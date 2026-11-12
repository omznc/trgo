import { LANG_INFO, LANGS, type Lang } from "@lagano/providers/langs";

// The language data lives in the providers package, because the proxy builds the prompt from it too.
export { LANG_INFO, LANGS, type Lang };

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
// Chrome has no number data for Bosnian and groups thousands with a comma. Croatian has the same format.
export const numberTag = lang === "bs" ? "hr-HR" : langTag;

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
