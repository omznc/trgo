import { describe, expect, test } from "bun:test";
import olxCities from "./fixtures/olx-cities.json";
import olxSearch from "./fixtures/olx-search.json";
import svexSearch from "./fixtures/svex-search.json";
import { flattenOlxCities, mapOlxItem, olxSearchParams } from "../src/olx";
import { searchAll } from "../src/search-all";
import { mapSvexItem, svexSearchParams } from "../src/svex";
import type { Provider } from "../src/types";

describe("olx", () => {
	test("maps a real search item", () => {
		const cities = flattenOlxCities(olxCities);
		const listing = mapOlxItem(olxSearch.data[0]!, cities);
		expect(listing).toMatchObject({
			provider: "olx",
			id: "73497222",
			price: 79,
			priceText: "79 KM",
			condition: "new",
			city: "Tuzla",
			url: "https://olx.ba/artikal/73497222",
		});
		expect(listing.postedAt).toBe(new Date(olxSearch.data[0]!.date * 1000).toISOString());
	});

	test("hides a price that is not shown", () => {
		const item = { ...olxSearch.data[0]!, show_price: false };
		expect(mapOlxItem(item).price).toBeNull();
	});

	test("builds search params", () => {
		expect(olxSearchParams({ q: "ender", minPrice: 10, condition: "used", sort: "newest", limit: 5 })).toEqual({
			q: "ender",
			per_page: 5,
			price_from: 10,
			price_to: undefined,
			state: "used",
			sort_by: "created_at",
			sort_order: "desc",
		});
	});
});

describe("svex", () => {
	test("maps a real search item", () => {
		const listing = mapSvexItem(svexSearch.items[0]!);
		expect(listing).toMatchObject({
			provider: "svex",
			id: "80945785-7da9-4c30-a8cd-2c3d3dd41eec",
			price: 400,
			priceText: "400 KM",
			city: "Bihać",
			url: "https://svex.ba/oglas/80945785-7da9-4c30-a8cd-2c3d3dd41eec-3d-printer-creality-ender-3-pro-mvl3zvz17c49",
		});
	});

	test("maps query to SVEX params", () => {
		expect(svexSearchParams({ q: "x", maxPrice: 50, sort: "price_asc" }, "new_sealed")).toMatchObject({
			priceMax: 50,
			condition: "new_sealed",
			sort: "price_asc",
		});
	});
});

describe("searchAll", () => {
	const ok: Provider = {
		id: "olx",
		name: "ok",
		search: async () => ({ listings: [mapOlxItem(olxSearch.data[0]!)], total: 9 }),
		getListing: async () => {
			throw new Error("unused");
		},
	};
	const broken: Provider = {
		...ok,
		id: "svex",
		search: async () => {
			throw new Error("HTTP 502");
		},
	};

	test("keeps partial results and reports the error", async () => {
		const res = await searchAll([ok, broken], { q: "ender" });
		expect(res.listings).toHaveLength(1);
		expect(res.total).toBe(9);
		expect(res.errors).toEqual([{ provider: "svex", message: "HTTP 502" }]);
	});
});
