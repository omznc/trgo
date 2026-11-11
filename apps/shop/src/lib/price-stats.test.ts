import { expect, test } from "bun:test";
import { priceReport, priceStats } from "./price-stats";

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

const listing = (price: number, age: number, condition?: "new" | "used") =>
	({ price, condition, postedAt: new Date(NOW - age * 86_400_000).toISOString() }) as never;
const NOW = Date.parse("2026-11-11T12:00:00Z");

test("report: new/used medians need 5 per side, trend needs 15", () => {
	const recent = [700, 710, 720, 730, 740].map((p) => listing(p, 5, "used"));
	const older = [600, 610, 620, 630, 640].map((p) => listing(p, 60, "new"));
	const r = priceReport({ fetched: 40, listings: [...recent, ...older], windowDays: 90, dropped: { accessory: 3 } }, NOW)!;
	expect(r.usedMedian).toBe(720);
	expect(r.newMedian).toBe(620);
	expect(r.trendPct).toBeUndefined();
	expect(r.fetched).toBe(40);
	const many = (base: number, days: number) => Array.from({ length: 15 }, (_, i) => listing(base + i, days, "used"));
	const t = priceReport({ fetched: 30, listings: [...many(800, 5), ...many(700, 60)], windowDays: 90, dropped: {} }, NOW)!;
	expect(t.trendPct).toBe(14);
});

test("report: no trend or split with fewer than 5", () => {
	const r = priceReport({ fetched: 4, listings: [700, 710, 720, 730].map((p) => listing(p, 5, "used")), windowDays: 90, dropped: {} }, NOW)!;
	expect(r.usedMedian).toBeUndefined();
	expect(r.trendPct).toBeUndefined();
});
