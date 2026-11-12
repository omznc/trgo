import type { Provider, ProviderId, SearchAllResult, SearchQuery } from "./types";

// `adapt` changes the query for one provider, for example to convert a price to its currency.
export async function searchAll(providers: Provider[], query: SearchQuery, adapt: (id: ProviderId, query: SearchQuery) => SearchQuery = (_, q) => q): Promise<SearchAllResult> {
	const settled = await Promise.allSettled(providers.map((p) => p.search(adapt(p.id, query))));
	const out: SearchAllResult = { listings: [], total: 0, errors: [] };
	settled.forEach((result, i) => {
		const provider = providers[i]!;
		if (result.status === "fulfilled") {
			out.listings.push(...result.value.listings);
			out.total += result.value.total;
		} else {
			const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
			out.errors.push({ provider: provider.id, message });
		}
	});
	return out;
}
