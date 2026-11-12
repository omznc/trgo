import { describe, expect, test } from "bun:test";
import { createOlxBgProvider, olxBgSearchParams, parseOlxBgSearch } from "../src/olxbg";

const reply = (await Bun.file(new URL("./fixtures/olxbg-search.json", import.meta.url)).json()) as Parameters<typeof parseOlxBgSearch>[0];

describe("olx.bg parser", () => {
	const result = parseOlxBgSearch(reply, { q: "iphone", limit: 40 });

	test("maps the first listing and fills the photo size", () => {
		expect(result.listings[0] as unknown).toEqual({
			provider: "olxbg",
			id: "149773178",
			title: "Iphone 15 256gb",
			price: 300,
			priceText: "300 €",
			currency: "EUR",
			condition: "used",
			city: "гр. София",
			imageUrl: "https://frankfurt.apollo.olxcdn.com:443/v1/files/48yadgeocp4q-BG/image;s=640x480",
			url: "https://www.olx.bg/d/ad/iphone-15-256gb-CID632-IDa8qQq.html",
			postedAt: "2026-11-12T08:40:01.000Z",
		});
	});

	test("drops a duplicate id", () => {
		expect(result.listings.map((l) => l.id)).toEqual(["149773178", "149766011", "149700001"]);
	});

	test("cuts the list to the limit", () => {
		expect(parseOlxBgSearch(reply, { q: "x", limit: 2 }).listings.map((l) => l.id)).toEqual(["149773178", "149766011"]);
	});

	test("gives no price for another currency, and keeps the label", () => {
		expect(result.listings[1]).toMatchObject({ price: null, priceText: "600 лв.", condition: "new", imageUrl: undefined });
	});

	test("gives no price for an ad with no price", () => {
		expect(result.listings[2]).toMatchObject({ price: null, priceText: "По договаряне" });
	});

	test("reads the total and hasMore", () => {
		expect(result.total).toBe(11672);
		expect(result.hasMore).toBe(true);
		expect(parseOlxBgSearch(reply, { q: "x", limit: 50, page: 20 }).hasMore).toBe(false);
	});
});

describe("olx.bg params", () => {
	test("builds the params for each option", () => {
		expect(olxBgSearchParams({ q: "x" })).toMatchObject({ query: "x", limit: 40, offset: 0, sort_by: undefined });
		expect(olxBgSearchParams({ q: "x", minPrice: 100, maxPrice: 500, condition: "used", sort: "newest", limit: 50, page: 3 })).toEqual({
			query: "x",
			limit: 50,
			offset: 100,
			"filter_float_price:from": 100,
			"filter_float_price:to": 500,
			"filter_enum_state[0]": "used",
			sort_by: "created_at:desc",
		});
		expect(olxBgSearchParams({ q: "x", sort: "price_asc" }).sort_by).toBe("filter_float_price:asc");
		expect(olxBgSearchParams({ q: "x", sort: "price_desc" }).sort_by).toBe("filter_float_price:desc");
	});
});

describe("olx.bg provider", () => {
	const make = (body: unknown, calls: string[] = []) => createOlxBgProvider({ proxyUrl: "https://proxy.test/", fetch: (async (url: URL) => (calls.push(String(url)), Response.json(body))) as unknown as typeof fetch });

	test("calls the proxy path", async () => {
		const calls: string[] = [];
		const res = await make(reply, calls).search({ q: "iphone", maxPrice: 300, limit: 40 });
		expect(calls[0]).toBe("https://proxy.test/olxbg/api/v1/offers/?query=iphone&limit=40&offset=0&filter_float_price%3Ato=300");
		expect(res.listings).toHaveLength(3);
	});

	test("returns an empty page past the offset cap without a request", async () => {
		const calls: string[] = [];
		expect(await make(reply, calls).search({ q: "x", limit: 50, page: 21 })).toEqual({ listings: [], total: 0, hasMore: false });
		expect(calls).toHaveLength(0);
	});

	test("fails on a HTTP error", async () => {
		const failing = createOlxBgProvider({ proxyUrl: "https://proxy.test", fetch: (async () => new Response("no", { status: 502 })) as unknown as typeof fetch });
		await expect(failing.search({ q: "x" })).rejects.toThrow(/502/);
	});
});
