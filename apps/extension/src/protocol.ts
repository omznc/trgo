// Messages between the trgo page, the content script and the background worker.
import { EXTENSION_ERROR } from "@lagano/providers/hosts";

// The build sets this. It is a list of extra origins that only the dev build allows.
declare const __DEV_ORIGINS__: string[] | undefined;

export const HELLO = "trgo-ext:hello";
export const REQUEST = "trgo-ext:request";
export const RESPONSE = "trgo-ext:response";

export const ALLOWED_ORIGINS = [
	"https://trgo.omarzunic.com",
	"https://trgo.omznc.workers.dev",
	...(typeof __DEV_ORIGINS__ === "undefined" ? [] : __DEV_ORIGINS__),
];

// The page sends only a key, a path and a query. It never sends a URL.
export type ExtRequest = { type: typeof REQUEST; id: string; key: string; path: string; search: string; accept: string };
export type ExtResult = { status: number; statusText: string; headers: Record<string, string>; body: string };
export type ExtResponse = { type: typeof RESPONSE; id: string; result: ExtResult };

const isString = (value: unknown): value is string => typeof value === "string";

export function isExtRequest(data: unknown): data is ExtRequest {
	if (typeof data !== "object" || data === null) return false;
	const d = data as Record<string, unknown>;
	return d.type === REQUEST && isString(d.id) && isString(d.key) && isString(d.path) && isString(d.search) && isString(d.accept);
}

export function isExtResponse(data: unknown): data is ExtResponse {
	if (typeof data !== "object" || data === null) return false;
	const d = data as Record<string, unknown>;
	return d.type === RESPONSE && isString(d.id) && typeof d.result === "object" && d.result !== null;
}

// Returns the request when the message comes from this page, on an allowed origin.
export function acceptPageMessage(
	event: { source: unknown; origin: string; data: unknown },
	pageWindow: unknown,
	pageOrigin: string,
	allowed: string[] = ALLOWED_ORIGINS,
): ExtRequest | null {
	if (event.source !== pageWindow || event.origin !== pageOrigin || !allowed.includes(event.origin)) return null;
	return isExtRequest(event.data) ? event.data : null;
}

export const respond = (id: string, result: ExtResult): ExtResponse => ({ type: RESPONSE, id, result });

export const failure = (status: number, error: string): ExtResult => ({
	status,
	statusText: error,
	// The mark tells the page that the extension failed, not the site. Upstream headers never carry it.
	headers: { "content-type": "application/json", [EXTENSION_ERROR]: error },
	body: JSON.stringify({ error }),
});
