import { describe, expect, test } from "bun:test";
import { KP_RATE_LIMITED } from "../src/kp";
import { createVintedHrProvider, parseVintedSearch, vintedSearchParams } from "../src/vinted";

const html = await Bun.file(new URL("./fixtures/vinted-search.html", import.meta.url)).text();

describe("vinted parser", () => {
	const result = parseVintedSearch("vintedhr", html);

	test("maps the first listing with the price of the seller", () => {
		expect(result.listings[0] as unknown).toEqual({
			provider: "vintedhr",
			id: "10950346883",
			title: "Creality Ender-3 V3 KE 3D printer",
			price: 290,
			priceText: "290.00 EUR",
			currency: "EUR",
			condition: "used",
			imageUrl: "https://images1.vinted.net/t/05_0011e_Ait7Z6f1bdDCHNKaBXtmWRX4/310x430/599a0c8b.webp?s=7ec775c1375fb32b1966700a14f27d1cc418611f",
			url: "https://www.vinted.hr/items/10950346883-creality-ender-3-v3-ke-3d-printer",
		});
	});

	test("reads the condition at the end of the line", () => {
		expect(result.listings.map((l) => l.condition)).toEqual(["used", "used", "new", "used"]);
	});

	test("reads the total and hasMore", () => {
		expect(result.listings).toHaveLength(4);
		expect(result.total).toBe(960);
		expect(result.hasMore).toBe(true);
	});

	test("uses the domain of the provider in the url", () => {
		expect(parseVintedSearch("vintedat", html).listings[0]?.url).toStartWith("https://www.vinted.at/items/");
	});

	test("throws on a page without data", () => {
		expect(() => parseVintedSearch("vintedhr", "<html>captcha</html>")).toThrow("no data");
		expect(() => parseVintedSearch("vintedhr", html.replaceAll("pagination", "x"))).toThrow("no data");
	});
});

describe("vinted params", () => {
	test("builds the params for each option", () => {
		expect(vintedSearchParams({ q: "ender 3" }).toString()).toBe("search_text=ender+3");
		const all = vintedSearchParams({ q: "x", minPrice: 100, maxPrice: 500, condition: "used", sort: "price_desc", page: 3 });
		expect(all.get("price_from")).toBe("100");
		expect(all.get("price_to")).toBe("500");
		expect(all.get("order")).toBe("price_high_to_low");
		expect(all.getAll("status_ids[]")).toEqual(["2", "3", "4"]);
		expect(all.get("page")).toBe("3");
		expect(vintedSearchParams({ q: "x", condition: "new" }).getAll("status_ids[]")).toEqual(["6", "1"]);
		expect(vintedSearchParams({ q: "x", sort: "newest" }).get("order")).toBe("newest_first");
		expect(vintedSearchParams({ q: "x", sort: "price_asc" }).get("order")).toBe("price_low_to_high");
		const plain = vintedSearchParams({ q: "x", sort: "relevance", page: 1 });
		expect(plain.has("order")).toBe(false);
		expect(plain.has("page")).toBe(false);
	});
});

describe("vinted provider", () => {
	const make = (response: () => Response, calls: string[] = []) => createVintedHrProvider({ proxyUrl: "https://proxy.test/", fetch: (async (url: string) => (calls.push(url), response())) as unknown as typeof fetch });

	test("calls the proxy path and cuts to the limit", async () => {
		const calls: string[] = [];
		const res = await make(() => new Response(html), calls).search({ q: "ender", maxPrice: 300, limit: 2 });
		expect(calls[0]).toBe("https://proxy.test/vintedhr/catalog?search_text=ender&price_to=300");
		expect(res.listings).toHaveLength(2);
	});

	test("maps HTTP errors", async () => {
		await expect(make(() => new Response("no", { status: 429 })).search({ q: "x" })).rejects.toThrow(KP_RATE_LIMITED);
		for (const status of [403, 503]) await expect(make(() => new Response("no", { status })).search({ q: "x" })).rejects.toThrow(`HTTP ${status}`);
	});
});
