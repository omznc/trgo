import { EXTENSION_HOSTS, splitKey } from "./hosts";

// The signal lets the call drop its listener at once when the request is aborted.
export type ExtensionCall = (request: { key: string; path: string; search: string; accept: string }, signal?: AbortSignal) => Promise<{
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: string;
}>;

type Options = { proxyUrl: string; call: ExtensionCall; fallback?: typeof fetch };

// Parts of an anonymous GET to a host that the extension can reach. Null for any other request.
function extensionRoute(proxyUrl: string, input: RequestInfo | URL, init?: RequestInit) {
	// A Request merges the method, the headers and the signal the same way as fetch.
	const request = new Request(input, init);
	const base = proxyUrl.replace(/\/+$/, "");
	if (request.method !== "GET" || !request.url.startsWith(`${base}/`)) return null;
	// Logged-in calls carry the user's token or cookie. They must go through the proxy.
	if (request.headers.has("authorization") || request.headers.has("x-lagano-cookie")) return null;
	const url = new URL(request.url);
	const { key, path } = splitKey(url.pathname.slice(new URL(base).pathname.replace(/\/+$/, "").length));
	if (!Object.hasOwn(EXTENSION_HOSTS, key)) return null;
	return { key, path, search: url.search, accept: request.headers.get("accept") ?? "", signal: request.signal };
}

// A fetch that sends anonymous reads to the browser extension. Everything else uses the fallback.
export function createExtensionFetch({ proxyUrl, call, fallback = fetch }: Options): typeof fetch {
	return (async (input: RequestInfo | URL, init?: RequestInit) => {
		const route = extensionRoute(proxyUrl, input, init);
		if (!route) return fallback(input, init);
		const { signal, ...request } = route;
		signal?.throwIfAborted();
		const aborted = new Promise<never>((_, reject) => signal?.addEventListener("abort", () => reject(signal.reason), { once: true }));
		const res = await Promise.race([call(request, signal), aborted]);
		// A null-body status must not get a body.
		return new Response(res.body === "" ? null : res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
	}) as typeof fetch;
}
