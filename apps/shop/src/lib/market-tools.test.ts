import { describe, expect, test } from "bun:test";
import { PROVIDERS, type Listing, type Provider, type SearchQuery, type Table } from "@lagano/providers";
import { buildTools } from "./agent";
import { runPriceCheck } from "./price-check";
import { toolProviders } from "./tool-gate";

const none = { search: false, detail: false, priceCheck: false, mine: false, publish: false, edit: false };
// A fake search-only provider in Croatia.
const fakehr = { id: "fakehr", name: "Fake", siteName: "fake.hr", site: "https://fake.hr", country: "HR", currency: "EUR", currencyLabel: "EUR", searchLanguage: "hr", searchLanguageName: "Croatian", capabilities: { ...none, search: true, priceCheck: true } } as const;
const WITH_BA: Table = { ...PROVIDERS, fakehr };
const ONLY_FAKE: Table = { fakehr };

const accepts = (schema: unknown, value: unknown) => (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse(value).success;

describe("capability gating", () => {
	test("a search-only provider gets no publish, edit or list tool", () => {
		expect(Object.keys(buildTools(["fakehr"], ONLY_FAKE))).toEqual(["search_listings", "price_check"]);
		expect(toolProviders(["fakehr"], ONLY_FAKE)).toEqual({ search: ["fakehr"], priceCheck: ["fakehr"], publish: [], edit: [], mine: [] });
	});

	test("the account tools never list the search-only provider", () => {
		const tools = buildTools(["fakehr"], WITH_BA);
		expect(Object.keys(tools)).toHaveLength(5);
		const post = { title: "A long title", description: "d", price: 5, condition: "new", categoryHint: "x", city: "Y", photoIds: ["p"] };
		expect(accepts(tools.create_listing!.inputSchema, { ...post, providers: ["olx"] })).toBe(true);
		expect(accepts(tools.create_listing!.inputSchema, { ...post, providers: ["fakehr"] })).toBe(false);
		expect(accepts(tools.edit_my_listing!.inputSchema, { provider: "fakehr", id: "1", action: "hide" })).toBe(false);
	});

	test("search and price check follow the market selection", () => {
		expect(toolProviders(["olx"], WITH_BA).search).toEqual(["olx"]);
		expect(toolProviders(["fakehr"], WITH_BA).priceCheck).toEqual(["fakehr"]);
		expect(toolProviders(["olx", "fakehr"], WITH_BA).publish).toEqual(["olx", "svex"]);
	});

	test("a tool schema takes only the selected search sites", () => {
		const search = buildTools(["olx", "fakehr"], WITH_BA).search_listings!.inputSchema;
		expect(accepts(search, { q: "x", providers: ["fakehr"] })).toBe(true);
		expect(accepts(search, { q: "x", providers: ["svex"] })).toBe(false);
	});
});

describe("price check currency", () => {
	const now = new Date().toISOString();
	const listing = (provider: "olx" | "svex", currency: "BAM" | "EUR", price: number, n: number): Listing => ({ provider, id: `${provider}${n}`, title: `ps5 ${provider} ${n}`, price, priceText: String(price), currency, url: "https://x.test", postedAt: now });
	const stub = (id: "olx" | "svex", currency: "BAM" | "EUR", price: number, seen: SearchQuery[]): Provider => ({
		id,
		name: id,
		getListing: async () => ({}) as never,
		search: async (q) => {
			seen.push(q);
			return { listings: q.page === 1 ? Array.from({ length: 10 }, (_, i) => listing(id, currency, price, i)) : [], total: 10, hasMore: false };
		},
	});
	// Here SVEX stands for a provider that sells in EUR.
	const table: Table = { ...PROVIDERS, svex: { ...PROVIDERS.svex, currency: "EUR", currencyLabel: "EUR" } };

	test("mixed BAM and EUR listings give one median in EUR", async () => {
		const seen: SearchQuery[] = [];
		// 586.749 BAM is 300 EUR. A median over the raw numbers would be about 443.
		const providers = [stub("olx", "BAM", 586.749, seen), stub("svex", "EUR", 300, seen)];
		let last: Awaited<ReturnType<ReturnType<typeof runPriceCheck>["next"]>>["value"];
		for await (const out of runPriceCheck({ item: "PS5", query: "ps5", minPrice: 100, maxPrice: 1000 }, providers, { currency: "EUR", label: "EUR" }, undefined, table)) last = out;
		const out = last as { report: { stats: { median: number; count: number } }; label: string };
		expect(out.label).toBe("EUR");
		expect(out.report.stats.count).toBe(20);
		expect(out.report.stats.median).toBeCloseTo(300, 1);
		// The EUR limits reach OLX in BAM and SVEX in EUR.
		expect(seen.find((q) => q.maxPrice === 1956)?.minPrice).toBe(196);
		expect(seen.find((q) => q.maxPrice === 1000)?.minPrice).toBe(100);
	});

	test("the result lists a provider that lost a page", async () => {
		const flaky: Provider = {
			...stub("olx", "BAM", 300, []),
			search: async (q) => {
				if (q.page === 2) throw new Error("down");
				return { listings: Array.from({ length: 10 }, (_, i) => listing("olx", "BAM", 300, i)), total: 99, hasMore: true };
			},
		};
		let last: unknown;
		for await (const out of runPriceCheck({ item: "PS5", query: "ps5" }, [flaky], { currency: "BAM", label: "KM" }, undefined, table)) last = out;
		expect((last as { partial: string[] }).partial).toEqual(["olx"]);
	});
});
