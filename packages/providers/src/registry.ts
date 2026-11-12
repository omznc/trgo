// The one list of marketplaces. A new provider needs, in this order:
// 1. its id in PROVIDER_IDS, its entry in PROVIDERS, and its factory in adapters.ts;
// 2. its hosts in the explicit UPSTREAMS allowlist of apps/proxy (the proxy does NOT read this file:
//    the allowlist is the security boundary);
// 3. the entries that the typecheck then asks for (strings, sessions, publish steps).
// See docs/adding-a-provider.md.
import type { Currency } from "./rates";

export const PROVIDER_IDS = ["olx", "svex"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export type Capability = "search" | "priceCheck" | "mine" | "publish" | "edit";

export type ProviderInfo = {
	id: ProviderId;
	// Short name for the UI.
	name: string;
	// Name with the domain, for the model prompt.
	siteName: string;
	// Home URL.
	site: string;
	// ISO 3166-1 alpha-2.
	country: string;
	// ISO 4217. It needs a rate in rates.ts.
	currency: Currency;
	// What the UI shows after a price.
	currencyLabel: string;
	// Language of the search words, and its English name for the model prompt.
	searchLanguage: string;
	searchLanguageName: string;
	capabilities: Record<Capability, boolean>;
};

export const PROVIDERS = {
	olx: {
		id: "olx",
		name: "OLX",
		siteName: "OLX.ba",
		site: "https://olx.ba",
		country: "BA",
		currency: "BAM",
		currencyLabel: "KM",
		searchLanguage: "bs",
		searchLanguageName: "Bosnian",
		capabilities: { search: true, priceCheck: true, mine: true, publish: true, edit: true },
	},
	svex: {
		id: "svex",
		name: "SVEX",
		siteName: "SVEX.ba",
		site: "https://svex.ba",
		country: "BA",
		currency: "BAM",
		currencyLabel: "KM",
		searchLanguage: "bs",
		searchLanguageName: "Bosnian",
		capabilities: { search: true, priceCheck: true, mine: true, publish: true, edit: true },
	},
} as const satisfies Record<ProviderId, ProviderInfo>;

export type { Currency };

export const isProviderId = (value: unknown): value is ProviderId => (PROVIDER_IDS as readonly unknown[]).includes(value);

export const providersWith = (capability: Capability): ProviderId[] => PROVIDER_IDS.filter((id) => PROVIDERS[id].capabilities[capability]);
