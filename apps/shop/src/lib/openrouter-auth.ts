const KEY = "lagano.openrouter.key";
const MODEL = "lagano.model";
const VERIFIER = "lagano.pkce.verifier";
const STATE = "lagano.pkce.state";

export const getKey = () => localStorage.getItem(KEY);
export const setKey = (key: string) => localStorage.setItem(KEY, key.trim());
export const clearKey = () => localStorage.removeItem(KEY);
export const getModel = () => localStorage.getItem(MODEL);
export const setModel = (model: string) => localStorage.setItem(MODEL, model);

const base64Url = (bytes: Uint8Array) =>
	btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

const randomString = () => base64Url(crypto.getRandomValues(new Uint8Array(32)));

async function challengeOf(verifier: string) {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
	return base64Url(new Uint8Array(digest));
}

export async function startLogin() {
	const verifier = randomString();
	const state = randomString();
	sessionStorage.setItem(VERIFIER, verifier);
	sessionStorage.setItem(STATE, state);
	const url = new URL("https://openrouter.ai/auth");
	url.searchParams.set("callback_url", location.origin + location.pathname);
	url.searchParams.set("code_challenge", await challengeOf(verifier));
	url.searchParams.set("code_challenge_method", "S256");
	url.searchParams.set("state", state);
	location.assign(url);
}

function cleanUrl() {
	history.replaceState(null, "", location.pathname);
}

// Handles the return from OpenRouter. Returns true when a new key was stored.
export async function finishLogin(): Promise<boolean> {
	const params = new URLSearchParams(location.search);
	const code = params.get("code");
	if (!code) return false;
	const state = params.get("state");
	const verifier = sessionStorage.getItem(VERIFIER);
	const expected = sessionStorage.getItem(STATE);
	sessionStorage.removeItem(VERIFIER);
	sessionStorage.removeItem(STATE);
	cleanUrl();
	if (!verifier || !state || state !== expected) throw new Error("state");
	const res = await fetch("https://openrouter.ai/api/v1/auth/keys", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: "S256" }),
	});
	if (!res.ok) throw new Error(String(res.status));
	const { key } = (await res.json()) as { key?: string };
	if (!key) throw new Error("no key");
	setKey(key);
	return true;
}
