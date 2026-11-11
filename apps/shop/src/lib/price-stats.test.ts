import { expect, test } from "bun:test";
import { priceStats } from "./price-stats";

test("ignores zero, null and NaN", () => {
	const s = priceStats([0, null, Number.NaN, 100, 200, undefined]);
	expect(s?.count).toBe(2);
	expect(s?.min).toBe(100);
	expect(s?.max).toBe(200);
});

test("returns null without a usable price", () => {
	expect(priceStats([0, null])).toBeNull();
});

test("median and quartiles", () => {
	const s = priceStats([100, 200, 300, 400, 500])!;
	expect(s.median).toBe(300);
	expect(s.p25).toBe(200);
	expect(s.p75).toBe(400);
	expect(priceStats([100, 200, 300, 400])!.median).toBe(250);
});

test("buckets cover all prices and mark the peak", () => {
	const s = priceStats([100, 110, 120, 125, 130, 400, 1000])!;
	expect(s.buckets).toHaveLength(12);
	expect(s.buckets.reduce((a, b) => a + b.count, 0)).toBe(7);
	expect(s.buckets[11]!.count).toBe(1);
	expect(s.peak).toBe(0);
});

test("equal prices make one bucket", () => {
	const s = priceStats([500, 500])!;
	expect(s.buckets).toEqual([{ from: 500, to: 500, count: 2 }]);
	expect(s.median).toBe(500);
});
