import { describe, expect, test } from "bun:test";
import olxCities from "./fixtures/olx-cities.json";
import olxSearch from "./fixtures/olx-search.json";
import svexSearch from "./fixtures/svex-search.json";
import olxDetail from "./fixtures/olx-detail.json";
import svexDetail from "./fixtures/svex-detail.json";
import { listingIdFromUrl } from "../src/detail";
import { createOlxProvider, flattenOlxCities, htmlToText, mapOlxDetail, mapOlxItem, olxSearchParams } from "../src/olx";
import { searchAll } from "../src/search-all";
import { createSvexProvider, mapSvexDetail, mapSvexItem, svexSearchParams } from "../src/svex";
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
			page: undefined,
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

describe("listing detail", () => {
	test("maps an OLX detail and strips HTML", () => {
		const d = mapOlxDetail(olxDetail);
		expect(d).toMatchObject({ id: "73497222", city: "Tuzla", views: 111, seller: { name: "GameLand", type: "shop" } });
		expect(d.description).not.toMatch(/[<>]/);
		expect(d.description).toContain("\n");
		expect(d.imageUrls).toHaveLength(1);
		expect(d.attributes).toContainEqual({ name: "Original", value: "Da" });
		expect(d.postedAt).toBe(new Date(olxDetail.additional.created_at * 1000).toISOString());
	});

	test("htmlToText drops tags and decodes entities", () => {
		expect(htmlToText("<p>a &amp; b<script>x</script></p><p>&lt;i&gt;</p>")).toBe("a & bx\n<i>");
	});

	test("maps a SVEX detail", () => {
		const d = mapSvexDetail(svexDetail);
		expect(d).toMatchObject({ views: 1, seller: { name: "mesud_mesic10", type: "private" } });
		expect(d.imageUrls).toHaveLength(2);
		expect(d.attributes).toContainEqual({ name: "Vrsta opreme", value: "3d printer" });
		expect(d.description).toContain("Radni volumen");
	});

	test("reads the id from a listing URL", () => {
		expect(listingIdFromUrl("olx", "https://olx.ba/artikal/73497222")).toBe("73497222");
		expect(listingIdFromUrl("svex", `https://svex.ba/oglas/${svexDetail.id}-slug`)).toBe(svexDetail.id);
		expect(listingIdFromUrl("olx", "123")).toBe("123");
		expect(() => listingIdFromUrl("olx", "https://olx.ba/x")).toThrow();
	});
});

type Call = { url: URL };
function stubFetch(handler: (url: URL) => Response) {
	const calls: Call[] = [];
	const f = (async (url: string | URL) => {
		const u = new URL(String(url));
		calls.push({ url: u });
		return handler(u);
	}) as unknown as typeof fetch;
	return { f, calls };
}

const svexItem = (id: string) => ({ id, slug: id, title: id, price: "10" });

describe("svex condition groups", () => {
	// Each group returns as many items as the call asks for.
	const grouped = () =>
		stubFetch((u) => {
			const c = u.searchParams.get("condition")!;
			const n = Number(u.searchParams.get("limit"));
			return Response.json({ items: Array.from({ length: n }, (_, i) => svexItem(`${c}-${i}`)), total: 50 });
		});

	test("relevance asks each group for its share and interleaves the groups", async () => {
		const { f, calls } = grouped();
		const svex = createSvexProvider({ proxyUrl: "https://p.test", fetch: f });
		const res = await svex.search({ q: "x", condition: "used", limit: 6 });
		// ceil(6 / 3) + margin 2
		expect(calls.map((c) => c.url.searchParams.get("limit"))).toEqual(["4", "4", "4"]);
		expect(res.listings.map((l) => l.id)).toEqual([
			"used_excellent-0",
			"used_good-0",
			"used_fair-0",
			"used_excellent-1",
			"used_good-1",
			"used_fair-1",
		]);
	});

	test("a price sort still asks each group for the full limit", async () => {
		const { f, calls } = grouped();
		const svex = createSvexProvider({ proxyUrl: "https://p.test", fetch: f });
		await svex.search({ q: "x", condition: "new", limit: 6, sort: "price_asc" });
		expect(calls.map((c) => c.url.searchParams.get("limit"))).toEqual(["6", "6"]);
	});
});

describe("olx city list", () => {
	test("a failed city call is not cached", async () => {
		let cityCalls = 0;
		const { f } = stubFetch((u) => {
			if (u.pathname === "/olx/cities") return ++cityCalls === 1 ? new Response("no", { status: 500 }) : Response.json(olxCities);
			return Response.json(olxSearch);
		});
		const olx = createOlxProvider({ proxyUrl: "https://p.test", fetch: f });
		const first = await olx.search({ q: "x" });
		expect(first.listings[0]!.city).toBeUndefined();
		const second = await olx.search({ q: "x" });
		expect(cityCalls).toBe(2);
		expect(second.listings[0]!.city).toBe("Tuzla");
	});
});
