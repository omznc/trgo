import { describe, expect, test } from "bun:test";
import { EXTENSION_HOSTS, resolveExtensionTarget, resolveTarget, UPSTREAMS } from "../src/hosts";

const proxy = (path: string) => resolveTarget(new URL(`https://p.test${path}`));

describe("proxy table", () => {
	test("resolves a valid path for each upstream", () => {
		for (const [key, origin] of Object.entries(UPSTREAMS)) {
			const route = proxy(`/${key}/a/b?x=1`);
			expect(route?.key).toBe(key);
			expect(route?.target.href).toBe(`${origin}/a/b?x=1`);
		}
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
		for (const [key, { origin }] of Object.entries(EXTENSION_HOSTS)) {
			expect(resolveExtensionTarget(key, "/a/b", "?x=1")?.target.href).toBe(`${origin}/a/b?x=1`);
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

	test("sends cookies only to njuskalo", () => {
		for (const [key, host] of Object.entries(EXTENSION_HOSTS)) {
			expect(host.credentials).toBe(key === "njuskalo" ? "include" : "omit");
		}
	});
});
