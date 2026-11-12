import { PROVIDERS, type ProviderId } from "@lagano/providers";
import type { ToolUIPart } from "ai";
import { Tag } from "lucide-react";
import type { PriceCheckOutput } from "@/lib/price-check";
import type { PriceReport, PriceStats } from "@/lib/price-stats";
import { useRef } from "react";
import { CopyImageButton } from "@/components/shell/CopyImageButton";
import { langTag } from "@/lib/lang";
import { strings } from "@/lib/strings";


const km = (n: number) => Math.round(n).toLocaleString(langTag);

function Histogram({ stats, unit }: { stats: PriceStats; unit: string }) {
	const { buckets, peak } = stats;
	const top = buckets[peak]!.count;
	const label = strings.priceHistogram(Math.round(buckets[peak]!.from), Math.round(buckets[peak]!.to), unit);
	return (
		<div role="img" aria-label={label} className="flex h-[72px] items-end gap-1">
			{buckets.map((b, i) => (
				<div
					key={b.from}
					className={`bar-grow flex-1 rounded-t-[3px] ${i === peak ? "d100" : "d50"}`}
					style={{ height: `${Math.max(4, (b.count / top) * 100)}%`, "--c": "var(--color-accent)", animationDelay: `${180 + i * 40}ms` } as React.CSSProperties}
				/>
			))}
		</div>
	);
}

const shell = "glass in flex max-w-[560px] flex-col gap-4 rounded-panel p-5 shadow-none";

function Title({ item }: { item?: string }) {
	return (
		<div className="flex items-center gap-2">
			<Tag className="size-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden />
			<h3 className="m-0 text-[15px] font-semibold">{strings.priceTitle(item ?? "")}</h3>
		</div>
	);
}

function Loading({ item, fetched }: { item?: string; fetched: number }) {
	return (
		<section className={shell} style={{ animationDelay: "120ms" }} aria-busy>
			<Title item={item} />
			<div className="text-xs text-fg-3" role="status">{strings.priceLoading(fetched)}</div>
			<div className="shim h-[46px] w-40 rounded-md" />
			<div className="shim h-[72px] rounded-md" />
		</section>
	);
}

// Dropped counts, largest first, as "61 dodatak, 12 neispravnih cijena".
function droppedText(dropped: Record<string, number>) {
	return Object.entries(dropped)
		.filter(([, n]) => n > 0)
		.sort((a, b) => b[1] - a[1])
		.map(([reason, n]) => `${n} ${strings.priceDropped[reason] ?? reason}`)
		.join(", ");
}

function Extras({ report, unit }: { report: PriceReport; unit: string }) {
	const { newMedian, usedMedian, trendPct } = report;
	const parts = [
		usedMedian && `${strings.priceUsed}: ${km(usedMedian)} ${unit}`,
		newMedian && `${strings.priceNew}: ${km(newMedian)} ${unit}`,
		trendPct !== undefined && strings.priceTrend(trendPct),
	].filter(Boolean);
	return parts.length ? <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-fg-2">{parts.map((p) => <span key={String(p)}>{p}</span>)}</div> : null;
}

export function PriceCheckPart({ part }: { part: ToolUIPart }) {
	const card = useRef<HTMLElement>(null);
	const output = part.state === "output-available" ? (part.output as PriceCheckOutput) : undefined;
	const item = (part.input as { item?: string } | undefined)?.item;
	if (part.state === "output-error") return null;
	if (!output || "loading" in output) return <Loading item={item} fetched={output && "loading" in output ? output.fetched : 0} />;
	const { report } = output;
	if (!report) return <section className={shell}><Title item={output.item} /><p className="m-0 text-sm text-fg-2">{strings.priceEmpty(output.item)}</p></section>;
	const { stats } = report;
	// A report that was saved before the markets has no label. It was in KM.
	const unit = output.label ?? "KM";
	return (
		<section ref={card} className={shell} style={{ animationDelay: "120ms" }}>
			<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
				<div className="min-w-0 flex-1">
					<Title item={output.item} />
				</div>
				<span className="shrink-0 text-xs text-fg-3 max-sm:order-last max-sm:basis-full">{strings.priceMeta(stats.count, report.windowDays)}</span>
				<CopyImageButton target={card} className="-my-1.5 -mr-2" />
			</div>
			<div className="flex flex-wrap items-end gap-7">
				<div>
					<div className="lbl">{strings.priceMedian}</div>
					<div className="text-[40px] leading-[1.1] font-bold tracking-[-0.03em]">{km(stats.median)} {unit}</div>
				</div>
				<div>
					<div className="lbl">{strings.priceRange}</div>
					<div className="text-xl font-semibold tracking-[-0.02em]">
						{km(stats.p25)} – {km(stats.p75)} {unit}
					</div>
				</div>
			</div>
			<Extras report={report} unit={unit} />
			<Histogram stats={stats} unit={unit} />
			<div className="flex justify-between text-xs text-fg-3">
				<span>{km(stats.lo)} {unit}</span>
				<span>{km((stats.lo + stats.hi) / 2)}</span>
				<span>{km(stats.hi)} {unit}</span>
			</div>
			<div className="text-xs text-fg-3">{strings.priceAnalyzed(stats.count, report.fetched, droppedText(report.dropped))}</div>
			{output.partial?.length ? <div role="status" className="text-xs text-warn">{strings.pricePartial(output.partial.map((id) => PROVIDERS[id as ProviderId].name).join(", "))}</div> : null}
		</section>
	);
}
