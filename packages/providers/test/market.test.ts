import { describe, expect, test } from "bun:test";
import { accountIds, availableTable, convert, countryProviders, displayCurrency, displayLabel, idsWith, inCurrency, isPartialSelection, marketCountries, marketSelection, parseSelection, PROVIDERS, queryFor, searchAll, selectionCountry, type SearchQuery, type Table } from "../src";

const none = { search: false, detail: false, priceCheck: false, mine: false, publish: false, edit: false };
// A fake search-only provider in Croatia.
const FAKE: Table = {
	...availableTable(PROVIDERS, false),
	fakehr: { id: "fakehr", name: "Fake", siteName: "fake.hr", site: "https://fake.hr", country: "HR", currency: "EUR", currencyLabel: "EUR", searchLanguage: "hr", searchLanguageName: "Croatian", capabilities: { ...none, search: true, priceCheck: true } },
};

describe("market helpers", () => {
	test("countries and providers by country", () => {
		expect(marketCountries(PROVIDERS)).toEqual(["BA", "RS", "HR"]);
		expect(countryProviders(PROVIDERS, "RS")).toEqual(["kp"]);
		expect(marketCountries(FAKE)).toEqual(["BA", "RS", "HR"]);
		expect(countryProviders(FAKE, "HR")).toEqual(["fakehr"]);
		expect(countryProviders(FAKE, "BA")).toEqual(["olx", "svex"]);
	});

	test("an unknown country or none gives BA", () => {
		expect(marketSelection(FAKE, "HR")).toEqual(["fakehr"]);
		for (const country of ["DE", null, undefined]) expect(marketSelection(FAKE, country)).toEqual(["olx", "svex"]);
	});

	test("a provider that needs the extension is a market only with it", () => {
		expect(marketCountries(availableTable(PROVIDERS, false))).toEqual(["BA", "RS"]);
		// HR then falls back like an unknown country.
		expect(marketSelection(availableTable(PROVIDERS, false), "HR")).toEqual(["olx", "svex"]);
		expect(marketSelection(availableTable(PROVIDERS, true), "HR")).toEqual(["njuskalo"]);
		expect(parseSelection(availableTable(PROVIDERS, false), ["njuskalo", "kp"])).toEqual(["kp"]);
		expect(availableTable(PROVIDERS, true)).toBe(PROVIDERS);
	});

	test("a saved choice keeps only known searchable ids", () => {
		expect(parseSelection(FAKE, ["fakehr", "olx", "gone"])).toEqual(["olx", "fakehr"]);
		expect(parseSelection(FAKE, ["gone"])).toBeNull();
		expect(parseSelection(FAKE, "olx")).toBeNull();
		expect(selectionCountry(FAKE, ["olx", "svex"])).toBe("BA");
		expect(selectionCountry(FAKE, ["olx", "fakehr"])).toBeNull();
	});

	test("a search-only provider cannot publish, edit or list, and has no account", () => {
		for (const capability of ["publish", "edit", "mine"] as const) expect(idsWith(FAKE, capability)).not.toContain("fakehr");
		expect(idsWith(FAKE, "search")).toContain("fakehr");
		expect(accountIds(FAKE)).toEqual(["olx", "svex"]);
		expect(accountIds(PROVIDERS)).toEqual(["olx", "svex"]);
	});

	test("the display currency is shared or EUR", () => {
		expect(displayCurrency(FAKE, ["olx", "svex"])).toBe("BAM");
		expect(displayLabel(FAKE, ["olx", "svex"])).toBe("KM");
		expect(displayCurrency(FAKE, ["olx", "fakehr"])).toBe("EUR");
		expect(displayLabel(FAKE, ["fakehr"])).toBe("EUR");
	});
});

describe("partial selection", () => {
	test("only a strict subset of the own market is partial", () => {
		expect(isPartialSelection(PROVIDERS, ["olx", "svex"])).toBe(false);
		expect(isPartialSelection(PROVIDERS, ["kp"])).toBe(false);
		expect(isPartialSelection(PROVIDERS, ["olx", "svex", "kp"])).toBe(false);
		expect(isPartialSelection(PROVIDERS, ["olx"])).toBe(true);
		expect(isPartialSelection(PROVIDERS, ["svex", "kp"])).toBe(true);
	});
});

describe("currency", () => {
	test("BAM is pegged to EUR", () => {
		expect(convert(195.583, "BAM", "EUR")).toBeCloseTo(100, 6);
		expect(convert(100, "EUR", "BAM")).toBeCloseTo(195.583, 6);
		expect(convert(5, "EUR", "EUR")).toBe(5);
	});

	test("a price filter is converted for each provider", () => {
		const q = { q: "x", minPrice: 100, maxPrice: 500 };
		expect(queryFor(FAKE, "EUR", "fakehr", q)).toBe(q);
		expect(queryFor(FAKE, "EUR", "olx", q)).toMatchObject({ minPrice: 196, maxPrice: 978 });
		expect(queryFor(FAKE, "BAM", "olx", q)).toBe(q);
		expect(queryFor(FAKE, "EUR", "olx", { q: "x" })).toEqual({ q: "x", minPrice: undefined, maxPrice: undefined });
	});

	test("searchAll gives each provider a price in its own currency", async () => {
		const seen: Record<string, unknown> = {};
		const stub = (id: "olx" | "fakehr") =>
			({ id, name: id, getListing: async () => ({}) as never, search: async (q: object) => ((seen[id] = q), { listings: [], total: 0 }) }) as never;
		const adapt = (id: string, q: SearchQuery) => queryFor(FAKE, "EUR", id, q);
		await searchAll([stub("olx"), stub("fakehr")], { q: "x", maxPrice: 500 }, adapt);
		expect(seen.olx).toMatchObject({ maxPrice: 978 });
		expect(seen.fakehr).toMatchObject({ maxPrice: 500 });
	});

	test("a listing is shown in the display currency", () => {
		const l = { price: 195.583, currency: "BAM" as const };
		expect(inCurrency(l, "EUR")).toMatchObject({ currency: "EUR" });
		expect(inCurrency(l, "EUR").price).toBeCloseTo(100, 6);
		expect(inCurrency({ price: null, currency: "BAM" as const }, "EUR").price).toBeNull();
	});
});
