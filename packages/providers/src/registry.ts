// The one list of marketplaces. A new provider needs, in this order:
// 1. its id in PROVIDER_IDS, its entry in PROVIDERS, and its factory in adapters.ts;
// 2. its hosts in the explicit UPSTREAMS allowlist of apps/proxy (the proxy does NOT read this file:
//    the allowlist is the security boundary);
// 3. the entries that the typecheck then asks for (strings, sessions, publish steps).
// See docs/adding-a-provider.md.
import type { Currency } from "./rates";

export const PROVIDER_IDS = ["olx", "svex", "kp", "njuskalo", "bolha", "olxbg", "willhaben"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

// `detail` is true when getListing works. Without it the UI shows the card data and a link.
export type Capability = "search" | "detail" | "priceCheck" | "mine" | "publish" | "edit";

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
	// The most listings that one price check loads from this provider. Missing means no limit.
	priceSampleMax?: number;
	// True when the provider works only with the trgo browser extension.
	needsExtension?: boolean;
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
		capabilities: { search: true, detail: true, priceCheck: true, mine: true, publish: true, edit: true },
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
		capabilities: { search: true, detail: true, priceCheck: true, mine: true, publish: true, edit: true },
	},
	kp: {
		id: "kp",
		name: "KP",
		siteName: "KupujemProdajem.com",
		site: "https://www.kupujemprodajem.com",
		country: "RS",
		currency: "RSD",
		currencyLabel: "din",
		searchLanguage: "sr",
		searchLanguageName: "Serbian",
		capabilities: { search: true, detail: false, priceCheck: true, mine: false, publish: false, edit: false },
		// 5 pages of 30. Each page is one request through the home relay.
		priceSampleMax: 150,
	},
	njuskalo: {
		id: "njuskalo",
		name: "Njuškalo",
		siteName: "Njuškalo.hr",
		site: "https://www.njuskalo.hr",
		country: "HR",
		currency: "EUR",
		currencyLabel: "EUR",
		searchLanguage: "hr",
		searchLanguageName: "Croatian",
		capabilities: { search: true, detail: false, priceCheck: true, mine: false, publish: false, edit: false },
		// 6 pages of 25. Each page is one request from the browser of the user.
		priceSampleMax: 150,
		needsExtension: true,
	},
	bolha: {
		id: "bolha",
		name: "Bolha",
		siteName: "Bolha.com",
		site: "https://www.bolha.com",
		country: "SI",
		currency: "EUR",
		currencyLabel: "EUR",
		searchLanguage: "sl",
		searchLanguageName: "Slovenian",
		capabilities: { search: true, detail: false, priceCheck: true, mine: false, publish: false, edit: false },
		// 6 pages of 25. Each page is one request through the proxy.
		priceSampleMax: 150,
	},
	olxbg: {
		id: "olxbg",
		name: "OLX.bg",
		siteName: "OLX.bg",
		site: "https://www.olx.bg",
		country: "BG",
		currency: "EUR",
		currencyLabel: "EUR",
		searchLanguage: "bg",
		searchLanguageName: "Bulgarian",
		capabilities: { search: true, detail: false, priceCheck: true, mine: false, publish: false, edit: false },
		// 4 pages of 40.
		priceSampleMax: 150,
	},
	willhaben: {
		id: "willhaben",
		name: "willhaben",
		siteName: "willhaben.at",
		site: "https://www.willhaben.at",
		country: "AT",
		currency: "EUR",
		currencyLabel: "EUR",
		searchLanguage: "de",
		searchLanguageName: "German",
		capabilities: { search: true, detail: false, priceCheck: true, mine: false, publish: false, edit: false },
		// 5 pages of 30.
		priceSampleMax: 150,
	},
} as const satisfies Record<ProviderId, ProviderInfo>;

export type { Currency };

export const isProviderId = (value: unknown): value is ProviderId => (PROVIDER_IDS as readonly unknown[]).includes(value);

export const providersWith = (capability: Capability): ProviderId[] => PROVIDER_IDS.filter((id) => PROVIDERS[id].capabilities[capability]);
