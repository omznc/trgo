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
	FREE_KV: kv,
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
	// The upstream host stays fixed. The README says 400, so this differs from the README.
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
});
