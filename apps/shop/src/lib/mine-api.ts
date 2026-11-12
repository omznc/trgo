import type { MineList, MyListing, OlxSession, ProviderId, SvexSession } from "@lagano/providers";
import { olxAccount, svexAccount } from "./publish";
import { expireSession, getSession, isAuthError } from "./sessions";

export type MineOp = "hide" | "unhide" | "refresh" | "finish" | "price" | "delete";
export type MineResult = { freeLeft?: number; paid?: boolean; expiresAt?: string };
// `truncated` names the providers whose list is cut.
export type MineLoad = { items: MyListing[]; errors: Partial<Record<ProviderId, "error" | "expired">>; truncated: ProviderId[] };

export const PROVIDER_NAME: Record<ProviderId, string> = { olx: "OLX", svex: "SVEX" };

function olxCall(s: OlxSession, id: number, op: MineOp, price: number): Promise<MineResult | unknown> {
	switch (op) {
		case "hide":
			return olxAccount.hide(s, id);
		case "unhide":
			return olxAccount.unhide(s, id);
		case "refresh":
			return olxAccount.refresh(s, id);
		case "finish":
			return olxAccount.finish(s, id);
		case "price":
			return olxAccount.updatePrice(s, id, price);
		case "delete":
			return olxAccount.deleteListing(s, id);
	}
}

function svexCall(s: SvexSession, id: string, op: MineOp, price: number): Promise<MineResult | unknown> {
	switch (op) {
		case "hide":
			return svexAccount.hide(s, id);
		case "unhide":
			return svexAccount.unhide(s, id);
		case "refresh":
			return svexAccount.refresh(s, id);
		case "finish":
			return svexAccount.finish(s, id);
		case "price":
			return svexAccount.updatePrice(s, id, price);
		case "delete":
			return svexAccount.deleteListing(s, id);
	}
}

// Runs one write call on the right provider. An auth error clears the session.
export async function mineCall(item: MyListing, op: MineOp, price = 0): Promise<MineResult> {
	const session = getSession(item.provider);
	if (!session) throw new Error("Not logged in");
	try {
		const out =
			item.provider === "olx"
				? await olxCall(session as OlxSession, Number(item.id), op, price)
				: await svexCall(session as SvexSession, item.id, op, price);
		return (op === "refresh" && out ? out : {}) as MineResult;
	} catch (error) {
		if (isAuthError(error)) expireSession(item.provider);
		throw error;
	}
}

async function loadOne(provider: ProviderId): Promise<MineList> {
	const session = getSession(provider);
	if (!session) return { listings: [], truncated: false };
	return provider === "olx" ? olxAccount.listMine(session as OlxSession) : svexAccount.listMine(session as SvexSession);
}

// A failed provider does not hide the list of the other one.
export async function loadMine(providers: ProviderId[]): Promise<MineLoad> {
	const results = await Promise.allSettled(providers.map(loadOne));
	const out: MineLoad = { items: [], errors: {}, truncated: [] };
	results.forEach((r, i) => {
		const provider = providers[i]!;
		if (r.status === "fulfilled") {
			out.items.push(...r.value.listings);
			if (r.value.truncated) out.truncated.push(provider);
		} else if (isAuthError(r.reason)) {
			expireSession(provider);
			out.errors[provider] = "expired";
		} else out.errors[provider] = "error";
	});
	return out;
}
