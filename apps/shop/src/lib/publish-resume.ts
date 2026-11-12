import { ActionReplyError } from "@lagano/providers";
import type { LaganoMessage } from "./agent";
import type { ProviderResult, PublishOutput } from "./publish";
import { isAuthError } from "./sessions";

// What one provider has done so far. A failed result keeps it, so a retry can go on from there.
export type Track = { id?: string; slug?: string; uploaded: number; stage: "create" | "photos" | "publish" };

export const trackOf = (previous?: ProviderResult): Track =>
	previous?.listingId
		? { id: previous.listingId, slug: previous.slug, uploaded: previous.uploaded ?? 0, stage: "photos" }
		: { uploaded: 0, stage: "create" };

export const savedTrack = (t: Track) => (t.id ? { listingId: t.id, slug: t.slug, uploaded: t.uploaded } : {});

// A reply that the server sent, with an HTTP error or an auth error, shows that the call did not run.
const refused = (error: unknown) => isAuthError(error) || /HTTP 4\d\d\b/.test(error instanceof Error ? error.message : "");

// True when the listing may exist or may be live, and a second call could make a duplicate.
export function outcomeUnknown(error: unknown, track: Track): boolean {
	if (error instanceof ActionReplyError) return true;
	return track.stage === "publish" && !!track.id && !refused(error);
}

export type RetryMode = "fresh" | "resume" | "none";

// "resume" goes on with the listing id that the first try made. "none" leaves the check to the user.
export function retryMode(result: ProviderResult): RetryMode {
	if (result.ok || result.unknown) return "none";
	return result.listingId ? "resume" : "fresh";
}

// Puts the results of a retry into the create_listing part, so a reload shows the real state.
// Returns null when no message holds that tool call.
export function withListingResults(messages: LaganoMessage[], toolCallId: string, results: ProviderResult[]): LaganoMessage[] | null {
	const hit = (p: LaganoMessage["parts"][number]) => p.type === "tool-create_listing" && p.toolCallId === toolCallId;
	if (!messages.some((m) => m.parts.some(hit))) return null;
	const output: PublishOutput = { done: true, results };
	return messages.map((m) => ({ ...m, parts: m.parts.map((p) => (hit(p) ? { ...p, output } : p)) as LaganoMessage["parts"] }));
}

// True while a create_listing post runs. A stop at this time would leave a draft or a copy.
export function isPublishing(messages: LaganoMessage[]): boolean {
	return messages.some((m) =>
		m.parts.some((p) => {
			if (p.type !== "tool-create_listing") return false;
			if (p.state === "approval-responded") return p.approval.approved;
			return p.state === "output-available" && (p.output as PublishOutput | undefined)?.done === false;
		}),
	);
}
