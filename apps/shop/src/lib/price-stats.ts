import { quantile, type Selection } from "@lagano/providers";

export type Bucket = { from: number; to: number; count: number };
export type PriceStats = { count: number; min: number; max: number; lo: number; hi: number; median: number; p25: number; p75: number; buckets: Bucket[]; peak: number };
export type PriceReport = {
	stats: PriceStats;
	fetched: number;
	windowDays: number;
	// Number of dropped listings by reason.
	dropped: Record<string, number>;
	newMedian?: number;
	usedMedian?: number;
	// Change of the median of the last 30 days against the rest of the window, in percent.
	trendPct?: number;
};

const BINS = 12;
const MIN_SIDE = 5;
// A trend compares two medians, so each side needs more prices.
const MIN_TREND = 15;
const DAY_MS = 86_400_000;

// Prices of 0, null or NaN ("Na upit") are ignored. Returns null when no price is left.
export function priceStats(prices: (number | null | undefined)[]): PriceStats | null {
	const sorted = prices.filter((p): p is number => typeof p === "number" && Number.isFinite(p) && p > 0).sort((a, b) => a - b);
	if (sorted.length === 0) return null;
	const min = sorted[0]!;
	const max = sorted.at(-1)!;
	// The chart spans p5-p95, so one 5 000 KM listing does not squash the bars. Tails go in the edge bars.
	const wide = sorted.length >= 20;
	const lo = wide ? quantile(sorted, 0.05) : min;
	const hi = wide ? quantile(sorted, 0.95) : max;
	const n = lo === hi ? 1 : BINS;
	const width = (hi - lo) / n;
	const buckets: Bucket[] = Array.from({ length: n }, (_, i) => ({ from: lo + i * width, to: lo + (i + 1) * width, count: 0 }));
	for (const p of sorted) buckets[width === 0 ? 0 : Math.max(0, Math.min(n - 1, Math.floor((p - lo) / width)))]!.count++;
	const peak = buckets.reduce((best, b, i) => (b.count > buckets[best]!.count ? i : best), 0);
	return { count: sorted.length, min, max, lo, hi, median: quantile(sorted, 0.5), p25: quantile(sorted, 0.25), p75: quantile(sorted, 0.75), buckets, peak };
}

// Median of a group, only when the group has enough prices.
function medianOf(prices: number[], min = MIN_SIDE): number | undefined {
	return prices.length < min ? undefined : priceStats(prices)?.median;
}

export function priceReport(selection: Selection, now = Date.now()): PriceReport | null {
	const { listings } = selection;
	const stats = priceStats(listings.map((l) => l.price));
	if (!stats) return null;
	const prices = (keep: (l: (typeof listings)[number]) => boolean) => listings.filter(keep).map((l) => l.price!);
	const isRecent = (l: (typeof listings)[number]) => now - Date.parse(l.postedAt!) <= 30 * DAY_MS;
	const recent = medianOf(prices(isRecent), MIN_TREND);
	const rest = medianOf(prices((l) => !isRecent(l)), MIN_TREND);
	return {
		stats,
		fetched: selection.fetched,
		windowDays: selection.windowDays,
		dropped: selection.dropped,
		newMedian: medianOf(prices((l) => l.condition === "new")),
		usedMedian: medianOf(prices((l) => l.condition === "used")),
		trendPct: recent && rest ? Math.round((recent / rest - 1) * 100) : undefined,
	};
}
