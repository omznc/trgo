// Pure market helpers. Each takes the provider table, so a test can pass a fake table.
import { convert, type Currency } from "./rates";
import type { Capability, ProviderInfo } from "./registry";
import type { SearchQuery } from "./types";

export type ProviderRow = Omit<ProviderInfo, "id"> & { id: string };
export type Table<K extends string = string> = Record<K, ProviderRow>;

// The currency of a mixed selection.
export const MIXED_CURRENCY: Currency = "EUR";
// The country that is used when the visitor country is unknown or has no provider.
export const DEFAULT_COUNTRY = "BA";

const ids = <K extends string>(table: Table<K>) => Object.keys(table) as K[];
const unique = <T>(values: T[]) => [...new Set(values)];

export const idsWith = <K extends string>(table: Table<K>, capability: Capability, among: readonly K[] = ids(table)): K[] =>
	among.filter((id) => table[id].capabilities[capability]);

// Providers that need an account: they list, publish or edit. A search-only provider is not one of them.
export const accountIds = <K extends string>(table: Table<K>): K[] => ids(table).filter((id) => table[id].capabilities.mine || table[id].capabilities.publish);

// A market is a country that has at least one provider to search.
export const marketCountries = (table: Table): string[] => unique(idsWith(table, "search").map((id) => table[id]!.country));

export const countryProviders = <K extends string>(table: Table<K>, country: string): K[] => idsWith(table, "search").filter((id) => table[id].country === country);

// The selection for a country. An unknown country, or none, gives the default country.
export function marketSelection<K extends string>(table: Table<K>, country: string | null | undefined): K[] {
	const own = country ? countryProviders(table, country) : [];
	if (own.length) return own;
	const fallback = countryProviders(table, DEFAULT_COUNTRY);
	return fallback.length ? fallback : idsWith(table, "search");
}

// True when the selection leaves out a search provider of its own market (the countries of the selected providers).
export function isPartialSelection(table: Table, selected: readonly string[]): boolean {
	const countries = new Set(selected.map((id) => table[id]?.country));
	const market = idsWith(table, "search").filter((id) => countries.has(table[id]!.country));
	return selected.length < market.length;
}

// The saved choice: a list of ids that still exist and can search. Null when nothing valid is left.
export function parseSelection<K extends string>(table: Table<K>, raw: unknown): K[] | null {
	if (!Array.isArray(raw)) return null;
	const searchable = idsWith(table, "search");
	const kept = searchable.filter((id) => raw.includes(id));
	return kept.length ? kept : null;
}

// The country of a selection, or null when it spans countries.
export function selectionCountry(table: Table, selected: readonly string[]): string | null {
	const countries = unique(selected.map((id) => table[id]?.country));
	return countries.length === 1 && countries[0] ? countries[0] : null;
}

// The shared currency of the providers. A mixed selection uses EUR.
export function displayCurrency(table: Table, selected: readonly string[]): Currency {
	const currencies = unique(selected.map((id) => table[id]!.currency));
	return currencies.length === 1 ? currencies[0]! : MIXED_CURRENCY;
}

// What the UI shows after a price in the display currency.
export function displayLabel(table: Table, selected: readonly string[]): string {
	const currency = displayCurrency(table, selected);
	return Object.values(table).find((p) => p.currency === currency)?.currencyLabel ?? currency;
}

const rounded = (n: number | undefined, from: Currency, to: Currency) => (n === undefined || from === to ? n : Math.round(convert(n, from, to)));

// Turns a query with prices in the display currency into a query in the currency of one provider.
export function queryFor(table: Table, display: Currency, id: string, query: SearchQuery): SearchQuery {
	const currency = table[id]!.currency;
	if (currency === display) return query;
	return { ...query, minPrice: rounded(query.minPrice, display, currency), maxPrice: rounded(query.maxPrice, display, currency) };
}

// A listing with its price in the display currency. Other fields stay.
export function inCurrency<T extends { price: number | null; currency: Currency }>(listing: T, display: Currency): T {
	if (listing.currency === display || listing.price === null) return listing;
	return { ...listing, price: convert(listing.price, listing.currency, display), currency: display };
}
