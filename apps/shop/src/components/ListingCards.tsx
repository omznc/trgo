import type { ToolUIPart } from "ai";
import { AlertCircle, ArrowDown, ArrowDownUp, ArrowUp, Check, ChevronDown, LayoutGrid, List, RefreshCw, Search, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DetailListing } from "@/components/detail/DetailPanel";
import { Mascot } from "@/components/Mascot";
import { CopyImageButton } from "@/components/shell/CopyImageButton";
import { useChatActions } from "@/components/shell/chat-actions";
import { ListingCard, SkeletonCard, type ViewMode } from "@/components/shell/ListingCard";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

type SearchOutput = { listings: DetailListing[]; errors: { provider: string }[]; error?: string };
type SearchInput = { q?: string; maxPrice?: number };
type Condition = "all" | "new" | "used";

const LIST_ROWS = 3;
const NAMES = { olx: "OLX", svex: "SVEX" } as const;
const pill = "inline-flex h-[34px] min-h-[34px] items-center gap-[7px] whitespace-nowrap rounded-full pr-4 pl-[13px] text-[13px] font-medium tracking-[-0.01em]";

// "1.250 KM" -> 1250. A listing without a number sorts last.
export function priceValue(text: string) {
	const n = Number.parseFloat(text.replaceAll(".", "").replace(",", ".").replace(/[^\d.]/g, ""));
	return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

type Toggle = { open: boolean; onToggle: () => void };

// On the phone a row bleeds to the screen edges and its padding keeps the text column.
// The column is 14px page padding + 32px mascot + 12px gap = 58px on the left.
const BLEED = "max-sm:-mr-3.5 max-sm:-ml-[58px] max-sm:pr-3.5 max-sm:pl-[58px]";
const HIDE_BAR = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

// Height animates to the measured content height, so a change of content also animates.
function Collapsible({ open, children }: { open: boolean; children: React.ReactNode }) {
	const inner = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState<number | null>(null);
	useLayoutEffect(() => {
		const el = inner.current;
		if (!el) return;
		const measure = () => setHeight(el.offsetHeight);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	return (
		<motion.div
			initial={false}
			animate={{ height: height === null ? "auto" : open ? height : 0, opacity: open ? 1 : 0 }}
			transition={{ duration: 0.32, ease: [0.2, 0.9, 0.3, 1] }}
			inert={!open}
			className={cn("overflow-hidden", BLEED)}
		>
			<div ref={inner} className="pt-3.5">
				{children}
			</div>
		</motion.div>
	);
}

function StatusLine({
	loading,
	listings,
	errors,
	mine,
	toggle,
}: {
	loading: boolean;
	listings: DetailListing[];
	errors: string[];
	mine: boolean;
	toggle?: Toggle;
}) {
	const counts = (["olx", "svex"] as const).map((p) => [p, listings.filter((l) => l.provider === p).length] as const);
	const Root = toggle ? "button" : "div";
	const props = toggle
		? ({ type: "button", "aria-expanded": toggle.open, onClick: toggle.onToggle } as const)
		: ({ role: "status", "aria-live": "polite" } as const);
	return (
		<Root {...props} className={cn("flex items-center gap-2.5 text-left text-[13px] font-medium whitespace-nowrap text-fg-3 max-sm:gap-2 max-sm:overflow-x-auto sm:flex-wrap", HIDE_BAR)}>
			{toggle && <ChevronDown className={cn("size-3.5 shrink-0 transition-transform duration-300", !toggle.open && "-rotate-90")} strokeWidth={2.2} aria-hidden />}
			{loading ? (
				<>
					<span className="spin inline-grid">
						<RefreshCw className="size-3.5" aria-hidden />
					</span>
					{strings.searchingStatus}
				</>
			) : (
				<>
					<Search className="size-3.5 shrink-0" aria-hidden />
					<span className={cn(!mine && "max-sm:sr-only")}>{mine ? strings.searchedMine : strings.searchedOn}</span>
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
		</Root>
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
		<div className={cn("flex items-center justify-between gap-2.5 sm:flex-wrap max-sm:gap-1.5 max-sm:overflow-x-auto max-sm:[&>div]:shrink-0", HIDE_BAR)}>
			<div className="flex items-center gap-1.5 sm:flex-wrap">
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
	const [expanded, setExpanded] = useState(false);
	const grid = useRef<HTMLDivElement>(null);
	const [columns, setColumns] = useState(4);
	const settled = useRef(false);
	useEffect(() => {
		settled.current = true;
	}, []);
	// One row: the grid columns. The phone carousel is already one row.
	useLayoutEffect(() => {
		const el = grid.current;
		if (!el) return;
		const measure = () => {
			const css = getComputedStyle(el);
			setColumns(css.display === "grid" ? css.gridTemplateColumns.split(" ").length : Number.MAX_SAFE_INTEGER);
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	const keys = stableKeys(cards);
	const row = view === "list";
	const perRow = row ? LIST_ROWS : columns;
	const shown = expanded ? cards.length : perRow;
	return (
		<div className="@container flex flex-col gap-3.5">
			<div
				ref={grid}
				className={cn(
					"scroll-x flex snap-x snap-mandatory gap-2.5 pb-1 max-sm:scroll-pl-[58px]", BLEED, "sm:pb-0",
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
			{cards.length > perRow && (
				<div className="flex justify-center">
					<button
						type="button"
						aria-expanded={expanded}
						onClick={() => setExpanded((v) => !v)}
						className="glass inline-flex h-10 items-center gap-[7px] rounded-full pr-4 pl-[13px] text-sm font-medium tracking-[-0.01em] shadow-none"
					>
						{expanded ? <ArrowUp className="size-[15px]" strokeWidth={2.2} aria-hidden /> : <ArrowDown className="size-[15px]" strokeWidth={2.2} aria-hidden />}
						{expanded ? strings.showLess : strings.showMore}
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

function Loaded({ output, input, mine, defaultOpen }: { output: SearchOutput; input?: SearchInput; mine: boolean; defaultOpen: boolean }) {
	// A click on the header wins over the default from then on.
	const [clicked, setClicked] = useState<boolean | null>(null);
	const open = clicked ?? defaultOpen;
	const failed = output.errors.map((e) => e.provider);
	const block = useRef<HTMLDivElement>(null);
	return (
		<div ref={block}>
			<div className="flex items-center justify-between gap-1">
				<StatusLine loading={false} listings={output.listings} errors={failed} mine={mine} toggle={{ open, onToggle: () => setClicked(!open) }} />
				<CopyImageButton target={block} className="-my-1.5" />
			</div>
			<Collapsible open={open}>
				<LoadedBody output={output} input={input} mine={mine} failed={failed} />
			</Collapsible>
		</div>
	);
}

function Notes({ error, failed }: { error?: string; failed: string[] }) {
	return (
		<>
			{error && <ErrorNote text={error} />}
			{failed.length > 0 && <PartialBanner names={failed.map((p) => p.toUpperCase())} />}
		</>
	);
}

function LoadedBody({ output, input, mine, failed }: { output: SearchOutput; input?: SearchInput; mine: boolean; failed: string[] }) {
	const [controls, setControls] = useState<Controls>({ condition: "all", cheapest: false, view: "grid" });
	const cards = useMemo(() => applyControls(output.listings, controls), [output.listings, controls]);
	if (output.listings.length === 0 && failed.length === 0) return <EmptyResult q={input?.q} maxPrice={input?.maxPrice} />;
	return (
		<div className="flex flex-col gap-3.5">
			<Notes error={output.error} failed={mine ? [] : failed} />
			{output.listings.length > 1 && <FilterBar maxPrice={input?.maxPrice} controls={controls} onChange={setControls} />}
			{cards.length === 0 ? <ErrorNote text={strings.noResults} /> : <Results cards={cards} view={controls.view} loading={false} />}
		</div>
	);
}

export function SearchPart({ part, defaultOpen = true }: { part: ToolUIPart; defaultOpen?: boolean }) {
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
	return <Loaded output={part.output as SearchOutput} input={part.input as SearchInput | undefined} mine={mine} defaultOpen={defaultOpen} />;
}
