import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import worker from "./index";

const ORIGIN = "https://shop.example";
const ok = { limit: async () => ({ success: true }) };
const kv = { get: async () => null, put: async () => {} };
const env = {
	ALLOWED_ORIGINS: ORIGIN,
	GIT_COMMIT: "abc1234",
	RL_API: ok,
	RL_LOGIN: ok,
	RL_FREE: ok,
	RL_FREE_ALL: ok,
	RL_STATIC: ok,
	RL_KP: ok,
	RL_KP_ALL: ok,
	FREE_KV: kv,
	FREE_MODEL: "m/real",
	OPENROUTER_KEY: "test-key",
} as unknown as Parameters<typeof worker.fetch>[1];

const call = (path: string, init: RequestInit = {}, e = env, origin: string | null = ORIGIN) => {
	const headers = new Headers(init.headers);
	if (origin) headers.set("origin", origin);
	return worker.fetch(new Request(`https://proxy.test${path}`, { ...init, headers }), e);
};

const realFetch = globalThis.fetch;
let fetched: string[] = [];

beforeEach(() => {
	fetched = [];
	globalThis.fetch = (async (input: RequestInfo | URL) => {
		fetched.push(String(input));
		return new Response("upstream", { status: 200 });
	}) as typeof fetch;
});

afterEach(() => {
	globalThis.fetch = realFetch;
});

describe("geo", () => {
	const withCountry = (country?: string) => {
		const req = new Request("https://proxy.test/geo", { headers: { origin: ORIGIN } });
		Object.defineProperty(req, "cf", { value: country ? { country } : undefined });
		return worker.fetch(req, env);
	};

	test("returns the Cloudflare country", async () => {
		expect(await (await withCountry("HR")).json()).toEqual({ country: "HR" });
	});

	test("returns null without a country", async () => {
		expect(await (await withCountry()).json()).toEqual({ country: null });
	});

	test("needs an allowed origin and the API limit", async () => {
		expect((await call("/geo", {}, env, null)).status).toBe(403);
		const limited = { ...env, RL_API: { limit: async () => ({ success: false }) } } as typeof env;
		expect((await call("/geo", {}, limited)).status).toBe(429);
		expect(fetched).toEqual([]);
	});
});

describe("route allowlist", () => {
	test("rejects an unknown upstream key", async () => {
		expect((await call("/nope/x")).status).toBe(400);
		expect((await call("/")).status).toBe(400);
	});

	test("rejects the __proto__ key", async () => {
		expect((await call("/__proto__/x")).status).toBe(400);
		expect((await call("/constructor/x")).status).toBe(400);
	});

	test.each(["/olx/%2e%2e/b", "/olx//b", "/olx/a%5Cb", "/olx/a%2f..%2fb", "/olx/%2f%2fb"])(
		"rejects the path %s",
		async (path) => {
			expect((await call(path)).status).toBe(400);
			expect(fetched).toEqual([]);
		},
	);

	// The URL parser resolves these before the Worker sees them, so the guard never runs.
	// The upstream host stays fixed.
	test.each([
		["/olx/a/../b", "https://api.olx.ba/b"],
		["/olx/a/%2E%2E/b", "https://api.olx.ba/b"],
		["/olx/a\\b", "https://api.olx.ba/a/b"],
	])("the URL parser normalizes %s", async (path, upstream) => {
		await call(path);
		expect(fetched).toEqual([upstream]);
	});

	test("forwards a good path to the upstream", async () => {
		const res = await call("/olx/search?q=a");
		expect(res.status).toBe(200);
		expect(fetched).toEqual(["https://api.olx.ba/search?q=a"]);
	});
});

