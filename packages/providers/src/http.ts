import type { ProviderOptions } from "./types";

export function createGetJson({ proxyUrl, fetch: f = fetch }: ProviderOptions) {
	const base = proxyUrl.replace(/\/+$/, "");
	return async function getJson<T>(path: string, params?: Record<string, string | number | undefined>, signal?: AbortSignal): Promise<T> {
		const url = new URL(base + path);
		for (const [key, value] of Object.entries(params ?? {})) {
			if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
		}
		const res = await f(url, signal ? { signal } : undefined);
		if (!res.ok) throw new Error(`${path} failed with HTTP ${res.status}`);
		return (await res.json()) as T;
	};
}

// Raw request through the proxy. The caller reads the response.
export function createRequest({ proxyUrl, fetch: f = fetch }: ProviderOptions) {
	const base = proxyUrl.replace(/\/+$/, "");
	return (path: string, init?: RequestInit) => f(base + path, init);
}

// Throws with a short body excerpt, because the upstream error text names the bad field.
export async function readJson<T>(res: Response, label: string): Promise<T> {
	if (!res.ok) {
		const body = (await res.text().catch(() => "")).slice(0, 300);
		throw new Error(`${label} failed with HTTP ${res.status}${body ? `: ${body}` : ""}`);
	}
	return (await res.json()) as T;
}
