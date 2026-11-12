import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { makeHandler, makeLimiter } from "./index";

const SECRET = "test-secret";
const realFetch = globalThis.fetch;
let calls: { url: string; init: RequestInit }[] = [];
let reply: () => Response;

beforeEach(() => {
	calls = [];
	reply = () => new Response("page", { status: 200, headers: { "content-type": "text/html", "set-cookie": "a=b" } });
	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		calls.push({ url: String(input), init: init ?? {} });
		return reply();
	}) as typeof fetch;
});

afterEach(() => {
	globalThis.fetch = realFetch;
});

const handler = makeHandler(SECRET);
const get = (path: string, headers: Record<string, string> = { "x-relay-secret": SECRET }, method = "GET", h = handler) =>
	h(new Request(`http://relay.test${path}`, { method, headers }));

describe("kp-relay", () => {
	test("forwards a GET with fixed headers only", async () => {
		const res = await get("/pretraga?keywords=bike", {
			"x-relay-secret": SECRET,
			cookie: "c=1",
			"x-forwarded-for": "1.2.3.4",
			authorization: "Bearer x",
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("page");
		expect(res.headers.get("content-type")).toBe("text/html");
		expect(res.headers.get("set-cookie")).toBeNull();
		expect(calls).toHaveLength(1);
		expect(calls[0].url).toBe("https://www.kupujemprodajem.com/pretraga?keywords=bike");
		expect(calls[0].init.redirect).toBe("manual");
		const sent = new Headers(calls[0].init.headers);
		expect([...sent.keys()].sort()).toEqual(["accept", "accept-language", "user-agent"]);
		expect(sent.get("user-agent")).toContain("Mozilla/5.0");
	});

	test("returns 405 for other methods", async () => {
		for (const method of ["POST", "PUT", "DELETE", "HEAD"]) {
			expect((await get("/x", { "x-relay-secret": SECRET }, method)).status).toBe(405);
		}
		expect(calls).toEqual([]);
	});

	test("returns 401 for a wrong or missing secret", async () => {
		expect((await get("/x", {})).status).toBe(401);
		expect((await get("/x", { "x-relay-secret": "wrong" })).status).toBe(401);
		expect((await get("/x", { "x-relay-secret": `${SECRET}x` })).status).toBe(401);
		expect(calls).toEqual([]);
	});

	test("returns 400 for a blocked path", async () => {
		for (const path of ["/api/v1/x", "/API/x", "/%61pi/x", "/a%2f..%2fb", "/a%2f%2fb", "/a%5Cb", "/a//b", "/%zz"]) {
			expect((await get(path)).status).toBe(400);
		}
		expect(calls).toEqual([]);
	});

	test("allows a path with api inside", async () => {
		expect((await get("/oglas/api-test")).status).toBe(200);
	});

	test("returns 502 for a redirect to another host", async () => {
		reply = () => new Response(null, { status: 302, headers: { location: "https://evil.test/x" } });
		expect((await get("/x")).status).toBe(502);
	});

	test("passes a redirect on the same host without the location", async () => {
		reply = () => new Response(null, { status: 301, headers: { location: "/other" } });
		const res = await get("/x");
		expect(res.status).toBe(301);
		expect(res.headers.get("location")).toBeNull();
	});

	test("returns 502 when the upstream fails", async () => {
		globalThis.fetch = (async () => {
			throw new Error("down");
		}) as unknown as typeof fetch;
		expect((await get("/x")).status).toBe(502);
	});

	test("returns 429 over 30 requests in 10 seconds", async () => {
		let t = 0;
		const h = makeHandler(SECRET, makeLimiter(30, 10_000, () => t));
		for (let i = 0; i < 30; i++) expect((await get("/x", { "x-relay-secret": SECRET }, "GET", h)).status).toBe(200);
		expect((await get("/x", { "x-relay-secret": SECRET }, "GET", h)).status).toBe(429);
		expect(calls).toHaveLength(30);
		t = 10_000;
		expect((await get("/x", { "x-relay-secret": SECRET }, "GET", h)).status).toBe(200);
	});

	test("refuses to start without RELAY_SECRET", async () => {
		const proc = Bun.spawn(["bun", `${import.meta.dir}/index.ts`], { env: { PATH: process.env.PATH }, stdout: "pipe", stderr: "pipe" });
		expect(await proc.exited).toBe(1);
	});
});
