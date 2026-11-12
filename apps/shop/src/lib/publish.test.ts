import { afterEach, beforeEach, expect, test } from "bun:test";
import type { Track } from "./publish-resume";
import { addPhoto } from "./photos";
import { type ListingArgs, olxAccount, publishListing, publishOlx, publishSvex, svexAccount } from "./publish";

const store = new Map<string, string>();
const g = globalThis as Record<string, unknown>;
const saved = { localStorage: g.localStorage, window: g.window, createImageBitmap: g.createImageBitmap, OffscreenCanvas: g.OffscreenCanvas };

beforeEach(() => {
	store.clear();
	g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
	g.window = { dispatchEvent: () => true };
	g.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
	g.OffscreenCanvas = class {
		getContext = () => ({ fillRect() {}, drawImage() {} });
		convertToBlob = async () => new Blob(["x"]);
	};
	store.set("lagano.session.olx", JSON.stringify({ token: "t" }));
	store.set("lagano.session.svex", JSON.stringify({ token: "t" }));
});

afterEach(() => Object.assign(g, saved));

const base: ListingArgs = { providers: ["olx"], title: "t", description: "d", price: 10, condition: "used", categoryHint: "x", city: "x", photoIds: [] };
const run = async (gen: AsyncGenerator<string, unknown>) => {
	for (let n = await gen.next(); !n.done; n = await gen.next());
};

// A stub replaces a provider function. The call log shows what the step did.
function stubOlx(calls: string[]) {
	const o = olxAccount as unknown as Record<string, unknown>;
	o.uploadImages = async (_s: unknown, id: number) => void calls.push(`upload ${id}`);
	o.publish = async (_s: unknown, id: number) => void calls.push(`publish ${id}`);
	o.createDraft = async () => (calls.push("create"), { id: 99 });
	o.cities = async () => (calls.push("cities"), []);
}

test("an OLX resume skips sent photos and publishes the saved draft", async () => {
	const calls: string[] = [];
	stubOlx(calls);
	const a = await addPhoto(new Blob(["a"]));
	const b = await addPhoto(new Blob(["b"]));
	const track: Track = { id: "7", uploaded: 1, stage: "photos" };
	await run(publishOlx({ ...base, photoIds: [a.id, b.id] }, track));
	expect(calls).toEqual(["upload 7", "publish 7"]);
	expect(track.uploaded).toBe(2);
});

test("an OLX resume with all photos sent needs no photo in the browser", async () => {
	const calls: string[] = [];
	stubOlx(calls);
	const track: Track = { id: "7", uploaded: 2, stage: "photos" };
	await run(publishOlx({ ...base, photoIds: ["photo-gone-1", "photo-gone-2"] }, track));
	expect(calls).toEqual(["publish 7"]);
});

test("an OLX resume never makes a second draft", async () => {
	const calls: string[] = [];
	stubOlx(calls);
	await run(publishOlx(base, { id: "7", uploaded: 0, stage: "photos" }));
	expect(calls).not.toContain("create");
	expect(calls).not.toContain("cities");
});

test("a missing photo stops OLX before a draft is made", async () => {
	const calls: string[] = [];
	stubOlx(calls);
	await expect(run(publishOlx({ ...base, photoIds: ["photo-gone-1"] }, { uploaded: 0, stage: "create" }))).rejects.toThrow("not in the browser");
	expect(calls).toEqual([]);
});

test("a SVEX resume only publishes the saved listing", async () => {
	const calls: string[] = [];
	const s = svexAccount as unknown as Record<string, unknown>;
	s.publishListing = async (_s: unknown, id: string) => void calls.push(`publish ${id}`);
	s.uploadPhoto = async () => (calls.push("photo"), {});
	s.createListing = async () => (calls.push("create"), { id: "x", slug: "x" });
	const track: Track = { id: "s1", slug: "slug", uploaded: 0, stage: "photos" };
	await run(publishSvex({ ...base, providers: ["svex"], photoIds: ["photo-gone-1"] }, track));
	expect(calls).toEqual(["publish s1"]);
});

test("publishListing resumes from a saved result", async () => {
	const calls: string[] = [];
	stubOlx(calls);
	const previous = [{ provider: "olx" as const, ok: false, listingId: "7", uploaded: 1 }];
	const out = [];
	for await (const o of publishListing({ ...base, photoIds: ["photo-gone-1"] }, previous)) out.push(o);
	expect(calls).toEqual(["publish 7"]);
	expect(out.at(-1)).toMatchObject({ done: true, results: [{ provider: "olx", ok: true }] });
});
