import { expect, test } from "bun:test";
import { POOL, pickSuggestions, placeholderOf } from "./suggestions";

test("returns one prompt of each type", () => {
	for (let m = 1; m <= 12; m++) expect(pickSuggestions(m).map((p) => p.kind)).toEqual(["search", "price", "sell"]);
});

test("season filter hides out-of-season prompts", () => {
	for (let i = 0; i < 200; i++) {
		for (const p of pickSuggestions(7)) expect(!p.months || p.months.includes(7)).toBe(true);
	}
	expect(POOL.some((p) => p.months?.includes(7))).toBe(true);
});

test("winter prompts can show in January", () => {
	const seen = new Set<string>();
	for (let i = 0; i < 500; i++) for (const p of pickSuggestions(1)) if (p.months) seen.add(p.text);
	expect(seen.size).toBeGreaterThan(0);
});

test("no duplicate prompt texts in the pool", () => {
	const texts = POOL.map((p) => p.text);
	expect(new Set(texts).size).toBe(texts.length);
});

test("placeholder cuts the verb", () => {
	const p = POOL.find((x) => x.kind === "search");
	expect(placeholderOf(p!).startsWith("Npr. ")).toBe(true);
	expect(placeholderOf(p!)).not.toContain("Nađi");
});
