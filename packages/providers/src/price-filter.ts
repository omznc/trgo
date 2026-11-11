// Title filter for price checks. No AI: normalized words and one word table.

// Each entry is a regex source for one word. It matches whole words only.
export const TITLE_WORDS = {
	// Never a real offer for the item.
	reject: [
		"trazim",
		"kupujem",
		"otkup\\w*",
		"zamjen\\w*",
		"mijenjam",
		"neisprav\\w*",
		"pokvaren\\w*",
		"defekt\\w*",
		"kvar",
		"za dijelove",
		"dijelov\\w*",
		"dio",
	],
	// Accessories and add-ons. A bundle word ("konzola", "komplet") keeps the listing.
	accessory: [
		"igr(?:a|e|ic\\w*)",
		"igara",
		"cd",
		"kontroler\\w*",
		"dzojstik\\w*",
		"joystick\\w*",
		"gamepad\\w*",
		"futrol\\w*",
		"mask[aeu]",
		"torb\\w*",
		"punjac\\w*",
		"kabl\\w*",
		"kabel\\w*",
		"stalak\\w*",
		"postolje",
		"kutij[aeu]",
		"ekran\\w*",
		"display",
		"slusalic\\w*",
		"hdmi",
		"folij\\w*",
		"stakl\\w*",
		"zastit\\w*",
		"maskic\\w*",
		"silikon\\w*",
		"controllers?",
		"dualsense",
		"portal",
		"vr2?",
		"naocal\\w*",
		"headset",
		"dock",
		"case",
		"cover",
		"adapter\\w*",
	],
	bundle: ["konzol\\w*", "console", "bundle", "komplet\\w*", "paket", "(?:2|dva|dvije) kontroler\\w*"],
	// A different, usually dearer model. Dropped unless the query has the word.
	// "slim" and "digital" are not here: they are the same console at a close price.
	variant: ["pro", "mini", "max", "plus", "ultra", "lite"],
} as const;

// Spellings of one product. Both the title and the query pass through this table.
const ALIASES: [RegExp, string][] = [
	[/\bplay ?station ?(\d)\b/g, "ps$1"],
	[/\bps ?(\d)\b/g, "ps$1"],
	[/\biphone ?(\d+)/g, "iphone $1"],
	[/\bgalaxy ?s ?(\d+)/g, "galaxy s$1"],
];

export function normalizeTitle(text: string): string {
	let out = text
		.toLowerCase()
		.replace(/đ/g, "d")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
	for (const [re, to] of ALIASES) out = out.replace(re, to);
	return out;
}

const wordRe = (source: string) => new RegExp(`\\b(?:${source})\\b`);
const has = (normalized: string, words: readonly string[]) => words.some((w) => wordRe(w).test(normalized));

export type FilterOptions = { query: string; mustInclude?: string[]; exclude?: string[] };
export type Rejection = "reject" | "accessory" | "variant" | "mismatch" | "excluded";

// Returns null when the title is a real offer for the queried item.
export function rejectTitle(title: string, options: FilterOptions): Rejection | null {
	const t = normalizeTitle(title);
	const query = normalizeTitle(options.query);
	const wanted = (words: readonly string[]) => words.filter((w) => !wordRe(w).test(query));
	const must = [...query.split(" "), ...(options.mustInclude ?? []).map(normalizeTitle)].filter(Boolean);
	if (!must.every((w) => wordRe(w).test(t))) return "mismatch";
	if ((options.exclude ?? []).some((w) => w && wordRe(normalizeTitle(w)).test(t))) return "excluded";
	if (has(t, wanted(TITLE_WORDS.reject))) return "reject";
	if (!has(t, TITLE_WORDS.bundle) && has(t, wanted(TITLE_WORDS.accessory))) return "accessory";
	const asked = must.join(" ");
	if (has(t, TITLE_WORDS.variant.filter((w) => !wordRe(w).test(asked)))) return "variant";
	return null;
}
