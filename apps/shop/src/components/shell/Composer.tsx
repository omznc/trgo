import { countryProviders, marketCountries, PROVIDERS, type ProviderId } from "@lagano/providers";
import { ArrowUp, ChevronDown, ImagePlus } from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useExtensionVersion } from "@/lib/extension";
import { countryName } from "@/lib/market";
import { type MutableRefObject, type Ref, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FileUIPart } from "ai";
import {
	PromptInput,
	PromptInputAttachment,
	PromptInputAttachments,
	PromptInputTextarea,
	usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { strings } from "@/lib/strings";
import { ta } from "@/lib/strings-account";
import { useSuggestions } from "@/lib/suggestions";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ModelButton } from "./Header";
import { taggedKey, untagListing, useTaggedListings } from "./tagged-listing";
import { TaggedChip } from "./TaggedChip";

function AttachButton() {
	const attachments = usePromptInputAttachments();
	return (
		<button
			type="button"
			aria-label={strings.attach}
			onClick={() => attachments.openFileDialog()}
			className="chip grid size-8 place-items-center rounded-full text-fg"
		>
			<ImagePlus className="size-[15px]" strokeWidth={2.2} aria-hidden />
		</button>
	);
}

// Gives the parent a way to empty the chips after a send that did not come from the form.
function ClearHandle({ clearRef }: { clearRef: MutableRefObject<(() => void) | null> }) {
	const { clear } = usePromptInputAttachments();
	useEffect(() => {
		clearRef.current = clear;
		return () => {
			clearRef.current = null;
		};
	}, [clear, clearRef]);
	return null;
}

const GAP = 6;
const MORE_W = 44;

// How many pills fit in one row with room left for the "+N" pill. A hidden copy of the row gives the widths.
function useFit(tagged: unknown[]) {
	const row = useRef<HTMLDivElement>(null);
	const probe = useRef<HTMLDivElement>(null);
	const [fit, setFit] = useState(tagged.length);
	useLayoutEffect(() => {
		const measure = () => {
			const max = row.current?.clientWidth ?? 0;
			const widths = [...(probe.current?.children ?? [])].map((c) => (c as HTMLElement).offsetWidth);
			const total = widths.reduce((s, w) => s + w + GAP, -GAP);
			if (total <= max) return setFit(widths.length);
			let used = MORE_W;
			let k = 0;
			while (k < widths.length && used + widths[k]! + GAP <= max) used += widths[k++]! + GAP;
			setFit(Math.max(1, k));
		};
		measure();
		const ro = new ResizeObserver(measure);
		if (row.current) ro.observe(row.current);
		return () => ro.disconnect();
	}, [tagged]);
	return { row, probe, fit };
}

