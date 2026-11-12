export type ProviderId = "olx" | "svex";

export type Listing = {
	provider: ProviderId;
	id: string;
	title: string;
	price: number | null;
	priceText: string;
	currency: "BAM";
	condition?: "new" | "used";
	city?: string;
	imageUrl?: string;
	url: string;
	postedAt?: string;
};

export type ListingSeller = { name: string; type: "shop" | "private"; since?: string };

export type ListingDelivery = {
	shipping?: boolean;
	pickup?: boolean;
	freeShipping?: boolean;
	// Shipping price in KM, when the seller states one.
	price?: number | null;
};

export type ListingDetail = Listing & {
	// Plain text. Line breaks are "\n". No HTML.
	description: string;
	imageUrls: string[];
	views?: number;
	seller?: ListingSeller;
	attributes: { name: string; value: string }[];
	delivery: ListingDelivery;
};

export type SearchQuery = {
	q: string;
	minPrice?: number;
	maxPrice?: number;
	condition?: "new" | "used";
	sort?: "relevance" | "price_asc" | "price_desc" | "newest";
	limit?: number;
	// 1-based page of `limit` results.
	page?: number;
};

export type SearchResult = {
	listings: Listing[];
	total: number;
	// From the server paging data. Undefined when the server does not say.
	hasMore?: boolean;
};

export interface Provider {
	id: ProviderId;
	name: string;
	search(query: SearchQuery): Promise<SearchResult>;
	getListing(id: string): Promise<ListingDetail>;
}

export type ProviderOptions = {
	proxyUrl: string;
	fetch?: typeof fetch;
};

export type SearchAllResult = {
	listings: Listing[];
	total: number;
	errors: { provider: ProviderId; message: string }[];
};

export type OlxSession = { token: string };
export type SvexSession = { cookies: Record<string, string> };

export type SvexCondition =
	| "new_sealed"
	| "new_open"
	| "used_excellent"
	| "used_good"
	| "used_fair"
	| "defective";

export type SvexMedia = {
	kind: "image";
	id: string;
	urlOriginal: string;
	urlThumb?: string;
	urlMedium?: string;
	urlLarge?: string;
};

export type SvexListingInput = {
	title: string;
	description: string;
	categoryId: string;
	price: number;
	condition: SvexCondition;
	cityId: string;
	media: SvexMedia[];
	exchangePossible?: boolean;
	deliveryShipping?: boolean;
	deliveryPickup?: boolean;
	// 0 is free shipping, null is "by agreement".
	deliveryPrice?: number | null;
	shippingWeight?: unknown;
	shippingDimensions?: unknown;
};

export type OlxListingInput = {
	title: string;
	description: string;
	category_id: number;
	city_id: number;
	price: number;
	state: "new" | "used";
	attributes?: { id: number; value: string | number | boolean | (string | number)[] }[];
};

export type NamedId<T = string> = { id: T; name: string };
