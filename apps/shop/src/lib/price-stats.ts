export type Bucket = { from: number; to: number; count: number };
export type PriceStats = { count: number; min: number; max: number; median: number; p25: number; p75: number; buckets: Bucket[]; peak: number };

const BINS = 12;

// Linear interpolation between the closest ranks. The input is sorted.
function quantile(sorted: number[], q: number) {
	const pos = (sorted.length - 1) * q;
	const lo = Math.floor(pos);
	const hi = Math.ceil(pos);
	return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

// Prices of 0, null or NaN ("Na upit") are ignored. Returns null when no price is left.
export function priceStats(prices: (number | null | undefined)[]): PriceStats | null {
	const sorted = prices.filter((p): p is number => typeof p === "number" && Number.isFinite(p) && p > 0).sort((a, b) => a - b);
	if (sorted.length === 0) return null;
	const min = sorted[0]!;
	const max = sorted.at(-1)!;
	const n = min === max ? 1 : BINS;
	const width = (max - min) / n;
	const buckets: Bucket[] = Array.from({ length: n }, (_, i) => ({ from: min + i * width, to: min + (i + 1) * width, count: 0 }));
	for (const p of sorted) buckets[width === 0 ? 0 : Math.min(n - 1, Math.floor((p - min) / width))]!.count++;
	const peak = buckets.reduce((best, b, i) => (b.count > buckets[best]!.count ? i : best), 0);
	return { count: sorted.length, min, max, median: quantile(sorted, 0.5), p25: quantile(sorted, 0.25), p75: quantile(sorted, 0.75), buckets, peak };
}
