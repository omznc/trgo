// Pass-through proxy. It never stores or logs bodies, headers or URLs.
// The only state is a per-day request counter for the free AI route (see free.ts).
// Read the whole file in a few minutes.
import { isReadOnly, isSafePath, resolveTarget } from "@lagano/providers/hosts";
import { hmacIp, ipKey, isChatTooLong, MAX_BODY_BYTES, sanitizeBody, scrub, scrubStream, secondsUntilNextUtcDay } from "./free";

const FORWARD_HEADERS = ["content-type", "accept", "authorization", "next-action", "next-router-state-tree"];

// Upload targets: S3 buckets only, over https.
// shortcut: matches any S3 bucket, pin it to the SVEX bucket host once a real presign URL is captured
const UPLOAD_HOSTS: RegExp[] = [/^[a-z0-9.-]+\.s3[a-z0-9.-]*\.amazonaws\.com$/];
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

interface Env {
	ALLOWED_ORIGINS?: string;
	GIT_COMMIT?: string;
	RL_API?: RateLimit;
	RL_LOGIN?: RateLimit;
	RL_FREE?: RateLimit;
	RL_FREE_ALL?: RateLimit;
	RL_STATIC?: RateLimit;
	RL_KP?: RateLimit;
	RL_KP_ALL?: RateLimit;
	FREE_KV?: KVNamespace;
	// Secrets. Set them with "cf workers secrets update".
	FREE_MODEL?: string;
	OPENROUTER_KEY?: string;
	// The relay for KupujemProdajem: a Workers VPC binding to the relay tunnel. The secret is a Worker secret.
	KP_RELAY?: Fetcher;
	KP_RELAY_SECRET?: string;
	// Set to "1" in .dev.vars only. It turns the rate limit off.
	DEV_NO_RATE_LIMIT?: string;
}

const text = (status: number, body: string, headers?: HeadersInit) => new Response(body, { status, headers });
const jsonError = (status: number, error: string, headers: Headers) => Response.json({ error }, { status, headers });

