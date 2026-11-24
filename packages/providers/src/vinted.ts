import { createRequest } from "./http";
import { KP_RATE_LIMITED } from "./kp";
import { PROVIDERS } from "./registry";
import type { Listing, Provider, ProviderOptions, SearchQuery, SearchResult } from "./types";

type VintedItem = {
	id: number | string;
	productItem?: {
		title?: string;
		url?: string;
		// The price of the seller. totalItemPrice adds the fee of the buyer.
		price?: { amount?: string; currencyCode?: string };
		thumbnailUrl?: string;
		itemBox?: { secondLine?: string };
	};
};

export type VintedId = "vintedhr" | "vintedsi" | "vintedat";


const ORDER = { newest: "newest_first", price_asc: "price_low_to_high", price_desc: "price_high_to_low" } as const;
// The ids of the filter: 6 new with tags, 1 new without tags, 2 very good, 3 good, 4 satisfactory.
const STATUS = { new: ["6", "1"], used: ["2", "3", "4"] } as const;

// The page has no condition id, only the text in the language of the site. The text ends the line, for example "M · Dobro".
const NEW_TEXT = /^(novo|neu)\b/i;
const USED_TEXT = /^(veoma dobro|dobro|zadovolj|zelo dobro|sehr gut|gut|zufrieden)/i;

function conditionOf(line: string | undefined): Listing["condition"] {
	const text = line?.split(" · ").pop()?.trim() ?? "";
	return NEW_TEXT.test(text) ? "new" : USED_TEXT.test(text) ? "used" : undefined;
}

export function vintedSearchParams(query: SearchQuery): URLSearchParams {
	const params = new URLSearchParams({ search_text: query.q });
	if (query.minPrice !== undefined) params.set("price_from", String(query.minPrice));
	if (query.maxPrice !== undefined) params.set("price_to", String(query.maxPrice));
	if (query.sort && query.sort !== "relevance") params.set("order", ORDER[query.sort]);
	if (query.condition) for (const id of STATUS[query.condition]) params.append("status_ids[]", id);
	if (query.page && query.page > 1) params.set("page", String(query.page));
	return params;
}

export function mapVintedItem(id: VintedId, item: VintedItem): Listing | null {
	const p = item.productItem;
	if (!p?.title || !p.url) return null;
	const amount = Number(p.price?.amount);
	return {
		provider: id,
		id: String(item.id),
		title: p.title,
		price: amount > 0 ? amount : null,
		priceText: amount > 0 ? `${p.price?.amount} ${PROVIDERS[id].currencyLabel}` : "",
		currency: PROVIDERS[id].currency,
		condition: conditionOf(p.itemBox?.secondLine),
		imageUrl: p.thumbnailUrl,
		url: new URL(p.url, PROVIDERS[id].site).href,
	};
}

// The items are in a chunk of the flight data of Next.js. The chunk is one string, so unescape only that chunk.
function itemsChunk(html: string): string | null {
	const at = html.indexOf('\\"items\\":{\\"items\\":[{');
	if (at < 0) return null;
	const start = html.lastIndexOf("self.__next_f.push([1,", at);
	const end = html.indexOf("])</script>", at);
	if (start < 0 || end < 0) return null;
	try {
		return JSON.parse(html.slice(start + "self.__next_f.push([1,".length, end)) as string;
	} catch {
		return null;
	}
}

// Cuts the items array out of the chunk. "tail" is the text after it, with the pagination.
function cutItems(chunk: string): { items: VintedItem[]; tail: string } | null {
	const from = chunk.indexOf('"items":{"items":[');
	const to = chunk.indexOf('],"pagination":', from);
	if (from < 0 || to < 0) return null;
	try {
		return { items: JSON.parse(chunk.slice(from + '"items":{"items":'.length, to + 1)) as VintedItem[], tail: chunk.slice(to) };
	} catch {
		return null;
	}
}

export function parseVintedSearch(id: VintedId, html: string): SearchResult {
	const chunk = itemsChunk(html);
	const cut = chunk && cutItems(chunk);
	if (!cut) throw new Error(`${id} search page has no data`);
	const listings = cut.items.flatMap((item) => mapVintedItem(id, item) ?? []);
	const page = /"current_page":(\d+),"per_page":\d+,"time":\d+,"total_entries":(\d+),"total_pages":(\d+)/.exec(cut.tail);
	const total = page ? Number(page[2]) : listings.length;
	return { listings, total, hasMore: page ? Number(page[1]) < Number(page[3]) : false };
}

export function createVintedProvider(id: VintedId, options: ProviderOptions): Provider {
	const request = createRequest(options);
	return {
		id,
		name: PROVIDERS[id].name,
		async search(query): Promise<SearchResult> {
			const res = await request(`/${id}/catalog?${vintedSearchParams(query)}`, query.signal ? { signal: query.signal } : undefined);
			if (res.status === 429) throw new Error(KP_RATE_LIMITED);
			if (!res.ok) throw new Error(`${id} search failed with HTTP ${res.status}`);
			const result = parseVintedSearch(id, await res.text());
			return query.limit && query.limit < result.listings.length ? { ...result, listings: result.listings.slice(0, query.limit) } : result;
		},
		getListing() {
			return Promise.reject(new Error(`${id} listing details are not supported yet`));
		},
	};
}

export const createVintedHrProvider = (options: ProviderOptions) => createVintedProvider("vintedhr", options);
export const createVintedSiProvider = (options: ProviderOptions) => createVintedProvider("vintedsi", options);
export const createVintedAtProvider = (options: ProviderOptions) => createVintedProvider("vintedat", options);
