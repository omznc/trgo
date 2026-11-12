import { afterEach, beforeEach, expect, test } from "bun:test";
import { editMine } from "./agent";
import { clearMineMemo } from "./mine-api";
import { olxAccount } from "./publish";

const store = new Map<string, string>();
const g = globalThis as Record<string, unknown>;
const saved = { localStorage: g.localStorage, window: g.window };
const olx = olxAccount as unknown as Record<string, unknown>;
const mine = (id: string, status = "active") => ({ provider: "olx", id, title: "t", priceText: "1 KM", price: 1, currency: "BAM", url: "u", status });

let writes: string[];
beforeEach(() => {
	store.clear();
	clearMineMemo();
	writes = [];
	g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
	g.window = { dispatchEvent: () => true };
	store.set("lagano.session.olx", JSON.stringify({ token: "t" }));
	olx.hide = async (_s: unknown, id: number) => void writes.push(`hide ${id}`);
});

afterEach(() => Object.assign(g, saved));

const hide = (id: string) => editMine({ provider: "olx", id, action: "hide" });

test("an id that is not in the own listings is refused without a write", async () => {
	olx.listMine = async () => ({ listings: [mine("1")], truncated: false });
	await expect(hide("2")).rejects.toThrow("Refused (not_found)");
	expect(writes).toEqual([]);
});

test("a missing id in a cut list is refused as not checkable", async () => {
	olx.listMine = async () => ({ listings: [mine("1")], truncated: true });
	await expect(hide("2")).rejects.toThrow("Refused (list_cut)");
	expect(writes).toEqual([]);
});

test("a provider that is not connected is refused", async () => {
	store.clear();
	olx.listMine = async () => ({ listings: [mine("1")], truncated: false });
	await expect(hide("1")).rejects.toThrow("Refused (not_connected)");
	expect(writes).toEqual([]);
});

test("an own listing is written", async () => {
	olx.listMine = async () => ({ listings: [mine("1")], truncated: false });
	await hide("1");
	expect(writes).toEqual(["hide 1"]);
});
