import { availableTable, displayCurrency, displayLabel, marketSelection, parseSelection, PROVIDERS, type ProviderId } from "@lagano/providers";
import { useSyncExternalStore } from "react";
import { extensionVersion } from "./extension";
import { lang } from "./lang";
import { proxyUrl } from "./publish";

// The saved market choice: a JSON list of provider ids.
const KEY = "trgo-market";

// The providers that work now. Njuškalo needs the extension, so a saved choice or /geo never picks it without it.
const available = () => availableTable(PROVIDERS, extensionVersion() !== null);

// The server and the first render use the default market. Browser storage is read after mount.
let selection: ProviderId[] = marketSelection(PROVIDERS, null);
let started = false;
// A choice by the user (saved or made while /geo loads) always wins over /geo.
let chosen = false;
const listeners = new Set<() => void>();

const publish = (next: ProviderId[]) => {
	selection = next;
	for (const l of listeners) l();
};

export const getSelection = () => selection;
export const useSelection = () =>
	useSyncExternalStore(
		(l) => (listeners.add(l), () => void listeners.delete(l)),
		getSelection,
		getSelection,
	);

// Chrome has no Bosnian region names in Intl, so the market countries have their own.
const BS_COUNTRIES: Record<string, string> = { BA: "Bosna i Hercegovina", HR: "Hrvatska", RS: "Srbija", SI: "Slovenija", AT: "Austrija", BG: "Bugarska" };

// "Croatia" or "Hrvatska", in the language of the app.
export function countryName(code: string) {
	if (lang === "bs" && BS_COUNTRIES[code]) return BS_COUNTRIES[code];
	try {
		return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code;
	} catch {
		return code;
	}
}

// The display currency and its label for a selection.
export const currencyOf = (ids: readonly string[] = selection) => displayCurrency(PROVIDERS, ids);
export const labelOf = (ids: readonly string[] = selection) => displayLabel(PROVIDERS, ids);

// Saves an explicit choice of the user. The choice is never replaced by /geo.
export function chooseMarket(next: ProviderId[]) {
	chosen = true;
	try {
		localStorage.setItem(KEY, JSON.stringify(next));
	} catch {}
	publish(next);
}

function readSaved(): ProviderId[] | null {
	try {
		return parseSelection(available(), JSON.parse(localStorage.getItem(KEY) ?? "null"));
	} catch {
		return null;
	}
}

async function fetchCountry(): Promise<string | null> {
	try {
		const res = await fetch(`${proxyUrl}/geo`, { signal: AbortSignal.timeout(4000) });
		const data: unknown = await res.json();
		const country = (data as { country?: unknown } | null)?.country;
		return typeof country === "string" ? country : null;
	} catch {
		return null;
	}
}

// Runs once in the browser. A saved choice means no /geo call.
export async function initMarket() {
	if (started) return;
	started = true;
	const saved = readSaved();
	if (saved) {
		chosen = true;
		return publish(saved);
	}
	const country = await fetchCountry();
	if (!chosen) publish(marketSelection(available(), country));
}
