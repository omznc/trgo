import type { MineStatus, MyListing } from "@lagano/providers";
import type { MineOp } from "./mine-api";

// Which statuses allow which write. The my-listings menu and the edit tool share this table.
// A price change is not allowed on a draft: a PUT on an OLX draft publishes it.
export const can = {
	refresh: ["active", "expired"],
	hide: ["active"],
	unhide: ["hidden"],
	finish: ["active", "hidden"],
	price: ["active", "hidden"],
} satisfies Record<string, MineStatus[]>;

export const allowed = (item: MyListing, op: keyof typeof can) => (can[op] as MineStatus[]).includes(item.status);

// The edit tool actions, mapped to the write calls.
export const EDIT_OPS = { set_price: "price", hide: "hide", unhide: "unhide", mark_sold: "finish", refresh: "refresh" } as const satisfies Record<string, MineOp>;
export type EditAction = keyof typeof EDIT_OPS;

// OLX refuses a refresh of a new listing.
export const refreshTooEarly = (item: MyListing) => item.provider === "olx" && item.status === "active" && item.canRefresh === false;

export type EditProblem = "not_connected" | "list_cut" | "not_found" | "status" | "too_early";

// What the check knows about the provider list. A cut list may hide the listing.
export type EditScope = { connected: boolean; cut: boolean };

// Why an edit must not run. null means it may run. The item is the real own listing, or undefined.
export function editProblem(item: MyListing | undefined, action: EditAction, scope: EditScope = { connected: true, cut: false }): EditProblem | null {
	if (!scope.connected) return "not_connected";
	if (!item) return scope.cut ? "list_cut" : "not_found";
	const op = EDIT_OPS[action];
	if (!allowed(item, op)) return "status";
	if (op === "refresh" && refreshTooEarly(item)) return "too_early";
	return null;
}
