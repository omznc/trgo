import { createRequest } from "./http";
import { PROVIDERS } from "./registry";
import type { Listing, Provider, ProviderOptions, SearchQuery, SearchResult } from "./types";

// The fields of one ad in the page state that this adapter reads.
type KpAd = {
	id: number;
	name: string;
	adUrl: string;
	// "2.190 din", "8 €", "Kontakt" or "Dogovor".
	priceText?: string;
	// A number, or "" when the ad has no price.
	priceNumber?: number | "";
	currencyAcronym?: string;
	conditionId?: string;
	location?: string;
	// Local time in Serbia: "2026-11-07 20:02:07".
	postedRaw?: string;
	image?: string;
};

type KpSearchState = { total: number; pages: number; page: number; adsIds: number[]; byId: Record<string, KpAd> };

const KP_SITE = PROVIDERS.kp.site;
// The search page holds 30 ads. The size is fixed, so `limit` only trims.
export const KP_PAGE_SIZE = 30;

const SORT: Partial<Record<NonNullable<SearchQuery["sort"]>, string>> = {
	price_asc: "price asc",
	price_desc: "price desc",
	newest: "posted desc",
};

// shortcut: "used" sends only condition=used, so "as-new" ads are missed; send both when KP documents a list value.
export function kpSearchPath(query: SearchQuery): string {
	const hasPrice = query.minPrice !== undefined || query.maxPrice !== undefined;
	const params: Record<string, string | number | undefined> = {
		keywords: query.q,
		page: query.page && query.page > 1 ? query.page : undefined,
		order: SORT[query.sort ?? "relevance"],
		condition: query.condition,
		priceFrom: query.minPrice,
		priceTo: query.maxPrice,
		// KP reads the price filter in this currency.
		currency: hasPrice ? PROVIDERS.kp.currency.toLowerCase() : undefined,
	};
	const pairs = Object.entries(params).flatMap(([key, value]) => (value === undefined || value === "" ? [] : [`${key}=${encodeURIComponent(String(value))}`]));
	return `/kp/pretraga?${pairs.join("&")}`;
}

// KP sends local time without a zone. The offset follows the Belgrade rules for that date.
export function kpPostedAt(raw: string | undefined): string | undefined {
	const guess = raw ? Date.parse(`${raw.replace(" ", "T")}Z`) : Number.NaN;
	if (Number.isNaN(guess)) return undefined;
	const zone = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Belgrade", timeZoneName: "longOffset" }).formatToParts(guess).find((p) => p.type === "timeZoneName")?.value;
	const [, sign, hours, minutes] = /GMT([+-])(\d{2}):(\d{2})/.exec(zone ?? "") ?? [];
	const offset = hours ? (sign === "-" ? -1 : 1) * (Number(hours) * 60 + Number(minutes)) * 60_000 : 0;
	return new Date(guess - offset).toISOString();
}

export function mapKpAd(ad: KpAd): Listing {
	const price = typeof ad.priceNumber === "number" && ad.priceNumber > 0 ? ad.priceNumber : null;
	return {
		provider: "kp",
		id: String(ad.id),
		title: ad.name,
		price,
		priceText: ad.priceText || "Kontakt",
		currency: ad.currencyAcronym === "eur" ? "EUR" : "RSD",
		// Only "new" is new. "as-new" is second hand, but unused.
		condition: ad.conditionId === "new" ? "new" : ad.conditionId ? "used" : undefined,
		city: ad.location || undefined,
		imageUrl: ad.image || undefined,
		url: KP_SITE + ad.adUrl,
		postedAt: kpPostedAt(ad.postedRaw),
	};
}

// The ads are in the page state. The _next/data route answers HTTP 410.
export function parseKpSearch(html: string): SearchResult {
	const json = /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s.exec(html)?.[1];
	if (!json) throw new Error("KupujemProdajem page has no search data");
	const state = (JSON.parse(json) as { props?: { initialReduxState?: { search?: KpSearchState } } }).props?.initialReduxState?.search;
	if (!state) throw new Error("KupujemProdajem page has no search data");
	return {
		listings: state.adsIds.flatMap((id) => (state.byId[String(id)] ? [mapKpAd(state.byId[String(id)]!)] : [])),
		total: state.total,
		hasMore: state.page < state.pages,
	};
}

export function createKpProvider(options: ProviderOptions): Provider {
	const request = createRequest(options);
	return {
		id: "kp",
		name: PROVIDERS.kp.name,
		async search(query) {
			const res = await request(kpSearchPath(query), query.signal ? { signal: query.signal } : undefined);
			if (!res.ok) throw new Error(`/kp/pretraga failed with HTTP ${res.status}`);
			const result = parseKpSearch(await res.text());
			return query.limit && query.limit < result.listings.length ? { ...result, listings: result.listings.slice(0, query.limit) } : result;
		},
		getListing() {
			return Promise.reject(new Error("KupujemProdajem listing details are not supported yet"));
		},
	};
}
