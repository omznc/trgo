import { PROVIDER_IDS, PROVIDERS, type ProviderId } from "@lagano/providers";

export type SearchCard = {
	provider: ProviderId;
	id: string;
	title: string;
	price: string;
	value: number | null;
	city?: string;
	url: string;
	imageUrl?: string;
	condition?: "new" | "used";
	postedAt?: string;
};

export type SearchToolOutput = {
	total: number;
	errors: { provider: string }[];
	days?: number;
	listings: SearchCard[];
};

const TOP = 12;
const DAY_MS = 86_400_000;

function median(sorted: number[]) {
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function line(l: SearchCard, now: number) {
	const age = l.postedAt ? Math.floor((now - Date.parse(l.postedAt)) / DAY_MS) : null;
	const parts = [`${l.provider}:${l.id}`, l.title.slice(0, 60), l.price, l.city, l.condition, age === null || Number.isNaN(age) ? undefined : `${age}d`];
	return `- ${parts.filter(Boolean).join(" | ")}`;
}

// The model sees this short text. The UI part keeps all the listings.
export function summarizeSearch(output: SearchToolOutput, now = Date.now()): string {
	const { listings, errors, total, days } = output;
	if (listings.length === 0) {
		const failed = errors.map((e) => e.provider).join(", ");
		return `No listings found${days ? ` in the last ${days} days` : ""}.${failed ? ` Failed providers: ${failed}.` : ""} Tell the user.`;
	}
	const by = (p: string) => listings.filter((l) => l.provider === p).length;
	const prices = listings.flatMap((l) => (l.value ? [l.value] : [])).sort((a, b) => a - b);
	const range = prices.length ? ` Price ${PROVIDERS[listings[0]!.provider].currencyLabel}: min ${prices[0]}, median ${Math.round(median(prices))}, max ${prices.at(-1)}.` : "";
	const failed = errors.length ? ` Failed providers: ${errors.map((e) => e.provider).join(", ")}.` : "";
	return [
		`The user sees all ${listings.length} listings as cards (${PROVIDER_IDS.map((id) => `${PROVIDERS[id].name} ${by(id)}`).join(", ")}; ${total} found on the sites${days ? `; only the last ${days} days` : ""}).${range}${failed}`,
		`First ${Math.min(TOP, listings.length)}, format provider:id | title | price | city | condition | age:`,
		...listings.slice(0, TOP).map((l) => line(l, now)),
		"Do not repeat the list. Refer to the cards.",
	].join("\n");
}
