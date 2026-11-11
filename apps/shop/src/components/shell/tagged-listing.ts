import type { ProviderId } from "@lagano/providers";
import { useSyncExternalStore } from "react";

// One listing that the user attached to the next chat message.
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

let current: TaggedListing | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function tagListing(listing: TaggedListing) {
	current = listing;
	emit();
}

export function clearTaggedListing() {
	if (!current) return;
	current = null;
	emit();
}

// Tags the listing, then focuses the composer. The panel closes below the split tier (1180px),
// because it would cover the composer there. It stays open in the split view.
export function tagAndFocus(listing: TaggedListing, close: () => void) {
	tagListing(listing);
	if (!window.matchMedia("(min-width: 1180px)").matches) close();
	setTimeout(() => document.getElementById("prompt")?.focus(), 60);
}

export const getTaggedListing = () => current;

export function useTaggedListing() {
	return useSyncExternalStore(
		(cb) => (listeners.add(cb), () => listeners.delete(cb)),
		() => current,
		() => null,
	);
}

// Text for the model only. The chat strips it from the visible message.
export const taggedNote = (l: TaggedListing) =>
	`\n\n[Tagged listing: provider=${l.provider}, id=${l.id}, own=${l.own ? "yes" : "no"}, title=${l.title.replace(/[\]\n]/g, " ")}, price=${l.priceText}, url=${l.url}]`;
