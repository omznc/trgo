import type { ProviderId } from "@lagano/providers";
import { ChevronDown, ChevronRight, Info, Sparkles } from "lucide-react";
import { useId } from "react";
import { getPhoto } from "@/lib/photos";
import type { ListingArgs } from "@/lib/publish";
import { sell } from "@/lib/strings-sell";
import { Steps } from "./Steps";
import "./sell.css";

const t = sell.draft;
export type UiCondition = keyof typeof t.condition;
export type Target = "olx" | "svex" | "both";
export type Draft = {
	title: string;
	price: string;
	categoryHint: string;
	condition: UiCondition;
	city: string;
	freeShipping: boolean;
	pickup: boolean;
	description: string;
	target: Target;
};

// The four labels of the design map to the condition and the SVEX grade of the publish arguments.
const GRADES = {
	new: { condition: "new", grade: "new_sealed" },
	likeNew: { condition: "used", grade: "used_excellent" },
	used: { condition: "used", grade: "used_good" },
	damaged: { condition: "used", grade: "defective" },
} as const;

export const targetProviders = (t: Target): ProviderId[] => (t === "both" ? ["olx", "svex"] : [t]);

export function draftToArgs(d: Draft, photoIds: string[]): ListingArgs {
	return {
		providers: targetProviders(d.target),
		title: d.title.trim(),
		description: d.description,
		price: Number(d.price),
		...GRADES[d.condition],
		categoryHint: d.categoryHint,
		city: d.city.trim(),
		freeShipping: d.freeShipping,
		photoIds,
	};
}

function AiTag() {
	return (
		<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
			<Sparkles size={11} strokeWidth={2.4} aria-hidden />
			{t.aiTag}
		</span>
	);
}

function Field({ label, htmlFor, ai, children }: { label: string; htmlFor?: string; ai?: boolean; children: React.ReactNode }) {
	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<div className="flex items-center justify-between">
				{htmlFor ? (
					<label htmlFor={htmlFor} className="sell-lbl">
						{label}
					</label>
				) : (
					<span className="sell-lbl">{label}</span>
				)}
				{ai && <AiTag />}
			</div>
			{children}
		</div>
	);
}

function Segmented<T extends string>(props: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
	return (
		<div role="radiogroup" aria-label={props.label} className={`sell-chip gap-0.5 rounded-xl p-[3px] ${props.options.length > 3 ? "grid grid-cols-2 sm:flex" : "flex"}`}>
			{props.options.map(([key, text]) => {
				const on = key === props.value;
				return (
					<button
						key={key}
						type="button"
						role="radio"
						aria-checked={on}
						onClick={() => props.onChange(key)}
						className={`sell-btn h-11 min-h-11 flex-1 rounded-[10px] border-0 px-1 text-sm font-medium ${on ? "bg-fg text-bg" : "bg-transparent text-fg"}`}
					>
						{text}
					</button>
				);
			})}
		</div>
	);
}

function Toggle({ label, sub, on, onChange }: { label: string; sub?: string; on: boolean; onChange: (v: boolean) => void }) {
	return (
		<label className="sell-focus-within flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2.5">
			<span className="flex flex-col">
				<span className="text-[15px]">{label}</span>
				{sub && <span className="text-xs text-fg-4">{sub}</span>}
			</span>
			<input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
			<span aria-hidden className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-ok" : "bg-white/18"}`}>
				<span className={`absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.3)] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${on ? "translate-x-[18px]" : "translate-x-0"}`} />
			</span>
		</label>
	);
}

type SetField = <K extends keyof Draft>(key: K, value: Draft[K]) => void;

