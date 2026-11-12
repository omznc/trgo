import { type ListingDetail, PROVIDERS, type ProviderId } from "@lagano/providers";
import { Calendar, Check, Copy, ExternalLink, MapPin, MessageSquare, Package, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PanelHeader } from "@/components/account/ui";
import { useChatActions } from "@/components/shell/chat-actions";
import { useSidePanel } from "@/components/shell/side-panel";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { timeAgo } from "./format";
import { Gallery } from "./Gallery";
import { details } from "./strings-detail";
import { useListingDetail } from "./use-listing-detail";

// What the search result carries. The panel loads the rest.
export type DetailListing = {
	provider: ProviderId;
	id?: string;
	postedAt?: string;
	title: string;
	price: string;
	city?: string;
	url: string;
	imageUrl?: string;
	condition?: "new" | "used";
	available?: boolean;
};

const CONDITIONS = { new: strings.conditionNew, used: strings.conditionUsed } as const;

function Fact({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
	return (
		<span className="chip inline-flex h-8 items-center gap-[7px] rounded-full pr-4 pl-[13px] text-[13px] font-medium tracking-[-0.01em]">
			<Icon className="size-[13px]" strokeWidth={2.2} aria-hidden />
			{text}
		</span>
	);
}

const Bone = ({ className }: { className?: string }) => <div aria-hidden className={cn("animate-pulse rounded-lg bg-white/6", className)} />;

function deliveryFacts(d: ListingDetail["delivery"], unit: string) {
	const facts: string[] = [];
	if (d.freeShipping) facts.push(details.freeShipping);
	else if (d.shipping) facts.push(typeof d.price === "number" && d.price > 0 ? details.shippingPrice(d.price, unit) : details.shipping);
	if (d.pickup) facts.push(details.pickup);
	return facts;
}

function Facts({ listing, detail, loading }: { listing: DetailListing; detail?: ListingDetail; loading: boolean }) {
	const ago = timeAgo(detail?.postedAt);
	return (
		<div className="flex flex-wrap gap-2">
			{listing.city && <Fact icon={MapPin} text={listing.city} />}
			{listing.condition && <Fact icon={Package} text={CONDITIONS[listing.condition]} />}
			{ago ? <Fact icon={Calendar} text={ago} /> : loading && <Bone className="h-8 w-24 rounded-full" />}
			{detail &&
				deliveryFacts(detail.delivery, PROVIDERS[listing.provider].currencyLabel).map((text) => <Fact key={text} icon={Truck} text={text} />)}
		</div>
	);
}

function Description({ text, loading, error, retry }: { text?: string; loading: boolean; error: boolean; retry: () => void }) {
	if (error)
		return (
			<p className="m-0 text-[13px] text-fg-3">
				{details.loadFailed}{" "}
				<button type="button" onClick={retry} className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-fg underline">
					{strings.retry}
				</button>
			</p>
		);
	if (loading)
		return (
			<div className="flex flex-col gap-2" role="status" aria-label={details.loadingLabel}>
				<Bone className="h-[15px] w-full" />
				<Bone className="h-[15px] w-full" />
				<Bone className="h-[15px] w-3/5" />
			</div>
		);
	if (!text) return null;
	// Plain text from the provider. React escapes it; pre-line shows the line breaks.
	return <p className="m-0 text-[15px] leading-[1.55] break-words whitespace-pre-line text-fg-2">{text}</p>;
}

function SellerCard({ seller, provider }: { seller: NonNullable<ListingDetail["seller"]>; provider: string }) {
	const year = seller.since ? new Date(seller.since).getFullYear() : undefined;
	const meta = [seller.type === "shop" ? details.sellerShop : details.sellerPrivate, year && details.sellerSince(provider, year)];
	return (
		<div className="chip flex items-center gap-3 rounded-2xl p-3">
			<span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-[#c2407a] font-bold">
				{seller.name.slice(0, 2).toUpperCase()}
			</span>
			<div className="min-w-0 grow">
				<div className="truncate text-[15px] font-semibold">{seller.name}</div>
				<div className="text-[13px] text-fg-4">{meta.filter(Boolean).join(" · ")}</div>
			</div>
		</div>
	);
}

function Specs({ attributes }: { attributes: ListingDetail["attributes"] }) {
	if (attributes.length === 0) return null;
	return (
		<section className="flex flex-col gap-1.5">
			<div className="lbl">{details.specs}</div>
			<dl className="chip m-0 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3 gap-y-2 rounded-2xl p-3 text-[14px]">
				{attributes.map((a) => (
					<div key={a.name} className="col-span-2 grid grid-cols-subgrid">
						<dt className="text-fg-4">{a.name}</dt>
						<dd className="m-0 font-medium break-words">{a.value}</dd>
					</div>
				))}
			</dl>
		</section>
	);
}

type InfoProps = { detail?: ListingDetail; loading: boolean; error: boolean; retry: () => void; provider: string };

function Info({ detail, loading, error, retry, provider }: InfoProps) {
	return (
		<>
			{(loading || error || detail?.description) && (
				<section className="flex flex-col gap-1.5">
					<div className="lbl">{details.description}</div>
					<Description text={detail?.description} loading={loading} error={error} retry={retry} />
				</section>
			)}
			{detail && <DetailRest detail={detail} provider={provider} />}
			{loading && <Bone className="h-[66px] rounded-2xl" />}
		</>
	);
}

function DetailRest({ detail, provider }: { detail: ListingDetail; provider: string }) {
	return (
		<>
			<Specs attributes={detail.attributes} />
			{detail.seller && <SellerCard seller={detail.seller} provider={provider} />}
			{detail.views !== undefined && <div className="text-[13px] text-fg-4">{details.views(detail.views)}</div>}
		</>
	);
}

function CopyLink({ url }: { url: string }) {
	const [done, setDone] = useState(false);
	const timer = useRef<number>(undefined);
	useEffect(() => () => window.clearTimeout(timer.current), []);
	const Icon = done ? Check : Copy;
	return (
		<button
			type="button"
			aria-label={done ? details.linkCopied : details.copyLink}
			title={details.copyLink}
			onClick={() =>
				navigator.clipboard.writeText(url).then(() => {
					setDone(true);
					window.clearTimeout(timer.current);
					timer.current = window.setTimeout(() => setDone(false), 1800);
				}, () => {})
			}
			className="glass grid size-12 shrink-0 place-items-center rounded-full p-0 shadow-none"
		>
			<Icon className="size-[16px]" strokeWidth={2.2} aria-hidden />
		</button>
	);
}

export function DetailPanel({ listing, onAsk }: { listing: DetailListing; onAsk?: (listing: DetailListing) => void }) {
	const { close } = useSidePanel();
	const actions = useChatActions();
	const { detail, loading, error, retry } = useListingDetail(listing.provider, listing.url);
	const name = PROVIDERS[listing.provider].name;
	const images = detail?.imageUrls.length ? detail.imageUrls : listing.imageUrl ? [listing.imageUrl] : [];
	const ask = () => {
		if (onAsk) return onAsk(listing);
		close();
		actions.ask(strings.askAboutText(listing.title));
	};
	return (
		<>
			<PanelHeader title={name} onClose={close} />
			<div className="scroll flex min-h-0 flex-1 flex-col gap-4 px-5 pb-5">
				<Gallery key={listing.url} images={images} alt={listing.title} loading={loading && images.length === 0} />
				<div>
					<div className="text-[32px] leading-tight font-bold tracking-[-0.03em]">{listing.price}</div>
					<h2 className="mt-0.5 mb-0 text-lg font-semibold tracking-[-0.02em]">{listing.title}</h2>
				</div>
				<Facts listing={listing} detail={detail} loading={loading} />
				<Info detail={detail} loading={loading} error={error} retry={retry} provider={name} />
			</div>
			<div className="flex shrink-0 flex-wrap gap-2 border-t border-chip-line px-5 pt-3.5 pb-5">
				<a
					href={listing.url}
					target="_blank"
					rel="noopener noreferrer"
					className="btn inline-flex h-12 min-h-12 min-w-[150px] flex-1 items-center justify-center gap-[7px] rounded-full bg-fg text-sm font-semibold tracking-[-0.01em] whitespace-nowrap text-bg no-underline shadow-[0_8px_24px_rgba(0,0,0,.25)] hover:text-bg"
				>
					<ExternalLink className="size-[15px]" strokeWidth={2.2} aria-hidden />
					{strings.openOn(name)}
				</a>
				<button
					type="button"
					onClick={ask}
					className="glass inline-flex grow h-12 min-h-12 items-center gap-[7px] rounded-full pr-4 pl-[13px] text-sm font-medium tracking-[-0.01em] whitespace-nowrap shadow-none"
				>
					<MessageSquare className="size-[15px]" strokeWidth={2.2} aria-hidden />
					{strings.askAbout}
				</button>
				<CopyLink url={listing.url} />
			</div>
		</>
	);
}
