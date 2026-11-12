// One UI language for each market, and English.
export const LANGS = ["bs", "hr", "sr", "sl", "de", "bg", "en"] as const;
export type Lang = (typeof LANGS)[number];

// name: the name in its own language, for the menu. english: the name in the model prompt.
// tag: the BCP 47 tag for the page and for Intl. Serbian is in Latin script, like the Serbian sites.
export const LANG_INFO: Record<Lang, { name: string; english: string; tag: string }> = {
	bs: { name: "Bosanski", english: "Bosnian", tag: "bs-BA" },
	hr: { name: "Hrvatski", english: "Croatian", tag: "hr-HR" },
	sr: { name: "Srpski", english: "Serbian (Latin script)", tag: "sr-Latn-RS" },
	sl: { name: "Slovenščina", english: "Slovenian", tag: "sl-SI" },
	de: { name: "Deutsch", english: "German", tag: "de-AT" },
	bg: { name: "Български", english: "Bulgarian", tag: "bg-BG" },
	en: { name: "English", english: "English", tag: "en-US" },
};

const KEY = "trgo-lang";
// Serbo-Croatian and Montenegrin have no UI of their own. Bosnian is the nearest one.
const ALIASES: Record<string, Lang> = { sh: "bs", cnr: "bs" };

const isLang = (value: string | null): value is Lang => (LANGS as readonly string[]).includes(value ?? "");

function detectLang(): Lang {
	// The server and the tests have no window: they use Bosnian.
	if (typeof window === "undefined") return "bs";
	try {
		const saved = localStorage.getItem(KEY);
		if (isLang(saved)) return saved;
	} catch {}
	const primary = navigator.language.split("-")[0]?.toLowerCase() ?? "";
	return isLang(primary) ? primary : (ALIASES[primary] ?? "en");
}

export const lang: Lang = detectLang();
export const langTag = LANG_INFO[lang].tag;

const rules = new Intl.PluralRules(langTag);

// Picks a form by the plural rule of the app language. English, German and Bulgarian have only "one" and "other".
// Slovenian also has "two". A form set without "two" uses "few" for it.
export function plural(n: number, forms: { one: string; two?: string; few: string; other: string }) {
	const rule = rules.select(n);
	if (rule === "one") return forms.one;
	if (rule === "two") return forms.two ?? forms.few;
	return rule === "few" ? forms.few : forms.other;
}

export function setLang(next: Lang) {
	try {
		localStorage.setItem(KEY, next);
	} catch {}
	location.reload();
}
