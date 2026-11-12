import { describe, expect, test } from "bun:test";
import { EXTENSION_HOSTS, READ_ONLY, resolveExtensionTarget, resolveTarget, UPSTREAMS } from "../src/hosts";

const proxy = (path: string) => resolveTarget(new URL(`https://p.test${path}`));

describe("proxy table", () => {
	test("resolves a valid path for each upstream", () => {
		for (const [key, origin] of Object.entries(UPSTREAMS)) {
			const path = `${READ_ONLY[key]?.[0] ?? "/"}a/b`;
			const route = proxy(`/${key}${path}?x=1`);
			expect(route?.key).toBe(key);
			expect(route?.target.href).toBe(`${origin}${path}?x=1`);
		}
	});

	test("gives the read-only hosts their search paths only", () => {
		expect(proxy("/bolha/search/?q=x")).not.toBeNull();
		expect(proxy("/olxbg/api/v1/offers/?query=x")).not.toBeNull();
		expect(proxy("/willhaben/iad/kaufen-und-verkaufen/marktplatz?keyword=x")).not.toBeNull();
		for (const path of ["/bolha/", "/bolha/user/login", "/olxbg/api/v1/users/me", "/olxbg/", "/willhaben/iad/myprofile", "/willhaben/search/"]) {
			expect(proxy(path)).toBeNull();
		}
		expect(proxy("/olx/anything")).not.toBeNull();
	});

	test("uses the root path when there is none", () => {
		expect(proxy("/olx")?.target.href).toBe("https://api.olx.ba/");
	});

	test("rejects bad routes", () => {
		for (const path of ["/nope/a", "/__proto__/a", "/olx/../a", "/olx/%2e%2e/a", "/olx//a", "/olx@evil.test/a", "/olx/%5Cb", "/olx/%zz"]) {
			expect(proxy(path)).toBeNull();
		}
	});

	test("does not know njuskalo or a direct kp host", () => {
		expect(proxy("/njuskalo/a")).toBeNull();
		expect(proxy("/kp/a")).toBeNull();
	});
});

describe("extension table", () => {
	test("resolves a valid path for each host", () => {
		for (const [key, { origin, paths }] of Object.entries(EXTENSION_HOSTS)) {
			const path = `${paths?.[0] ?? "/"}a/b`;
			expect(resolveExtensionTarget(key, path, "?x=1")?.target.href).toBe(`${origin}${path}?x=1`);
		}
	});

	test("gives njuskalo the search pages only", () => {
		expect(resolveExtensionTarget("njuskalo", "/search/", "?keywords=x")).not.toBeNull();
		for (const path of ["/", "/moj-kutak", "/search", "/searchx/", "/search/../moj-kutak", "/search/%2e%2e/moj-kutak"]) {
			expect(resolveExtensionTarget("njuskalo", path, "")).toBeNull();
		}
	});

	test("rejects bad routes", () => {
		for (const [key, path] of [["nope", "/a"], ["__proto__", "/a"], ["kp", "/../a"], ["kp", "//a"], ["kp", "@evil.test/a"], ["kp", ".evil.test/a"],["kp", "/a\\b"], ["njuskalo", "/%2e%2e/a"]]) {
			expect(resolveExtensionTarget(key, path, "")).toBeNull();
		}
	});

	test("njuskalo is only in the extension table", () => {
		expect(Object.keys(UPSTREAMS)).not.toContain("njuskalo");
		expect(Object.keys(EXTENSION_HOSTS)).toContain("njuskalo");
		expect(Object.keys(EXTENSION_HOSTS)).toContain("kp");
	});

	test("the proxy-only keys are not in the extension table", () => {
		for (const key of ["bolha", "olxbg", "willhaben"]) {
			expect(Object.keys(UPSTREAMS)).toContain(key);
			expect(Object.keys(EXTENSION_HOSTS)).not.toContain(key);
		}
	});

	test("sends cookies only to njuskalo", () => {
		for (const [key, host] of Object.entries(EXTENSION_HOSTS)) {
			expect(host.credentials).toBe(key === "njuskalo" ? "include" : "omit");
		}
	});
});
