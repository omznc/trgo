import { createProvider } from "./adapters";
import type { ListingDetail, ProviderId, ProviderOptions } from "./types";

// Takes a plain id or a listing URL. SVEX URLs are /oglas/{uuid}-{slug}; the uuid has 36 characters.
export function listingIdFromUrl(provider: ProviderId, idOrUrl: string): string {
	if (!idOrUrl.includes("/")) return idOrUrl;
	const path = new URL(idOrUrl).pathname;
	const id = provider === "olx" ? /\/artikal\/(\d+)/.exec(path)?.[1] : /\/oglas\/([0-9a-f-]{36})/i.exec(path)?.[1];
	if (!id) throw new Error(`Not a ${provider} listing URL: ${idOrUrl}`);
	return id;
}

export function getListing(options: ProviderOptions, provider: ProviderId, idOrUrl: string): Promise<ListingDetail> {
	return createProvider(provider, options).getListing(listingIdFromUrl(provider, idOrUrl));
}
