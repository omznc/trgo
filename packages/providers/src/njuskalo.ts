import { createRequest } from "./http";
import type { Listing, ListingDetail, Provider, ProviderOptions, SearchQuery, SearchResult } from "./types";

const SITE = "https://www.njuskalo.hr";
const STATE_MARKER = "window.__INITIAL_STATE__=";

const PROVIDER = "njuskalo";
const EUR = "EUR";

type NjuskaloAd = {
	id: number;
	title: string;
	createdAt?: string | null;
	image?: string | null;
	priceFormatted?: string | null;
	isPriceOnRequest?: boolean;
	hidePrice?: boolean;
	url: string;
	location?: string | null;
	condition?: string | null;
	highlights?: { id: string; value: string }[];
};

type NjuskaloState = {
	searchPage?: {
		pageData?: {
			promotedListings?: NjuskaloAd[];
			regularListings?: NjuskaloAd[];
			listingsCount?: number;
			totalPageCount?: number;
			fields?: { page?: number };
		};
	};
};

// "1.250 €" is 1250. "1.250,50 €" is 1250.5. A range or an empty text is null.
export function parseNjuskaloPrice(text: string | null | undefined): number | null {
	const match = /^\s*(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?\s*€?\s*$/.exec(text ?? "");
	if (!match) return null;
	const value = Number(match[1]!.replaceAll(".", "") + (match[2] ? `.${match[2]}` : ""));
	return value > 0 ? value : null;
}

function mapCondition(ad: NjuskaloAd): Listing["condition"] {
	const text = ad.condition ?? ad.highlights?.find((h) => h.id === "condition")?.value;
	if (text === "novo") return "new";
	return text === "rabljeno" ? "used" : undefined;
}

function mapAd(ad: NjuskaloAd): Listing {
	const hidden = ad.isPriceOnRequest || ad.hidePrice;
	const price = hidden ? null : parseNjuskaloPrice(ad.priceFormatted);
	return {
		provider: PROVIDER,
		id: String(ad.id),
		title: ad.title,
		price,
		priceText: price === null ? "Po dogovoru" : (ad.priceFormatted ?? ""),
		currency: EUR,
		condition: mapCondition(ad),
		city: ad.location || undefined,
		imageUrl: ad.image && !ad.image.includes("nema-slika") ? ad.image : undefined,
		url: new URL(ad.url, SITE).href,
		postedAt: ad.createdAt || undefined,
	};
}

// The page holds its data as JSON in a script. Returns undefined when the page has none (a bot check).
function readState(html: string): NjuskaloState | undefined {
	const start = html.indexOf(STATE_MARKER);
	if (start < 0) return undefined;
	const from = start + STATE_MARKER.length;
	const end = html.indexOf("</script>", from);
	try {
		return JSON.parse(html.slice(from, end < 0 ? undefined : end).trim().replace(/;$/, "")) as NjuskaloState;
	} catch {
		return undefined;
	}
}

// Ads that the seller paid to promote also show in the regular list. Regular ads go first, so a sort keeps its order.
export function parseNjuskaloSearch(html: string): SearchResult {
	const data = readState(html)?.searchPage?.pageData;
	if (!data) throw new Error("Njuskalo search page has no data (blocked by a bot check?)");
	const listings = dedupe([...(data.regularListings ?? []), ...(data.promotedListings ?? [])].map(mapAd));
	const { totalPageCount, fields } = data;
	return {
		listings,
		total: data.listingsCount ?? listings.length,
		hasMore: totalPageCount === undefined ? undefined : (fields?.page ?? 1) < totalPageCount,
	};
}

const dedupe = (listings: Listing[]) => listings.filter((l, i) => listings.findIndex((o) => o.id === l.id) === i);

// Listing URLs end in "-oglas-<id>".
export function njuskaloIdFromUrl(idOrUrl: string): string {
	if (!idOrUrl.includes("/")) return idOrUrl;
	const id = /-oglas-(\d+)\/?$/.exec(new URL(idOrUrl, SITE).pathname)?.[1];
	if (!id) throw new Error(`Not a njuskalo listing URL: ${idOrUrl}`);
	return id;
}

const SORT = { newest: "new", price_asc: "cheap", price_desc: "expensive" } as const;

// The site fixes the page size, so `limit` only cuts the page.
export function njuskaloSearchParams(query: SearchQuery): URLSearchParams {
	const params = new URLSearchParams({ keywords: query.q });
	if (query.minPrice !== undefined) params.set("price[min]", String(query.minPrice));
	if (query.maxPrice !== undefined) params.set("price[max]", String(query.maxPrice));
	if (query.condition) params.set(`condition[${query.condition}]`, query.condition);
	const sort = query.sort && query.sort !== "relevance" ? SORT[query.sort] : undefined;
	if (sort) params.set("sort", sort);
	if (query.page && query.page > 1) params.set("page", String(query.page));
	return params;
}

export function createNjuskaloProvider(options: ProviderOptions): Provider {
	const request = createRequest(options);
	return {
		id: PROVIDER,
		name: "Njuškalo",
		async search(query): Promise<SearchResult> {
			const path = `/njuskalo/search/?${njuskaloSearchParams(query)}`;
			const res = await request(path, query.signal ? { signal: query.signal } : undefined);
			if (!res.ok) throw new Error(`${path} failed with HTTP ${res.status}`);
			const result = parseNjuskaloSearch(await res.text());
			return query.limit ? { ...result, listings: result.listings.slice(0, query.limit) } : result;
		},
		async getListing(): Promise<ListingDetail> {
			// No detail page could be captured (the bot check blocked it), so there is no parser yet.
			throw new Error("Njuskalo listing details are not supported yet");
		},
	};
}
