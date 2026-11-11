import { plural } from "@/lib/lang";
import { details } from "./strings-detail";

export { plural };

const DAY = 86_400_000;

// "3 days ago" style. Returns undefined for a missing or invalid date.
export function timeAgo(iso: string | undefined, now = Date.now()): string | undefined {
	const t = iso ? Date.parse(iso) : Number.NaN;
	if (Number.isNaN(t)) return undefined;
	const ms = Math.max(0, now - t);
	const days = Math.floor(ms / DAY);
	const { ago } = details;
	if (ms < 3_600_000) return ago.now;
	if (days < 1) return ago.today;
	if (days === 1) return ago.yesterday;
	if (days < 7) return ago.days(days);
	if (days < 30) return ago.weeks(Math.floor(days / 7));
	if (days < 365) return ago.months(Math.floor(days / 30));
	return ago.years(Math.floor(days / 365));
}
