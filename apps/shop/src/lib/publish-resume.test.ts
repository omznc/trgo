import { ActionReplyError } from "@lagano/providers";
import { expect, test } from "bun:test";
import type { LaganoMessage } from "./agent";
import type { ProviderResult } from "./publish";
import { isPublishing, outcomeUnknown, retryMode, savedTrack, trackOf, withListingResults } from "./publish-resume";

const failed = (extra: Partial<ProviderResult> = {}): ProviderResult => ({ provider: "olx", ok: false, error: "x", ...extra });

test("retry makes a new listing only when no id was saved", () => {
	expect(retryMode(failed())).toBe("fresh");
	expect(retryMode(failed({ listingId: "7", uploaded: 1 }))).toBe("resume");
	expect(retryMode(failed({ listingId: "7", unknown: true }))).toBe("none");
	expect(retryMode({ provider: "olx", ok: true, url: "u" })).toBe("none");
});

test("a resume starts from the saved id and the sent photos", () => {
	expect(trackOf(failed())).toEqual({ uploaded: 0, stage: "create" });
	const track = trackOf(failed({ listingId: "7", slug: "s", uploaded: 2 }));
	expect(track).toEqual({ id: "7", slug: "s", uploaded: 2, stage: "photos" });
	expect(savedTrack(track)).toEqual({ listingId: "7", slug: "s", uploaded: 2 });
	expect(savedTrack({ uploaded: 0, stage: "create" })).toEqual({});
});

test("an unreadable reply or an unclear publish failure is unknown", () => {
	expect(outcomeUnknown(new ActionReplyError("bad"), { uploaded: 0, stage: "create" })).toBe(true);
	const publishing = { id: "7", uploaded: 1, stage: "publish" as const };
	expect(outcomeUnknown(new Error("Failed to fetch"), publishing)).toBe(true);
	expect(outcomeUnknown(new Error("OLX POST /listings/7/publish failed with HTTP 422: bad"), publishing)).toBe(false);
	expect(outcomeUnknown(new Error("OLX photo failed with HTTP 500"), { id: "7", uploaded: 0, stage: "photos" })).toBe(false);
});

const listing = (state: string, extra: object = {}) =>
	[{ id: "a", role: "assistant", parts: [{ type: "tool-create_listing", toolCallId: "t1", state, ...extra }] }] as unknown as LaganoMessage[];

test("retry results go into the matching tool call only", () => {
	const messages = listing("output-available", { output: { done: true, results: [failed()] } });
	const next = withListingResults(messages, "t1", [{ provider: "olx", ok: true, url: "u" }]);
	expect((next?.[0]?.parts[0] as unknown as { output: { results: ProviderResult[] } }).output.results[0]?.ok).toBe(true);
	expect(withListingResults(messages, "other", [])).toBeNull();
});

test("a post in progress blocks the stop", () => {
	expect(isPublishing(listing("approval-responded", { approval: { id: "x", approved: true } }))).toBe(true);
	expect(isPublishing(listing("approval-responded", { approval: { id: "x", approved: false } }))).toBe(false);
	expect(isPublishing(listing("output-available", { output: { done: false, progress: {}, results: [] } }))).toBe(true);
	expect(isPublishing(listing("output-available", { output: { done: true, results: [] } }))).toBe(false);
	expect(isPublishing(listing("approval-requested", { approval: { id: "x" } }))).toBe(false);
});
