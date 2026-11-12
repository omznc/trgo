import { expect, test } from "bun:test";
import { isAuthError } from "./sessions";

test("401 and not-logged-in texts are auth errors", () => {
	expect(isAuthError(new Error("HTTP 401"))).toBe(true);
	expect(isAuthError(new Error("Not logged in"))).toBe(true);
	expect(isAuthError("Unauthenticated")).toBe(true);
});

test("403 is auth only when the body says not logged in", () => {
	expect(isAuthError(new Error("HTTP 403"))).toBe(false);
	expect(isAuthError(new Error("HTTP 403 forbidden: blocked by rule"))).toBe(false);
	expect(isAuthError(new Error("HTTP 403 user is not logged in"))).toBe(true);
	expect(isAuthError(new Error("HTTP 403 unauthenticated"))).toBe(true);
});

test("other errors are not auth errors", () => {
	expect(isAuthError(new Error("HTTP 500"))).toBe(false);
});
