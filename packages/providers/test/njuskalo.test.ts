import { describe, expect, test } from "bun:test";
import { KP_RATE_LIMITED } from "../src/kp";
import { createNjuskaloProvider, NJUSKALO_CHECK, njuskaloIdFromUrl, njuskaloSearchParams, parseNjuskaloPrice, parseNjuskaloSearch } from "../src/njuskalo";

const html = await Bun.file(new URL("./fixtures/njuskalo-search.html", import.meta.url)).text();

// The fixture is one real page. Other pages come from it: the test edits the page data (the real site was behind a bot check).
const MARKER = "window.__INITIAL_STATE__=";
function withPageData(edit: (pageData: Record<string, any>) => void): string {
	const start = html.indexOf(MARKER) + MARKER.length;
	const end = html.indexOf("</script>", start);
	const state = JSON.parse(html.slice(start, end).trim().replace(/;$/, ""));
	edit(state.searchPage.pageData);
	return html.slice(0, start) + JSON.stringify(state) + html.slice(end);
}

describe("njuskalo parser", () => {
	const result = parseNjuskaloSearch(html);

	test("maps the first listing", () => {
		expect(result.listings[0] as unknown).toEqual({
			provider: "njuskalo",
			id: "49263022",
			title: "iPhone 16",
			price: 70,
			priceText: "70 €",
			currency: "EUR",
			condition: undefined, // "oštećeno / neispravno" has no match in the Listing type
			city: "Švarča - Karlovac",
			imageUrl: "https://www.njuskalo.hr/image-360x360c/iphone-16/iphone-16-slika-267056310.jpg",
			url: "https://www.njuskalo.hr/iphone-16/iphone-16-oglas-49263022",
			postedAt: "2026-11-09T09:00:01.000Z",
		});
	});

	test("reads the condition of a used and of a new listing", () => {
		const used = result.listings.find((l) => l.condition === "used");
		const fresh = result.listings.find((l) => l.condition === "new");
		expect(used).toBeDefined();
		expect(fresh?.id).toBe("52210744"); // a promoted ad: the condition is only in its highlights
	});

	test("puts promoted ads after the regular ones, once", () => {
		const ids = result.listings.map((l) => l.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids).toHaveLength(31);
		expect(ids.indexOf("52210744")).toBeGreaterThanOrEqual(25);
	});

	test("drops a promoted duplicate of a regular ad", () => {
		const page = withPageData((d) => d.promotedListings.push({ ...d.regularListings[1] }));
		expect(parseNjuskaloSearch(page).listings).toHaveLength(31);
	});

	test("reads the total and hasMore on page 1", () => {
		expect(result.total).toBe(17709);
		expect(result.hasMore).toBe(true);
	});

	test("hasMore is false on the last page", () => {
		const page = withPageData((d) => {
			d.fields.page = d.totalPageCount;
		});
		expect(parseNjuskaloSearch(page).hasMore).toBe(false);
	});

	test("returns an empty result", () => {
		const page = withPageData((d) => {
			d.regularListings = [];
			d.promotedListings = [];
			d.listingsCount = 0;
			d.totalPageCount = 0;
		});
		expect(parseNjuskaloSearch(page)).toEqual({ listings: [], total: 0, hasMore: false });
	});

	test("keeps a price on request without a price", () => {
		const page = withPageData((d) => {
			d.regularListings[0].isPriceOnRequest = true;
			d.regularListings[0].priceFormatted = null;
		});
		expect(parseNjuskaloSearch(page).listings[0]).toMatchObject({ price: null, priceText: "Po dogovoru" });
	});

	test("throws on a page without data", () => {
		expect(() => parseNjuskaloSearch("<html>captcha</html>")).toThrow(NJUSKALO_CHECK);
	});
});

describe("njuskalo price", () => {
	test("parses thousand separators and decimals", () => {
		expect(parseNjuskaloPrice("1.250 €")).toBe(1250);
		expect(parseNjuskaloPrice("1.250.000 €")).toBe(1250000);
		expect(parseNjuskaloPrice("1.250,50 €")).toBe(1250.5);
		expect(parseNjuskaloPrice("70 €")).toBe(70);
	});

	test("returns null for text that is not one price", () => {
		expect(parseNjuskaloPrice("100 € - 200 €")).toBeNull();
		expect(parseNjuskaloPrice("Po dogovoru")).toBeNull();
		expect(parseNjuskaloPrice(null)).toBeNull();
		expect(parseNjuskaloPrice("0 €")).toBeNull();
	});
});

describe("njuskalo url", () => {
	test("builds the params for each option", () => {
		expect(njuskaloSearchParams({ q: "iphone 12" }).toString()).toBe("keywords=iphone+12");
		const params = njuskaloSearchParams({ q: "x", minPrice: 100, maxPrice: 500, condition: "used", sort: "price_asc", page: 3 });
		expect(Object.fromEntries(params)).toEqual({
			keywords: "x",
			"price[min]": "100",
			"price[max]": "500",
			"condition[used]": "1",
			sort: "cheap",
			page: "3",
		});
		expect(njuskaloSearchParams({ q: "x", condition: "new" }).get("condition[new]")).toBe("1");
		expect(njuskaloSearchParams({ q: "x", sort: "newest" }).get("sort")).toBe("new");
		expect(njuskaloSearchParams({ q: "x", sort: "price_desc" }).get("sort")).toBe("expensive");
		const plain = njuskaloSearchParams({ q: "x", sort: "relevance", page: 1 });
		expect(plain.has("sort")).toBe(false);
		expect(plain.has("page")).toBe(false);
	});

	test("reads the id from a listing URL", () => {
		expect(njuskaloIdFromUrl("https://www.njuskalo.hr/iphone-16/iphone-16-oglas-49263022")).toBe("49263022");
		expect(njuskaloIdFromUrl("49263022")).toBe("49263022");
		expect(() => njuskaloIdFromUrl("https://www.njuskalo.hr/search/")).toThrow();
	});
});

describe("njuskalo provider", () => {
	test("calls the proxy path and passes the signal", async () => {
		const calls: { url: string; init?: RequestInit }[] = [];
		const provider = createNjuskaloProvider({
			proxyUrl: "https://proxy.test/",
			fetch: (async (url: string, init?: RequestInit) => {
				calls.push({ url: String(url), init });
				return new Response(html);
			}) as unknown as typeof fetch,
		});
		const controller = new AbortController();
		const res = await provider.search({ q: "iphone", maxPrice: 300, limit: 5, signal: controller.signal });
		expect(calls[0]!.url).toBe("https://proxy.test/njuskalo/search/?keywords=iphone&price%5Bmax%5D=300");
		expect(calls[0]!.init?.signal).toBe(controller.signal);
		expect(res.listings).toHaveLength(5);
		expect(res.hasMore).toBe(true);
	});

	test("maps HTTP errors to the errors the shop explains", async () => {
		const withStatus = (status: number) =>
			createNjuskaloProvider({
				proxyUrl: "https://proxy.test",
				fetch: (async () => new Response("no", { status })) as unknown as typeof fetch,
			}).search({ q: "x" });
		for (const status of [403, 502, 503]) await expect(withStatus(status)).rejects.toThrow(NJUSKALO_CHECK);
		await expect(withStatus(429)).rejects.toThrow(KP_RATE_LIMITED);
		await expect(withStatus(404)).rejects.toThrow(/404/);
	});
});
