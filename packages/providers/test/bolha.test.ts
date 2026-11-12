import { describe, expect, test } from "bun:test";
import { createBolhaProvider } from "../src/bolha";
import { KP_RATE_LIMITED } from "../src/kp";
import { NJUSKALO_CHECK } from "../src/njuskalo";

const html = await Bun.file(new URL("./fixtures/bolha-search.html", import.meta.url)).text();

const provider = (fetch: (url: string, init?: RequestInit) => Promise<Response>) => createBolhaProvider({ proxyUrl: "https://proxy.test/", fetch: fetch as unknown as typeof globalThis.fetch });

describe("bolha provider", () => {
	test("maps the ads and drops the promoted duplicate", async () => {
		const res = await provider(async () => new Response(html)).search({ q: "iphone" });
		expect(res.listings.map((l) => l.id)).toEqual(["16628626", "16700001", "16700002"]);
		expect(res.listings[0] as unknown).toEqual({
			provider: "bolha",
			id: "16628626",
			title: "iPhone 14",
			price: 330,
			priceText: "330 €",
			currency: "EUR",
			condition: "used",
			city: "Grajena - Ptuj",
			imageUrl: "https://www.bolha.com/image-360x360c/apple-iphone/iphone-14-slika-63531258.jpg",
			url: "https://www.bolha.com/apple-iphone/iphone-14-oglas-16628626",
			postedAt: "2026-10-27T14:54:33.000Z",
		});
		expect(res.total).toBe(1602);
		expect(res.hasMore).toBe(true);
	});

	test("keeps a price on request without a price, and drops the empty image", async () => {
		const { listings } = await provider(async () => new Response(html)).search({ q: "iphone" });
		expect(listings[1]).toMatchObject({ price: null, priceText: "Po dogovoru", condition: "new", imageUrl: undefined });
		expect(listings[2]).toMatchObject({ price: 1129.99, condition: undefined });
	});

	test("calls the bolha proxy path with the params", async () => {
		const calls: string[] = [];
		const res = await provider(async (url) => (calls.push(url), new Response(html))).search({ q: "iphone", minPrice: 100, maxPrice: 300, condition: "new", sort: "price_asc", page: 2, limit: 2 });
		expect(calls[0]).toBe("https://proxy.test/bolha/search/?keywords=iphone&price%5Bmin%5D=100&price%5Bmax%5D=300&condition%5Bnew%5D=1&sort=cheap&page=2");
		expect(res.listings).toHaveLength(2);
	});

	test("never asks for the extension check", async () => {
		const withStatus = (status: number) => provider(async () => new Response("no", { status })).search({ q: "x" });
		for (const status of [403, 502, 503]) await expect(withStatus(status)).rejects.toThrow(new RegExp(`/bolha/search/.*HTTP ${status}`));
		await expect(provider(async () => new Response("<html>captcha</html>")).search({ q: "x" })).rejects.toThrow("bolha search page has no data");
		await expect(withStatus(429)).rejects.toThrow(KP_RATE_LIMITED);
		for (const status of [403, 503]) await expect(withStatus(status)).rejects.not.toThrow(NJUSKALO_CHECK);
	});
});
