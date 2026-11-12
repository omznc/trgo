import { describe, expect, test } from "bun:test";
import { createProvider, PROVIDER_IDS, PROVIDERS, providersWith } from "../src";

const client = (id: (typeof PROVIDER_IDS)[number]) => createProvider(id, { proxyUrl: "https://proxy.test" }) as unknown as Record<string, unknown>;
const has = (c: Record<string, unknown>, names: string[]) => names.every((n) => typeof c[n] === "function");

// What the code supports today, by capability. A flag must be true exactly when the adapter has these methods.
const METHODS = {
	search: (c: Record<string, unknown>) => has(c, ["search", "getListing"]),
	priceCheck: (c: Record<string, unknown>) => has(c, ["search"]),
	mine: (c: Record<string, unknown>) => has(c, ["listMine"]),
	edit: (c: Record<string, unknown>) => has(c, ["hide", "unhide", "refresh", "finish", "updatePrice"]),
	publish: (c: Record<string, unknown>) => has(c, ["publish"]) || has(c, ["publishListing", "createListing"]),
};

describe("provider registry", () => {
	test("PROVIDER_IDS matches the keys of PROVIDERS", () => {
		expect([...PROVIDER_IDS].sort() as string[]).toEqual(Object.keys(PROVIDERS).sort());
		expect([...PROVIDER_IDS]).toEqual(["olx", "svex"]);
	});

	test("each entry has its own id and the Bosnian facts", () => {
		for (const id of PROVIDER_IDS) {
			expect(PROVIDERS[id]).toMatchObject({ id, country: "BA", currency: "BAM", currencyLabel: "KM", searchLanguage: "bs" });
		}
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

	test("providersWith lists the ids with a capability", () => {
		expect(providersWith("publish")).toEqual(["olx", "svex"]);
	});
});