// Returns null when the origin is missing or not allowed.
function corsHeaders(request: Request, env: Env): Headers | null {
	const origin = request.headers.get("origin");
	const allowed = (env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(",").map((o) => o.trim());
	if (!origin || !allowed.includes(origin)) return null;
	return new Headers({
		vary: "origin",
		"access-control-allow-origin": origin,
		"access-control-expose-headers": "x-lagano-set-cookie",
	});
}

// Lowercase, decoded once, no trailing slash. Upstream treats "/Login/" like "/login".
function normalizePath(path: string): string {
	let decoded = path;
	try {
		decoded = decodeURIComponent(path);
	} catch {
		// A bad escape stays as it is.
	}
	return decoded.toLowerCase().replace(/\/+$/, "");
}

const isLogin = (request: Request, path: string) => {
	const p = normalizePath(path);
	return request.method === "POST" && (p === "/olx/auth/login" || p === "/svex/prijava");
};

// SVEX action discovery fetches about 50 public static chunks.
const isStaticChunk = (request: Request, path: string) =>
	request.method === "GET" && path.startsWith("/svex/_next/static/");

const isKp = (path: string) => path === "/kp" || path.startsWith("/kp/");

const clientKey = (request: Request) => ipKey(request.headers.get("cf-connecting-ip") ?? "unknown");

// Fixed window per client (IPv4 address or IPv6 /64). Login routes also use the stricter limit.
// Static chunks use their own, larger limit. Missing bindings fail closed, unless DEV_NO_RATE_LIMIT is set.
async function checkLimit(request: Request, env: Env, path: string): Promise<"ok" | "limited" | "misconfigured"> {
	if (env.DEV_NO_RATE_LIMIT === "1") return "ok";
	const key = clientKey(request);
	if (isStaticChunk(request, path)) {
		if (!env.RL_STATIC) return "misconfigured";
		return (await env.RL_STATIC.limit({ key })).success ? "ok" : "limited";
	}
	const login = isLogin(request, path);
	const kp = isKp(path);
	if (!env.RL_API || !hasRouteLimits(env, login, kp)) return "misconfigured";
	const checks = [env.RL_API.limit({ key })];
	if (login) checks.push(env.RL_LOGIN!.limit({ key }));
	if (kp) checks.push(env.RL_KP!.limit({ key }));
	if (!(await Promise.all(checks)).every((r) => r.success)) return "limited";
	// RL_KP_ALL has one fixed key. It runs last, so a rejected client does not fill it for others.
	// It is a ceiling for each Cloudflare location.
	if (kp && !(await env.RL_KP_ALL!.limit({ key: "all" })).success) return "limited";
	return "ok";
}

const hasRouteLimits = (env: Env, login: boolean, kp: boolean) => (!login || !!env.RL_LOGIN) && (!kp || (!!env.RL_KP && !!env.RL_KP_ALL));

async function limitResponse(request: Request, env: Env, path: string, cors: Headers): Promise<Response | null> {
	const limit = await checkLimit(request, env, path);
	if (limit === "misconfigured") return jsonError(500, "rate limit bindings are missing", cors);
	return limit === "limited" ? jsonError(429, "too many requests", cors) : null;
}

function uploadTarget(url: URL): URL | null {
	let target: URL;
	try {
		target = new URL(url.searchParams.get("url") ?? "");
	} catch {
		return null;
	}
	const hostOk = UPLOAD_HOSTS.some((re) => re.test(target.hostname));
	if (target.protocol !== "https:" || target.port || target.username || !hostOk) return null;
	return target;
}

// Streams the PUT body to a presigned URL. The declared length is the size limit.
async function upload(request: Request, url: URL, cors: Headers): Promise<Response> {
	if (request.method !== "PUT") return jsonError(405, "use PUT", cors);
	const target = uploadTarget(url);
	if (!target) return jsonError(400, "upload url not allowed", cors);
	const length = Number(request.headers.get("content-length"));
	if (!Number.isInteger(length) || length <= 0) return jsonError(411, "content-length required", cors);
	if (length > MAX_UPLOAD_BYTES) return jsonError(413, "file too large (max 15 MB)", cors);
	const headers = new Headers({ "content-length": String(length) });
	const type = request.headers.get("content-type");
	if (type) headers.set("content-type", type);
	try {
		const res = await fetch(target, { method: "PUT", headers, body: request.body, redirect: "manual" });
		return new Response(res.body, { status: res.status, headers: cors });
	} catch {
		return jsonError(502, "upload failed", cors);
	}
}

function upstreamHeaders(request: Request, key: string): Headers {
	const headers = new Headers();
	for (const name of FORWARD_HEADERS) {
		const value = request.headers.get(name);
		if (value) headers.set(name, value);
	}
	// A read-only host never gets the user's session.
	if (isReadOnly(key)) {
		headers.delete("authorization");
	} else {
		const cookie = request.headers.get("x-lagano-cookie");
		if (cookie) headers.set("cookie", cookie);
	}
	if (key === "svex") {
		headers.set("origin", "https://svex.ba");
		headers.set("referer", "https://svex.ba");
	}
	headers.set("user-agent", "Mozilla/5.0 (compatible; lagano-proxy)");
	return headers;
}

async function proxy(request: Request, key: string, target: URL, cors: Headers): Promise<Response> {
	const hasBody = request.method !== "GET" && request.method !== "HEAD";
	if (hasBody && isReadOnly(key)) return jsonError(405, "use GET", cors);
	let upstream: Response;
	try {
		upstream = await fetch(target, {
			method: request.method,
			headers: upstreamHeaders(request, key),
			body: hasBody ? request.body : undefined,
			redirect: "manual",
		});
	} catch {
		return text(502, "upstream unreachable", cors);
	}
	const headers = new Headers(cors);
	// Hop-by-hop and encoding headers stay out; the runtime sets them again.
	for (const name of ["content-type", "location", "cache-control"]) {
		const value = upstream.headers.get(name);
		if (value) headers.set(name, value);
	}
	const cookies = upstream.headers.getSetCookie();
	if (cookies.length > 0) headers.set("x-lagano-set-cookie", JSON.stringify(cookies));
	return new Response(upstream.body, { status: upstream.status, headers });
}

// KupujemProdajem blocks Cloudflare Workers. A relay on the owner's server makes the request instead.
// Its URL comes from the build, so it is not in UPSTREAMS. It must use https. Only GET passes.
// The relay gets the shared secret and the path. It gets no cookie and no authorization header.
// The VPC service sends each request to the relay container, whatever host the URL has.
// The relay has no public hostname, so the zone's bot check cannot challenge the proxy on the way.
const KP_RELAY_ORIGIN = "http://kp-relay:8788";

async function kpRoute(request: Request, env: Env, url: URL, cors: Headers): Promise<Response> {
	if (request.method !== "GET") return jsonError(405, "use GET", cors);
	if (!env.KP_RELAY || !env.KP_RELAY_SECRET) return jsonError(503, "kp-unavailable", cors);
	const path = url.pathname.slice("/kp".length) || "/";
	if (!isSafePath(path)) return text(400, "bad route", cors);
	const target = new URL(KP_RELAY_ORIGIN + path);
	if (target.origin !== KP_RELAY_ORIGIN) return text(400, "bad route", cors);
	target.search = url.search;
	const headers = new Headers({ "x-relay-secret": env.KP_RELAY_SECRET! });
	const accept = request.headers.get("accept");
	if (accept) headers.set("accept", accept);
	let upstream: Response;
	try {
		upstream = await env.KP_RELAY.fetch(target, { method: "GET", headers, redirect: "manual" });
	} catch {
		return text(502, "upstream unreachable", cors);
	}
	const out = new Headers(cors);
	const type = upstream.headers.get("content-type");
	if (type) out.set("content-type", type);
	return new Response(upstream.body, { status: upstream.status, headers: out });
}

const FREE_DAILY_CAP = 150;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const freeLimited = (scope: "minute" | "day", retryAfter: number, cors: Headers) => {
	const headers = new Headers(cors);
	headers.set("retry-after", String(retryAfter));
	return Response.json({ error: "free-limit", scope }, { status: 429, headers });
};

// Per client: 12 per minute (binding). This runs first, so one client cannot spend the shared limit.
async function freeClientLimit(request: Request, env: Env, cors: Headers): Promise<Response | null> {
	if (env.DEV_NO_RATE_LIMIT === "1") return null;
	if (!env.RL_FREE || !env.RL_FREE_ALL || !env.FREE_KV) return jsonError(500, "rate limit bindings are missing", cors);
	if (!(await env.RL_FREE.limit({ key: clientKey(request) })).success) return freeLimited("minute", 60, cors);
	return null;
}

// A ceiling for the whole route (RL_FREE_ALL, one key). A binding counts for each Cloudflare location,
// not worldwide, so this is a ceiling for each location. The real cost cap is the credit limit on the OpenRouter key.
// A global counter in KV is not safe (write limits, eventual consistency), so use a binding.
async function freeGlobalLimit(env: Env, cors: Headers): Promise<Response | null> {
	if (env.DEV_NO_RATE_LIMIT === "1" || !env.RL_FREE_ALL) return null;
	if (!(await env.RL_FREE_ALL.limit({ key: "all" })).success) return freeLimited("minute", 60, cors);
	return null;
}

// Per IP per day in KV. KV is approximate under load. A KV error lets the request pass.
async function freeDayLimit(request: Request, env: Env, cors: Headers): Promise<Response | null> {
	if (env.DEV_NO_RATE_LIMIT === "1" || !env.FREE_KV || !env.OPENROUTER_KEY) return null;
	try {
		const ip = await hmacIp(clientKey(request), env.OPENROUTER_KEY);
		const key = `d:${new Date().toISOString().slice(0, 10)}:${ip}`;
		const count = Number(await env.FREE_KV.get(key)) || 0;
		if (count >= FREE_DAILY_CAP) return freeLimited("day", secondsUntilNextUtcDay(), cors);
		await env.FREE_KV.put(key, String(count + 1), { expirationTtl: 2 * 24 * 3600 });
	} catch {
		// Fail open: the per-minute limits still apply.
	}
	return null;
}

const freeUnavailable = (cors: Headers) => jsonError(503, "free-unavailable", cors);

async function freeChat(request: Request, env: Env, cors: Headers): Promise<Response> {
	if (request.method !== "POST") return jsonError(405, "use POST", cors);
	if (!env.FREE_MODEL || !env.OPENROUTER_KEY) return freeUnavailable(cors);
	// Order: client limit, body check, global limit, daily quota. A bad body spends no shared limit.
	const limited = await freeClientLimit(request, env, cors);
	if (limited) return limited;
	const body = await readFreeBody(request, env.FREE_MODEL, cors);
	if (body instanceof Response) return body;
	const globalLimited = await freeGlobalLimit(env, cors);
	if (globalLimited) return globalLimited;
	const dayLimited = await freeDayLimit(request, env, cors);
	if (dayLimited) return dayLimited;
	let upstream: Response;
	try {
		upstream = await fetch(OPENROUTER_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${env.OPENROUTER_KEY}`,
				"http-referer": "trgo",
				"x-openrouter-title": "trgo",
			},
			body: JSON.stringify(body),
		});
	} catch {
		return jsonError(502, "upstream unreachable", cors);
	}
	// A problem with our own key or quota is not the user's problem.
	if ([401, 402, 403, 429].includes(upstream.status)) return freeUnavailable(cors);
	return relayFree(upstream, cors);
}

async function readFreeBody(request: Request, model: string, cors: Headers): Promise<Record<string, unknown> | Response> {
	// Check the declared size first, so a large body is never read.
	const length = Number(request.headers.get("content-length"));
	if (!Number.isInteger(length) || length <= 0) return jsonError(413, "body too large", cors);
	if (length > MAX_BODY_BYTES) return jsonError(413, "free-too-long", cors);
	const raw = await request.text();
	if (raw.length > MAX_BODY_BYTES) return jsonError(413, "free-too-long", cors);
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return jsonError(400, "bad json", cors);
	}
	const body = sanitizeBody(parsed, model);
	if (body) return body;
	return isChatTooLong(parsed) ? jsonError(413, "free-too-long", cors) : jsonError(400, "bad body", cors);
}

// Sends the upstream answer back with the model name and the provider removed.
async function relayFree(upstream: Response, cors: Headers): Promise<Response> {
	const headers = new Headers(cors);
	headers.set("cache-control", "no-store");
	const type = upstream.headers.get("content-type") ?? "application/json";
	headers.set("content-type", type);
	if (type.includes("text/event-stream")) {
		return new Response(upstream.body?.pipeThrough(scrubStream()), { status: upstream.status, headers });
	}
	const data = await upstream.json().catch(() => null);
	return Response.json(scrub(data) ?? { error: "bad upstream" }, { status: upstream.status, headers });
}

const versionResponse = (env: Env, headers: Headers) => Response.json({ commit: env.GIT_COMMIT ?? "dev" }, { headers });

// The country that Cloudflare detects for the request. Nothing is stored or logged.
const geoResponse = (request: Request, cors: Headers) =>
	request.method === "GET"
		? Response.json({ country: (request as Request & { cf?: { country?: string } }).cf?.country ?? null }, { headers: cors })
		: jsonError(405, "use GET", cors);

function preflight(request: Request, url: URL, cors: Headers): Response {
	cors.set("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
	cors.set("access-control-allow-headers", [...FORWARD_HEADERS, "x-lagano-cookie"].join(","));
	// The AI SDK adds its own headers on the free route.
	const asked = request.headers.get("access-control-request-headers");
	if (url.pathname.startsWith("/ai/") && asked) cors.set("access-control-allow-headers", asked);
	cors.set("access-control-max-age", "600");
	return new Response(null, { status: 204, headers: cors });
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const cors = corsHeaders(request, env);
		// Only GET /version works without an allowed Origin.
		if (!cors) {
			if (request.method === "GET" && url.pathname === "/version") return versionResponse(env, new Headers());
			return text(403, "origin not allowed");
		}
		if (url.pathname === "/ai/chat/completions" && request.method !== "OPTIONS") return freeChat(request, env, cors);
		const blocked = await limitResponse(request, env, url.pathname, cors);
		if (blocked) return blocked;
		if (request.method === "OPTIONS") return preflight(request, url, cors);
		if (url.pathname === "/version") return versionResponse(env, cors);
		if (url.pathname === "/geo") return geoResponse(request, cors);
		if (url.pathname === "/upload") return upload(request, url, cors);
		if (isKp(url.pathname)) return kpRoute(request, env, url, cors);
		const route = resolveTarget(url);
		if (!route) return text(400, "bad route", cors);
		return proxy(request, route.key, route.target, cors);
	},
};
