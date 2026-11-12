import { describe, expect, test } from "bun:test";
import { createProvider, PROVIDER_IDS, PROVIDERS, providersWith } from "../src";

const client = (id: (typeof PROVIDER_IDS)[number]) => createProvider(id, { proxyUrl: "https://proxy.test" }) as unknown as Record<string, unknown>;
const has = (c: Record<string, unknown>, names: string[]) => names.every((n) => typeof c[n] === "function");

// What the code supports today, by capability. A flag must be true exactly when the adapter has these methods.
const METHODS = {
	search: (c: Record<string, unknown>) => has(c, ["search", "getListing"]),
	priceCheck: (c: Record<string, unknown>) => has(c, ["search"]),	mine: (c: Record<string, unknown>) => has(c, ["listMine"]),
	edit: (c: Record<string, unknown>) => has(c, ["hide", "unhide", "refresh", "finish", "updatePrice"]),
	publish: (c: Record<string, unknown>) => has(c, ["publish"]) || has(c, ["publishListing", "createListing"]),
};

describe("provider registry", () => {
	test("PROVIDER_IDS matches the keys of PROVIDERS", () => {
		expect([...PROVIDER_IDS].sort() as string[]).toEqual(Object.keys(PROVIDERS).sort());
		expect([...PROVIDER_IDS]).toEqual(["olx", "svex", "kp", "njuskalo"]);
	});

	test("each entry has its own id and the facts of its country", () => {
		for (const id of ["olx", "svex"] as const) {
			expect(PROVIDERS[id]).toMatchObject({ id, country: "BA", currency: "BAM", currencyLabel: "KM", searchLanguage: "bs" });
		}
		expect(PROVIDERS.kp).toMatchObject({ id: "kp", country: "RS", currency: "RSD", searchLanguage: "sr", siteName: "KupujemProdajem.com" });
		expect(PROVIDERS.olx.name).toBe("OLX");
		expect(PROVIDERS.svex.siteName).toBe("SVEX.ba");
	});

	test("each factory makes a client with the registry id", () => {
		for (const id of PROVIDER_IDS) expect((client(id) as { id: string }).id).toBe(id);
	});

	test("every capability flag matches the adapter", () => {
		for (const id of PROVIDER_IDS) {
			const c = client(id);
			for (const [capability, supported] of Object.entries(METHODS)) {
				const flag: boolean = PROVIDERS[id].capabilities[capability as keyof typeof METHODS];
				expect(`${id} ${capability} ${flag}`).toBe(`${id} ${capability} ${supported(c)}`);
			}
		}
	});

	test("the detail flag is false exactly when getListing rejects as not supported", async () => {
		for (const id of PROVIDER_IDS) {
			const offline = createProvider(id, { proxyUrl: "https://proxy.test", fetch: (() => Promise.reject(new Error("offline"))) as unknown as typeof fetch });
			// A real adapter fails here with the network error.
			const reason = await offline.getListing("1").then(() => "", (e: Error) => e.message);
			expect(`${id} ${PROVIDERS[id].capabilities.detail}`).toBe(`${id} ${!reason.includes("not supported")}`);
		}
	});

	test("providersWith lists the ids with a capability", () => {
		expect(providersWith("publish")).toEqual(["olx", "svex"]);
		expect(providersWith("search")).toEqual(["olx", "svex", "kp", "njuskalo"]);
	});

	test("kp can search and check prices only", () => {
		expect(PROVIDERS.kp.capabilities).toEqual({ search: true, detail: false, priceCheck: true, mine: false, publish: false, edit: false });
		expect(providersWith("mine")).not.toContain("kp");
	});

	test("njuskalo searches and checks prices only, and needs the extension", () => {
		expect(PROVIDERS.njuskalo).toMatchObject({ id: "njuskalo", country: "HR", currency: "EUR", searchLanguage: "hr", siteName: "Njuškalo.hr", needsExtension: true });
		expect(PROVIDERS.njuskalo.capabilities).toEqual({ search: true, detail: false, priceCheck: true, mine: false, publish: false, edit: false });
		// The page holds 25 listings, so 6 pages are at most 150.
		expect(PROVIDERS.njuskalo.priceSampleMax).toBe(150);
		for (const id of PROVIDER_IDS) if (id !== "njuskalo") expect("needsExtension" in PROVIDERS[id]).toBe(false);
	});
});
