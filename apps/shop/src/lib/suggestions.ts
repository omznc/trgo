import { useSyncExternalStore } from "react";

export type Kind = "search" | "price" | "sell";

export type Suggestion = {
	kind: Kind;
	text: string;
	// Search words for the live check in scripts/check-suggestions.ts.
	q: string;
	// Price ceiling in KM, search only.
	max?: number;
	// Months 1-12 in which the prompt is in season. No value means all year.
	months?: number[];
};

const WINTER = [10, 11, 12, 1, 2];
const SUMMER = [5, 6, 7, 8];
const SCHOOL = [8, 9];

const s = (text: string, q: string, max?: number, months?: number[]): Omit<Suggestion, "kind"> => ({ text, q, max, months });
const search = (text: string, q: string, max: number, months?: number[]): Suggestion => ({ kind: "search", ...s(text, q, max, months) });
const price = (text: string, q: string, months?: number[]): Suggestion => ({ kind: "price", ...s(text, q, undefined, months) });
const sell = (text: string, q: string, months?: number[]): Suggestion => ({ kind: "sell", ...s(text, q, undefined, months) });

// Search texts start with "Nađi ": the composer placeholder cuts that word.
export const POOL: Suggestion[] = [
	search("Nađi iPhone 12 ispod 700 KM", "iphone 12", 700),
	search("Nađi Samsung Galaxy S21 do 500 KM", "samsung galaxy s21", 500),
	search("Nađi Xiaomi telefon ispod 300 KM", "xiaomi", 300),
	search("Nađi polovni laptop za faks do 800 KM", "laptop", 800),
	search("Nađi MacBook Air do 1500 KM", "macbook air", 1500),
	search("Nađi PlayStation 5 ispod 900 KM", "playstation 5", 900),
	search("Nađi Nintendo Switch do 450 KM", "nintendo switch", 450),
	search("Nađi 3D printer do 500 KM", "3d printer", 500),
	search("Nađi gaming PC do 1500 KM", "gaming pc", 1500),
	search("Nađi RTX 3060 ispod 600 KM", "rtx 3060", 600),
	search("Nađi LED TV 55 inča do 700 KM", "tv 55", 700),
	search("Nađi bicikl za dijete do 200 KM", "bicikl dječiji", 200),
	search("Nađi električni bicikl do 2000 KM", "električni bicikl", 2000),
	search("Nađi ugaonu garnituru u Sarajevu do 1000 KM", "ugaona garnitura", 1000),
	search("Nađi veš mašinu u Tuzli do 500 KM", "veš mašina", 500),
	search("Nađi frižider u Banjoj Luci do 600 KM", "frižider", 600),
	search("Nađi aluminijske felge 16 ispod 500 KM", "felge 16", 500),
	search("Nađi dječija kolica do 400 KM", "dječija kolica", 400),
	search("Nađi aku bušilicu do 200 KM", "aku bušilica", 200),
	search("Nađi Canon fotoaparat do 700 KM", "canon fotoaparat", 700),
	search("Nađi pametni sat do 250 KM", "pametni sat", 250),
	search("Nađi bežične slušalice do 100 KM", "bežične slušalice", 100),
	search("Nađi dron do 500 KM", "dron", 500),
	search("Nađi zimske gume 205/55 R16 do 300 KM", "zimske gume 205/55 r16", 300, WINTER),
	search("Nađi skije sa vezovima do 300 KM", "skije", 300, [11, 12, 1, 2]),
	search("Nađi peć na drva ispod 500 KM", "peć na drva", 500, WINTER),
	search("Nađi radijator grijalicu do 100 KM", "grijalica", 100, WINTER),
	search("Nađi klima uređaj do 800 KM", "klima uređaj", 800, SUMMER),
	search("Nađi baštenski set do 400 KM", "baštenski set", 400, [4, 5, 6, 7, 8]),
	search("Nađi šator za kampovanje do 200 KM", "šator", 200, SUMMER),
	search("Nađi ljetne gume 195/65 R15 do 250 KM", "ljetne gume 195/65 r15", 250, [3, 4, 5]),
	search("Nađi laptop za školu do 700 KM", "laptop", 700, SCHOOL),
	search("Nađi školski ruksak do 60 KM", "ruksak", 60, SCHOOL),

	price("Koliko vrijedi moj iPhone 13?", "iphone 13"),
	price("Koliko mogu dobiti za Samsung Galaxy S22?", "samsung galaxy s22"),
	price("Koliko vrijedi PlayStation 4?", "playstation 4"),
	price("Koliko mogu dobiti za svoj laptop Lenovo ThinkPad?", "thinkpad"),
	price("Koliko vrijedi Xbox Series S?", "xbox series s"),
	price("Koliko mogu dobiti za planinski bicikl?", "planinski bicikl"),
	price("Koliko vrijedi RTX 3070?", "rtx 3070"),
	price("Koliko vrijedi pametni TV od 50 inča?", "tv 50"),
	price("Koliko mogu dobiti za usisivač Dyson?", "dyson"),
	price("Koliko vrijedi Nintendo Switch?", "nintendo switch"),
	price("Koliko vrijedi dječiji krevetac?", "krevetac"),
	price("Koliko mogu dobiti za zimske gume?", "zimske gume", WINTER),
	price("Koliko vrijedi komplet skija?", "skije", [11, 12, 1, 2]),
	price("Koliko vrijedi klima uređaj?", "klima uređaj", SUMMER),
	price("Koliko mogu dobiti za električni bicikl?", "električni bicikl", SUMMER),

	sell("Objavi oglas za slušalice", "slušalice"),
	sell("Prodaj moj iPhone 11", "iphone 11"),
	sell("Objavi oglas za PlayStation 4", "playstation 4"),
	sell("Prodaj moj laptop", "laptop"),
	sell("Objavi oglas za dječija kolica", "dječija kolica"),
	sell("Prodaj bicikl", "bicikl"),
	sell("Objavi oglas za ugaonu garnituru", "ugaona garnitura"),
	sell("Prodaj komplet alata", "alat"),
	sell("Objavi oglas za veš mašinu", "veš mašina"),
	sell("Prodaj grafičku karticu", "grafička kartica"),
	sell("Objavi oglas za auto felge", "felge"),
	sell("Prodaj zimske gume", "zimske gume", WINTER),
	sell("Objavi oglas za skije", "skije", [11, 12, 1, 2]),
	sell("Prodaj peć na drva", "peć na drva", WINTER),
	sell("Objavi oglas za baštenski namještaj", "baštenski set", [4, 5, 6, 7, 8]),
	sell("Prodaj školske knjige", "školske knjige", SCHOOL),
];