function Details({ draft, set, uid }: { draft: Draft; set: SetField; uid: string }) {
	const conds = Object.entries(t.condition) as [UiCondition, string][];
	return (
		<div className="flex min-w-0 flex-col gap-3.5">
			<Field label={t.field.title} htmlFor={`${uid}-title`} ai>
				<input id={`${uid}-title`} className="sell-field" value={draft.title} onChange={(e) => set("title", e.target.value)} />
			</Field>
			<div className="grid gap-3 sm:grid-cols-2">
				<Field label={t.field.price} htmlFor={`${uid}-price`} ai>
					<div className="relative">
						<input id={`${uid}-price`} inputMode="decimal" className="sell-field pr-12 font-semibold" value={draft.price} onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))} />
						<span className="pointer-events-none absolute right-3.5 top-3 text-sm text-fg-3">{t.currency}</span>
					</div>
				</Field>
				<Field label={t.field.category} htmlFor={`${uid}-cat`} ai>
					<div className="relative">
						<input id={`${uid}-cat`} className="sell-field pr-10" value={draft.categoryHint} onChange={(e) => set("categoryHint", e.target.value)} />
						<ChevronDown size={16} strokeWidth={2.2} className="pointer-events-none absolute right-3 top-3.5 text-fg-3" aria-hidden />
					</div>
				</Field>
			</div>
			<Field label={t.field.condition} ai>
				<Segmented label={t.field.condition} value={draft.condition} options={conds} onChange={(v) => set("condition", v)} />
			</Field>
			<div className="grid gap-3 sm:grid-cols-2">
				<Field label={t.field.city} htmlFor={`${uid}-city`}>
					<input id={`${uid}-city`} className="sell-field" value={draft.city} onChange={(e) => set("city", e.target.value)} />
				</Field>
				<Field label={t.field.delivery} ai>
					<div className="flex flex-col gap-1.5">
						<Toggle label={t.delivery.pickup} on={draft.pickup} onChange={(v) => set("pickup", v)} />
						<Toggle label={t.delivery.free} sub={t.delivery.freeNote} on={draft.freeShipping} onChange={(v) => set("freeShipping", v)} />
					</div>
				</Field>
			</div>
			<Field label={t.field.description} htmlFor={`${uid}-desc`} ai>
				<textarea id={`${uid}-desc`} rows={4} className="sell-field h-auto resize-y py-3 leading-normal" value={draft.description} onChange={(e) => set("description", e.target.value)} />
			</Field>
		</div>
	);
}

function Cover({ ids, onEditPhotos }: { ids: string[]; onEditPhotos: () => void }) {
	return (
		<div className="flex flex-row items-center gap-3 sm:flex-col sm:items-stretch sm:gap-2">
			<img src={getPhoto(ids[0] ?? "")?.url} alt={t.coverAlt} className="aspect-square w-28 shrink-0 rounded-2xl bg-[#232745] object-cover sm:w-full" />
			<p className="m-0 text-xs text-fg-3">
				{t.photoCount(ids.length)}
				<button type="button" onClick={onEditPhotos} className="sell-link min-h-11 cursor-pointer border-0 bg-transparent p-0 text-xs text-focus sm:min-h-0">
					{t.editPhotos}
				</button>
			</p>
		</div>
	);
}

type Props = { draft: Draft; photoIds: string[]; priceHint?: string; onChange: (d: Draft) => void; onDiscard: () => void; onReview: () => void; onEditPhotos: () => void };

export function DraftCard({ draft, photoIds, priceHint, onChange, onDiscard, onReview, onEditPhotos }: Props) {
	const uid = useId();
	const set: SetField = (key, value) => onChange({ ...draft, [key]: value });
	const valid = draft.title.trim().length >= 8 && Number(draft.price) > 0 && draft.city.trim() !== "";
	return (
		<section className="sell-glass rounded-[24px] p-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="m-0 text-[17px] font-semibold tracking-[-0.02em]">{t.title}</h2>
				<Steps current={1} />
			</div>
			<div className="mt-4 grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-[18px]">
				<Cover ids={photoIds} onEditPhotos={onEditPhotos} />
				<Details draft={draft} set={set} uid={uid} />
			</div>
			{priceHint && (
				<p className="m-0 mt-3 flex items-center gap-1.5 text-xs text-fg-3">
					<Info size={13} aria-hidden /> {priceHint}
				</p>
			)}
			<div className="mt-[18px] flex flex-col gap-2.5 border-t border-white/8 pt-[18px]">
				<Field label={t.target.label}>
					<Segmented label={t.target.label} value={draft.target} options={[["olx", t.target.olx], ["svex", t.target.svex], ["both", t.target.both]]} onChange={(v) => set("target", v)} />
				</Field>
				{draft.target !== "svex" && (
					<p role="status" className="m-0 flex items-center gap-2.5 rounded-[14px] border border-warn/25 bg-warn/12 px-3.5 py-2.5 text-sm text-fg">
						<Info size={16} className="shrink-0 text-warn" aria-hidden />
						{t.olxDeliveryWarning}
					</p>
				)}
				<div className="flex justify-end gap-2">
					<button type="button" onClick={onDiscard} className="sell-btn h-11 min-h-11 rounded-full border-0 bg-transparent px-4 text-sm font-medium text-fg-3">
						{t.discard}
					</button>
					<button type="button" disabled={!valid} onClick={onReview} className="sell-btn inline-flex h-11 min-h-11 items-center gap-[7px] rounded-full border-0 bg-accent pl-[13px] pr-4 text-sm font-semibold text-bg disabled:opacity-50">
						<ChevronRight size={15} strokeWidth={2.2} aria-hidden />
						{t.review}
					</button>
				</div>
			</div>
		</section>
	);
}