describe("origin", () => {
	test("rejects a missing Origin", async () => {
		expect((await call("/olx/x", {}, env, null)).status).toBe(403);
	});

	test("rejects a wrong Origin", async () => {
		expect((await call("/olx/x", {}, env, "https://evil.example")).status).toBe(403);
		expect(fetched).toEqual([]);
	});

	test("lets an allowed Origin pass", async () => {
		const res = await call("/olx/x");
		expect(res.status).toBe(200);
		expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
	});

	test("GET /version works without Origin", async () => {
		const res = await call("/version", {}, env, null);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ commit: "abc1234" });
	});

	test("POST /version needs an Origin", async () => {
		expect((await call("/version", { method: "POST" }, env, null)).status).toBe(403);
	});
});

describe("/upload", () => {
	const good = "https://bucket.s3.eu-west-1.amazonaws.com/key?sig=1";
	const put = (url: string, length: string | null = "10") =>
		call(`/upload?url=${encodeURIComponent(url)}`, {
			method: "PUT",
			body: "0123456789",
			headers: length === null ? {} : { "content-length": length },
		});

	test("accepts a good S3 url", async () => {
		expect((await put(good)).status).toBe(200);
		expect(fetched).toEqual([good]);
	});

	test.each([
		["http:", "http://bucket.s3.amazonaws.com/k"],
		["a port", "https://bucket.s3.amazonaws.com:8443/k"],
		["user info", "https://user:pw@bucket.s3.amazonaws.com/k"],
		["a non-matching host", "https://evil.example/k"],
		["a look-alike host", "https://bucket.s3.amazonaws.com.evil.example/k"],
		["a bad url", "not a url"],
	])("rejects %s", async (_name, url) => {
		expect((await put(url)).status).toBe(400);
		expect(fetched).toEqual([]);
	});

	test("rejects a missing content-length", async () => {
		const res = await call(`/upload?url=${encodeURIComponent(good)}`, { method: "PUT" });
		expect(res.status).toBe(411);
		expect(fetched).toEqual([]);
	});

	test("rejects a too large content-length", async () => {
		expect((await put(good, String(15 * 1024 * 1024 + 1))).status).toBe(413);
		expect(fetched).toEqual([]);
	});

	test("rejects a method other than PUT", async () => {
		expect((await call("/upload", { method: "POST" })).status).toBe(405);
	});
});

describe("rate limit bindings", () => {
	test("return 500 when RL_API is missing", async () => {
		const res = await call("/olx/x", {}, { ...env, RL_API: undefined } as typeof env);
		expect(res.status).toBe(500);
		expect(fetched).toEqual([]);
	});

	test("return 500 for a login route without RL_LOGIN", async () => {
		const res = await call("/olx/auth/login", { method: "POST" }, { ...env, RL_LOGIN: undefined } as typeof env);
		expect(res.status).toBe(500);
	});

	test("return 429 when the limit is hit", async () => {
		const full = { limit: async () => ({ success: false }) };
		const res = await call("/olx/x", {}, { ...env, RL_API: full } as typeof env);
		expect(res.status).toBe(429);
	});

	test("return 500 on the free route without bindings", async () => {
		const bare = { ALLOWED_ORIGINS: ORIGIN, FREE_MODEL: "m", OPENROUTER_KEY: "k" } as unknown as typeof env;
		const res = await call("/ai/chat/completions", { method: "POST", body: "{}" }, bare);
		expect(res.status).toBe(500);
	});

	test("return 500 on the free route without RL_FREE_ALL", async () => {
		const res = await call("/ai/chat/completions", { method: "POST", body: "{}" }, { ...env, RL_FREE_ALL: undefined } as typeof env);
		expect(res.status).toBe(500);
		expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
	});

	test("return 500 for a static chunk without RL_STATIC", async () => {
		const res = await call("/svex/_next/static/a.js", {}, { ...env, RL_STATIC: undefined } as typeof env);
		expect(res.status).toBe(500);
	});
});

