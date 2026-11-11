import { type FilterOptions, normalizeTitle, rejectTitle } from "./price-filter";
import type { Listing, Provider, ProviderId } from "./types";

// The largest page that each API accepts.
const PAGE_SIZE: Record<ProviderId, number> = { olx: 200, svex: 100 };
const DAY_MS = 86_400_000;
export const WINDOWS = [90, 180, 365] as const;
const MIN_LISTINGS = 15;
const MIN_FOR_OUTLIERS = 8;
const MIN_PRICE = 5;

export type FetchOptions = {
	perProvider?: number;
	minPrice?: number;
	maxPrice?: number;
	concurrency?: number;
	now?: number;
	onProgress?: (fetched: number) => void;
};

const ageDays = (l: Listing, now: number) => (l.postedAt ? (now - Date.parse(l.postedAt)) / DAY_MS : Number.POSITIVE_INFINITY);

// Pages of one provider, newest first. A batch of pages runs in parallel.
async function fetchProvider(provider: Provider, q: string, options: FetchOptions, onBatch: (n: number) => void) {
	const { perProvider = 600, concurrency = 2, now = Date.now() } = options;
	const limit = PAGE_SIZE[provider.id];
	const pages = Math.ceil(perProvider / limit);
	const out: Listing[] = [];
	for (let first = 1; first <= pages; first += concurrency) {
		const numbers = Array.from({ length: Math.min(concurrency, pages - first + 1) }, (_, i) => first + i);
		const results = await Promise.all(numbers.map((page) => provider.search({ q, sort: "newest", limit, page, minPrice: options.minPrice, maxPrice: options.maxPrice })));
		const batch = results.flatMap((r) => r.listings);
		out.push(...batch);
		onBatch(batch.length);
		// Stop at the end of the results, or when a whole batch is older than the widest window.
		const short = results.some((r) => r.listings.length < limit);
		if (short || batch.every((l) => ageDays(l, now) > WINDOWS.at(-1)!)) break;
	}
	return out;
}

export async function fetchRecent(providers: Provider[], q: string, options: FetchOptions = {}) {
	let fetched = 0;
	const settled = await Promise.allSettled(
		providers.map((p) =>
			fetchProvider(p, q, options, (n) => {
				fetched += n;
				options.onProgress?.(fetched);
			}),
		),
	);
	const listings = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
	const errors = settled.flatMap((r, i) => (r.status === "rejected" ? [providers[i]!.id] : []));
	return { listings, errors };
}

// Linear interpolation between the closest ranks. The input is sorted.
export function quantile(sorted: number[], q: number) {
	const pos = (sorted.length - 1) * q;
	const lo = Math.floor(pos);
	const hi = Math.ceil(pos);
	return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

// Drops prices outside 1.5 IQR of the quartiles of log(price).
export function trimOutliers(listings: Listing[]): Listing[] {
	if (listings.length < MIN_FOR_OUTLIERS) return listings;
	const logs = listings.map((l) => Math.log(l.price!)).sort((a, b) => a - b);
	const q1 = quantile(logs, 0.25);
	const q3 = quantile(logs, 0.75);
	const fence = 1.5 * (q3 - q1);
	return listings.filter((l) => {
		const x = Math.log(l.price!);
		return x >= q1 - fence && x <= q3 + fence;
	});
}

// The narrowest window with enough listings. The widest window is the last choice.
// `exact` fixes the window, even if it holds few listings.
export function pickWindow(listings: Listing[], now: number, min = MIN_LISTINGS, exact?: number) {
	if (exact) return { days: exact, listings: listings.filter((l) => ageDays(l, now) <= exact) };
	for (const days of WINDOWS) {
		const inside = listings.filter((l) => ageDays(l, now) <= days);
		if (inside.length >= min || days === WINDOWS.at(-1)) return { days, listings: inside };
	}
	throw new Error("unreachable");
}

export type SelectOptions = FilterOptions & { minPrice?: number; maxPrice?: number; condition?: "new" | "used"; now?: number; days?: number };
export type Selection = {
	fetched: number;
	listings: Listing[];
	windowDays: number;
	// Number of dropped listings by reason.
	dropped: Record<string, number>;
};

const dupKey = (l: Listing) => `${normalizeTitle(l.title)}|${l.price}`;

// The first reason to drop a listing, or null.
function dropReason(l: Listing, options: SelectOptions): string | null {
	const title = rejectTitle(l.title, options);
	if (title) return title;
	if (options.condition && l.condition !== options.condition) return "condition";
	if (l.price === null || !(l.price >= MIN_PRICE)) return "price";
	return l.price < (options.minPrice ?? 0) || l.price > (options.maxPrice ?? Infinity) ? "range" : null;
}

export function selectComparable(all: Listing[], options: SelectOptions): Selection {
	const now = options.now ?? Date.now();
	const dropped: Record<string, number> = {};
	const drop = (reason: string, n = 1) => {
		if (n > 0) dropped[reason] = (dropped[reason] ?? 0) + n;
	};
	const seen = new Set<string>();
	const clean = all.filter((l) => {
		const reason = dropReason(l, options) ?? (seen.has(dupKey(l)) ? "duplicate" : null);
		if (reason) drop(reason);
		else seen.add(dupKey(l));
		return !reason;
	});
	const windowed = pickWindow(clean, now, MIN_LISTINGS, options.days);
	drop("old", clean.length - windowed.listings.length);
	const listings = trimOutliers(windowed.listings);
	drop("outlier", windowed.listings.length - listings.length);
	return { fetched: all.length, listings, windowDays: windowed.days, dropped };
}
