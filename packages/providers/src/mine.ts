import { mapOlxItem } from "./olx";
import { svexListingUrl } from "./svex";
import type { Listing } from "./types";

export type MineStatus = "active" | "hidden" | "sold" | "expired" | "draft";

export type MyListing = Listing & {
	status: MineStatus;
	views?: number;
	// ISO date. SVEX gives it. OLX does not.
	expiresAt?: string;
	soldAt?: string;
	// OLX only: false when the listing is too new to refresh.
	canRefresh?: boolean;
};

export type RefreshResult = { freeLeft?: number; paid?: boolean };

type OlxMineItem = Parameters<typeof mapOlxItem>[0] & { refresh_available?: boolean };

// OLX has one endpoint for each state. "inactive" holds the unpublished listings.
export const OLX_STATES = [
	["active", "active"],
	["hidden", "hidden"],
	["finished", "sold"],
	["expired", "expired"],
	["inactive", "draft"],
] as const;

export function mapOlxMine(item: OlxMineItem, status: MineStatus): MyListing {
	return { ...mapOlxItem(item), status, canRefresh: item.refresh_available };
}

type SvexMineItem = {
	id: string;
	slug: string;
	title: string;
	status: string;
	price: string | number | null;
	currency?: string;
	views?: number;
	expiresAt?: string | null;
	soldAt?: string | null;
	publishedAt?: string | null;
	createdAt?: string;
	thumbnailUrl?: string | null;
};

const SVEX_STATUS: Record<string, MineStatus | null> = {
	ACTIVE: "active",
	PAUSED: "hidden",
	SOLD: "sold",
	EXPIRED: "expired",
	DRAFT: "draft",
	PENDING_REVIEW: "draft",
	OVER_LIMIT: "draft",
	ARCHIVED: null,
};

export function mapSvexMine(item: SvexMineItem): MyListing | null {
	const status = SVEX_STATUS[item.status];
	if (!status) return null;
	const price = Number(item.price);
	const hasPrice = Number.isFinite(price) && price > 0;
	return {
		provider: "svex",
		id: item.id,
		title: item.title,
		price: hasPrice ? price : null,
		priceText: hasPrice ? `${price} KM` : "Po dogovoru",
		currency: "BAM",
		imageUrl: item.thumbnailUrl ?? undefined,
		url: svexListingUrl(item.id, item.slug),
		postedAt: item.publishedAt ?? item.createdAt,
		status,
		views: item.views,
		expiresAt: item.expiresAt ?? undefined,
		soldAt: item.soldAt ?? undefined,
	};
}

// Index of the "]" that closes the array which opens at `start`. Strings can hold brackets.
function arrayEnd(text: string, start: number) {
	let depth = 0;
	let inString = false;
	for (let i = start; i < text.length; i++) {
		const c = text[i];
		if (inString) {
			if (c === "\\") i++;
			else if (c === '"') inString = false;
		} else if (c === '"') inString = true;
		else if (c === "[") depth++;
		else if (c === "]" && --depth === 0) return i;
	}
	return -1;
}

// The page is server rendered. Its RSC payload sits in self.__next_f.push([1,"..."]) strings.
export function rscText(html: string) {
	const chunks: string[] = [];
	for (const [, quoted] of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
		chunks.push(JSON.parse(quoted!) as string);
	}
	return chunks.join("");
}

// Reads the listing array from the /moji-oglasi page. It sits before "totalListings".
export function parseSvexMine(html: string): MyListing[] {
	return parseSvexMinePage(html).listings;
}

// `truncated` is true when the page holds fewer items than "totalListings". We know no paging URL.
export function parseSvexMinePage(html: string): { listings: MyListing[]; truncated: boolean } {
	const text = rscText(html);
	const end = text.indexOf('"totalListings"');
	const start = end < 0 ? -1 : text.lastIndexOf('"items":[', end);
	if (start < 0) throw new Error("SVEX my listings page has no listing data.");
	const open = start + '"items":'.length;
	const close = arrayEnd(text, open);
	if (close < 0) throw new Error("SVEX my listings data is cut off.");
	const items = JSON.parse(text.slice(open, close + 1)) as SvexMineItem[];
	const total = Number(/^"totalListings":(\d+)/.exec(text.slice(end))?.[1]);
	return {
		listings: items.map(mapSvexMine).filter((x): x is MyListing => x !== null),
		truncated: Number.isFinite(total) && items.length < total,
	};
}