describe("limiter keys", () => {
	const spy = () => {
		const keys: string[] = [];
		return { keys, binding: { limit: async ({ key }: { key: string }) => (keys.push(key), { success: true }) } };
	};
	const withIp = (init: RequestInit = {}, ip = "2001:db8:1:2:aaaa:bbbb:cccc:dddd") => ({
		...init,
		headers: { ...(init.headers as Record<string, string>), "cf-connecting-ip": ip },
	});

	test("an IPv6 client is keyed by its /64", async () => {
		const api = spy();
		await call("/olx/x", withIp(), { ...env, RL_API: api.binding } as typeof env);
		await call("/olx/x", withIp({}, "2001:db8:1:2:1::9"), { ...env, RL_API: api.binding } as typeof env);
		expect(api.keys).toEqual(["2001:db8:1:2::/64", "2001:db8:1:2::/64"]);
	});

	test("static chunks use RL_STATIC and not RL_API", async () => {
		const api = spy();
		const stat = spy();
		const e = { ...env, RL_API: api.binding, RL_STATIC: stat.binding } as typeof env;
		await call("/svex/_next/static/a.js", withIp({}, "203.0.113.5"), e);
		expect(api.keys).toEqual([]);
		expect(stat.keys).toEqual(["203.0.113.5"]);
	});

	test("a static chunk over its limit gets 429", async () => {
		const full = { limit: async () => ({ success: false }) };
		const res = await call("/svex/_next/static/a.js", {}, { ...env, RL_STATIC: full } as typeof env);
		expect(res.status).toBe(429);
	});

	test.each(["/olx/auth/login/", "/olx/auth/%6Cogin", "/olx/Auth/LOGIN", "/olx/auth/login//", "/svex/Prijava/"])(
		"the login limit applies to %s",
		async (path) => {
			const login = spy();
			await call(path, { method: "POST" }, { ...env, RL_LOGIN: login.binding } as typeof env);
			expect(login.keys.length).toBe(1);
		},
	);

	test("a GET to the login path has no login limit", async () => {
		const login = spy();
		await call("/olx/auth/login", {}, { ...env, RL_LOGIN: login.binding } as typeof env);
		expect(login.keys).toEqual([]);
	});

	test("a bad percent escape does not throw", async () => {
		expect((await call("/olx/%E0%A4%A", { method: "POST" })).status).toBe(400);
	});
});

