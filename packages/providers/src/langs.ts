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
