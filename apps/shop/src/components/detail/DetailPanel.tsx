import { ExternalLink, ImageOff, MessageSquare, Package, MapPin } from "lucide-react";
import { PanelHeader } from "@/components/account/ui";
import { useChatActions } from "@/components/shell/chat-actions";
import { useSidePanel } from "@/components/shell/side-panel";
import { strings } from "@/lib/strings";

// Only what the search result carries. Add fields here when the tool returns them.
export type DetailListing = {
	provider: "olx" | "svex";
	title: string;
	price: string;
	city?: string;
	url: string;
	imageUrl?: string;
	condition?: "new" | "used";
	available?: boolean;
};

const NAMES = { olx: "OLX", svex: "SVEX" } as const;
const CONDITIONS = { new: strings.conditionNew, used: strings.conditionUsed } as const;

function Fact({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
	return (
		<span className="chip inline-flex h-8 items-center gap-[7px] rounded-full pr-4 pl-[13px] text-[13px] font-medium tracking-[-0.01em]">
			<Icon className="size-[13px]" strokeWidth={2.2} aria-hidden />
			{text}
		</span>
	);
}

export function DetailPanel({ listing }: { listing: DetailListing }) {
	const { close } = useSidePanel();
	const actions = useChatActions();
	const name = NAMES[listing.provider];
	return (
		<>
			<PanelHeader title={name} onClose={close} />
			<div className="scroll flex min-h-0 flex-1 flex-col gap-4 px-5 pb-5">
				<div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-bubble bg-card-img">
					{listing.imageUrl ? (
						<img src={listing.imageUrl} alt={listing.title} className="size-full object-cover" />
					) : (
						<div className="absolute inset-0 grid place-content-center justify-items-center gap-1.5 text-xs text-fg-4">
							<ImageOff className="size-[22px]" aria-hidden />
							{strings.noImage}
						</div>
					)}
				</div>
				<div>
					<div className="text-[32px] leading-tight font-bold tracking-[-0.03em]">{listing.price}</div>
					<h2 className="mt-0.5 mb-0 text-lg font-semibold tracking-[-0.02em]">{listing.title}</h2>
				</div>
				<div className="flex flex-wrap gap-2">
					{listing.city && <Fact icon={MapPin} text={listing.city} />}
					{listing.condition && <Fact icon={Package} text={CONDITIONS[listing.condition]} />}
				</div>
			</div>
			<div className="flex shrink-0 gap-2 border-t border-chip-line px-5 pt-3.5 pb-5">
				<a
					href={listing.url}
					target="_blank"
					rel="noopener noreferrer"
					className="btn inline-flex h-12 min-h-12 flex-1 items-center justify-center gap-[7px] rounded-full bg-fg text-sm font-semibold tracking-[-0.01em] whitespace-nowrap text-bg no-underline shadow-[0_8px_24px_rgba(0,0,0,.25)] hover:text-bg"
				>
					<ExternalLink className="size-[15px]" strokeWidth={2.2} aria-hidden />
					{strings.openOn(name)}
				</a>
				<button
					type="button"
					onClick={() => {
						close();
						actions.ask(strings.askAboutText(listing.title));
					}}
					className="glass inline-flex h-12 min-h-12 items-center gap-[7px] rounded-full pr-4 pl-[13px] text-sm font-medium tracking-[-0.01em] whitespace-nowrap shadow-none"
				>
					<MessageSquare className="size-[15px]" strokeWidth={2.2} aria-hidden />
					{strings.askAbout}
				</button>
			</div>
		</>
	);
}
