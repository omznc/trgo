import type { MineStatus, MyListing } from "@lagano/providers";
import { expect, test } from "bun:test";
import { editProblem } from "./mine-rules";

const item = (status: MineStatus, extra: Partial<MyListing> = {}): MyListing => ({
	provider: "olx",
	id: "1",
	title: "Bicikl",
	priceText: "100 KM",
	price: 100,
	currency: "BAM",
	url: "https://olx.ba/artikal/1",
	status,
	...extra,
});

test("an id that is not in the own listings is refused", () => {
	expect(editProblem(undefined, "hide")).toBe("not_found");
});

test("a missing id in a cut list cannot be checked", () => {
	expect(editProblem(undefined, "hide", { connected: true, cut: true })).toBe("list_cut");
	expect(editProblem(item("active"), "hide", { connected: true, cut: true })).toBeNull();
});

test("a provider that is not connected is reported first", () => {
	expect(editProblem(undefined, "hide", { connected: false, cut: false })).toBe("not_connected");
});

test("set_price on a draft is refused", () => {
	expect(editProblem(item("draft"), "set_price")).toBe("status");
	expect(editProblem(item("active"), "set_price")).toBeNull();
	expect(editProblem(item("hidden"), "set_price")).toBeNull();
});

test("each action follows the status table", () => {
	expect(editProblem(item("hidden"), "hide")).toBe("status");
	expect(editProblem(item("active"), "unhide")).toBe("status");
	expect(editProblem(item("hidden"), "unhide")).toBeNull();
	expect(editProblem(item("sold"), "mark_sold")).toBe("status");
	expect(editProblem(item("expired"), "refresh")).toBeNull();
});

test("OLX refuses a refresh that is too early", () => {
	expect(editProblem(item("active", { canRefresh: false }), "refresh")).toBe("too_early");
	expect(editProblem(item("active", { canRefresh: false, provider: "svex" }), "refresh")).toBeNull();
});
