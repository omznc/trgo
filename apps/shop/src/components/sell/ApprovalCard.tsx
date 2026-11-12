import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSidePanel } from "@/components/shell/side-panel";
import { getPhoto } from "@/lib/photos";
import { getSession } from "@/lib/sessions";
import type { ListingArgs } from "@/lib/publish";
import { strings } from "@/lib/strings";
import { sell } from "@/lib/strings-sell";
import { SellMascot } from "./SellMascot";
import { Steps } from "./Steps";
import { PROVIDERS, type ProviderId } from "@lagano/providers";
import "./sell.css";

const GRADE_LABEL: Record<string, string> = {
	new_sealed: sell.draft.condition.new,
	new_open: sell.draft.condition.new,
	used_excellent: sell.draft.condition.likeNew,
	used_good: sell.draft.condition.used,
	used_fair: sell.draft.condition.used,
	defective: sell.draft.condition.damaged,
};

export function conditionLabel(input: ListingArgs, provider: ProviderId) {
	if (provider === "svex" && input.grade) return GRADE_LABEL[input.grade] ?? input.grade;
	return input.condition === "new" ? strings.conditionNew : strings.conditionUsed;
}

// A new provider fails the typecheck here until its delivery text exists.
const DELIVERY: Record<ProviderId, (input: ListingArgs) => string> = {
	olx: () => sell.approve.deliveryOlx,
	svex: (input) => (input.freeShipping ? sell.approve.deliverySvexFree : sell.approve.deliverySvex),
};

function rowsFor(input: ListingArgs, provider: ProviderId): [string, string][] {
	const r = sell.approve.row;
	const bool = (v: string | number | boolean) => (typeof v === "boolean" ? (v ? sell.approve.yes : sell.approve.no) : String(v));
	// Only OLX posts the attributes. The model wrote them, so the user must see them.
	const attributes = provider === "olx" ? Object.entries(input.olxAttributes ?? {}).map(([k, v]): [string, string] => [k, bool(v)]) : [];
	return [
		[r.title, input.title],
		[r.price, `${input.price} ${PROVIDERS[provider].currencyLabel}`],
		[r.condition, conditionLabel(input, provider)],
		[r.city, input.city],
		[r.photos, sell.approve.photosValue(input.photoIds.length)],
		[r.category, input.categoryHint],
		[r.delivery, DELIVERY[provider](input)],
		...attributes,
	];
}

function PlatformCard({ input, provider }: { input: ListingArgs; provider: ProviderId }) {
	return (
		<div className="rounded-[18px] border border-[rgba(14,16,32,.08)] bg-white px-4 py-3.5">
			<div className="mb-1 flex items-center gap-2">
				<span className="rounded-full bg-bg px-[9px] py-[3px] text-xs font-bold text-fg">{PROVIDERS[provider].name}</span>
				<span className="text-[13px] text-[rgba(14,16,32,.6)]">{sell.approve.cardHead}</span>
			</div>
			<dl className="m-0">
				{rowsFor(input, provider).map(([label, value], i) => (
					<div key={i} className="flex justify-between gap-3 border-b border-[rgba(14,16,32,.08)] py-2 text-sm">
						<dt className="text-[rgba(14,16,32,.6)]">{label}</dt>
						<dd className="m-0 min-w-0 break-words text-right font-semibold">{value}</dd>
					</div>
				))}
				<div className="border-b border-[rgba(14,16,32,.08)] py-2 text-sm">
					<dt className="text-[rgba(14,16,32,.6)]">{sell.approve.row.description}</dt>
					{/* The post is word for word this text, so it scrolls and is not cut. */}
					<dd
						// biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll area needs the keyboard
						tabIndex={0}
						className="m-0 mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-medium"
					>
						{input.description}
					</dd>
				</div>
			</dl>
			{provider === "olx" && (
				<p className="m-0 mt-2.5 flex items-start gap-2 rounded-xl bg-[#FFF1DC] px-3 py-2.5 text-[13px] text-[#8A4B00]">
					<Info size={15} strokeWidth={2.2} className="mt-px shrink-0" aria-hidden />
					<span>{sell.approve.olxDeliveryWarning}</span>
				</p>
			)}
		</div>
	);
}

function Thumbs({ ids }: { ids: string[] }) {
	return (
		<ul className="m-0 flex list-none items-center gap-2 overflow-x-auto p-0">
			{ids.map((id, i) => (
				<li key={id} className="shrink-0">
					<img
						src={getPhoto(id)?.url}
						alt={sell.approve.thumbAlt(i + 1)}
						className={`size-14 rounded-xl object-cover ${i === 0 ? "border-2 border-accent" : "border border-[rgba(14,16,32,.1)]"}`}
					/>
				</li>
			))}
		</ul>
	);
}

const ACTION = "sell-btn inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-full text-[15px] ";

export function ApprovalCard({ input, onRespond }: { input: ListingArgs; onRespond: (approved: boolean) => void }) {
	const [answered, setAnswered] = useState(false);
	const root = useRef<HTMLElement>(null);
	// The dialog holds the decision, so focus moves to it when it appears.
	useEffect(() => root.current?.focus({ preventScroll: true }), []);
	const { requireConnection } = useSidePanel();
	const answer = (approved: boolean) => {
		// The action stays enabled, so the user can publish after the login.
		const missing = approved ? input.providers.find((p) => !getSession(p)) : undefined;
		if (missing) return requireConnection(missing, strings.needPublish[missing]);
		setAnswered(true);
		onRespond(approved);
	};
	const names = input.providers.length > 1 ? sell.approve.both : input.providers.map((p) => PROVIDERS[p].name).join("");
	return (
		<section
			ref={root}
			tabIndex={-1}
			role="alertdialog"
			aria-labelledby="sell-ap-title"
			aria-describedby="sell-ap-sub"
			className="sell-attn flex flex-col gap-4 rounded-[28px] border-2 border-accent bg-fg p-[22px] text-bg outline-none"
		>
			<div className="flex flex-wrap items-center gap-3.5">
				<SellMascot pose="neutral" width={56} />
				<div className="min-w-0 flex-1 basis-48">
					<h2 id="sell-ap-title" className="m-0 text-2xl font-bold tracking-[-0.03em]">
						{sell.approve.title}
					</h2>
					<p id="sell-ap-sub" className="m-0 mt-0.5 text-sm text-[rgba(14,16,32,.65)]">
						{sell.approve.subtitle}
					</p>
				</div>
				<Steps current={2} tone="light" />
			</div>
			<Thumbs ids={input.photoIds} />
			<div className="grid gap-3 sm:grid-cols-2">
				{input.providers.map((p) => (
					<PlatformCard key={p} input={input} provider={p} />
				))}
			</div>
			<p className="m-0 text-[13px] text-[rgba(14,16,32,.6)]">{sell.approve.editHint}</p>
			<div className="flex flex-wrap justify-end gap-2">
				<button type="button" disabled={answered} onClick={() => answer(false)} className={`${ACTION} bg-transparent px-[18px] font-medium disabled:opacity-50`}>
					{sell.approve.cancel}
				</button>
				<button type="button" disabled={answered} onClick={() => answer(true)} className={`${ACTION} bg-bg px-[22px] font-semibold text-fg disabled:opacity-50`}>
					{sell.approve.publish(names)}
				</button>
			</div>
		</section>
	);
}
