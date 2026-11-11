import { expect, test } from "bun:test";
import { type SearchCard, summarizeSearch } from "./search-summary";

const NOW = Date.parse("2026-11-12T12:00:00Z");
const card = (i: number): SearchCard => ({
	provider: i % 2 ? "svex" : "olx",
	id: String(1000 + i),
	title: `Xbox Series S 512GB konzola sa dva kontrolera i garancijom ${i}`.padEnd(120, "x"),
	price: `${300 + i} KM`,
	value: 300 + i,
	city: "Sarajevo",
	url: `https://olx.ba/artikal/${1000 + i}`,
	imageUrl: `https://img.olx.ba/images/${i}/very/long/path/photo.jpg`,
	condition: "used",
	postedAt: new Date(NOW - i * 86_400_000).toISOString(),
});

test("model sees a short summary of 100 listings", () => {
	const listings = Array.from({ length: 100 }, (_, i) => card(i));
	const text = summarizeSearch({ total: 340, errors: [], listings }, NOW);
	expect(text).toContain("all 100 listings");
	expect(text).toContain("min 300, median 350, max 399");
	expect(text.match(/^- /gm)).toHaveLength(12);
	expect(text).toContain("olx:1000 | ");
	expect(text).toContain("| 3d");
	expect(text.length).toBeLessThan(JSON.stringify({ listings }).length / 10);
});

test("says so when nothing is found", () => {
	expect(summarizeSearch({ total: 0, errors: [{ provider: "svex" }], days: 90, listings: [] })).toContain("last 90 days");
});
