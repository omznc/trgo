import type { ToolUIPart } from "ai";
import { AlertCircle, ArrowDown, ArrowDownUp, Check, ChevronDown, LayoutGrid, List, RefreshCw, Search, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DetailListing } from "@/components/detail/DetailPanel";
import { Mascot } from "@/components/Mascot";
import { useChatActions } from "@/components/shell/chat-actions";
import { ListingCard, SkeletonCard, type ViewMode } from "@/components/shell/ListingCard";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

type SearchOutput = { listings: DetailListing[]; errors: { provider: string }[]; error?: string };
type SearchInput = { q?: string; maxPrice?: number };
type Condition = "all" | "new" | "used";

const PAGE = 8;
const NAMES = { olx: "OLX", svex: "SVEX" } as const;
const pill = "inline-flex h-[34px] min-h-[34px] items-center gap-[7px] whitespace-nowrap rounded-full pr-4 pl-[13px] text-[13px] font-medium tracking-[-0.01em]";

// "1.250 KM" -> 1250. A listing without a number sorts last.
export function priceValue(text: string) {
	const n = Number.parseFloat(text.replaceAll(".", "").replace(",", ".").replace(/[^\d.]/g, ""));
	return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function StatusLine({ loading, listings, errors, mine }: { loading: boolean; listings: DetailListing[]; errors: string[]; mine: boolean }) {
	const counts = (["olx", "svex"] as const).map((p) => [p, listings.filter((l) => l.provider === p).length] as const);
	return (
		<div role="status" aria-live="polite" className="flex flex-wrap items-center gap-2.5 text-[13px] font-medium text-fg-3">
			{loading ? (
				<>
					<span className="spin inline-grid">
						<RefreshCw className="size-3.5" aria-hidden />
					</span>
					{strings.searchingStatus}
				</>
			) : (
				<>
					<Search className="size-3.5" aria-hidden />
					{mine ? strings.searchedMine : strings.searchedOn}
					{!mine &&
						counts.map(([p, n]) =>
							errors.includes(p) ? (
								<span key={p} className="chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px]">
									<TriangleAlert className="size-3 text-danger" aria-hidden />
									{NAMES[p]}
								</span>
							) : (
								<span key={p} className="chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px]">
									<Check className="size-3 text-ok" strokeWidth={3} aria-hidden />
									{strings.count(NAMES[p], n)}
								</span>
							),
						)}
				</>
			)}
		</div>
	);
}

const NEXT_CONDITION: Record<Condition, Condition> = { all: "new", new: "used", used: "all" };
const CONDITION_LABEL: Record<Condition, string> = {
	all: strings.conditionAll,
	new: `Stanje: ${strings.conditionNew.toLowerCase()}`,
	used: `Stanje: ${strings.conditionUsed.toLowerCase()}`,
};

type Controls = { condition: Condition; cheapest: boolean; view: ViewMode };

function FilterBar({ maxPrice, controls, onChange }: { maxPrice?: number; controls: Controls; onChange: (c: Controls) => void }) {
	const set = (patch: Partial<Controls>) => onChange({ ...controls, ...patch });
	const viewBtn = (v: ViewMode, label: string, Icon: typeof List) => (
		<button
			type="button"
			aria-pressed={controls.view === v}
			aria-label={label}
			onClick={() => set({ view: v })}
			className={cn("grid h-[30px] w-[34px] place-items-center rounded-full", controls.view === v ? "bg-white/[.16] text-fg" : "text-fg-3")}
		>
			<Icon className="size-[15px]" strokeWidth={2.2} aria-hidden />
		</button>
	);
	return (
		<div className="flex flex-wrap items-center justify-between gap-2.5">
			<div className="flex flex-wrap items-center gap-1.5">
				{maxPrice !== undefined && <span className={cn(pill, "chip text-fg")}>{strings.maxPrice(maxPrice)}</span>}
				<button type="button" onClick={() => set({ condition: NEXT_CONDITION[controls.condition] })} className={cn(pill, "chip text-fg")}>
					{CONDITION_LABEL[controls.condition]}
					<ChevronDown className="size-[13px]" strokeWidth={2.2} aria-hidden />
				</button>
			</div>
			<div className="flex items-center gap-1.5">
				<button type="button" onClick={() => set({ cheapest: !controls.cheapest })} className={cn(pill, "chip text-fg")}>
					<ArrowDownUp className="size-[13px]" strokeWidth={2.2} aria-hidden />
					{controls.cheapest ? strings.sortCheapest : strings.sortRelevance}
				</button>
				<div role="group" aria-label={strings.viewLabel} className="chip inline-flex gap-0.5 rounded-full p-[3px] max-sm:hidden">
					{viewBtn("grid", strings.viewGrid, LayoutGrid)}
					{viewBtn("list", strings.viewList, List)}
				</div>
			</div>
		</div>
	);
}

function stableKeys(cards: DetailListing[]) {
	const seen = new Map<string, number>();
	return cards.map((c) => {
		const n = seen.get(c.url) ?? 0;
		seen.set(c.url, n + 1);
		return `${c.url}#${n}`;
	});
}

function Results({ cards, view, loading }: { cards: DetailListing[]; view: ViewMode; loading: boolean }) {
	const [shown, setShown] = useState(PAGE);
	const settled = useRef(false);
	useEffect(() => {
		settled.current = true;
	}, []);
	const keys = stableKeys(cards);
	const row = view === "list";
	return (
		<div className="@container flex flex-col gap-3.5">
			<div
				className={cn(
					"scroll-x -mx-3.5 flex snap-x snap-mandatory gap-2.5 px-3.5 pb-1 sm:mx-0 sm:px-0 sm:pb-0",
					row
						? "sm:flex-col sm:overflow-visible"
						: "sm:grid sm:grid-cols-2 sm:gap-3.5 sm:overflow-visible @[600px]:grid-cols-3 @[880px]:grid-cols-4",
				)}
			>
				{cards.slice(0, shown).map((card, i) => (
					<ListingCard key={keys[i]} card={card} stagger={settled.current ? 0 : Math.min(i, 8) * 70} view={view} />
				))}
				{loading && [0, 1].map((i) => <SkeletonCard key={i} row={row} />)}
			</div>
			{cards.length > shown && (
				<div className="flex justify-center">
					<button type="button" onClick={() => setShown((n) => n + PAGE)} className="glass inline-flex h-10 items-center gap-[7px] rounded-full pr-4 pl-[13px] text-sm font-medium tracking-[-0.01em] shadow-none">
						<ArrowDown className="size-[15px]" strokeWidth={2.2} aria-hidden />
						{strings.showMore}
					</button>
				</div>
			)}
		</div>
	);
}

function EmptyResult({ q, maxPrice }: { q?: string; maxPrice?: number }) {
	const actions = useChatActions();
	const raised = maxPrice ? Math.round((maxPrice * 1.3) / 10) * 10 : undefined;
	return (
		<section className="glass flex max-w-[560px] flex-col items-center gap-2.5 rounded-panel px-5 py-7 text-center shadow-none">
			<Mascot mood="empty" width={72} label={strings.emptyTitle} />
			<h2 className="m-0 text-[17px] font-semibold tracking-[-0.02em]">{strings.emptyTitle}</h2>
			{q && <p className="m-0 text-sm leading-snug text-fg-3">{strings.emptyBody(q, maxPrice)}</p>}
			{raised && (
				<button type="button" onClick={() => actions.send(`${q ?? ""} do ${raised} KM`.trim())} className="chip mt-1 inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium">
					{strings.raisePrice}
				</button>
			)}
		</section>
	);
}

function ErrorNote({ text }: { text: string }) {
	return (
		<p className="m-0 flex items-center gap-2 text-sm text-fg-3">
			<AlertCircle className="size-4" aria-hidden />
			{text}
		</p>
	);
}

function PartialBanner({ names }: { names: string[] }) {
	return (
		<div role="status" className="flex items-center gap-2.5 rounded-[14px] border border-[#FFB34040] bg-[#FFB3401F] px-3.5 py-2.5 text-sm text-warn">
			<TriangleAlert className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
			<span className="flex-1 text-fg">{strings.providerFailed(names.join(", "))}</span>
		</div>
	);
}

function applyControls(listings: DetailListing[], c: Controls) {
	const filtered = c.condition === "all" ? listings : listings.filter((l) => l.condition === c.condition);
	return c.cheapest ? [...filtered].sort((a, b) => priceValue(a.price) - priceValue(b.price)) : filtered;
}

function Loaded({ output, input, mine }: { output: SearchOutput; input?: SearchInput; mine: boolean }) {
	const [controls, setControls] = useState<Controls>({ condition: "all", cheapest: false, view: "grid" });
	const cards = useMemo(() => applyControls(output.listings, controls), [output.listings, controls]);
	const failed = output.errors.map((e) => e.provider);
	if (output.listings.length === 0 && failed.length === 0) return <EmptyResult q={input?.q} maxPrice={input?.maxPrice} />;
	return (
		<div className="flex flex-col gap-3.5">
			<StatusLine loading={false} listings={output.listings} errors={failed} mine={mine} />
			{output.error && <ErrorNote text={output.error} />}
			{failed.length > 0 && !mine && <PartialBanner names={failed.map((p) => p.toUpperCase())} />}
			{output.listings.length > 1 && <FilterBar maxPrice={input?.maxPrice} controls={controls} onChange={setControls} />}
			{cards.length === 0 ? <ErrorNote text={strings.noResults} /> : <Results cards={cards} view={controls.view} loading={false} />}
		</div>
	);
}

export function SearchPart({ part }: { part: ToolUIPart }) {
	const mine = part.type === "tool-list_my_listings";
	if (part.state === "input-streaming" || part.state === "input-available") {
		return (
			<div className="flex flex-col gap-3.5">
				<StatusLine loading listings={[]} errors={[]} mine={mine} />
				<Results cards={[]} view="grid" loading />
			</div>
		);
	}
	if (part.state === "output-error") return <ErrorNote text={strings.toolError} />;
	if (part.state !== "output-available") return null;
	return <Loaded output={part.output as SearchOutput} input={part.input as SearchInput | undefined} mine={mine} />;
}
