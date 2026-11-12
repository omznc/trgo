// Fetches marketplace pages for the trgo page. It writes no logs: URLs and bodies stay private.
import { resolveExtensionTarget } from "@lagano/providers/hosts";
import { api, type Sender } from "./api";
import { ALLOWED_ORIGINS, type ExtRequest, type ExtResult, failure, isExtRequest, respond } from "./protocol";

const TIMEOUT_MS = 20_000;
const MAX_BYTES = 5 * 1024 * 1024;
// A polite cap for each host: 30 upstream requests in 10 seconds.
const RATE_MAX = 30;
const RATE_WINDOW_MS = 10_000;

const recent = new Map<string, number[]>();

function rateLimited(key: string): boolean {
	const now = Date.now();
	const times = (recent.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
	const limited = times.length >= RATE_MAX;
	if (!limited) times.push(now);
	recent.set(key, times);
	return limited;
}

// Returns null when the body is over the cap.
async function readCapped(res: Response): Promise<string | null> {
	if (Number(res.headers.get("content-length")) > MAX_BYTES) return null;
	if (!res.body) return "";
	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let total = 0;
	let text = "";
	for (;;) {
		const { done, value } = await reader.read();
		if (done) return text + decoder.decode();
		total += value.byteLength;
		if (total > MAX_BYTES) {
			await reader.cancel();
			return null;
		}
		text += decoder.decode(value, { stream: true });
	}
}

async function load(request: ExtRequest): Promise<ExtResult> {
	// The page is not trusted for the URL. Resolve it again here.
	const route = resolveExtensionTarget(request.key, request.path, request.search);
	if (!route) return failure(400, "bad route");
	// Firefox grants host permissions only after the user agrees on the welcome page.
	if (!(await api.permissions.contains({ origins: [`${route.target.origin}/*`] }))) return failure(403, "permission");
	if (rateLimited(request.key)) return failure(429, "too many requests");
	try {
		const res = await fetch(route.target, {
			method: "GET",
			credentials: route.credentials,
			redirect: "manual",
			headers: request.accept ? { accept: request.accept } : {},
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		// A redirect often means a login or a block page. Do not follow it.
		if (res.type === "opaqueredirect" || res.status === 0) return failure(502, "redirect");
		const body = await readCapped(res);
		if (body === null) return failure(502, "response too large");
		const type = res.headers.get("content-type");
		return { status: res.status, statusText: res.statusText, headers: type ? { "content-type": type } : {}, body };
	} catch {
		return failure(502, "upstream unreachable");
	}
}

function fromAllowedPage(sender: Sender): boolean {
	if (sender.id !== api.runtime.id) return false;
	try {
		return ALLOWED_ORIGINS.includes(new URL(sender.url ?? "").origin);
	} catch {
		return false;
	}
}

// A new install opens the welcome page, where the user can allow the sites.
api.runtime.onInstalled.addListener(({ reason }) => {
	if (reason === "install") void api.tabs.create({ url: api.runtime.getURL("welcome.html") });
});

// Answer with sendResponse and return true. This works in Chrome and in Firefox.
api.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (!isExtRequest(message)) return undefined;
	if (!fromAllowedPage(sender)) {
		sendResponse(respond(message.id, failure(403, "forbidden")));
		return undefined;
	}
	void load(message).then((result) => sendResponse(respond(message.id, result)));
	return true;
});
