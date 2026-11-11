import { useSyncExternalStore } from "react";
import { lang } from "./lang";

export type Kind = "search" | "price" | "sell";

export type Suggestion = {
	kind: Kind;
	// Bosnian prompt.
	text: string;
	// English prompt.
	en: string;
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

const s = (text: string, en: string, q: string, max?: number, months?: number[]): Omit<Suggestion, "kind"> => ({ text, en, q, max, months });
const search = (text: string, en: string, q: string, max: number, months?: number[]): Suggestion => ({ kind: "search", ...s(text, en, q, max, months) });
const price = (text: string, en: string, q: string, months?: number[]): Suggestion => ({ kind: "price", ...s(text, en, q, undefined, months) });
const sell = (text: string, en: string, q: string, months?: number[]): Suggestion => ({ kind: "sell", ...s(text, en, q, undefined, months) });

// Search texts start with "Nađi " or "Find ": the composer placeholder cuts that word.
export const POOL: Suggestion[] = [
	search("Nađi iPhone 12 ispod 700 KM", "Find an iPhone 12 under 700 KM", "iphone 12", 700),
	search("Nađi Samsung Galaxy S21 do 500 KM", "Find a Samsung Galaxy S21 up to 500 KM", "samsung galaxy s21", 500),
	search("Nađi Xiaomi telefon ispod 300 KM", "Find a Xiaomi phone under 300 KM", "xiaomi", 300),
	search("Nađi polovni laptop za faks do 800 KM", "Find a used laptop for university up to 800 KM", "laptop", 800),
	search("Nađi MacBook Air do 1500 KM", "Find a MacBook Air up to 1500 KM", "macbook air", 1500),
	search("Nađi PlayStation 5 ispod 900 KM", "Find a PlayStation 5 under 900 KM", "playstation 5", 900),
	search("Nađi Nintendo Switch do 450 KM", "Find a Nintendo Switch up to 450 KM", "nintendo switch", 450),
	search("Nađi 3D printer do 500 KM", "Find a 3D printer up to 500 KM", "3d printer", 500),
	search("Nađi gaming PC do 1500 KM", "Find a gaming PC up to 1500 KM", "gaming pc", 1500),
	search("Nađi RTX 3060 ispod 600 KM", "Find an RTX 3060 under 600 KM", "rtx 3060", 600),
	search("Nađi LED TV 55 inča do 700 KM", "Find a 55 inch LED TV up to 700 KM", "tv 55", 700),
	search("Nađi bicikl za dijete do 200 KM", "Find a child's bike up to 200 KM", "bicikl dječiji", 200),
	search("Nađi električni bicikl do 2000 KM", "Find an electric bike up to 2000 KM", "električni bicikl", 2000),
	search("Nađi ugaonu garnituru u Sarajevu do 1000 KM", "Find a corner sofa in Sarajevo up to 1000 KM", "ugaona garnitura", 1000),
	search("Nađi veš mašinu u Tuzli do 500 KM", "Find a washing machine in Tuzla up to 500 KM", "veš mašina", 500),
	search("Nađi frižider u Banjoj Luci do 600 KM", "Find a fridge in Banja Luka up to 600 KM", "frižider", 600),
	search("Nađi aluminijske felge 16 ispod 500 KM", "Find 16 inch alloy wheels under 500 KM", "felge 16", 500),
	search("Nađi dječija kolica do 400 KM", "Find a baby stroller up to 400 KM", "dječija kolica", 400),
	search("Nađi aku bušilicu do 200 KM", "Find a cordless drill up to 200 KM", "aku bušilica", 200),
	search("Nađi Canon fotoaparat do 700 KM", "Find a Canon camera up to 700 KM", "canon fotoaparat", 700),
	search("Nađi pametni sat do 250 KM", "Find a smartwatch up to 250 KM", "pametni sat", 250),
	search("Nađi bežične slušalice do 100 KM", "Find wireless headphones up to 100 KM", "bežične slušalice", 100),
	search("Nađi dron do 500 KM", "Find a drone up to 500 KM", "dron", 500),
	search("Nađi zimske gume 205/55 R16 do 300 KM", "Find winter tyres 205/55 R16 up to 300 KM", "zimske gume 205/55 r16", 300, WINTER),
	search("Nađi skije sa vezovima do 300 KM", "Find skis with bindings up to 300 KM", "skije", 300, [11, 12, 1, 2]),
	search("Nađi peć na drva ispod 500 KM", "Find a wood stove under 500 KM", "peć na drva", 500, WINTER),
	search("Nađi radijator grijalicu do 100 KM", "Find a radiator heater up to 100 KM", "grijalica", 100, WINTER),
	search("Nađi klima uređaj do 800 KM", "Find an air conditioner up to 800 KM", "klima uređaj", 800, SUMMER),
	search("Nađi baštenski set do 400 KM", "Find a garden set up to 400 KM", "baštenski set", 400, [4, 5, 6, 7, 8]),
	search("Nađi šator za kampovanje do 200 KM", "Find a camping tent up to 200 KM", "šator", 200, SUMMER),
	search("Nađi ljetne gume 195/65 R15 do 250 KM", "Find summer tyres 195/65 R15 up to 250 KM", "ljetne gume 195/65 r15", 250, [3, 4, 5]),
	search("Nađi laptop za školu do 700 KM", "Find a laptop for school up to 700 KM", "laptop", 700, SCHOOL),
	search("Nađi školski ruksak do 60 KM", "Find a school backpack up to 60 KM", "ruksak", 60, SCHOOL),

	price("Koliko vrijedi moj iPhone 13?", "How much is my iPhone 13 worth?", "iphone 13"),
	price("Koliko mogu dobiti za Samsung Galaxy S22?", "How much can I get for a Samsung Galaxy S22?", "samsung galaxy s22"),
	price("Koliko vrijedi PlayStation 4?", "How much is a PlayStation 4 worth?", "playstation 4"),
	price("Koliko mogu dobiti za svoj laptop Lenovo ThinkPad?", "How much can I get for my Lenovo ThinkPad laptop?", "thinkpad"),
	price("Koliko vrijedi Xbox Series S?", "How much is an Xbox Series S worth?", "xbox series s"),
	price("Koliko mogu dobiti za planinski bicikl?", "How much can I get for a mountain bike?", "planinski bicikl"),
	price("Koliko vrijedi RTX 3070?", "How much is an RTX 3070 worth?", "rtx 3070"),
	price("Koliko vrijedi pametni TV od 50 inča?", "How much is a 50 inch smart TV worth?", "tv 50"),
	price("Koliko mogu dobiti za usisivač Dyson?", "How much can I get for a Dyson vacuum cleaner?", "dyson"),
	price("Koliko vrijedi Nintendo Switch?", "How much is a Nintendo Switch worth?", "nintendo switch"),
	price("Koliko vrijedi dječiji krevetac?", "How much is a baby cot worth?", "krevetac"),
	price("Koliko mogu dobiti za zimske gume?", "How much can I get for winter tyres?", "zimske gume", WINTER),
	price("Koliko vrijedi komplet skija?", "How much is a set of skis worth?", "skije", [11, 12, 1, 2]),
	price("Koliko vrijedi klima uređaj?", "How much is an air conditioner worth?", "klima uređaj", SUMMER),
	price("Koliko mogu dobiti za električni bicikl?", "How much can I get for an electric bike?", "električni bicikl", SUMMER),

	sell("Objavi oglas za slušalice", "Post a listing for headphones", "slušalice"),
	sell("Prodaj moj iPhone 11", "Sell my iPhone 11", "iphone 11"),
	sell("Objavi oglas za PlayStation 4", "Post a listing for a PlayStation 4", "playstation 4"),
	sell("Prodaj moj laptop", "Sell my laptop", "laptop"),
	sell("Objavi oglas za dječija kolica", "Post a listing for a baby stroller", "dječija kolica"),
	sell("Prodaj bicikl", "Sell a bike", "bicikl"),
	sell("Objavi oglas za ugaonu garnituru", "Post a listing for a corner sofa", "ugaona garnitura"),
	sell("Prodaj komplet alata", "Sell a tool set", "alat"),
	sell("Objavi oglas za veš mašinu", "Post a listing for a washing machine", "veš mašina"),
	sell("Prodaj grafičku karticu", "Sell a graphics card", "grafička kartica"),
	sell("Objavi oglas za auto felge", "Post a listing for car wheels", "felge"),
	sell("Prodaj zimske gume", "Sell winter tyres", "zimske gume", WINTER),
	sell("Objavi oglas za skije", "Post a listing for skis", "skije", [11, 12, 1, 2]),
	sell("Prodaj peć na drva", "Sell a wood stove", "peć na drva", WINTER),
	sell("Objavi oglas za baštenski namještaj", "Post a listing for garden furniture", "baštenski set", [4, 5, 6, 7, 8]),
	sell("Prodaj školske knjige", "Sell school books", "školske knjige", SCHOOL),
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

const textOf = (p: Suggestion) => (lang === "en" ? p.en : p.text);

/** Text for the composer placeholder, for example "Npr. 3D printer do 500 KM". */
export const placeholderOf = (p: Suggestion) =>
	lang === "en" ? `E.g. ${p.en.replace(/^Find (an? )?/, "")}` : `Npr. ${p.text.replace(/^Nađi /, "")}`;

type Picks = { chips: string[]; placeholder: string };

const toPicks = (list: Suggestion[], placeholderSource: Suggestion): Picks => ({
	chips: list.map(textOf),
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
