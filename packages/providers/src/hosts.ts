// The hosts that the proxy and the browser extension may reach. Pure code, no Worker types.

// SSRF guard: the only hosts the proxy Worker can reach. Keep this list short.
export const UPSTREAMS: Record<string, string> = {
	olx: "https://api.olx.ba",
	svex: "https://svex.ba",
	"svex-listing": "https://listing.api.svex.ba",
	"svex-search": "https://search.api.svex.ba",
	bolha: "https://www.bolha.com",
	olxbg: "https://www.olx.bg",
	willhaben: "https://www.willhaben.at",
};

// These hosts are read-only through the proxy: GET only, these path prefixes only, no cookie, no authorization.
export const READ_ONLY: Record<string, string[]> = {
	bolha: ["/search/"],
	olxbg: ["/api/v1/offers/"],
	willhaben: ["/iad/kaufen-und-verkaufen/marktplatz"],
};

export const isReadOnly = (key: string) => Object.hasOwn(READ_ONLY, key);

// The header that marks a reply as an error of the extension itself.
export const EXTENSION_ERROR = "x-trgo-extension-error";

// "paths" limits a host to some path prefixes. "extensionOnly" hosts have no proxy route to fall back to.
export type ExtensionHost = { origin: string; credentials: "include" | "omit"; paths?: string[]; extensionOnly?: boolean };

// These keys are proxy-only: the extension is in store review, so its host list must not grow.
const PROXY_ONLY = ["bolha", "olxbg", "willhaben"];

// Only njuskalo needs the user's own session. The other hosts never get the browser cookies.
// With the session, njuskalo could show the user's account pages, so it gets the search pages only.
export const EXTENSION_HOSTS: Record<string, ExtensionHost> = {
	...Object.fromEntries(Object.entries(UPSTREAMS).filter(([key]) => !PROXY_ONLY.includes(key)).map(([key, origin]) => [key, { origin, credentials: "omit" as const }])),
	kp: { origin: "https://www.kupujemprodajem.com", credentials: "omit" },
	njuskalo: { origin: "https://www.njuskalo.hr", credentials: "include", paths: ["/search/"], extensionOnly: true },
};

// Checks the path before and after percent-decoding.
export function isSafePath(path: string): boolean {
	let decoded: string;
	try {
		decoded = decodeURIComponent(path);
	} catch {
		return false;
	}
	const bad = (s: string) => s === ".." || s === "." || s.includes("\\");
	return ![path, decoded].some((p) => p.includes("//") || p.split("/").some(bad));
}

// Splits "/key/rest" into the key and "/rest". The path is "/" when there is no rest.
export function splitKey(pathname: string): { key: string; path: string } {
	const rest = pathname.slice(1);
	const slash = rest.indexOf("/");
	return slash === -1 ? { key: rest, path: "/" } : { key: rest.slice(0, slash), path: rest.slice(slash) };
}

function resolveIn(base: string | undefined, path: string, search: string): URL | null {
	if (!base || !isSafePath(path)) return null;
	const target = new URL(base + path);
	// Reject any path that changes the host (for example "@host" tricks).
	if (target.origin !== base) return null;
	target.search = search;
	return target;
}

// Returns the upstream URL, or null when the path is not allowed.
export function resolveTarget(url: URL): { key: string; target: URL } | null {
	const { key, path } = splitKey(url.pathname);
	if (isReadOnly(key) && !READ_ONLY[key]!.some((prefix) => path.startsWith(prefix))) return null;
	const target = resolveIn(Object.hasOwn(UPSTREAMS, key) ? UPSTREAMS[key] : undefined, path, url.search);
	return target ? { key, target } : null;
}

// Same checks for the extension table. "path" starts with "/".
export function resolveExtensionTarget(key: string, path: string, search: string): { target: URL; credentials: ExtensionHost["credentials"] } | null {
	const host = Object.hasOwn(EXTENSION_HOSTS, key) ? EXTENSION_HOSTS[key] : undefined;
	if (host?.paths && !host.paths.some((prefix) => path.startsWith(prefix))) return null;
	const target = resolveIn(host?.origin, path, search);
	return target && host ? { target, credentials: host.credentials } : null;
}
