import type { ProviderId } from "@lagano/providers";
import { useSyncExternalStore } from "react";

// A listing that the user attached to the next chat message.
export type TaggedListing = {
	provider: ProviderId;
	id: string;
	title: string;
	priceText: string;
	url: string;
	imageUrl?: string;
	// True for a listing of the user's own account. The agent may edit it.
	own?: boolean;
};

export const MAX_TAGGED = 5;
const NONE: TaggedListing[] = [];
let current = NONE;
const listeners = new Set<() => void>();
const set = (next: TaggedListing[]) => {
	current = next.length ? next : NONE;
	listeners.forEach((l) => l());
};

export const taggedKey = (l: Pick<TaggedListing, "provider" | "id">) => `${l.provider}:${l.id}`;

// A new listing goes last. At the cap, the oldest one drops.
export function tagListing(listing: TaggedListing) {
	if (current.some((l) => taggedKey(l) === taggedKey(listing))) return;
	set([...current, listing].slice(-MAX_TAGGED));
}

export function untagListing(listing: Pick<TaggedListing, "provider" | "id">) {
	set(current.filter((l) => taggedKey(l) !== taggedKey(listing)));
}

export function toggleTagged(listing: TaggedListing) {
	if (current.some((l) => taggedKey(l) === taggedKey(listing))) untagListing(listing);
	else tagListing(listing);
}

export function clearTaggedListing() {
	if (current.length) set(NONE);
}

// Tags the listing, then focuses the composer. The panel closes below the split tier (1180px),
// because it would cover the composer there. It stays open in the split view.
export function tagAndFocus(listing: TaggedListing, close: () => void) {
	tagListing(listing);
	if (!window.matchMedia("(min-width: 1180px)").matches) close();
	setTimeout(() => document.getElementById("prompt")?.focus(), 60);
}

export const getTaggedListings = () => current;

export function useTaggedListings() {
	return useSyncExternalStore(
		(cb) => (listeners.add(cb), () => listeners.delete(cb)),
		() => current,
		() => NONE,
	);
}

// Text for the model only. The chat strips it from the visible message.
export const taggedNote = (l: TaggedListing) =>
	`\n\n[Tagged listing: provider=${l.provider}, id=${l.id}, own=${l.own ? "yes" : "no"}, title=${l.title.replace(/[\]\n]/g, " ")}, price=${l.priceText}, url=${l.url}]`;
