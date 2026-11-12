import { describe, expect, test } from "bun:test";
import { rejectTitle } from "../src/price-filter";
import { fetchRecent, selectComparable, trimOutliers } from "../src/price-sample";
import type { Listing, Provider } from "../src/types";
import titles from "./fixtures/price-titles.json";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
let n = 0;
const make = (title: string, price: number | null, age = 1, extra: Partial<Listing> = {}): Listing => ({
	provider: "olx",
	id: String(++n),
	title,
	price,
	priceText: String(price),
	currency: "BAM",
	url: `https://olx.ba/artikal/${n}`,
	postedAt: daysAgo(age),
	...extra,
});

describe("rejectTitle", () => {
	test.each(titles.ps5.kept)("keeps %s", (title) => {
		expect(rejectTitle(title, { query: "ps5" })).toBeNull();
	});
	test.each(Object.entries(titles.ps5.rejected))("rejects %s", (title, reason) => {
		expect(rejectTitle(title, { query: "ps5" })).toBe(reason as never);
	});
	test("keeps a variant when the query names it", () => {
		expect(rejectTitle("PlayStation 5 Pro 2TB", { query: "ps5 pro" })).toBeNull();
	});
	test("keeps slim, drops it with exclude", () => {
		expect(rejectTitle("PS5 slim 1TB", { query: "ps5" })).toBeNull();
		expect(rejectTitle("PS5 slim 1TB", { query: "ps5", exclude: ["slim"] })).toBe("excluded");
	});
	test("applies mustInclude", () => {
		expect(rejectTitle("PS5 digital", { query: "ps5", mustInclude: ["disc"] })).toBe("mismatch");
	});
	test("iPhone 13 drops pro, mini and other models", () => {
		const q = { query: "iphone 13" };
		expect(rejectTitle("iPhone 13 128GB crni", q)).toBeNull();
		expect(rejectTitle("Iphone13 Pro Max", q)).toBe("variant");
		expect(rejectTitle("iPhone 13 mini", q)).toBe("variant");
		expect(rejectTitle("iPhone 12 128GB", q)).toBe("mismatch");
		expect(rejectTitle("Maska za iPhone 13", q)).toBe("accessory");
	});
});

describe("trimOutliers", () => {
	test("drops a far price on both sides", () => {
		const prices = [700, 720, 740, 750, 760, 780, 800, 820, 850, 9000, 20];
		const kept = trimOutliers(prices.map((p) => make("x", p))).map((l) => l.price);
		expect(kept).not.toContain(9000);
		expect(kept).not.toContain(20);
		expect(kept).toHaveLength(9);
	});
	test("keeps a small sample", () => {
		expect(trimOutliers([make("x", 1), make("x", 5000)])).toHaveLength(2);
	});
});

describe("selectComparable", () => {
	// The age is part of the title, so batches do not make cross-posts.
	const batch = (count: number, age: number) =>
		Array.from({ length: count }, (_, i) => make(`PS5 konzola ${i} ${age}`, 700 + i, age));
	test("uses exactly the given days, even with few listings", () => {
		const s = selectComparable([...batch(3, 10), ...batch(20, 150)], { query: "ps5", now: NOW, days: 90 });
		expect(s.windowDays).toBe(90);
		expect(s.listings).toHaveLength(3);
	});
	test("uses 90 days when enough listings are in it", () => {
		const s = selectComparable([...batch(20, 10), ...batch(5, 200)], { query: "ps5", now: NOW });
		expect(s.windowDays).toBe(90);
		expect(s.listings).toHaveLength(20);
		expect(s.dropped.old).toBe(5);
	});
	test("widens to 180, then 365", () => {
		expect(selectComparable([...batch(5, 10), ...batch(12, 150)], { query: "ps5", now: NOW }).windowDays).toBe(180);
		const s = selectComparable([...batch(5, 10), ...batch(12, 300), ...batch(3, 500)], { query: "ps5", now: NOW });
		expect(s.windowDays).toBe(365);
		expect(s.listings).toHaveLength(17);
	});
	test("a listing without a date counts as old", () => {
		const s = selectComparable([make("PS5 konzola", 700, 1, { postedAt: undefined })], { query: "ps5", now: NOW });
		expect(s.listings).toHaveLength(0);
	});
	test("drops bad prices and cross-posts", () => {
		const s = selectComparable(
			[
				make("PS5 konzola", 0),
				make("PS5 konzola", null),
				make("PS5 konzola", 3),
				make("PS5 konzola", 700),
				make("ps5  KONZOLA", 700, 2, { provider: "svex" }),
			],
			{ query: "ps5", now: NOW },
		);
		expect(s.dropped).toMatchObject({ price: 3, duplicate: 1 });
		expect(s.listings).toHaveLength(1);
	});
	test("filters by condition", () => {
		const s = selectComparable([make("PS5 konzola", 700, 1, { condition: "new" }), make("PS5 konzola 2", 600)], {
			query: "ps5",
			condition: "used",
			now: NOW,
		});
		expect(s.dropped.condition).toBe(2);
	});
});

