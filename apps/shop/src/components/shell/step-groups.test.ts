import { expect, test } from "bun:test";
import { defaultOpenSearch, groupParts, readCount, stepCounts } from "./step-groups";

test("the read count uses the listings that loaded, not the listings that the model asked for", () => {
	const input = { listings: [{}, {}, {}] };
	expect(readCount({ type: "tool-get_listings", state: "input-available", input })).toBe(3);
	const output = { results: [{ detail: {} }, { error: true }, { detail: {} }] };
	expect(readCount({ type: "tool-get_listings", state: "output-available", input, output })).toBe(2);
});

const text = (t: string) => ({ type: "text", text: t });
const step = (type = "tool-search_listings") => ({ type });

test("text between steps goes inside the run", () => {
	const items = groupParts([step(), text("a"), step("tool-get_listings"), text("done")]);
	expect(items).toEqual([
		{ kind: "steps", start: 0, indices: [0, 1, 2] },
		{ kind: "part", index: 3 },
	]);
});

test("text before the first step stays outside", () => {
	const items = groupParts([text("hi"), step(), step()]);
	expect(items).toEqual([
		{ kind: "part", index: 0 },
		{ kind: "steps", start: 1, indices: [1, 2] },
	]);
});

test("a price check breaks the run", () => {
	const items = groupParts([step(), text("a"), { type: "tool-price_check" }, step()]);
	expect(items).toEqual([
		{ kind: "steps", start: 0, indices: [0] },
		{ kind: "part", index: 1 },
		{ kind: "part", index: 2 },
		{ kind: "steps", start: 3, indices: [3] },
	]);
});

test("one step makes a run of one", () => {
	expect(groupParts([step()])).toEqual([{ kind: "steps", start: 0, indices: [0] }]);
});

test("step-start parts do not break a run", () => {
	const start = { type: "step-start" };
	const items = groupParts([text("hi"), start, step(), start, text("a"), start, step(), start, step("tool-get_listings"), start, text("done")]);
	expect(items).toEqual([
		{ kind: "part", index: 0 },
		{ kind: "part", index: 1 },
		{ kind: "steps", start: 2, indices: [2, 4, 6, 8] },
		{ kind: "part", index: 10 },
	]);
});

test("reasoning parts do not break a run", () => {
	const items = groupParts([step(), { type: "reasoning" }, step()]);
	expect(items).toEqual([{ kind: "steps", start: 0, indices: [0, 2] }]);
});

const found = (n: number) => ({ type: "tool-search_listings", state: "output-available", output: { listings: Array(n).fill({}) } });

test("a loading search opens when no search has results", () => {
	expect(defaultOpenSearch([found(0), { type: "tool-search_listings", state: "input-available" }])).toBe(1);
});

test("a later loading search does not close a search with results", () => {
	expect(defaultOpenSearch([found(2), { type: "tool-search_listings", state: "input-available" }])).toBe(0);
});

test("a failed read counts as zero", () => {
	expect(readCount({ type: "tool-get_listings", state: "output-error", input: { listings: [{}, {}] } })).toBe(0);
});

test("the last finished search opens when none has results", () => {
	expect(defaultOpenSearch([found(0), text("a"), found(0)])).toBe(2);
});

test("a search with results wins over a later empty search", () => {
	expect(defaultOpenSearch([found(0), found(3), found(0)])).toBe(1);
});

test("the counts dedupe the listings by url", () => {
	const done = (urls: string[]) => ({ type: "tool-search_listings", state: "output-available", output: { listings: urls.map((url) => ({ url })) } });
	const read = { type: "tool-get_listings", input: { listings: [{}, {}] } };
	expect(stepCounts([done(["a", "b"]), done(["b", "c"]), read])).toEqual({ searches: 2, reads: 2, listings: 3 });
});
