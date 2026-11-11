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
		price_from: query.minPrice,
		price_to: query.maxPrice,
		state: query.condition,
		...SORT[query.sort ?? "relevance"],
	};
}

function htmlToText(html: string): string {
	return html
		.replace(/<\/p>|<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function createOlxProvider(options: ProviderOptions): Provider & ReturnType<typeof createOlxAccount> {
	const account = createOlxAccount(options);
	const getJson = createGetJson(options);
	let cities: Promise<Map<number, string>> | undefined;
	// The city list is nice to have: a failure leaves the city empty.
	const loadCities = () =>
		(cities ??= getJson<OlxCityTree>("/olx/cities").then(flattenOlxCities, () => new Map<number, string>()));

	return {
		...account,
		id: "olx",
		name: "OLX.ba",
		async search(query): Promise<SearchResult> {
			const [res, cityMap] = await Promise.all([
				getJson<{ data: OlxItem[]; meta?: { total?: number } }>("/olx/search", olxSearchParams(query)),
				loadCities(),
			]);
			return {
				listings: res.data.map((item) => mapOlxItem(item, cityMap)),
				total: res.meta?.total ?? res.data.length,
			};
		},
		async getListing(id): Promise<ListingDetail> {
			const d = await getJson<
				OlxItem & { additional?: { description?: string }; images?: string[]; cities?: { name: string }[] }
			>(`/olx/listings/${id}`);
			const listing = mapOlxItem(d);
			return {
				...listing,
				city: d.cities?.[0]?.name,
				imageUrl: d.images?.[0] ?? listing.imageUrl,
				description: htmlToText(d.additional?.description ?? ""),
				imageUrls: d.images ?? [],
			};
		},
	};
}
