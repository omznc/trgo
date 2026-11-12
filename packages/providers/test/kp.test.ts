import { describe, expect, test } from "bun:test";
import { createKpProvider, kpPostedAt, kpSearchPath, parseKpSearch } from "../src/kp";
import { listingIdFromUrl } from "../src/detail";

const fixture = (name: string) => Bun.file(new URL(`./fixtures/${name}.html`, import.meta.url)).text();

// A fetch that serves one fixture and keeps the request.
const serve = (html: string) => {
	const calls: { url: string; init?: RequestInit }[] = [];
	const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
		calls.push({ url: String(url), init });
		return new Response(html);
	}) as typeof globalThis.fetch;
	return { calls, provider: createKpProvider({ proxyUrl: "https://p.test/", fetch }) };
};

describe("kp search page", () => {
	test("maps the first listing", async () => {
		const { listings, total, hasMore } = parseKpSearch(await fixture("kp-search"));
		expect(listings).toHaveLength(30);
		expect(total).toBe(1124);
		expect(hasMore).toBe(true);
		expect(listings[0]).toEqual({
			provider: "kp",
			id: "162491887",
			title: "Pumpica za izmuzanje izmlazanje mleka električna dve flašice",
			price: 2190,
			priceText: "2.190 din",
			currency: "RSD",
			condition: "new",
			city: "Beograd",
			imageUrl: "https://images.kupujemprodajem.com/photos/oglasi/7/88/162491887/162491887_68a7009dc12c66-55224557af6bc2fa-314c-4.webp",
			url: "https://www.kupujemprodajem.com/mama-i-beba/oprema-za-hranjenje-i-dojenje/pumpica-za-izmuzanje-izmlazanje-mleka-elektricna-dve-flasice/oglas/162491887",
			postedAt: "2026-11-07T19:02:07.000Z",
		});
	});

	test("keeps the EUR currency and maps the used condition", async () => {
		const { listings } = parseKpSearch(await fixture("kp-search"));
		expect(listings[1]).toMatchObject({ price: 8, currency: "EUR", priceText: "8 €", condition: "used", city: "Niš", postedAt: "2026-11-11T23:02:22.000Z" });
		// "as-new" is second hand.
		expect(listings[2]).toMatchObject({ condition: "used" });
	});

	test("keeps an ad without a price", async () => {
		const { listings } = parseKpSearch(await fixture("kp-search-page2"));
		expect(listings.find((l) => l.id === "185999019")).toMatchObject({ price: null, priceText: "Kontakt", currency: "RSD" });
	});

	test("reads page 2 and the filtered page", async () => {
		const page2 = parseKpSearch(await fixture("kp-search-page2"));
		expect(page2.hasMore).toBe(true);
		expect(page2.listings[0]!.id).toBe("179449610");
		const filtered = parseKpSearch(await fixture("kp-search-filtered"));
		expect(filtered.total).toBe(131);
		expect(filtered.listings.every((l) => l.condition === "new" && l.price! >= 500 && l.price! <= 3000)).toBe(true);
	});

	test("an empty result has no listings and no more pages", async () => {
		expect(parseKpSearch(await fixture("kp-search-empty"))).toEqual({ listings: [], total: 0, hasMore: false });
	});

	test("a page without search data throws", () => {
		expect(() => parseKpSearch("<html></html>")).toThrow("no search data");
	});

	test("postedAt follows the summer and winter offset of Belgrade", () => {
		expect(kpPostedAt("2026-07-01 12:00:00")).toBe("2026-07-01T10:00:00.000Z");
		expect(kpPostedAt("2026-12-01 12:00:00")).toBe("2026-12-01T11:00:00.000Z");
		expect(kpPostedAt(undefined)).toBeUndefined();
		expect(kpPostedAt("pre 5 dana")).toBeUndefined();
	});
});

describe("kp query", () => {
	test("a plain search sends only the keywords", () => {
		expect(kpSearchPath({ q: "dečji bicikl" })).toBe("/kp/pretraga?keywords=de%C4%8Dji%20bicikl");
	});

	test("maps each option to its parameter", () => {
		const path = kpSearchPath({ q: "mleko", minPrice: 500, maxPrice: 3000, condition: "new", sort: "price_asc", page: 3 });
		expect(path).toBe("/kp/pretraga?keywords=mleko&page=3&order=price%20asc&condition=new&priceFrom=500&priceTo=3000&currency=rsd");
		expect(kpSearchPath({ q: "x", sort: "newest" })).toContain("order=posted%20desc");
		expect(kpSearchPath({ q: "x", sort: "price_desc" })).toContain("order=price%20desc");
		expect(kpSearchPath({ q: "x", sort: "relevance", page: 1 })).toBe("/kp/pretraga?keywords=x");
	});

	test("sends the currency only with a price", () => {
		expect(kpSearchPath({ q: "x", maxPrice: 100 })).toContain("priceTo=100&currency=rsd");
		expect(kpSearchPath({ q: "x", condition: "used" })).not.toContain("currency");
	});
});

describe("kp provider", () => {
	test("calls the proxy path and passes the signal", async () => {
		const { calls, provider } = serve(await fixture("kp-search"));
		const signal = new AbortController().signal;
		const res = await provider.search({ q: "mleko", page: 2, signal });
		expect(calls[0]!.url).toBe("https://p.test/kp/pretraga?keywords=mleko&page=2");
		expect(calls[0]!.init?.signal).toBe(signal);
		expect(res.listings).toHaveLength(30);
	});

	test("limit trims the page", async () => {
		const { provider } = serve(await fixture("kp-search"));
		expect((await provider.search({ q: "mleko", limit: 5 })).listings).toHaveLength(5);
	});

	test("a 503 from the proxy throws kp-unavailable", async () => {
		const provider = createKpProvider({ proxyUrl: "https://p.test", fetch: (async () => Response.json({ error: "kp-unavailable" }, { status: 503 })) as unknown as typeof fetch });
		await expect(provider.search({ q: "x" })).rejects.toThrow("kp-unavailable");
	});

	test("an HTTP error throws", async () => {
		const provider = createKpProvider({ proxyUrl: "https://p.test", fetch: (async () => new Response("no", { status: 502 })) as unknown as typeof fetch });
		await expect(provider.search({ q: "x" })).rejects.toThrow("HTTP 502");
	});

	test("the detail is not supported yet", async () => {
		await expect(serve("").provider.getListing("1")).rejects.toThrow("not supported yet");
		expect(listingIdFromUrl("kp", "https://www.kupujemprodajem.com/a/b/oglas/162491887")).toBe("162491887");
	});
});
