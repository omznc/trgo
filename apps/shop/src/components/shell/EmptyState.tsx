import { ExternalLink, KeyRound, Plus, Search, Tag } from "lucide-react";
import { type CSSProperties, useEffect, useRef } from "react";
import { Mascot } from "@/components/Mascot";
import { startLogin } from "@/lib/openrouter-auth";
import { strings } from "@/lib/strings";
import { useSuggestions } from "@/lib/suggestions";

const ICONS = [Search, Tag, Plus];

// Start delay in ms of the first-load reveal, see .ld in styles.css.
export const delay = (ms: number) => ({ "--d": ms }) as CSSProperties;

export function Hero({ connected }: { connected: boolean }) {
	return (
		<div className="flex flex-col items-center gap-3.5 text-center">
			<Mascot mood={connected ? "found" : "sleeping"} width={88} label={connected ? strings.mascotName : strings.sleepingLabel} className="ld-pop" style={delay(340)} />
			<h1 style={delay(410)} className="ld m-0 text-[clamp(32px,9vw,56px)] leading-[1.07] font-bold tracking-[-0.035em]">{strings.tagline}</h1>
		</div>
	);
}

const pill = "inline-flex h-11 min-h-11 items-center gap-[7px] whitespace-nowrap rounded-full text-sm font-medium tracking-[-0.01em] sm:h-10 sm:min-h-10";

// With free = true the chat already works, so the banner is only a soft hint.
export function ConnectBanner({ onPasteKey, cue, free }: { onPasteKey: () => void; cue: { n: number; reason?: string }; free: boolean }) {
	const ref = useRef<HTMLDivElement>(null);
	// Replays the shake and ring when a blocked send opens or re-asks for the key.
	useEffect(() => {
		const el = ref.current;
		if (cue.reason !== strings.needKeySend || !el) return;
		el.dataset.cue = "";
		el.classList.remove("cue-shake");
		void el.offsetWidth;
		el.classList.add("cue-shake");
	}, [cue.n, cue.reason]);
	return (
		<div ref={ref} style={delay(480)} className="ld glass in flex w-full max-w-[720px] flex-wrap items-center gap-3.5 rounded-[22px] py-3.5 pr-3.5 pl-[18px] shadow-none">
			<div className="flex min-w-48 flex-1 flex-col gap-0.5">
				<strong className="text-[15px] font-semibold">{free ? strings.freeBannerTitle : strings.connectTitle}</strong>
				<span className="text-[13px] text-fg-3">{free ? strings.freeBannerBody : strings.connectSubtitle}</span>
			</div>
			<div className="flex items-center gap-1.5">
				<button type="button" onClick={onPasteKey} className={`${pill} pr-4 pl-[13px] text-fg-3`}>
					<KeyRound className="size-[15px]" strokeWidth={2.2} aria-hidden />
					{strings.pasteKey}
				</button>
				<button type="button" onClick={() => startLogin()} className={`${pill} bg-fg px-4 text-bg shadow-[0_8px_24px_rgba(0,0,0,.25)]`}>
					{strings.connectAction}
				</button>
			</div>
		</div>
	);
}

export function Suggestions({ onPick }: { onPick: (text: string) => void }) {
	const { chips } = useSuggestions();
	return (
		<div className="flex max-w-[760px] flex-wrap justify-center gap-2">
			{chips.map((s, i) => {
				const Icon = ICONS[i] ?? Search;
				return (
					<button
						key={s}
						type="button"
						onClick={() => onPick(s)}
						style={delay(620 + i * 60)}
						className="ld glass inline-flex h-11 items-center gap-[7px] rounded-full pr-4 pl-[13px] text-sm font-medium tracking-[-0.01em] shadow-none sm:h-10"
					>
						<Icon className="size-[15px]" strokeWidth={2.2} aria-hidden />
						{s}
					</button>
				);
			})}
		</div>
	);
}


export function Footer() {
	return (
		<footer style={delay(780)} className="ld relative flex shrink-0 justify-center px-6 pb-[max(18px,env(safe-area-inset-bottom))]">
			<a
				href={strings.sourceUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-[7px] text-xs font-medium text-fg no-underline shadow-none"
			>
				{strings.footerSource}
				<ExternalLink className="size-[11px]" aria-hidden />
			</a>
		</footer>
	);
}
