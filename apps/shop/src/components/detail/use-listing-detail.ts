import { getListing, type ListingDetail, type ProviderId } from "@lagano/providers";
import { useCallback, useEffect, useState } from "react";
import { proxyUrl } from "@/lib/publish";

// One request for each listing for the whole session. A failed request leaves the cache.
const cache = new Map<string, Promise<ListingDetail>>();

function load(provider: ProviderId, url: string) {
	const key = `${provider}:${url}`;
	let p = cache.get(key);
	if (!p) {
		p = getListing({ proxyUrl }, provider, url);
		p.catch(() => cache.delete(key));
		cache.set(key, p);
	}
	return p;
}

export type DetailState = { detail?: ListingDetail; loading: boolean; error: boolean; retry: () => void };

export function useListingDetail(provider: ProviderId, url: string): DetailState {
	const [state, setState] = useState<{ detail?: ListingDetail; error: boolean }>({ error: false });
	const [attempt, setAttempt] = useState(0);
	useEffect(() => {
		let live = true;
		setState({ error: false });
		load(provider, url).then(
			(detail) => live && setState({ detail, error: false }),
			() => live && setState({ error: true }),
		);
		return () => {
			live = false;
		};
	}, [provider, url, attempt]);
	const retry = useCallback(() => setAttempt((n) => n + 1), []);
	return { ...state, loading: !state.detail && !state.error, retry };
}
