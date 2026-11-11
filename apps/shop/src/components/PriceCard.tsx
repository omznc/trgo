import type { ToolUIPart } from "ai";
import { Tag } from "lucide-react";
import type { PriceStats } from "@/lib/price-stats";
import { strings } from "@/lib/strings";

type PriceOutput = { item: string; stats: PriceStats | null };

const km = (n: number) => Math.round(n).toLocaleString("de-DE");

function Histogram({ stats }: { stats: PriceStats }) {
	const { buckets, peak } = stats;
	const top = buckets[peak]!.count;
	const label = strings.priceHistogram(Math.round(buckets[peak]!.from), Math.round(buckets[peak]!.to));
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

export function PriceCheckPart({ part }: { part: ToolUIPart }) {
	if (part.state !== "output-available") return null;
	const { item, stats } = part.output as PriceOutput;
	if (!stats) return null;
	return (
		<section className="glass in flex max-w-[560px] flex-col gap-4 rounded-panel p-5 shadow-none" style={{ animationDelay: "120ms" }}>
			<div className="flex items-baseline justify-between gap-3">
				<div className="flex items-center gap-2">
					<Tag className="size-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden />
					<h3 className="m-0 text-[15px] font-semibold">{strings.priceTitle(item)}</h3>
				</div>
				<span className="shrink-0 text-xs text-fg-3">{strings.priceMeta(stats.count)}</span>
			</div>
			<div className="flex flex-wrap items-end gap-7">
				<div>
					<div className="lbl">{strings.priceMedian}</div>
					<div className="text-[40px] leading-[1.1] font-bold tracking-[-0.03em]">{km(stats.median)} KM</div>
				</div>
				<div>
					<div className="lbl">{strings.priceRange}</div>
					<div className="text-xl font-semibold tracking-[-0.02em]">
						{km(stats.p25)} – {km(stats.p75)} KM
					</div>
				</div>
			</div>
			<Histogram stats={stats} />
			<div className="flex justify-between text-xs text-fg-3">
				<span>{km(stats.min)} KM</span>
				<span>{km((stats.min + stats.max) / 2)}</span>
				<span>{km(stats.max)} KM</span>
			</div>
		</section>
	);
}
