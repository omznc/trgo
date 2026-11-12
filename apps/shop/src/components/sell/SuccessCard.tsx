import { PROVIDERS, type ProviderId } from "@lagano/providers";
import { Copy, ExternalLink, Info, RefreshCw } from "lucide-react";
import { useState } from "react";
import { publishListing, type ListingArgs, type ProviderResult } from "@/lib/publish";
import { useSidePanel } from "@/components/shell/side-panel";
import { retryMode } from "@/lib/publish-resume";
import { getSession } from "@/lib/sessions";
import { strings } from "@/lib/strings";
import { sell } from "@/lib/strings-sell";
import { ProviderList, type Progress } from "./PublishProgress";
import { SellMascot } from "./SellMascot";
import "./sell.css";

const CONFETTI: [number, number, string, number, number][] = [
	[6, 6, "var(--color-accent)", 0, 2600],
	[14, 4, "#FFD36E", 400, 3000],
	[22, 6, "#8FB4FF", 900, 2400],
	[31, 4, "#C2407A", 200, 2800],
	[40, 6, "#34C759", 1200, 3200],
	[52, 4, "var(--color-accent)", 600, 2500],
	[61, 6, "#FFD36E", 100, 2900],
	[70, 4, "#8FB4FF", 1500, 2700],
	[79, 6, "#C2407A", 700, 3100],
	[88, 4, "#34C759", 300, 2600],
	[94, 6, "var(--color-accent)", 1100, 2800],
];

const LIGHT = "sell-btn inline-flex h-11 min-h-11 items-center gap-[7px] rounded-full bg-fg pl-[13px] pr-4 text-sm font-semibold tracking-[-0.01em] !text-bg no-underline shadow-[0_8px_24px_rgba(0,0,0,.25)]";
const GLASS = "sell-btn sell-glass inline-flex h-11 min-h-11 items-center gap-[7px] rounded-full pl-[13px] pr-4 text-sm font-medium tracking-[-0.01em] text-fg";

const okOf = (results: ProviderResult[]) => results.filter((r) => r.ok && r.url);

function CopyLinks({ results }: { results: ProviderResult[] }) {
	const [note, setNote] = useState("");
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(okOf(results).map((r) => r.url).join("\n"));
			setNote(sell.success.copied);
		} catch {
			setNote(sell.success.copyFailed);
		}
	};
	return (
		<>
			<button type="button" onClick={copy} className={GLASS}>
				<Copy size={15} strokeWidth={2.2} aria-hidden />
				{sell.success.copyLinks}
			</button>
			<span role="status" className="sr-only">
				{note}
			</span>
		</>
	);
}

function Hero({ input, results }: { input: ListingArgs; results: ProviderResult[] }) {
	const olxOk = results.some((r) => r.provider === "olx" && r.ok);
	return (
		<section className="sell-in sell-glass relative flex flex-col items-center gap-3.5 overflow-hidden rounded-[28px] p-7 text-center">
			{CONFETTI.map(([left, size, color, delay, duration]) => (
				<span
					key={left}
					aria-hidden
					className="sell-conf pointer-events-none absolute -top-5"
					style={{ left: `${left}%`, width: size, height: size, background: color, animationDelay: `${delay}ms`, animationDuration: `${duration}ms` }}
				/>
			))}
			<SellMascot pose="celebrate" width={96} label={sell.success.mascotAria} />
			<h2 className="m-0 text-[26px] font-bold tracking-[-0.03em]">{sell.success.title}</h2>
			<p className="m-0 text-[15px] text-fg-3">{sell.success.subtitle(input.title, input.price)}</p>
			<div className="flex flex-wrap justify-center gap-2">
				{okOf(results).map((r) => (
					<a key={r.provider} href={r.url} target="_blank" rel="noopener noreferrer" className={LIGHT}>
						<ExternalLink size={15} strokeWidth={2.2} aria-hidden />
						{sell.success.open(PROVIDERS[r.provider].name)}
					</a>
				))}
				<CopyLinks results={results} />
			</div>
			{olxOk && (
				<p role="status" className="m-0 flex max-w-md items-start gap-2.5 rounded-[14px] border border-warn/25 bg-warn/12 px-3.5 py-2.5 text-left text-sm text-fg">
					<Info size={16} className="mt-px shrink-0 text-warn" aria-hidden />
					{sell.success.olxDeliveryNote}
				</p>
			)}
		</section>
	);
}

