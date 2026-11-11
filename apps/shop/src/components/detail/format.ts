const rules = new Intl.PluralRules("bs");

// Bosnian has three forms: 1 (one), 2-4 (few), 5+ (other).
export function plural(n: number, forms: { one: string; few: string; other: string }) {
	const rule = rules.select(n);
	return rule === "one" ? forms.one : rule === "few" ? forms.few : forms.other;
}

const DAY = 86_400_000;

// "prije 3 dana" style. Returns undefined for a missing or invalid date.
export function timeAgo(iso: string | undefined, now = Date.now()): string | undefined {
	const t = iso ? Date.parse(iso) : Number.NaN;
	if (Number.isNaN(t)) return undefined;
	const ms = Math.max(0, now - t);
	const days = Math.floor(ms / DAY);
	if (ms < 3_600_000) return "upravo sada";
	if (days < 1) return "danas";
	if (days === 1) return "jučer";
	if (days < 7) return `prije ${days} ${plural(days, { one: "dan", few: "dana", other: "dana" })}`;
	if (days < 30) {
		const w = Math.floor(days / 7);
		return `prije ${w} ${plural(w, { one: "sedmicu", few: "sedmice", other: "sedmica" })}`;
	}
	if (days < 365) {
		const m = Math.floor(days / 30);
		return `prije ${m} ${plural(m, { one: "mjesec", few: "mjeseca", other: "mjeseci" })}`;
	}
	const y = Math.floor(days / 365);
	return `prije ${y} ${plural(y, { one: "godinu", few: "godine", other: "godina" })}`;
}
