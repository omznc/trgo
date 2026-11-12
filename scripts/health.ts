// Runs one search on each site through the live proxy. It exits with 1 when a site returns no usable listing.
// A site that changes its pages makes the parser return nothing, and no error shows in the shop.
// Usage: bun scripts/health.ts   (PROXY_URL and ORIGIN change the targets)
import { createProvider, PROVIDERS, providersWith } from "../packages/providers/src";

const PROXY_URL = process.env.PROXY_URL ?? "https://trgo-proxy.omznc.workers.dev";
// The proxy refuses a request without an allowed Origin.
const ORIGIN = process.env.ORIGIN ?? "https://trgo.omarzunic.com";
const QUERY = "iphone";

const withOrigin = ((input: RequestInfo | URL, init?: RequestInit) => {
	const headers = new Headers(init?.headers);
	headers.set("origin", ORIGIN);
	return fetch(input, { ...init, headers });
}) as typeof fetch;

// An extension-only site blocks the proxy, so only a browser can check it.
const ids = providersWith("search").filter((id) => !PROVIDERS[id].needsExtension);

async function check(id: (typeof ids)[number]): Promise<string | null> {
	const provider = createProvider(id, { proxyUrl: PROXY_URL, fetch: withOrigin });
	const { listings } = await provider.search({ q: QUERY, signal: AbortSignal.timeout(20_000) });
	if (listings.length === 0) return "no listings";
	if (!listings.some((l) => l.price !== null)) return `${listings.length} listings, none with a price`;
	if (!listings.every((l) => l.title && l.url.startsWith("https://"))) return "a listing has no title or no https url";
	return null;
}

const results = await Promise.all(
	ids.map(async (id) => {
		const problem = await check(id).catch((e: Error) => e.message);
		console.log(`${problem ? "FAIL" : "ok  "} ${id}${problem ? `: ${problem}` : ""}`);
		return problem;
	}),
);
if (results.some(Boolean)) process.exit(1);