// Re-runs one provider with the arguments the user already approved. The other results stay as they are.
// A provider that made a draft or a listing goes on with that id. It never makes a second one.
function useRetry(input: ListingArgs, first: ProviderResult[], onSave: (results: ProviderResult[]) => void) {
	const [results, setResults] = useState(first);
	const [progress, setProgress] = useState<Progress>({});
	const [busy, setBusy] = useState<ProviderId | null>(null);
	const { requireConnection } = useSidePanel();
	const retry = async (provider: ProviderId) => {
		if (!getSession(provider)) return requireConnection(provider, strings.needPublish[provider]);
		setBusy(provider);
		let last: ProviderResult | undefined;
		for await (const out of publishListing({ ...input, providers: [provider] }, results)) {
			if (out.done) last = out.results[0];
			else setProgress(out.progress);
		}
		setProgress({});
		if (last) {
			const next = input.providers.flatMap((p) => (p === provider ? [last] : results.filter((r) => r.provider === p)));
			setResults(next);
			onSave(next);
		}
		setBusy(null);
	};
	return { results, progress, busy, retry };
}

function Partial({ input, results, progress, busy, retry }: ReturnType<typeof useRetry> & { input: ListingArgs }) {
	const ok = results.filter((r) => r.ok).map((r) => PROVIDERS[r.provider].name);
	const failed = results.filter((r) => !r.ok);
	const text = ok.length ? sell.partial.okText(ok.join(", ")) : sell.partial.failedText(failed.map((r) => PROVIDERS[r.provider].name).join(", "));
	// While one provider retries, its row shows live progress instead of the old error.
	const shown = busy ? results.filter((r) => r.provider !== busy) : results;
	const live: Progress = busy ? { ...progress, [busy]: progress[busy] ?? sell.publish.retrying } : {};
	return (
		<section className="sell-glass rounded-[24px] p-5" role="status" aria-live="polite">
			<div className="flex items-center gap-3.5">
				<SellMascot pose="worried" width={48} />
				<div className="min-w-0 flex-1">
					<h2 className="m-0 text-[15px] font-semibold tracking-[-0.02em]">{ok.length ? sell.partial.title : sell.partial.titleNone}</h2>
					<p className="m-0 text-sm leading-[1.45] text-fg-3">{text}</p>
				</div>
			</div>
			<ProviderList providers={input.providers} progress={live} results={shown} />
			{failed.filter((r) => r.provider !== busy).map((r) => (
				<p key={r.provider} role="alert" className="m-0 mt-2.5 break-words text-[13px] text-danger">
					{PROVIDERS[r.provider].name}: {r.error}
				</p>
			))}
			<div className="mt-3.5 flex flex-wrap justify-end gap-2">
				{results
					.filter((r) => r.ok && r.url)
					.map((r) => (
						<a key={r.provider} href={r.url} target="_blank" rel="noopener noreferrer" className={`${GLASS} !h-11`}>
							<ExternalLink size={15} strokeWidth={2.2} aria-hidden />
							{sell.success.open(PROVIDERS[r.provider].name)}
						</a>
					))}
				{failed.filter((r) => retryMode(r) !== "none").map((r) => (
					<button
						key={r.provider}
						type="button"
						disabled={busy !== null}
						onClick={() => retry(r.provider)}
						className="sell-btn inline-flex h-11 min-h-11 items-center gap-[7px] rounded-full bg-accent pl-[13px] pr-4 text-sm font-semibold text-bg disabled:opacity-50"
					>
						<RefreshCw size={15} strokeWidth={2.2} aria-hidden />
						{sell.partial.retry(PROVIDERS[r.provider].name)}
					</button>
				))}
			</div>
		</section>
	);
}

export function PublishResult({ input, results, onSave }: { input: ListingArgs; results: ProviderResult[]; onSave: (results: ProviderResult[]) => void }) {
	const state = useRetry(input, results, onSave);
	const allOk = state.results.length >= input.providers.length && state.results.every((r) => r.ok);
	if (allOk && !state.busy) return <Hero input={input} results={state.results} />;
	return <Partial input={input} {...state} />;
}
