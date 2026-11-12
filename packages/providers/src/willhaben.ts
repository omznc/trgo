import { createRequest } from "./http";
import { KP_RATE_LIMITED } from "./kp";
import { PROVIDERS } from "./registry";
import type { Listing, Provider, ProviderOptions, SearchQuery, SearchResult } from "./types";

type WillhabenAdvert = {
	id: string;
	// The title.
	description: string;
	attributes?: { attribute?: { name: string; values?: string[] }[] };
	advertImageList?: { advertImage?: { mainImageUrl?: string }[] };
};

type WillhabenData = {
	props?: {
		pageProps?: {
			searchResult?: {
				rowsFound?: number;
				rowsRequested?: number;
				pageRequested?: number;
				advertSummaryList?: { advertSummary?: WillhabenAdvert[] };
			};
		};
	};
};

const SITE = PROVIDERS.willhaben.site;
// The search page holds 30 ads when asked. Willhaben accepts up to 60.
export const WILLHABEN_PAGE_SIZE = 30;

// The values of the "sort" param.
const SORT = { newest: 1, price_asc: 3, price_desc: 4 } as const;
// The ids of the "Neu" and "Gebraucht" categories in the tree.
const CONDITION = { new: "22", used: "23" } as const;

export function willhabenSearchParams(query: SearchQuery): URLSearchParams {
	const params = new URLSearchParams({ keyword: query.q, rows: String(WILLHABEN_PAGE_SIZE) });
	if (query.minPrice !== undefined) params.set("PRICE_FROM", String(query.minPrice));
	if (query.maxPrice !== undefined) params.set("PRICE_TO", String(query.maxPrice));
	if (query.condition) params.set("treeAttributes", CONDITION[query.condition]);
	if (query.sort && query.sort !== "relevance") params.set("sort", String(SORT[query.sort]));
	if (query.page && query.page > 1) params.set("page", String(query.page));
	return params;
}

export function mapWillhabenAdvert(advert: WillhabenAdvert): Listing {
	const attr = (name: string) => advert.attributes?.attribute?.find((a) => a.name === name)?.values?.[0];
	const amount = Number(attr("PRICE"));
	const price = amount > 0 ? amount : null;
	const seoUrl = attr("SEO_URL");
	const mmo = attr("MMO");
	return {
		provider: "willhaben",
		id: advert.id,
		title: advert.description,
		price,
		priceText: attr("PRICE_FOR_DISPLAY") || "Preis auf Anfrage",
		currency: PROVIDERS.willhaben.currency,
		city: attr("LOCATION"),
		imageUrl: advert.advertImageList?.advertImage?.[0]?.mainImageUrl ?? (mmo ? `https://cache.willhaben.at/mmo/${mmo}` : undefined),
		url: seoUrl ? `${SITE}/iad/${seoUrl}` : `${SITE}/iad/object?adId=${advert.id}`,
		postedAt: attr("PUBLISHED_String"),
	};
}

// The page holds its data as JSON in a script. A page with no data is a bot check page.
export function parseWillhabenSearch(html: string): SearchResult {
	const json = /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s.exec(html)?.[1];
	if (!json) throw new Error("willhaben search page has no data");
	let result: NonNullable<NonNullable<WillhabenData["props"]>["pageProps"]>["searchResult"];
	try {
		result = (JSON.parse(json) as WillhabenData).props?.pageProps?.searchResult;
	} catch {
		// A broken script is the same as no data.
	}
	if (!result) throw new Error("willhaben search page has no data");
	const listings = (result.advertSummaryList?.advertSummary ?? []).map(mapWillhabenAdvert);
	const total = result.rowsFound ?? listings.length;
	const { pageRequested = 1, rowsRequested = WILLHABEN_PAGE_SIZE } = result;
	return { listings, total, hasMore: pageRequested * rowsRequested < total };
}

export function createWillhabenProvider(options: ProviderOptions): Provider {
	const request = createRequest(options);
	return {
		id: "willhaben",
		name: PROVIDERS.willhaben.name,
		async search(query): Promise<SearchResult> {
			const path = `/willhaben/iad/kaufen-und-verkaufen/marktplatz?${willhabenSearchParams(query)}`;
			const res = await request(path, query.signal ? { signal: query.signal } : undefined);
			if (res.status === 429) throw new Error(KP_RATE_LIMITED);
			if (!res.ok) throw new Error(`willhaben search failed with HTTP ${res.status}`);
			const result = parseWillhabenSearch(await res.text());
			return query.limit && query.limit < result.listings.length ? { ...result, listings: result.listings.slice(0, query.limit) } : result;
		},
		getListing() {
			return Promise.reject(new Error("willhaben listing details are not supported yet"));
		},
	};
}
