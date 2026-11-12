// Relay for KupujemProdajem. It makes GET requests from a home IP, because KP blocks Cloudflare.
// It writes no request logs. It forwards no client header.
import { timingSafeEqual } from "node:crypto";

const UPSTREAM = "https://www.kupujemprodajem.com";
const UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0";
const MAX_REQUESTS = 30;
const WINDOW_MS = 10_000;

const sameSecret = (a: string, b: string) => {
	const x = Buffer.from(a);
	const y = Buffer.from(b);
	return x.length === y.length && timingSafeEqual(x, y);
};

// Checks the path before and after percent-decoding. Rejects "..", "//", a backslash and "/api/".
// Bun resolves a raw ".." and turns a raw backslash into "/" before this code runs. The encoded forms stay.
const badPath = (p: string) => !p.startsWith("/") || p.toLowerCase().startsWith("/api/") || p.includes("..") || p.includes("//") || p.includes("\\");

export function isAllowedPath(pathAndQuery: string): boolean {
	const path = pathAndQuery.split("?")[0];
	try {
		return !badPath(path) && !badPath(decodeURIComponent(path));
	} catch {
		return false;
	}
}

// shortcut: one process, in memory. Use a shared store if you run more than one copy.
export function makeLimiter(max = MAX_REQUESTS, windowMs = WINDOW_MS, now: () => number = Date.now) {
	const times: number[] = [];
	return () => {
		const t = now();
		while (times.length > 0 && t - times[0] >= windowMs) times.shift();
		if (times.length >= max) return false;
		times.push(t);
		return true;
	};
}

export function makeHandler(secret: string, allow: () => boolean = makeLimiter()) {
	return async (request: Request): Promise<Response> => {
		if (request.method !== "GET") return new Response("use GET", { status: 405 });
		if (!sameSecret(request.headers.get("x-relay-secret") ?? "", secret)) return new Response("unauthorized", { status: 401 });
		// The raw request line keeps "..", "//" and "\" as sent. The URL parser would resolve some.
		const raw = request.url.slice(new URL(request.url).origin.length);
		if (!isAllowedPath(raw)) return new Response("bad path", { status: 400 });
		if (!allow()) return new Response("too many requests", { status: 429 });
		let res: Response;
		try {
			res = await fetch(UPSTREAM + raw, {
				method: "GET",
				headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*;q=0.8", "accept-language": "sr,en;q=0.8" },
				redirect: "manual",
			});
		} catch {
			return new Response("upstream unreachable", { status: 502 });
		}
		if (res.status >= 300 && res.status < 400) {
			const location = res.headers.get("location");
			if (location && new URL(location, UPSTREAM).origin !== UPSTREAM) return new Response("redirect to another host", { status: 502 });
		}
		const headers = new Headers();
		const type = res.headers.get("content-type");
		if (type) headers.set("content-type", type);
		return new Response(res.body, { status: res.status, headers });
	};
}

if (import.meta.main) {
	const secret = process.env.RELAY_SECRET;
	if (!secret) {
		console.error("RELAY_SECRET is not set");
		process.exit(1);
	}
	const port = Number(process.env.PORT ?? 8788);
	Bun.serve({ port, fetch: makeHandler(secret) });
	console.log(`kp-relay listens on ${port}`);
}
