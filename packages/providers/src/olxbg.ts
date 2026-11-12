import { createGetJson } from "./http";
import { PROVIDERS } from "./registry";
import type { Listing, Provider, ProviderOptions, SearchQuery, SearchResult } from "./types";

type OlxBgParam = { key: string; value?: { value?: number | null; currency?: string; label?: string; key?: string } };

type OlxBgItem = {
	id: number;
	title: string;
	url: string;
	created_time?: string;
	location?: { city?: { name?: string } };
	photos?: { link?: string }[];
	params?: OlxBgParam[];
};

type OlxBgReply = {
	data?: OlxBgItem[];
	metadata?: { total_elements?: number; visible_total_count?: number };
};

// The API stops at offset 1000, even when more ads match.
const MAX_OFFSET = 1000;
const DEFAULT_LIMIT = 40;
const PHOTO_SIZE = "640x480";

const SORT: Partial<Record<NonNullable<SearchQuery["sort"]>, string>> = {
	newest: "created_at:desc",
	price_asc: "filter_float_price:asc",
	price_desc: "filter_float_price:desc",
};

export function olxBgSearchParams(query: SearchQuery) {
	const limit = query.limit ?? DEFAULT_LIMIT;
	return {
		query: query.q,
		limit,
		offset: query.page && query.page > 1 ? (query.page - 1) * limit : 0,
		"filter_float_price:from": query.minPrice,
		"filter_float_price:to": query.maxPrice,
		"filter_enum_state[0]": query.condition,
		sort_by: SORT[query.sort ?? "relevance"],
	};
}

const param = (item: OlxBgItem, key: string) => item.params?.find((p) => p.key === key)?.value;

// The rates table has no other currency for Bulgaria, so another currency gives no price.
function priceOf(item: OlxBgItem): number | null {
	const price = param(item, "price");
	return price?.currency === PROVIDERS.olxbg.currency && price.value ? price.value : null;
}

function conditionOf(item: OlxBgItem): Listing["condition"] {
	const state = param(item, "state")?.key;
	return state === "new" || state === "used" ? state : undefined;
}

export function mapOlxBgItem(item: OlxBgItem): Listing {
	return {
		provider: "olxbg",
		id: String(item.id),
		title: item.title,
		price: priceOf(item),
		priceText: param(item, "price")?.label || "По договаряне",
		currency: PROVIDERS.olxbg.currency,
		condition: conditionOf(item),
		city: item.location?.city?.name,
		// The link holds a size template.
		imageUrl: item.photos?.[0]?.link?.replace("{width}x{height}", PHOTO_SIZE),
		url: item.url,
		postedAt: item.created_time ? new Date(item.created_time).toISOString() : undefined,
	};
}

// Promoted ads can repeat an ad and add items past the limit. The first copy stays.
export function parseOlxBgSearch(reply: OlxBgReply, query: SearchQuery): SearchResult {
	const { offset, limit } = olxBgSearchParams(query);
	const items = reply.data ?? [];
	const listings = items.map(mapOlxBgItem).filter((l, i, all) => all.findIndex((o) => o.id === l.id) === i).slice(0, limit);
	const total = reply.metadata?.visible_total_count ?? reply.metadata?.total_elements ?? listings.length;
	return { listings, total, hasMore: offset + limit < Math.min(reply.metadata?.total_elements ?? total, MAX_OFFSET) };
}

export function createOlxBgProvider(options: ProviderOptions): Provider {
	const getJson = createGetJson(options);
	return {
		id: "olxbg",
		name: PROVIDERS.olxbg.name,
		async search(query): Promise<SearchResult> {
			const params = olxBgSearchParams(query);
			if (params.offset >= MAX_OFFSET) return { listings: [], total: 0, hasMore: false };
			return parseOlxBgSearch(await getJson<OlxBgReply>("/olxbg/api/v1/offers/", params, query.signal), query);
		},
		getListing() {
			return Promise.reject(new Error("OLX.bg listing details are not supported yet"));
		},
	};
}