describe("fetchRecent", () => {
	const fake = (id: "olx" | "svex" | "kp", size: number, pages: number[]): Provider & { calls: number[] } => {
		const calls: number[] = [];
		return {
			id,
			name: id,
			calls,
			getListing: () => Promise.reject(new Error("unused")),
			async search(q) {
				calls.push(q.page ?? 1);
				const count = pages[(q.page ?? 1) - 1] ?? 0;
				return { total: 999, listings: Array.from({ length: count }, () => make("PS5", 700)).slice(0, size) };
			},
		};
	};
	test("pages until a short page and reports progress", async () => {
		const olx = fake("olx", 200, [200, 200, 50]);
		const seen: number[] = [];
		const { listings, errors } = await fetchRecent([olx], "ps5", { now: NOW, onProgress: (c) => seen.push(c) });
		expect(listings).toHaveLength(450);
		expect(olx.calls).toEqual([1, 2, 3]);
		expect(errors).toEqual([]);
		expect(seen.at(-1)).toBe(450);
	});
	test("uses hasMore over the page size, and falls back to a short page", async () => {
		const withMore = (hasMore: (page: number) => boolean | undefined) => {
			const calls: number[] = [];
			const p: Provider = {
				...fake("olx", 200, []),
				async search(q) {
					calls.push(q.page ?? 1);
					return { total: 999, listings: Array.from({ length: 200 }, () => make("PS5", 700)), hasMore: hasMore(q.page ?? 1) };
				},
			};
			return { p, calls };
		};
		// Full pages, but the server says page 2 is the last.
		const stops = withMore((page) => page < 2);
		await fetchRecent([stops.p], "ps5", { now: NOW });
		expect(stops.calls).toEqual([1, 2]);
		// Full pages and no paging data: the short page rule finds no end, so it runs to perProvider (600 / 200).
		const unknown = withMore(() => undefined);
		await fetchRecent([unknown.p], "ps5", { now: NOW });
		expect(unknown.calls).toEqual([1, 2, 3]);
	});
	test("keeps earlier pages when a later page fails, and stops paging", async () => {
		const calls: number[] = [];
		const flaky: Provider = {
			...fake("olx", 200, []),
			async search(q) {
				calls.push(q.page ?? 1);
				if (q.page === 2) throw new Error("boom");
				return { total: 999, listings: Array.from({ length: 200 }, () => make("PS5", 700)) };
			},
		};
		const { listings, errors, partial } = await fetchRecent([flaky], "ps5", { now: NOW, concurrency: 1, perProvider: 1000 });
		expect(listings).toHaveLength(200);
		expect(calls).toEqual([1, 2]);
		expect(errors).toEqual([]);
		expect(partial).toEqual(["olx"]);
		// In one parallel batch, the page that worked stays.
		const same = await fetchRecent([flaky], "ps5", { now: NOW, concurrency: 2, perProvider: 1000 });
		expect(same.listings).toHaveLength(200);
		expect(same.partial).toEqual(["olx"]);
	});
	test("a provider with a sample limit loads fewer pages", async () => {
		const kp = fake("kp", 30, Array.from({ length: 20 }, () => 30));
		const { listings } = await fetchRecent([kp], "ps5", { now: NOW });
		expect(kp.calls).toEqual([1, 2, 3, 4, 5]);
		expect(listings).toHaveLength(150);
	});
	test("a failing provider does not stop the other", async () => {
		const bad: Provider = { ...fake("svex", 100, []), search: () => Promise.reject(new Error("down")) };
		const { listings, errors } = await fetchRecent([bad, fake("olx", 200, [10])], "ps5", { now: NOW });
		expect(listings).toHaveLength(10);
		expect(errors).toEqual(["svex"]);
	});
});
