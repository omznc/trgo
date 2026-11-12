import { expect, test } from "bun:test";
import { POOL } from "@/lib/suggestions";
import { LOCALES } from ".";

// The typecheck finds a missing string key. It cannot find a missing suggestion, so this test does.
for (const [code, locale] of Object.entries(LOCALES)) {
	const { items, find } = locale.suggestions;

	test(`${code}: each suggestion has a translation that keeps the amount`, () => {
		expect(POOL.filter((p) => !items[p.en]).map((p) => p.en)).toEqual([]);
		expect(POOL.filter((p) => p.max && !items[p.en]?.includes(`${p.max} KM`)).map((p) => p.en)).toEqual([]);
	});

	test(`${code}: the placeholder cuts the first words of each search text`, () => {
		expect(POOL.filter((p) => p.kind === "search" && !find.test(items[p.en] ?? "")).map((p) => p.en)).toEqual([]);
	});
}
