import { afterEach, beforeEach, expect, test } from "bun:test";

const realFetch = globalThis.fetch;
let calls = 0;
const store = new Map<string, string>();

beforeEach(() => {
	calls = 0;
	store.clear();
	(globalThis as Record<string, unknown>).localStorage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
	};
});
afterEach(() => {
	globalThis.fetch = realFetch;
});

const answer = (body: unknown) => {
	globalThis.fetch = (async () => (calls++, Response.json(body))) as unknown as typeof fetch;
};
// A fresh module for each test, because the market is module state.
const fresh = (tag: string) => import(`./market.ts?${tag}`) as Promise<typeof import("./market")>;

test("a saved choice wins and /geo is never called", async () => {
	store.set("trgo-market", JSON.stringify(["svex"]));
	answer({ country: "HR" });
	const m = await fresh("saved");
	await m.initMarket();
	expect(calls).toBe(0);
	expect(m.getSelection()).toEqual(["svex"]);
});

test("no saved choice and an unknown country give BA", async () => {
	answer({ country: "HR" });
	const m = await fresh("unknown");
	await m.initMarket();
	expect(calls).toBe(1);
	expect(m.getSelection()).toEqual(["olx", "svex"]);
	// The guess is not saved, so a later load asks again.
	expect(store.has("trgo-market")).toBe(false);
});

test("no saved choice and RS give the RS providers", async () => {
	answer({ country: "RS" });
	const m = await fresh("rs");
	await m.initMarket();
	expect(calls).toBe(1);
	expect(m.getSelection()).toEqual(["kp"]);
	expect(store.has("trgo-market")).toBe(false);
});

test("a failed /geo gives BA", async () => {
	globalThis.fetch = (async () => {
		throw new Error("offline");
	}) as unknown as typeof fetch;
	const m = await fresh("failed");
	await m.initMarket();
	expect(m.getSelection()).toEqual(["olx", "svex"]);
});

test("an explicit choice is saved", async () => {
	const m = await fresh("choice");
	m.chooseMarket(["olx"]);
	expect(JSON.parse(store.get("trgo-market")!)).toEqual(["olx"]);
	expect(m.getSelection()).toEqual(["olx"]);
});
