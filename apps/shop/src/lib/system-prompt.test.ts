import { expect, test } from "bun:test";
import { PROVIDERS, type Table } from "@lagano/providers";
import { buildSystemPrompt, promptFacts } from "./system-prompt";

const fixed = (name: string) => Bun.file(new URL(`./fixtures/${name}`, import.meta.url)).text();

// The fixtures are the prompt text on main before the registry. The model must see no change.
test("the prompt is the same as before the registry", async () => {
	expect(buildSystemPrompt("bs", ["olx", "svex"])).toBe(await fixed("system-prompt.bs.txt"));
	expect(buildSystemPrompt("en", ["olx", "svex"])).toBe(await fixed("system-prompt.en.txt"));
});

test("a Serbian selection tells the model to use Latin ekavian terms", () => {
	const prompt = buildSystemPrompt("en", ["kp"]);
	expect(prompt).toContain("KupujemProdajem.com are Serbian sites");
	expect(prompt).toContain('Latin script and ekavian forms, for example "mleko", "dečji"');
	expect(prompt).toContain("Prices are in din (RSD).");
});

test("the prompt of the Bosnian market is the same when other markets exist", async () => {
	expect(buildSystemPrompt("bs", ["olx", "svex"], FAKE)).toBe(await fixed("system-prompt.bs.txt"));
});

test("the tool description parts come from the registry", () => {
	const facts = promptFacts(["olx", "svex"]);
	expect(facts.sites).toBe("OLX.ba and SVEX.ba");
	expect(facts.priceUnit).toBe("KM");
});

const none = { search: false, detail: false, priceCheck: false, mine: false, publish: false, edit: false };
const hr = { country: "HR", currency: "EUR", currencyLabel: "EUR", searchLanguage: "hr", searchLanguageName: "Croatian", capabilities: { ...none, search: true, priceCheck: true } } as const;
const FAKE: Table = { ...PROVIDERS, fakehr: { ...hr, id: "fakehr", name: "Fake", siteName: "fake.hr", site: "https://fake.hr" } };

test("a Croatian selection names the site, the currency and the language", () => {
	const prompt = buildSystemPrompt("en", ["fakehr"], FAKE);
	expect(prompt).toContain("shopping helper for Croatian online marketplaces");
	expect(prompt).toContain("You search fake.hr with the search_listings tool. Prices are in EUR.");
	expect(prompt).toContain("fake.hr are Croatian sites.");
	expect(prompt).not.toContain("veš mašina");
	expect(prompt).not.toContain("different currencies");
});

test("a mixed selection tells the model to search each site in its language", () => {
	const prompt = buildSystemPrompt("en", ["olx", "fakehr"], FAKE);
	expect(prompt).toContain("OLX.ba is a Bosnian site and fake.hr is a Croatian site");
	expect(prompt).toContain("Croatian terms for a Croatian site");
	expect(prompt).toContain("The minPrice and maxPrice inputs of search_listings and price_check are in EUR.");
});
