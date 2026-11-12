import { fetchRecent, inCurrency, PROVIDERS, queryFor, selectComparable, type Currency, type Provider, type ProviderId, type SearchQuery, type Table } from "@lagano/providers";
import { z } from "zod";
import { priceReport, type PriceReport } from "./price-stats";

// Prices are in the display currency of the market. `unit` holds its code and its label.
export type PriceUnit = { currency: Currency; label: string };

// The schema depends on the market: the sites that can be checked, and the currency of the price inputs.
export const priceCheckSchema = (ids: [ProviderId, ...ProviderId[]], unit: string) =>
	z.object({
		item: z.string().describe("Short item name for the card, for example 'PlayStation 5'."),
		query: z.string().describe("Search words, for example 'ps5'. Keep them short. Do not add the model words that the user did not say."),
		providers: z.array(z.enum(ids)).min(1).optional().describe("Check only these sites. Leave it out to check all selected sites. The search words must be in the language of the site."),
		mustInclude: z.array(z.string()).optional().describe("Extra words that every title must have, for example 'disc'."),
		exclude: z.array(z.string()).optional().describe("Words that no title may have, for example 'slim'."),
		condition: z.enum(["new", "used"]).optional(),
		minPrice: z.number().positive().optional().describe(`Lowest price in ${unit} that a real offer of this item can have. About half of the usual used price. It cuts games, cases and accessories.`),
		maxPrice: z.number().positive().optional().describe(`Highest price in ${unit} for a real offer. Use it only when the user gave a limit.`),
		days: z.number().int().min(7).max(365).optional().describe("Use only the listings of the last N days, for example 90 for 3 months. Set it only when the user asks for a period."),
	});
export type PriceCheckInput = z.infer<ReturnType<typeof priceCheckSchema>>;

export type PriceCheckOutput =
	| { item: string; loading: true; fetched: number }
	// `label` is missing in a report that was saved before the markets.
	| { item: string; report: PriceReport | null; errors: string[]; label?: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Yields the live count while the pages load, then the final result.
// Every listing is converted to the display currency before the stats, so a median never mixes currencies.
export async function* runPriceCheck(input: PriceCheckInput, providers: Provider[], unit: PriceUnit, signal?: AbortSignal, table: Table = PROVIDERS): AsyncGenerator<PriceCheckOutput> {
	const { item, query, providers: only, ...filters } = input;
	const used = only ? providers.filter((p) => only.includes(p.id)) : providers;
	let fetched = 0;
	const { minPrice, maxPrice } = filters;
	const adapt = (id: ProviderId, q: SearchQuery) => queryFor(table, unit.currency, id, q);
	const job = fetchRecent(used, query, { minPrice, maxPrice, onProgress: (n) => (fetched = n), signal, adapt });
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
	const converted = listings.map((l) => inCurrency(l, unit.currency));
	yield { item, report: priceReport(selectComparable(converted, { query, ...filters })), errors, label: unit.label };
}

// The model sees this short text, not the histogram.
export function summarize(output: PriceCheckOutput): string {
	if ("loading" in output) return "Price check did not finish.";
	const { report } = output;
	if (!report) return `No comparable priced listings. Failed providers: ${output.errors.join(", ") || "none"}. Tell the user and suggest other search words.`;
	const { stats, windowDays, trendPct } = report;
	const r = Math.round;
	const unit = output.label ?? "KM";
	return [
		`Card shown. Median ${r(stats.median)} ${unit}, usual range ${r(stats.p25)}-${r(stats.p75)} ${unit},`,
		`${stats.count} listings of the last ${windowDays} days (${report.fetched} fetched).`,
		trendPct === undefined ? "" : `Trend of the last 30 days: ${trendPct}%.`,
		stats.count < 10 ? "The sample is small. Say so." : "",
		"Answer in one or two sentences. Refer to the card. Do not repeat other numbers.",
	]
		.filter(Boolean)
		.join(" ");
}
