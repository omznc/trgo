import { describe, expect, test } from "bun:test";
import type { Listing } from "@lagano/providers";
import { searchOutput } from "./agent";
import { type SearchCard, searchedOf, sortValue, summarizeSearch } from "./search-summary";

const NOW = Date.parse("2026-11-12T12:00:00Z");
const card = (i: number): SearchCard => ({
	provider: i % 2 ? "svex" : "olx",
	id: String(1000 + i),
	title: `Xbox Series S 512GB konzola sa dva kontrolera i garancijom ${i}`.padEnd(120, "x"),
	price: `${300 + i} KM`,
	value: 300 + i,
	city: "Sarajevo",
	url: `https://olx.ba/artikal/${1000 + i}`,
	imageUrl: `https://img.olx.ba/images/${i}/very/long/path/photo.jpg`,
	condition: "used",
	postedAt: new Date(NOW - i * 86_400_000).toISOString(),
});

test("model sees a short summary of 100 listings", () => {
	const listings = Array.from({ length: 100 }, (_, i) => card(i));
	const text = summarizeSearch({ total: 340, errors: [], listings }, NOW);
	expect(text).toContain("all 100 listings");
	expect(text).toContain("min 300, median 350, max 399");
	expect(text.match(/^- /gm)).toHaveLength(12);
	expect(text).toContain("olx:1000 | ");
	expect(text).toContain("| 3d");
	expect(text.length).toBeLessThan(JSON.stringify({ listings }).length / 10);
});

test("says so when nothing is found", () => {
	expect(summarizeSearch({ total: 0, errors: [{ provider: "svex" }], days: 90, listings: [] })).toContain("last 90 days");
});

const listing = (provider: "olx" | "svex" | "kp", currency: "BAM" | "RSD" | "EUR", price: number | null, id: string): Listing => ({ provider, id, title: `PS5 ${id}`, price, priceText: `${price} ${currency}`, currency, url: `https://x.test/${id}` });

describe("search output in one unit", () => {
	test("a KP mix of RSD and EUR gives one range in RSD", () => {
		// 117.2 RSD is 1 EUR. 11720 RSD and 100 EUR are the same price.
		const raw = { listings: [listing("kp", "RSD", 11720, "1"), listing("kp", "EUR", 100, "2"), listing("kp", "RSD", 23440, "3")], total: 3, errors: [] };
		const out = searchOutput(raw, ["kp"], { currency: "RSD", unit: "din" });
		expect(out.listings.map((c) => Math.round(c.value!))).toEqual([11720, 11720, 23440]);
		expect(out.listings[1]!.price).toBe("100 EUR");
		const text = summarizeSearch(out, NOW);
		expect(text).toContain("Price din: min 11720, median 11720, max 23440.");
		expect(text).toContain("(KP 3;");
	});

	test("OLX and KP give one range in EUR", () => {
		const raw = { listings: [listing("olx", "BAM", 195.583, "1"), listing("kp", "RSD", 23440, "2"), listing("kp", "EUR", 300, "3")], total: 3, errors: [] };
		const out = searchOutput(raw, ["olx", "kp"], { currency: "EUR", unit: "EUR" });
		expect(out.listings.map((c) => Math.round(c.value!))).toEqual([100, 200, 300]);
		const text = summarizeSearch(out, NOW);
		expect(text).toContain("Price EUR: min 100, median 200, max 300.");
		expect(text).toContain("(OLX 1, KP 2;");
		expect(out.unit).toBe("EUR");
	});

	test("a BA search keeps the raw values and lists OLX and SVEX", () => {
		const out = searchOutput({ listings: [listing("olx", "BAM", 50, "1")], total: 1, errors: [] }, ["olx", "svex"], { currency: "BAM", unit: "KM" });
		expect(out.listings[0]!.value).toBe(50);
		expect(summarizeSearch(out, NOW)).toContain("(OLX 1, SVEX 0;");
		expect(summarizeSearch(out, NOW)).not.toContain("KP");
	});

	test("a BA search keeps the fractions as main did", () => {
		const raw = { listings: [listing("olx", "BAM", 12.5, "1"), listing("olx", "BAM", 20, "2"), listing("svex", "BAM", 30.5, "3")], total: 3, errors: [] };
		const out = searchOutput(raw, ["olx", "svex"], { currency: "BAM", unit: "KM" });
		expect(summarizeSearch(out, NOW)).toContain("Price KM: min 12.5, median 20, max 30.5.");
	});
});

describe("sort value", () => {
	test("sorts by the number and puts a listing without a price last", () => {
		const cards = [
			{ price: "2.000 din", value: 17 },
			{ price: "Kontakt", value: null },
			{ price: "9 €", value: 9 },
		];
		expect([...cards].sort((a, b) => sortValue(a) - sortValue(b)).map((c) => c.price)).toEqual(["9 €", "2.000 din", "Kontakt"]);
	});

	test("a card saved before has no value: the text decides", () => {
		expect(sortValue({ price: "1.250 KM" })).toBe(1250);
	});
});

describe("searched providers", () => {
	test("an old output falls back to the providers it shows, or OLX and SVEX", () => {
		expect(searchedOf({ listings: [{ provider: "svex" }], errors: [{ provider: "olx" }] })).toEqual(["olx", "svex"]);
		expect(searchedOf({ listings: [{ provider: "svex" }], errors: [] })).toEqual(["svex"]);
		expect(searchedOf({ listings: [], errors: [] })).toEqual(["olx", "svex"]);
		expect(searchedOf({ searched: ["kp"], listings: [], errors: [] })).toEqual(["kp"]);
	});
});

describe("KP relay down", () => {
	test("the model text says that KP is not available", () => {
		const errors = [{ provider: "kp", message: "kp-unavailable" }];
		expect(summarizeSearch({ total: 0, errors, listings: [] })).toContain("KupujemProdajem.com (kp) is not available right now.");
		const text = summarizeSearch({ total: 1, errors: [...errors, { provider: "olx", message: "HTTP 500" }], listings: [card(1)] }, NOW);
		expect(text).toContain("KupujemProdajem.com (kp) is not available right now.");
		expect(text).toContain("Failed providers: olx.");
	});

	test("the model text says that KP has too many requests", () => {
		const errors = [{ provider: "kp", message: "kp-rate-limited" }];
		const text = summarizeSearch({ total: 0, errors, listings: [] });
		expect(text).toContain("KupujemProdajem.com (kp) has too many requests. Try again in a minute.");
		expect(text).not.toContain("Failed providers");
	});
});
