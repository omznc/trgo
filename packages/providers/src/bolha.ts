import { type ClassifiedsSite, createClassifiedsProvider } from "./njuskalo";
import { PROVIDERS } from "./registry";
import type { Provider, ProviderOptions } from "./types";

// Bolha runs on the Njuškalo platform. A block is a plain error: the extension does not serve Bolha.
const BOLHA: ClassifiedsSite = { id: "bolha", name: PROVIDERS.bolha.name, site: PROVIDERS.bolha.site, noData: "bolha search page has no data" };

export const createBolhaProvider = (options: ProviderOptions): Provider => createClassifiedsProvider(options, BOLHA);