describe("free route", () => {
	const chat = (body: unknown, e = env, headers: Record<string, string> = {}) => {
		const raw = typeof body === "string" ? body : JSON.stringify(body);
		return call(
			"/ai/chat/completions",
			{ method: "POST", body: raw, headers: { "content-length": String(new TextEncoder().encode(raw).length), ...headers } },
			e,
		);
	};
	const good = { messages: [{ role: "user", content: "hi" }] };
	const kvSpy = (fail = false) => {
		const state = { gets: [] as string[], puts: [] as string[] };
		const store = {
			get: async (k: string) => {
				state.gets.push(k);
				if (fail) throw new Error("kv down");
				return null;
			},
			put: async (k: string) => {
				state.puts.push(k);
				if (fail) throw new Error("kv write limit");
			},
		};
		return { state, e: { ...env, FREE_KV: store } as typeof env };
	};

	test("forwards a good request to OpenRouter", async () => {
		const res = await chat(good);
		expect(res.status).toBe(200);
		expect(fetched).toEqual(["https://openrouter.ai/api/v1/chat/completions"]);
	});

	test("returns 413 without content-length", async () => {
		const res = await call("/ai/chat/completions", { method: "POST", body: JSON.stringify(good) });
		expect(res.status).toBe(413);
		expect(fetched).toEqual([]);
	});

	test("returns 413 for a large content-length and spends no KV quota", async () => {
		const { state, e } = kvSpy();
		const res = await chat(good, e, { "content-length": String(10 * 1024 * 1024) });
		expect(res.status).toBe(413);
		expect(state.gets.length + state.puts.length).toBe(0);
	});

	test("returns free-too-long for a chat over the message cap", async () => {
		const body = { messages: Array(121).fill({ role: "user", content: "x" }) };
		const res = await chat(body);
		expect(res.status).toBe(413);
		expect(await res.json()).toEqual({ error: "free-too-long" });
		expect(fetched).toEqual([]);
	});

	test("returns free-too-long for a large content-length", async () => {
		const res = await chat(good, env, { "content-length": String(10 * 1024 * 1024) });
		expect(await res.json()).toEqual({ error: "free-too-long" });
	});

	test("keeps 400 bad body for other input errors", async () => {
		const res = await chat({ messages: [1] });
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "bad body" });
	});

	test("rejects an image part before the KV quota is spent", async () => {
		const { state, e } = kvSpy();
		const body = { messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "data:x" } }] }] };
		expect((await chat(body, e)).status).toBe(400);
		expect(state.gets.length + state.puts.length).toBe(0);
		expect(fetched).toEqual([]);
	});

	test("spends the KV quota with an HMAC key, not the IP", async () => {
		const { state, e } = kvSpy();
		await call(
			"/ai/chat/completions",
			{ method: "POST", body: JSON.stringify(good), headers: { "content-length": "100", "cf-connecting-ip": "203.0.113.5" } },
			e,
		);
		expect(state.puts).toHaveLength(1);
		expect(state.puts[0]).toMatch(/^d:\d{4}-\d{2}-\d{2}:[0-9a-f]{64}$/);
		expect(state.puts[0]).not.toContain("203.0.113.5");
	});

	test("the day key changes with the secret", async () => {
		const a = kvSpy();
		const b = kvSpy();
		await chat(good, { ...a.e, OPENROUTER_KEY: "one" } as typeof env);
		await chat(good, { ...b.e, OPENROUTER_KEY: "two" } as typeof env);
		expect(a.state.puts[0]).not.toBe(b.state.puts[0]);
	});

	test("a KV error fails open and keeps the CORS headers", async () => {
		const { e } = kvSpy(true);
		const res = await chat(good, e);
		expect(res.status).toBe(200);
		expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
	});

	test("the global limit gives 429 minute", async () => {
		const full = { limit: async () => ({ success: false }) };
		const res = await chat(good, { ...env, RL_FREE_ALL: full } as typeof env);
		expect(res.status).toBe(429);
		expect(await res.json()).toEqual({ error: "free-limit", scope: "minute" });
		expect(fetched).toEqual([]);
	});

	test("an invalid body does not use the global limit", async () => {
		let used = 0;
		const all = { limit: async () => (used++, { success: true }) };
		const res = await chat({ ...good, tools: Array.from({ length: 9 }, () => ({})) }, { ...env, RL_FREE_ALL: all } as typeof env);
		expect(res.status).toBe(400);
		expect(used).toBe(0);
	});

	test("the client limit runs before the global limit", async () => {
		let used = 0;
		const all = { limit: async () => (used++, { success: true }) };
		const own = { limit: async () => ({ success: false }) };
		const res = await chat(good, { ...env, RL_FREE: own, RL_FREE_ALL: all } as typeof env);
		expect(res.status).toBe(429);
		expect(used).toBe(0);
	});

	test("the global limit uses one fixed key", async () => {
		const keys: string[] = [];
		const all = { limit: async ({ key }: { key: string }) => (keys.push(key), { success: true }) };
		await chat(good, { ...env, RL_FREE_ALL: all } as typeof env);
		await call(
			"/ai/chat/completions",
			{ method: "POST", body: JSON.stringify(good), headers: { "content-length": "100", "cf-connecting-ip": "198.51.100.9" } },
			{ ...env, RL_FREE_ALL: all } as typeof env,
		);
		expect(keys).toEqual(["all", "all"]);
	});
});

