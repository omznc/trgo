import { PROVIDERS } from "@lagano/providers";
import { X } from "lucide-react";
import { ta } from "@/lib/strings-account";
import { cn } from "@/lib/utils";
import type { TaggedListing } from "./tagged-listing";

// The tagged listing as a mention pill. Pass onRemove in the composer. The sent bubble has none.
export function TaggedChip({ listing, onRemove, small }: { listing: TaggedListing; onRemove?: () => void; small?: boolean }) {
	return (
		<span
			title={listing.title}
			className={cn(
				"group inline-flex max-w-[280px] items-center gap-1.5 rounded-full border border-accent/25 bg-accent/12 pr-2.5 pl-1 text-fg",
				small ? "h-6 text-[12px]" : "h-7 text-[13px]",
				onRemove && "pr-1",
			)}
		>
			{listing.imageUrl ? (
				<img src={listing.imageUrl} alt="" className={cn("flex-none rounded-full object-cover", small ? "size-4" : "size-5")} />
			) : (
				<span aria-hidden className={cn("flex-none rounded-full bg-accent/40", small ? "size-4" : "size-5")} />
			)}
			<span className="min-w-0 truncate font-medium">{listing.title}</span>
			<span className="flex-none text-fg-3">{listing.priceText}</span>
			<span className="flex-none text-[10px] font-semibold tracking-[.04em] text-accent">{PROVIDERS[listing.provider].name}</span>
			{onRemove && (
				<button
					type="button"
					aria-label={ta.tagRemove}
					onClick={onRemove}
					className="grid size-5 flex-none place-items-center rounded-full text-fg-3 hover:bg-white/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100"
				>
					<X size={12} aria-hidden />
				</button>
			)}
		</span>
	);
}
