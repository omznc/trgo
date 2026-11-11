export type Lang = "bs" | "en";

const KEY = "trgo-lang";
// Bosnian, Croatian, Serbian, Serbo-Croatian, Montenegrin.
const BS_FAMILY = new Set(["bs", "hr", "sr", "sh", "cnr"]);

function detectLang(): Lang {
	// The server and the tests have no window: they use Bosnian.
	if (typeof window === "undefined") return "bs";
	try {
		const saved = localStorage.getItem(KEY);
		if (saved === "bs" || saved === "en") return saved;
	} catch {}
	const primary = navigator.language.split("-")[0]?.toLowerCase() ?? "";
	return BS_FAMILY.has(primary) ? "bs" : "en";
}

export const lang: Lang = detectLang();

const rules = new Intl.PluralRules(lang);

// Picks a form by the plural rule of the app language. English has only "one" and "other".
export function plural(n: number, forms: { one: string; few: string; other: string }) {
	const rule = rules.select(n);
	return rule === "one" ? forms.one : rule === "few" ? forms.few : forms.other;
}

export function setLang(next: Lang) {
	try {
		localStorage.setItem(KEY, next);
	} catch {}
	location.reload();
}
