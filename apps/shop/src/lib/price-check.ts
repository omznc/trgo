import { fetchRecent, selectComparable, type Provider } from "@lagano/providers";
import { z } from "zod";
import { priceReport, type PriceReport } from "./price-stats";

export const priceCheckSchema = z.object({
	item: z.string().describe("Short item name for the card, for example 'PlayStation 5'."),
	query: z.string().describe("Search words, for example 'ps5'. Keep them short. Do not add the model words that the user did not say."),
	mustInclude: z.array(z.string()).optional().describe("Extra words that every title must have, for example 'disc'."),
	exclude: z.array(z.string()).optional().describe("Words that no title may have, for example 'slim'."),
	condition: z.enum(["new", "used"]).optional(),
	minPrice: z.number().positive().optional().describe("Lowest price in KM that a real offer of this item can have. About half of the usual used price. It cuts games, cases and accessories."),
	maxPrice: z.number().positive().optional().describe("Highest price in KM for a real offer. Use it only when the user gave a limit."),
	days: z.number().int().min(7).max(365).optional().describe("Use only the listings of the last N days, for example 90 for 3 months. Set it only when the user asks for a period."),
});
export type PriceCheckInput = z.infer<typeof priceCheckSchema>;

export type PriceCheckOutput =
	| { item: string; loading: true; fetched: number }
	| { item: string; report: PriceReport | null; errors: string[] };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Yields the live count while the pages load, then the final result.
export async function* runPriceCheck(input: PriceCheckInput, providers: Provider[], signal?: AbortSignal): AsyncGenerator<PriceCheckOutput> {
	const { item, query, ...filters } = input;
	let fetched = 0;
	const { minPrice, maxPrice } = filters;
	const job = fetchRecent(providers, query, { minPrice, maxPrice, onProgress: (n) => (fetched = n), signal });
	let done = false;
	// fetchRecent never rejects: it reports a failed provider in `errors`.
	void job.then(() => (done = true));
	// An abort ends the poll. The page requests stop through the same signal.
	while (!done && !signal?.aborted) {
		yield { item, loading: true, fetched };
		await Promise.race([job, sleep(250)]);
	}
	if (signal?.aborted) return;
	const { listings, errors } = await job;
	yield { item, report: priceReport(selectComparable(listings, { query, ...filters })), errors };
}

// The model sees this short text, not the histogram.
export function summarize(output: PriceCheckOutput): string {
	if ("loading" in output) return "Price check did not finish.";
	const { report } = output;
	if (!report) return `No comparable priced listings. Failed providers: ${output.errors.join(", ") || "none"}. Tell the user and suggest other search words.`;
	const { stats, windowDays, trendPct } = report;
	const r = Math.round;
	return [
		`Card shown. Median ${r(stats.median)} KM, usual range ${r(stats.p25)}-${r(stats.p75)} KM,`,
		`${stats.count} listings of the last ${windowDays} days (${report.fetched} fetched).`,
		trendPct === undefined ? "" : `Trend of the last 30 days: ${trendPct}%.`,
		stats.count < 10 ? "The sample is small. Say so." : "",
		"Answer in one or two sentences. Refer to the card. Do not repeat other numbers.",
	]
		.filter(Boolean)
		.join(" ");
}
