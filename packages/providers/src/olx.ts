import { createGetJson } from "./http";
import { createOlxAccount } from "./olx-account";
import type { Listing, ListingDetail, Provider, ProviderOptions, SearchQuery, SearchResult } from "./types";

type OlxItem = {
	id: number;
	title: string;
	price: number;
	display_price: string;
	show_price?: boolean;
	state?: string;
	city_id?: number;
	image?: string;
	date?: number;
};

type OlxCityTree = {
	data: { cantons: { cities: { id: number; name: string }[] }[] }[];
};

export const olxListingUrl = (id: number | string) => `https://olx.ba/artikal/${id}`;

export function mapOlxItem(item: OlxItem, cities: Map<number, string> = new Map()): Listing {
	const hasPrice = item.show_price !== false && item.price > 0;
	return {
		provider: "olx",
		id: String(item.id),
		title: item.title,
		price: hasPrice ? item.price : null,
		priceText: item.display_price,
		currency: "BAM",
		condition: item.state === "new" || item.state === "used" ? item.state : undefined,
		city: item.city_id === undefined ? undefined : cities.get(item.city_id),
		imageUrl: item.image,
		url: olxListingUrl(item.id),
		// OLX dates are unix seconds.
		postedAt: item.date ? new Date(item.date * 1000).toISOString() : undefined,
	};
}

export function flattenOlxCities(tree: OlxCityTree): Map<number, string> {
	const map = new Map<number, string>();
	for (const entity of tree.data)
		for (const canton of entity.cantons) for (const city of canton.cities) map.set(city.id, city.name);
	return map;
}

const SORT: Record<NonNullable<SearchQuery["sort"]>, { sort_by?: string; sort_order?: string }> = {
	relevance: {},
	price_asc: { sort_by: "price", sort_order: "asc" },
	price_desc: { sort_by: "price", sort_order: "desc" },
	newest: { sort_by: "created_at", sort_order: "desc" },
};

export function olxSearchParams(query: SearchQuery) {
	return {
		q: query.q,
		per_page: query.limit ?? 20,
		page: query.page,
		price_from: query.minPrice,
		price_to: query.maxPrice,
		state: query.condition,
		...SORT[query.sort ?? "relevance"],
	};
}

// Keeps text, <br> and <p> only. The result is plain text: the UI must not render it as HTML.
export function htmlToText(html: string): string {
	return html
		.replace(/<\/p>|<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

type OlxDetail = OlxItem & {
	views?: number;
	additional?: { description?: string; created_at?: number };
	images?: string[];
	cities?: { name: string }[];
	user?: { username?: string; type?: string; created_at?: number };
	attributes?: { name: string; value: string }[];
	shipping?: string;
	free_delivery?: boolean;
	shipping_available?: boolean;
};

// OLX sends booleans as the strings "true" and "false".
const olxAttrValue = (value: string) => (value === "true" ? "Da" : value === "false" ? "Ne" : value);

export function mapOlxDetail(d: OlxDetail): ListingDetail {
	const listing = mapOlxItem(d);
	const created = d.additional?.created_at;
	const images = d.images ?? [];
	return {
		...listing,
		city: d.cities?.[0]?.name,
		imageUrl: images[0] ?? listing.imageUrl,
		postedAt: created ? new Date(created * 1000).toISOString() : listing.postedAt,
		description: htmlToText(d.additional?.description ?? ""),
		imageUrls: images,
		views: d.views,
		seller: olxSeller(d.user),
		attributes: (d.attributes ?? []).filter((a) => a.value).map((a) => ({ name: a.name, value: olxAttrValue(a.value) })),
		delivery: olxDelivery(d),
	};
}

function olxSeller(user: OlxDetail["user"]): ListingDetail["seller"] {
	if (!user?.username) return undefined;
	return {
		name: user.username,
		type: user.type === "shop" ? "shop" : "private",
		since: user.created_at ? new Date(user.created_at * 1000).toISOString() : undefined,
	};
}

function olxDelivery(d: OlxDetail): ListingDetail["delivery"] {
	const shipping = d.shipping_available !== false && d.shipping !== undefined && d.shipping !== "no_shipping";
	return { shipping, freeShipping: d.free_delivery };
}

export function createOlxProvider(options: ProviderOptions): Provider & ReturnType<typeof createOlxAccount> {
	const account = createOlxAccount(options);
	const getJson = createGetJson(options);
	let cities: Promise<Map<number, string>> | undefined;
	// The city list is nice to have: a failure leaves the city empty.
	const loadCities = () =>
		(cities ??= getJson<OlxCityTree>("/olx/cities")
			.then(flattenOlxCities)
			.catch(() => {
				// Do not cache a failure: the next call tries again.
				cities = undefined;
				return new Map<number, string>();
			}));

	return {
		...account,
		id: "olx",
		name: "OLX.ba",
		async search(query): Promise<SearchResult> {
			const [res, cityMap] = await Promise.all([
				getJson<{ data: OlxItem[]; meta?: { total?: number; last_page?: number } }>("/olx/search", olxSearchParams(query)),
				loadCities(),
			]);
			return {
				listings: res.data.map((item) => mapOlxItem(item, cityMap)),
				total: res.meta?.total ?? res.data.length,
				hasMore: res.meta?.last_page === undefined ? undefined : (query.page ?? 1) < res.meta.last_page,
			};
		},
		async getListing(id): Promise<ListingDetail> {
			return mapOlxDetail(await getJson<OlxDetail>(`/olx/listings/${id}`));
		},
	};
}
