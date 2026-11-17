import { PROVIDERS } from "@lagano/providers";
import { useRef } from "react";
import type { DetailListing } from "@/components/detail/DetailPanel";
import type { LaganoMessage } from "@/lib/agent";
import { useSidePanel } from "./side-panel";

export type ListingRefs = Map<string, DetailListing>;

// The listings of all the searches in the chat, by "provider:id". The map only grows, so its identity stays stable.
export function useListingRefs(messages: LaganoMessage[]): ListingRefs {
	const refs = useRef<ListingRefs>(new Map()).current;
	for (const l of messages.flatMap((m) => m.parts.flatMap(listingsOf))) if (l.id) refs.set(`${l.provider}:${l.id}`, l);
	return refs;
}

function listingsOf(p: LaganoMessage["parts"][number]): DetailListing[] {
	const search = p.type === "tool-search_listings" || p.type === "tool-list_my_listings";
	return search && p.state === "output-available" ? ((p.output as { listings?: DetailListing[] }).listings ?? []) : [];
}

// A listing reference in the answer text. A click opens the listing in the side panel.
export function ListingRef({ listing }: { listing: DetailListing }) {
	const panel = useSidePanel();
	return (
		<button
			type="button"
			title={`${listing.title} · ${listing.price}`}
			aria-label={`${listing.title}, ${listing.price}, ${PROVIDERS[listing.provider].name}`}
			onClick={() => panel.open({ kind: "detail", listing }, { fresh: true })}
			className="mx-0.5 inline-flex h-6 max-w-[220px] items-center gap-1.5 rounded-full border border-accent/25 bg-accent/12 pr-2 pl-1 align-[-0.1em] text-[12px] text-fg hover:bg-accent/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
		>
			{listing.imageUrl ? (
				<img src={listing.imageUrl} alt="" className="size-4 flex-none rounded-full object-cover" />
			) : (
				<span aria-hidden className="size-4 flex-none rounded-full bg-accent/40" />
			)}
			<span className="flex-none font-semibold tracking-[.04em] text-accent">{PROVIDERS[listing.provider].name}</span>
			<span className="min-w-0 truncate text-fg-3">{listing.price}</span>
		</button>
	);
}
