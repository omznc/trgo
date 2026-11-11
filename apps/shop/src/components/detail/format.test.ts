import { expect, test } from "bun:test";
import { plural, timeAgo } from "./format";

const now = Date.parse("2026-11-11T12:00:00Z");
const ago = (days: number) => new Date(now - days * 86_400_000).toISOString();

test("formats the age in Bosnian", () => {
	expect(timeAgo(ago(0.5), now)).toBe("danas");
	expect(timeAgo(ago(1), now)).toBe("jučer");
	expect(timeAgo(ago(3), now)).toBe("prije 3 dana");
	expect(timeAgo(ago(14), now)).toBe("prije 2 sedmice");
	expect(timeAgo(ago(65), now)).toBe("prije 2 mjeseca");
	expect(timeAgo(ago(400), now)).toBe("prije 1 godinu");
	expect(timeAgo(undefined, now)).toBeUndefined();
	expect(timeAgo("nope", now)).toBeUndefined();
});

test("picks the plural form", () => {
	const f = { one: "pregled", few: "pregleda", other: "pregleda" };
	expect([1, 3, 11, 21].map((n) => plural(n, f))).toEqual(["pregled", "pregleda", "pregleda", "pregled"]);
});