describe("kp relay", () => {
	const kpEnv = { ...env, KP_RELAY_URL: "https://relay.test", KP_RELAY_SECRET: "s3" } as typeof env;
	let seen: { url: string; headers: Headers; method?: string }[] = [];

	beforeEach(() => {
		seen = [];
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			seen.push({ url: String(input), headers: new Headers(init?.headers), method: init?.method });
			return new Response("page", { status: 200, headers: { "content-type": "text/html", "set-cookie": "a=b" } });
		}) as typeof fetch;
	});

	test("returns 503 without config", async () => {
		for (const e of [env, { ...env, KP_RELAY_URL: "https://relay.test" }, { ...env, KP_RELAY_SECRET: "s3" }]) {
			const res = await call("/kp/oglasi", {}, e as typeof env);
			expect(res.status).toBe(503);
			expect(await res.json()).toEqual({ error: "kp-unavailable" });
		}
		expect(seen).toEqual([]);
	});

	test("returns 500 without RL_KP or RL_KP_ALL, and 429 when one is full", async () => {
		const full = { limit: async () => ({ success: false }) };
		for (const name of ["RL_KP", "RL_KP_ALL"]) {
			expect((await call("/kp/oglasi", {}, { ...kpEnv, [name]: undefined } as typeof env)).status).toBe(500);
			expect((await call("/kp/oglasi", {}, { ...kpEnv, [name]: full } as typeof env)).status).toBe(429);
		}
		expect(seen).toEqual([]);
	});

	test("a client rejected by RL_KP or RL_API does not call RL_KP_ALL", async () => {
		const full = { limit: async () => ({ success: false }) };
		let all = 0;
		const RL_KP_ALL = { limit: async () => (all++, { success: true }) };
		for (const name of ["RL_KP", "RL_API"]) {
			const res = await call("/kp/oglasi", {}, { ...kpEnv, RL_KP_ALL, [name]: full } as typeof env);
			expect(res.status).toBe(429);
		}
		expect(all).toBe(0);
	});

	test("another route does not use the KP limits", async () => {
		const full = { limit: async () => ({ success: false }) };
		expect((await call("/olx/x", {}, { ...kpEnv, RL_KP: full, RL_KP_ALL: full } as typeof env)).status).toBe(200);
	});

	test("returns 503 for a relay URL without https", async () => {
		const e = { ...kpEnv, KP_RELAY_URL: "http://relay.test" } as typeof env;
		expect((await call("/kp/oglasi", {}, e)).status).toBe(503);
		expect(seen).toEqual([]);
	});

	test("forwards with the secret and without cookies", async () => {
		const res = await call("/kp/pretraga?keywords=bike", { headers: { cookie: "c=1", authorization: "Bearer x", "x-lagano-cookie": "d=2" } }, kpEnv);
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("page");
		expect(res.headers.get("content-type")).toBe("text/html");
		expect(res.headers.get("x-lagano-set-cookie")).toBeNull();
		expect(seen).toHaveLength(1);
		expect(seen[0].url).toBe("https://relay.test/pretraga?keywords=bike");
		expect(seen[0].method).toBe("GET");
		expect(seen[0].headers.get("x-relay-secret")).toBe("s3");
		for (const name of ["cookie", "authorization", "origin"]) expect(seen[0].headers.get(name)).toBeNull();
	});

	test("allows only GET", async () => {
		for (const method of ["POST", "PUT", "DELETE"]) {
			expect((await call("/kp/oglasi", { method, body: "x" }, kpEnv)).status).toBe(405);
		}
		expect(seen).toEqual([]);
	});

	test("rejects an unsafe path", async () => {
		expect((await call("/kp/a%2f..%2fb", {}, kpEnv)).status).toBe(400);
		expect((await call("/kp//evil.test", {}, kpEnv)).status).toBe(400);
		expect(seen).toEqual([]);
	});

	test("keeps the existing routes", async () => {
		const res = await call("/olx/search?q=1", {}, kpEnv);
		expect(res.status).toBe(200);
		expect(seen.map((s) => s.url)).toEqual(["https://api.olx.ba/search?q=1"]);
		expect((await call("/nope/x", {}, kpEnv)).status).toBe(400);
	});
});