// The listings that the user tagged. Pills that do not fit hide behind a "+N" pill that opens all of them.
function TaggedSlot() {
	const tagged = useTaggedListings();
	const { row, probe, fit } = useFit(tagged);
	const [all, setAll] = useState(false);
	const hidden = tagged.length - fit;
	useEffect(() => {
		if (hidden <= 0) setAll(false);
	}, [hidden]);
	const shown = all ? tagged : tagged.slice(0, fit);
	return (
		<AnimatePresence initial={false}>
			{tagged.length > 0 && (
				<motion.div
					key="tagged"
					initial={{ opacity: 0, scale: 0.96, height: 0 }}
					animate={{ opacity: 1, scale: 1, height: "auto" }}
					exit={{ opacity: 0, scale: 0.96, height: 0 }}
					transition={{ duration: 0.18, ease: "easeOut" }}
					className="relative origin-left overflow-hidden px-2 pt-1.5"
				>
					<div aria-hidden ref={probe} className="pointer-events-none invisible absolute flex gap-1.5 [&>*]:shrink-0">
						{tagged.map((l) => (
							<TaggedChip key={taggedKey(l)} listing={l} onRemove={() => {}} />
						))}
					</div>
					<div ref={row} className={cn("flex min-w-0 gap-1.5", all ? "flex-wrap" : "[&>*]:shrink-0")}>
						{shown.map((l) => (
							<TaggedChip key={taggedKey(l)} listing={l} onRemove={() => untagListing(l)} />
						))}
						{hidden > 0 && (
							<button
								type="button"
								aria-expanded={all}
								onClick={() => setAll((v) => !v)}
								className="h-7 flex-none cursor-pointer rounded-full border border-accent/25 bg-accent/12 px-2.5 text-[13px] font-medium text-fg hover:bg-accent/20"
							>
								{all ? ta.tagLess : `+${hidden}`}
							</button>
						)}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

// The site icons, in public/logos. A new provider must add one here.
const LOGOS: Record<ProviderId, string> = { olx: "/logos/olx.svg", svex: "/logos/svex.svg", kp: "/logos/kp.png", njuskalo: "/logos/njuskalo.svg" };
// The trigger shows this many logos, then "+N".
const MAX_LOGOS = 3;

// The menu shows the site name under a country heading, the trigger shows the logos.
const MARKETS = marketCountries(PROVIDERS).map((country) => ({
	country,
	providers: countryProviders(PROVIDERS, country).map((key) => ({ key, name: PROVIDERS[key].siteName, shortName: PROVIDERS[key].name, logo: LOGOS[key], needsExtension: "needsExtension" in PROVIDERS[key] })),
}));

const Logo = ({ src, className = "" }: { src: string; className?: string }) => (
	<img src={src} alt="" width={16} height={16} className={`size-4 shrink-0 rounded-[5px] outline outline-1 -outline-offset-1 outline-white/20 ${className}`} />
);

function MarketsMenu({ selected, onToggle }: { selected: ProviderId[]; onToggle: (key: ProviderId) => void }) {
	const on = MARKETS.flatMap((g) => g.providers).filter((m) => selected.includes(m.key));
	const [only] = on;
	const extra = on.length - MAX_LOGOS;
	const hasExtension = useExtensionVersion() !== null;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={on.length ? `${strings.marketsAria}: ${on.map((m) => m.shortName).join(", ")}` : strings.marketsAria}
					title={on.map((m) => m.name).join(", ") || undefined}
					className="chip inline-flex h-8 items-center gap-1.5 rounded-full pr-2.5 pl-2 text-[13px] font-medium text-fg max-sm:hidden"
				>
					{on.length === 0 && <span className="pl-1">{strings.markets}</span>}
					{on.length === 1 && only && (
						<>
							<Logo src={only.logo} />
							{only.shortName}
						</>
					)}
					{on.length > 1 && (
						<span className="flex items-center">
							{on.slice(0, MAX_LOGOS).map((m, i) => (
								<Logo key={m.key} src={m.logo} className={`ring-2 ring-bg ${i ? "-ml-1" : ""}`} />
							))}
							{extra > 0 && <span className="ml-1 tabular-nums">+{extra}</span>}
						</span>
					)}
					<ChevronDown className="size-3.5 shrink-0" aria-hidden />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="solid min-w-44 rounded-2xl p-1.5">
				{MARKETS.map((g) => (
					<DropdownMenuGroup key={g.country}>
						<DropdownMenuLabel className="px-2 pt-1.5 pb-0.5 text-xs text-fg-4">{countryName(g.country)}</DropdownMenuLabel>
						{g.providers.map((m) => (
							<DropdownMenuCheckboxItem
								key={m.key}
								checked={selected.includes(m.key)}
								disabled={m.needsExtension && !hasExtension}
								onCheckedChange={() => onToggle(m.key)}
								onSelect={(event) => event.preventDefault()}
								className="min-h-10 gap-2 rounded-xl text-sm"
							>
								<Logo src={m.logo} />
								<span className="flex flex-col">
									{m.name}
									{m.needsExtension && !hasExtension && <span className="text-xs text-fg-4">{strings.needsExtension}</span>}
								</span>
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuGroup>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ActionButton({ busy, canStop, onStop }: { busy: boolean; canStop: boolean; onStop: () => void }) {
	if (busy) {
		return (
			<button
				type="button"
				aria-label={strings.stop}
				disabled={!canStop}
				onClick={onStop}
				className="grid size-10 shrink-0 place-items-center rounded-full bg-fg text-bg disabled:opacity-40"
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
					<rect x="5" y="5" width="14" height="14" rx="3" />
				</svg>
			</button>
		);
	}
	return (
		<button type="submit" aria-label={strings.send} className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-bg">
			<ArrowUp className="size-[18px]" strokeWidth={2.6} aria-hidden />
		</button>
	);
}

export function Composer({
	started,
	busy,
	canStop,
	model,
	connected,
	onModel,
	selected,
	onSelect,
	onSubmit,
	onStop,
	textareaRef,
	clearRef,
}: {
	started: boolean;
	busy: boolean;
	canStop: boolean;
	model: string;
	connected: boolean;
	onModel: (m: string) => void;
	selected: ProviderId[];
	onSelect: (ids: ProviderId[]) => void;
	onSubmit: (text: string, files: FileUIPart[]) => void;
	onStop: () => void;
	textareaRef: Ref<HTMLTextAreaElement>;
	clearRef: MutableRefObject<(() => void) | null>;
}) {
	const { placeholder } = useSuggestions();
	const tagged = useTaggedListings();
	// One source must stay on, or the search has nowhere to look.
	const toggle = (key: ProviderId) => {
		const next = selected.includes(key) ? selected.filter((id) => id !== key) : [...selected, key];
		if (next.length) onSelect(next);
	};
	return (
		<PromptInput
			accept="image/*"
			multiple
			globalDrop
			onSubmit={({ text, files }) => onSubmit(text, files)}
			style={{ viewTransitionName: "composer" }}
			className={cn(
				"glass mx-auto flex w-full flex-col p-1.5 has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-[3px] has-[textarea:focus-visible]:outline-focus",
				started ? "max-w-[872px] rounded-composer-sm" : "max-w-[720px] rounded-composer",
			)}
		>
			<ClearHandle clearRef={clearRef} />
			<TaggedSlot />
			<PromptInputAttachments className="p-0 px-2 pt-1.5">{(file) => <PromptInputAttachment data={file} />}</PromptInputAttachments>
			<label htmlFor="prompt" className="sr">
				{strings.message}
			</label>
			<PromptInputTextarea
				id="prompt"
				ref={textareaRef}
				rows={started ? 1 : 3}
				placeholder={tagged.length ? (tagged.some((l) => l.own) ? ta.tagPlaceholderOwn : tagged.length > 1 ? ta.tagPlaceholderMany : ta.tagPlaceholder) : started ? strings.placeholderFollowUp : placeholder}
				className={cn(
					"resize-none border-0 bg-transparent text-base leading-normal tracking-[-0.01em] text-fg shadow-none outline-none focus-visible:ring-0 focus-visible:outline-none md:text-base",
					started ? "max-h-[200px] min-h-0 px-3.5 pt-2.5 pb-1" : "max-h-60 min-h-16 sm:min-h-24 px-[18px] pt-4 pb-1.5 md:text-[17px]",
				)}
			/>
			<div className="flex items-center justify-between gap-3 py-1.5 pr-1.5 pl-2.5">
				<div className="-m-1 flex min-w-0 items-center gap-1.5 overflow-x-auto p-1 [scrollbar-width:none] [&>*]:shrink-0">
					<AttachButton />
					<MarketsMenu selected={selected} onToggle={toggle} />
					<ModelButton model={model} connected={connected} onChange={onModel} className="h-8 max-sm:hidden" />
				</div>
				<ActionButton busy={busy} canStop={canStop} onStop={onStop} />
			</div>
		</PromptInput>
	);
}
