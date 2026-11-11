import type { OlxSession, ProviderId, SvexSession } from "@lagano/providers";
import { useEffect, useState } from "react";

type Sessions = { olx: OlxSession; svex: SvexSession };

const keyOf = (p: ProviderId) => `lagano.session.${p}`;
const CHANGED = "lagano:sessions";
const EXPIRED = "lagano:session-expired";

export function getSession<P extends ProviderId>(p: P): Sessions[P] | null {
	try {
		return JSON.parse(localStorage.getItem(keyOf(p)) ?? "null");
	} catch {
		return null;
	}
}

export function setSession<P extends ProviderId>(p: P, session: Sessions[P]) {
	localStorage.setItem(keyOf(p), JSON.stringify(session));
	window.dispatchEvent(new Event(CHANGED));
}

export function clearSession(p: ProviderId) {
	localStorage.removeItem(keyOf(p));
	window.dispatchEvent(new Event(CHANGED));
}

// Clears the session and asks the UI to show the connect dialog.
export function expireSession(p: ProviderId) {
	clearSession(p);
	window.dispatchEvent(new CustomEvent<ProviderId>(EXPIRED, { detail: p }));
}

// The SVEX "not logged in" wording is a guess. Fix it when a real reply is seen.
const AUTH_ERROR = /HTTP (401|403)\b|not logged in|not authenticated|unauthori[sz]ed|unauthenticated/i;
export const isAuthError = (error: unknown) => AUTH_ERROR.test(error instanceof Error ? error.message : String(error));

// Browser storage is read after mount, so the server and client render the same.
export function useSessions() {
	const [state, setState] = useState<Record<ProviderId, boolean>>({ olx: false, svex: false });
	useEffect(() => {
		const read = () => setState({ olx: !!getSession("olx"), svex: !!getSession("svex") });
		read();
		window.addEventListener(CHANGED, read);
		window.addEventListener("storage", read);
		return () => {
			window.removeEventListener(CHANGED, read);
			window.removeEventListener("storage", read);
		};
	}, []);
	return state;
}

export function useSessionExpired(onExpired: (p: ProviderId) => void) {
	useEffect(() => {
		const handler = (e: Event) => onExpired((e as CustomEvent<ProviderId>).detail);
		window.addEventListener(EXPIRED, handler);
		return () => window.removeEventListener(EXPIRED, handler);
	}, [onExpired]);
}
