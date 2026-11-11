import { createGetJson } from "./http";
import { createSvexAccount } from "./svex-account";
import type { Listing, ListingDetail, Provider, ProviderOptions, SearchQuery, SearchResult } from "./types";

type SvexItem = {
	id: string;
	slug: string;
	title: string;
	price: string;
	currency?: string;
	city?: string;
	thumbnailMediumUrl?: string;
	thumbnailUrl?: string;
	publishedAt?: string;
	condition?: string;
};

export const svexListingUrl = (id: string, slug: string) => `https://svex.ba/oglas/${id}-${slug}`;

export function mapSvexItem(item: SvexItem): Listing {
	const price = Number(item.price);
	const hasPrice = Number.isFinite(price) && price > 0;
	return {
		provider: "svex",
		id: item.id,
		title: item.title,
		price: hasPrice ? price : null,
		priceText: hasPrice ? `${item.price} KM` : "Po dogovoru",
		currency: "BAM",
		condition: item.condition?.startsWith("new") ? "new" : item.condition?.startsWith("used") ? "used" : undefined,
		city: item.city || undefined,
		imageUrl: item.thumbnailMediumUrl ?? item.thumbnailUrl,
		url: svexListingUrl(item.id, item.slug),
		postedAt: item.publishedAt,
	};
}

// The API takes one condition value per call, so a group is one call for each value.
export const CONDITIONS = {
	new: ["new_sealed", "new_open"],
	used: ["used_excellent", "used_good", "used_fair"],
} as const;

export function svexSearchParams(query: SearchQuery, condition?: string) {
	return {
		q: query.q,
		limit: query.limit ?? 20,
		priceMin: query.minPrice,
		priceMax: query.maxPrice,
		condition,
		sort: query.sort,
	};
}

// Merges results of parallel calls: dedupe by id, then sort and cut again.
export function mergeSvexResults(results: SearchResult[], query: SearchQuery): SearchResult {
	const byId = new Map<string, Listing>();
	for (const result of results) for (const l of result.listings) byId.set(l.id, l);
	const price = (l: Listing) => l.price ?? Number.POSITIVE_INFINITY;
	const sorters: Partial<Record<NonNullable<SearchQuery["sort"]>, (a: Listing, b: Listing) => number>> = {
		price_asc: (a, b) => price(a) - price(b),
		price_desc: (a, b) => (b.price ?? -1) - (a.price ?? -1),
		newest: (a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""),
	};
	const sorter = sorters[query.sort ?? "relevance"];
	const all = [...byId.values()];
	if (sorter) all.sort(sorter);
	return { listings: all.slice(0, query.limit ?? 20), total: results.reduce((sum, r) => sum + r.total, 0) };
}

export function createSvexProvider(options: ProviderOptions): Provider & ReturnType<typeof createSvexAccount> {
	const getJson = createGetJson(options);
	const account = createSvexAccount(options);
	const searchOne = async (query: SearchQuery, condition?: string): Promise<SearchResult> => {
		const res = await getJson<{ items: SvexItem[]; total?: number }>(
			"/svex-search/v1/search",
			svexSearchParams(query, condition),
		);
		return { listings: res.items.map(mapSvexItem), total: res.total ?? res.items.length };
	};
	return {
		...account,
		id: "svex",
		name: "SVEX.ba",
		async search(query): Promise<SearchResult> {
			if (!query.condition) return searchOne(query);
			const results = await Promise.all(CONDITIONS[query.condition].map((c) => searchOne(query, c)));
			return mergeSvexResults(results, query);
		},
		async getListing(id): Promise<ListingDetail> {
			const d = await getJson<
				SvexItem & { description?: string; images?: { url: string }[]; cityNames?: string[] }
			>(`/svex-listing/v1/listings/${id}`);
			const listing = mapSvexItem({ ...d, city: d.city ?? d.cityNames?.[0] });
			const imageUrls = (d.images ?? []).map((i) => i.url);
			return { ...listing, imageUrl: imageUrls[0] ?? listing.imageUrl, description: d.description ?? "", imageUrls };
		},
	};
}
