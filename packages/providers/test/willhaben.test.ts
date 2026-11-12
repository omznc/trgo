import { describe, expect, test } from "bun:test";
import { KP_RATE_LIMITED } from "../src/kp";
import { createWillhabenProvider, parseWillhabenSearch, willhabenSearchParams } from "../src/willhaben";

const html = await Bun.file(new URL("./fixtures/willhaben-search.html", import.meta.url)).text();

describe("willhaben parser", () => {
	const result = parseWillhabenSearch(html);

	test("maps the first listing", () => {
		expect(result.listings[0] as unknown).toEqual({
			provider: "willhaben",
			id: "1233793216",
			title: "Apple iPhone 18 Pro Max 256 GB, nagelneu",
			price: 1389,
			priceText: "€ 1.389",
			currency: "EUR",
			condition: undefined,
			city: "Wien, 05. Bezirk, Margareten",
			imageUrl: "https://cache.willhaben.at/mmo/6/123/379/3216_1468940332_hoved.jpg",
			url: "https://www.willhaben.at/iad/kaufen-und-verkaufen/d/apple-iphone-18-pro-max-256-gb-nagelneu-1233793216/",
			postedAt: "2026-11-12T14:32:20Z",
		});
	});

	test("falls back to the MMO image path", () => {
		expect(result.listings[1]?.imageUrl).toBe("https://cache.willhaben.at/mmo/1/233/793/3217_1.jpg");
	});

	test("keeps an ad without a price", () => {
		expect(result.listings[2]).toMatchObject({ price: null, priceText: "Preis auf Anfrage", imageUrl: undefined, postedAt: undefined });
	});

	test("reads the total and hasMore", () => {
		expect(result.total).toBe(33316);
		expect(result.hasMore).toBe(true);
	});

	test("throws on a page without data", () => {
		expect(() => parseWillhabenSearch("<html>captcha</html>")).toThrow("no data");
		expect(() => parseWillhabenSearch('<script id="__NEXT_DATA__" type="application/json">{bad</script>')).toThrow("no data");
	});
});

describe("willhaben params", () => {
	test("builds the params for each option", () => {
		expect(willhabenSearchParams({ q: "iphone 12" }).toString()).toBe("keyword=iphone+12&rows=30");
		expect(Object.fromEntries(willhabenSearchParams({ q: "x", minPrice: 100, maxPrice: 500, condition: "used", sort: "price_desc", page: 3 }))).toEqual({
			keyword: "x",
			rows: "30",
			PRICE_FROM: "100",
			PRICE_TO: "500",
			treeAttributes: "23",
			sort: "4",
			page: "3",
		});
		expect(willhabenSearchParams({ q: "x", condition: "new" }).get("treeAttributes")).toBe("22");
		expect(willhabenSearchParams({ q: "x", sort: "newest" }).get("sort")).toBe("1");
		expect(willhabenSearchParams({ q: "x", sort: "price_asc" }).get("sort")).toBe("3");
		const plain = willhabenSearchParams({ q: "x", sort: "relevance", page: 1 });
		expect(plain.has("sort")).toBe(false);
		expect(plain.has("page")).toBe(false);
	});
});

describe("willhaben provider", () => {
	const make = (response: () => Response, calls: string[] = []) => createWillhabenProvider({ proxyUrl: "https://proxy.test/", fetch: (async (url: string) => (calls.push(url), response())) as unknown as typeof fetch });

	test("calls the proxy path and cuts to the limit", async () => {
		const calls: string[] = [];
		const res = await make(() => new Response(html), calls).search({ q: "iphone", maxPrice: 300, limit: 2 });
		expect(calls[0]).toBe("https://proxy.test/willhaben/iad/kaufen-und-verkaufen/marktplatz?keyword=iphone&rows=30&PRICE_TO=300");
		expect(res.listings).toHaveLength(2);
	});

	test("maps HTTP errors", async () => {
		await expect(make(() => new Response("no", { status: 429 })).search({ q: "x" })).rejects.toThrow(KP_RATE_LIMITED);
		for (const status of [403, 503]) await expect(make(() => new Response("no", { status })).search({ q: "x" })).rejects.toThrow(`HTTP ${status}`);
	});
});