const KINDS: Kind[] = ["search", "price", "sell"];

// Seasonal prompts count double, so they show up often but not every time.
function candidates(kind: Kind, month: number): Suggestion[] {
	return POOL.filter((p) => p.kind === kind && (!p.months || p.months.includes(month))).flatMap((p) => (p.months ? [p, p] : [p]));
}

/** One prompt of each type, in the order of KINDS. `month` is 1-12. */
export function pickSuggestions(month: number, rnd: () => number = Math.random): Suggestion[] {
	return KINDS.map((kind) => {
		const list = candidates(kind, month);
		return list[Math.floor(rnd() * list.length)] as Suggestion;
	});
}

/** Text for the composer placeholder, for example "Npr. 3D printer do 500 KM". */
export const placeholderOf = (p: Suggestion) => `Npr. ${p.text.replace(/^Nađi /, "")}`;

type Picks = { chips: string[]; placeholder: string };

const toPicks = (list: Suggestion[], placeholderSource: Suggestion): Picks => ({
	chips: list.map((p) => p.text),
	placeholder: placeholderOf(placeholderSource),
});

// The server and the first client render use this. The chips are still hidden by the load animation then.
const SERVER_PICKS = toPicks(pickSuggestions(1, () => 0), POOL[0] as Suggestion);

let clientPicks: Picks | undefined;
function getClientPicks(): Picks {
	if (!clientPicks) {
		const month = new Date().getMonth() + 1;
		const list = pickSuggestions(month);
		const searches = candidates("search", month);
		clientPicks = toPicks(list, searches[Math.floor(Math.random() * searches.length)] as Suggestion);
	}
	return clientPicks;
}

const noSubscribe = () => () => {};

/** Random picks for one page load. React swaps from the server picks to the client picks without a hydration warning. */
export function useSuggestions(): Picks {
	return useSyncExternalStore(noSubscribe, getClientPicks, () => SERVER_PICKS);
}
