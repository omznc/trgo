import { listingIdFromUrl } from "@lagano/providers";
import { Check, ImageOff, MapPin } from "lucide-react";
import { useState } from "react";
import type { DetailListing } from "@/components/detail/DetailPanel";
import { timeAgo } from "@/components/detail/format";
import { strings } from "@/lib/strings";
import { ta } from "@/lib/strings-account";
import { cn } from "@/lib/utils";
import { useSidePanel } from "./side-panel";
import { taggedKey, toggleTagged, useTaggedListings } from "./tagged-listing";

const NAMES = { olx: "OLX", svex: "SVEX" } as const;
const CONDITIONS = { new: strings.conditionNew, used: strings.conditionUsed } as const;

export type ViewMode = "grid" | "list";

function Photo({ card, gone }: { card: DetailListing; gone: boolean }) {
	return (
		<div className={"relative aspect-[4/3] overflow-hidden rounded-media bg-card-img"}>
			{card.imageUrl ? (
				<img
					src={card.imageUrl}
					alt=""
					loading="lazy"
					className="size-full object-cover"
					style={gone ? { filter: "grayscale(1) brightness(.7)" } : undefined}
				/>
			) : (
				<div className="absolute inset-0 grid place-content-center justify-items-center gap-1.5 text-xs text-fg-4">
					<ImageOff className="size-[22px]" aria-hidden />
					{strings.noImage}
				</div>
			)}
			<span className="absolute top-2 left-2 rounded-full bg-[rgba(14,16,32,.72)] px-[9px] py-1 text-[11px] font-semibold text-fg backdrop-blur-md">
				{NAMES[card.provider]}
			</span>
			{gone && (
				<span className="absolute inset-0 grid place-items-center">
					<span className="rounded-full bg-fg px-2.5 py-[5px] text-xs font-bold text-bg">{strings.unavailable}</span>
				</span>
			)}
		</div>
	);
}

function CardText({ card, gone }: { card: DetailListing; gone: boolean }) {
	const age = timeAgo(card.postedAt);
	return (
		<div className={cn("flex min-w-0 flex-col gap-1 px-1.5", gone && "opacity-60")}>
			<span className={cn("text-xl leading-tight font-bold tracking-[-0.02em] max-sm:text-lg", gone && "line-through")}>{card.price}</span>
			<span className="line-clamp-2 text-[13px] leading-snug text-fg-3 max-sm:truncate max-sm:text-xs">{gone ? strings.removed : card.title}</span>
			<span className="flex flex-wrap items-center gap-x-2.5 text-xs text-fg-4">
				{card.city && (
					<span className="inline-flex items-center gap-1">
						<MapPin className="size-3" aria-hidden />
						{card.city}
					</span>
				)}
				{card.condition && <span>{CONDITIONS[card.condition]}</span>}
				{age && <span>{age}</span>}
			</span>
		</div>
	);
}

function SelectToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
	return (
		<button
			type="button"
			aria-pressed={on}
			aria-label={ta.tagSelect}
			title={ta.tagSelect}
			onClick={onToggle}
			className={cn(
				"absolute top-3.5 right-3.5 grid size-7 place-items-center rounded-full border backdrop-blur-md focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus max-sm:top-3 max-sm:right-3",
				on ? "border-accent bg-accent text-bg" : "border-white/25 bg-[rgba(14,16,32,.72)] text-fg-3 hover:text-fg",
				// Always visible on touch. On a mouse it shows on hover, focus or when selected.
				!on && "pointer-fine:opacity-0 pointer-fine:group-hover/card:opacity-100",
			)}
		>
			<Check className="size-3.5" strokeWidth={on ? 3 : 2.2} aria-hidden />
		</button>
	);
}

export function ListingCard({ card, stagger, view, own = false, late = false }: { card: DetailListing; stagger: number; view: ViewMode; own?: boolean; late?: boolean }) {
	const [delay] = useState(stagger);
	const panel = useSidePanel();
	const tagged = useTaggedListings();
	const id = card.id ?? listingIdFromUrl(card.provider, card.url);
	const key = taggedKey({ provider: card.provider, id });
	const checked = tagged.some((l) => taggedKey(l) === key);
	const selected = panel.view?.kind === "detail" && panel.view.listing.url === card.url;
	const gone = card.available === false;
	const row = view === "list";
	return (
		<div
			style={{ animationDelay: `${delay}ms` }}
			className={cn(
				"group/card in relative flex",
				// Cards below the first row skip layout and paint until they are near the screen.
				late && "[contain-intrinsic-size:auto_300px] [content-visibility:auto]",
				"max-sm:w-[200px] max-sm:shrink-0 max-sm:snap-start",
			)}
		>
			<button
				type="button"
				aria-pressed={selected}
				onClick={() => panel.open({ kind: "detail", listing: card }, { fresh: true })}
				className={cn(
					"glass flex w-full gap-2.5 rounded-card p-2 text-left text-fg shadow-none",
					row ? "items-center pr-4 [&>div:first-child]:w-36 [&>div:first-child]:shrink-0" : "flex-col pb-3.5",
					"max-sm:rounded-card-sm max-sm:p-1.5 max-sm:pb-3",
					(selected || checked) && "border-accent",
					checked && "outline-2 -outline-offset-2 outline-accent",
				)}
			>
				<Photo card={card} gone={gone} />
				<CardText card={card} gone={gone} />
			</button>
			<SelectToggle
				on={checked}
				onToggle={() => toggleTagged({ provider: card.provider, id, title: card.title, priceText: card.price, url: card.url, imageUrl: card.imageUrl, own })}
			/>
		</div>
	);
}

export function SkeletonCard({ row }: { row?: boolean }) {
	return (
		<div aria-hidden className={cn("glass flex gap-2.5 rounded-card p-2 pb-3.5 shadow-none max-sm:w-[200px] max-sm:shrink-0", row ? "items-center" : "flex-col")}>
			<div className={cn("shim aspect-[4/3] rounded-media", row && "w-36 shrink-0")} />
			<div className="flex w-full flex-col gap-2 px-1.5">
				<div className="shim h-[18px] w-1/2 rounded-md" />
				<div className="shim h-3 w-[90%] rounded-md" />
				<div className="shim h-3 w-3/5 rounded-md" />
			</div>
		</div>
	);
}
