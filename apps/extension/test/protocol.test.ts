import { describe, expect, test } from "bun:test";
import { acceptPageMessage, ALLOWED_ORIGINS, type ExtRequest, isExtRequest, REQUEST } from "../src/protocol";

const page = {};
const origin = "https://trgo.omarzunic.com";
const data: ExtRequest = { type: REQUEST, id: "1", key: "kp", path: "/pretraga", search: "?q=a", accept: "text/html" };
const accept = (event: { source?: unknown; origin?: string; data?: unknown }, pageOrigin = origin) =>
	acceptPageMessage({ source: page, origin, data, ...event }, page, pageOrigin);

describe("content bridge", () => {
	test("accepts a request from the page", () => {
		expect(accept({})).toEqual(data);
	});

	test("rejects a wrong source", () => {
		expect(accept({ source: {} })).toBeNull();
		expect(accept({ source: null })).toBeNull();
	});

	test("rejects a wrong origin", () => {
		expect(accept({ origin: "https://evil.test" }, "https://evil.test")).toBeNull();
		expect(accept({ origin: "https://evil.test" })).toBeNull();
		expect(accept({}, "https://evil.test")).toBeNull();
	});

	test("rejects a malformed message", () => {
		for (const bad of [null, "text", 1, {}, { ...data, type: "other" }, { ...data, id: 1 }, { ...data, path: undefined }]) {
			expect(accept({ data: bad })).toBeNull();
			expect(isExtRequest(bad)).toBe(false);
		}
	});

	test("the store build allows no local origin", () => {
		expect(ALLOWED_ORIGINS.some((o) => o.includes("localhost"))).toBe(false);
	});
});
