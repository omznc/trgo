import { createExtensionFetch, type ExtensionCall } from "@lagano/providers";
import { useSyncExternalStore } from "react";

const REQUEST = "trgo-ext:request";
const RESPONSE = "trgo-ext:response";
const TIMEOUT_MS = 25_000;

// The content script of the extension sets this on the page before the page scripts run.
export const extensionVersion = (): string | null => (typeof document === "undefined" ? null : (document.documentElement.dataset.trgoExtension ?? null));

// The server render has no extension, so the first client render must match it.
export const useExtensionVersion = () =>
	useSyncExternalStore(
		() => () => {},
		extensionVersion,
		() => null,
	);

type PageWindow = Pick<Window, "postMessage" | "addEventListener" | "removeEventListener">;

type Reply = { type: typeof RESPONSE; id: string; result: Awaited<ReturnType<ExtensionCall>> };

const isReply = (data: unknown, id: string): data is Reply => {
	const d = data as Partial<Reply> | null;
	return d?.type === RESPONSE && d.id === id && typeof d.result?.status === "number" && typeof d.result.body === "string";
};

// Sends one request to the content script and waits for the reply with the same id.
export function createCall(win: PageWindow, origin: string, timeoutMs = TIMEOUT_MS): ExtensionCall {
	return (request, signal) =>
		new Promise((resolve, reject) => {
			if (signal?.aborted) return reject(signal.reason);
			// The id is made per call. Workers refuse random values at module load.
			const id = crypto.randomUUID();
			const stop = () => {
				clearTimeout(timer);
				win.removeEventListener("message", onMessage as EventListener);
				signal?.removeEventListener("abort", onAbort);
			};
			const onMessage = (event: MessageEvent) => {
				// Only the page itself may answer: a frame or another origin is ignored.
				if (event.source !== win || event.origin !== origin || !isReply(event.data, id)) return;
				stop();
				resolve(event.data.result);
			};
			const onAbort = () => {
				stop();
				reject(signal?.reason);
			};
			const timer = setTimeout(() => {
				stop();
				reject(new Error("The browser extension did not answer."));
			}, timeoutMs);
			win.addEventListener("message", onMessage as EventListener);
			signal?.addEventListener("abort", onAbort, { once: true });
			win.postMessage({ type: REQUEST, id, ...request }, origin);
		});
}

// Decides on each call, so it works when the extension shows up late.
export function createTransport(proxyUrl: string): typeof fetch {
	// Read the global fetch at call time, so a test can replace it.
	const plain = ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init)) as typeof fetch;
	const viaExtension = createExtensionFetch({ proxyUrl, call: (request, signal) => createCall(window, location.origin)(request, signal), fallback: plain });
	return ((input: RequestInfo | URL, init?: RequestInit) => (extensionVersion() ? viaExtension(input, init) : plain(input, init))) as typeof fetch;
}
