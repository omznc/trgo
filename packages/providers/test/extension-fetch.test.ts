import { describe, expect, test } from "bun:test";
import { createExtensionFetch, type ExtensionCall } from "../src/extension-fetch";
import { EXTENSION_ERROR } from "../src/hosts";

const PROXY = "https://p.test";

// Records what reaches the extension and what reaches the fallback.
const setup = (call?: ExtensionCall) => {
	const sent: Parameters<ExtensionCall>[0][] = [];
	const fallbackUrls: string[] = [];
	const fetch = createExtensionFetch({
		proxyUrl: `${PROXY}/`,
		call:
			call ??
			(async (request) => {
				sent.push(request);
				return { status: 200, statusText: "OK", headers: { "content-type": "text/html" }, body: "<p>hi</p>" };
			}),
		fallback: (async (input: RequestInfo | URL) => {
			fallbackUrls.push(String(input));
			return new Response("proxied");
		}) as typeof globalThis.fetch,
	});
	return { fetch, sent, fallbackUrls };
};

describe("extension fetch", () => {
	test("sends an anonymous GET to the extension", async () => {
		const { fetch, sent, fallbackUrls } = setup();
		const res = await fetch(new URL(`${PROXY}/kp/pretraga?keywords=bike`), { headers: { accept: "text/html" } });
		expect(await res.text()).toBe("<p>hi</p>");
		expect(res.headers.get("content-type")).toBe("text/html");
		expect(sent).toEqual([{ key: "kp", path: "/pretraga", search: "?keywords=bike", accept: "text/html" }]);
		expect(fallbackUrls).toEqual([]);
	});

	test("keeps the status of an empty reply", async () => {
		const { fetch } = setup(async () => ({ status: 304, statusText: "Not Modified", headers: {}, body: "" }));
		expect((await fetch(`${PROXY}/olx/search`)).status).toBe(304);
	});

	test("uses the fallback for everything else", async () => {
		const { fetch, sent, fallbackUrls } = setup();
		await fetch(`${PROXY}/olx/search`, { method: "POST" });
		await fetch(`${PROXY}/olx/search`, { headers: { authorization: "Bearer t" } });
		await fetch(`${PROXY}/svex/search`, { headers: { "X-Lagano-Cookie": "a=b" } });
		await fetch(new Request(`${PROXY}/svex/search`, { headers: { authorization: "Bearer t" } }));
		await fetch(`${PROXY}/ai/chat/completions`);
		await fetch(`${PROXY}/geo`);
		await fetch(`${PROXY}/unknown/a`);
		await fetch(`${PROXY}/__proto__/a`);
		await fetch("https://other.test/olx/search");
		await fetch(`${PROXY}x/olx/search`);
		expect(sent).toEqual([]);
		expect(fallbackUrls).toHaveLength(10);
	});

	test("falls back to the proxy when the extension fails", async () => {
		const failed = { status: 403, statusText: "permission", headers: { [EXTENSION_ERROR]: "permission" }, body: "{}" };
		const { fetch, fallbackUrls } = setup(async () => failed);
		expect(await (await fetch(`${PROXY}/olx/search`)).text()).toBe("proxied");
		const thrown = setup(async () => Promise.reject(new Error("The browser extension did not answer.")));
		expect(await (await thrown.fetch(`${PROXY}/kp/pretraga`)).text()).toBe("proxied");
		expect(fallbackUrls).toEqual([`${PROXY}/olx/search`]);
	});

	test("keeps an upstream error and the errors of an extension-only host", async () => {
		const upstream = setup(async () => ({ status: 403, statusText: "Forbidden", headers: {}, body: "no" }));
		expect((await upstream.fetch(`${PROXY}/olx/search`)).status).toBe(403);
		expect(upstream.fallbackUrls).toEqual([]);
		const only = setup(async () => ({ status: 403, statusText: "permission", headers: { [EXTENSION_ERROR]: "permission" }, body: "{}" }));
		expect((await only.fetch(`${PROXY}/njuskalo/search/?keywords=x`)).status).toBe(403);
		expect(only.fallbackUrls).toEqual([]);
		const silent = setup(async () => Promise.reject(new Error("no answer")));
		await expect(silent.fetch(`${PROXY}/njuskalo/search/?keywords=x`)).rejects.toThrow("no answer");
	});

	test("rejects with the abort reason", async () => {
		const { fetch } = setup(() => new Promise(() => {}));
		const controller = new AbortController();
		const pending = fetch(`${PROXY}/olx/search`, { signal: controller.signal });
		controller.abort(new Error("stop"));
		await expect(pending).rejects.toThrow("stop");
		await expect(fetch(`${PROXY}/olx/search`, { signal: controller.signal })).rejects.toThrow("stop");
	});
});
