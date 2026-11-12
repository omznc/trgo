import { expect, test } from "bun:test";
import { buildSystemPrompt, PRICE_UNIT, SITES } from "./system-prompt";

const fixed = (name: string) => Bun.file(new URL(`./fixtures/${name}`, import.meta.url)).text();

// The fixtures are the prompt text on main before the registry. The model must see no change.
test("the prompt is the same as before the registry", async () => {
	expect(buildSystemPrompt("bs")).toBe(await fixed("system-prompt.bs.txt"));
	expect(buildSystemPrompt("en")).toBe(await fixed("system-prompt.en.txt"));
});

test("the tool description parts come from the registry", () => {
	expect(SITES).toBe("OLX.ba and SVEX.ba");
	expect(PRICE_UNIT).toBe("KM");
});
