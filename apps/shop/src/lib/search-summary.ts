import { KP_UNAVAILABLE, PROVIDER_IDS, PROVIDERS, type ProviderId } from "@lagano/providers";

export type SearchCard = {
	provider: ProviderId;
	id: string;
	title: string;
	price: string;
	// The price in the unit of the search, so one number compares across currencies.
	value: number | null;
	city?: string;
	url: string;
	imageUrl?: string;
	condition?: "new" | "used";
	postedAt?: string;
};

export type SearchError = { provider: string; message?: string };

export type SearchToolOutput = {
	total: number;
	errors: SearchError[];
	days?: number;
	listings: SearchCard[];
	// The providers that the search asked. A chat saved before has no list.
	searched?: string[];
	// The label of the price unit, for example "KM". A chat saved before has none: it was KM.
	unit?: string;
};

const TOP = 12;
const DAY_MS = 86_400_000;

export const isUnavailable = (e: SearchError) => e.message === KP_UNAVAILABLE;

// The searched providers in registry order. An old output falls back to the providers that it shows.
export function searchedOf(output: { searched?: string[]; listings: { provider: string }[]; errors: { provider: string }[] }): ProviderId[] {
	const known = output.searched ?? [...output.listings, ...output.errors].map((x) => x.provider);
	const ids = PROVIDER_IDS.filter((id) => known.includes(id));
	return ids.length ? ids : ["olx", "svex"];
}

// "1.250 KM" -> 1250. A listing without a number sorts last.
export function priceValue(text: string) {
	const n = Number.parseFloat(text.replaceAll(".", "").replace(",", ".").replace(/[^\d.]/g, ""));
	return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

// The number to sort by: one currency for the whole search. A chat saved before has no `value`: its text is in one currency.
export const sortValue = (card: { value?: number | null; price: string }) => (card.value === undefined ? priceValue(card.price) : (card.value ?? Number.POSITIVE_INFINITY));

function median(sorted: number[]) {
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function line(l: SearchCard, now: number) {
	const age = l.postedAt ? Math.floor((now - Date.parse(l.postedAt)) / DAY_MS) : null;
	const parts = [`${l.provider}:${l.id}`, l.title.slice(0, 60), l.price, l.city, l.condition, age === null || Number.isNaN(age) ? undefined : `${age}d`];
	return `- ${parts.filter(Boolean).join(" | ")}`;
}

function failedText(errors: SearchError[]) {
	const down = errors.filter(isUnavailable).map((e) => `${PROVIDERS[e.provider as ProviderId]?.siteName ?? e.provider} (${e.provider}) is not available right now.`);
	const others = errors.filter((e) => !isUnavailable(e)).map((e) => e.provider);
	return [...down, ...(others.length ? [`Failed providers: ${others.join(", ")}.`] : [])].map((t) => ` ${t}`).join("");
}

// The model sees this short text. The UI part keeps all the listings.
export function summarizeSearch(output: SearchToolOutput, now = Date.now()): string {
	const { listings, errors, total, days } = output;
	const failed = failedText(errors);
	if (listings.length === 0) return `No listings found${days ? ` in the last ${days} days` : ""}.${failed} Tell the user.`;
	const by = (p: string) => listings.filter((l) => l.provider === p).length;
	const prices = listings.flatMap((l) => (l.value ? [l.value] : [])).sort((a, b) => a - b);
	const range = prices.length ? ` Price ${output.unit ?? "KM"}: min ${Math.round(prices[0]!)}, median ${Math.round(median(prices))}, max ${Math.round(prices.at(-1)!)}.` : "";
	return [
		`The user sees all ${listings.length} listings as cards (${searchedOf(output).map((id) => `${PROVIDERS[id].name} ${by(id)}`).join(", ")}; ${total} found on the sites${days ? `; only the last ${days} days` : ""}).${range}${failed}`,
		`First ${Math.min(TOP, listings.length)}, format provider:id | title | price | city | condition | age:`,
		...listings.slice(0, TOP).map((l) => line(l, now)),
		"Do not repeat the list. Refer to the cards.",
	].join("\n");
}
