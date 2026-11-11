import { ArrowUp, Check, ImagePlus } from "lucide-react";
import { type MutableRefObject, type Ref, useEffect } from "react";
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

export type Sources = { olx: boolean; svex: boolean };

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

// The listing that the user tagged from Moji oglasi or the detail panel.
function TaggedSlot() {
	const tagged = useTaggedListings();
	return (
		<AnimatePresence initial={false}>
			{tagged.length > 0 && (
				<motion.div
					key="tagged"
					initial={{ opacity: 0, scale: 0.96, height: 0 }}
					animate={{ opacity: 1, scale: 1, height: "auto" }}
					exit={{ opacity: 0, scale: 0.96, height: 0 }}
					transition={{ duration: 0.18, ease: "easeOut" }}
					className="origin-left overflow-hidden px-2 pt-1.5"
				>
					{/* One row. More pills scroll sideways. */}
					<div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&>*]:shrink-0 [&::-webkit-scrollbar]:hidden">
						{tagged.map((l) => (
							<TaggedChip key={taggedKey(l)} listing={l} onRemove={() => untagListing(l)} />
						))}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

function SourceToggle({ name, on, onToggle }: { name: string; on: boolean; onToggle: () => void }) {
	return (
		<button
			type="button"
			aria-pressed={on}
			onClick={onToggle}
			className={cn(
				"inline-flex h-8 items-center gap-1.5 rounded-full text-[13px] font-medium max-sm:hidden",
				on ? "chip pr-3 pl-[9px] text-fg" : "border border-dashed border-line-dashed px-3 text-fg-3",
			)}
		>
			{on && <Check className="size-[13px] text-accent" strokeWidth={2.8} aria-hidden />}
			{name}
		</button>
	);
}

function ActionButton({ busy, onStop }: { busy: boolean; onStop: () => void }) {
	if (busy) {
		return (
			<button type="button" aria-label={strings.stop} onClick={onStop} className="grid size-10 shrink-0 place-items-center rounded-full bg-fg text-bg">
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
	model,
	connected,
	onModel,
	sources,
	onSources,
	onSubmit,
	onStop,
	textareaRef,
	clearRef,
}: {
	started: boolean;
	busy: boolean;
	model: string;
	connected: boolean;
	onModel: (m: string) => void;
	sources: Sources;
	onSources: (s: Sources) => void;
	onSubmit: (text: string, files: FileUIPart[]) => void;
	onStop: () => void;
	textareaRef: Ref<HTMLTextAreaElement>;
	clearRef: MutableRefObject<(() => void) | null>;
}) {
	const { placeholder } = useSuggestions();
	const tagged = useTaggedListings();
	// One source must stay on, or the search has nowhere to look.
	const toggle = (key: keyof Sources) => {
		const next = { ...sources, [key]: !sources[key] };
		if (next.olx || next.svex) onSources(next);
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
				Poruka
			</label>
			<PromptInputTextarea
				id="prompt"
				ref={textareaRef}
				rows={started ? 1 : 3}
				placeholder={tagged.length ? (tagged.some((l) => l.own) ? ta.tagPlaceholderOwn : tagged.length > 1 ? ta.tagPlaceholderMany : ta.tagPlaceholder) : started ? strings.placeholderFollowUp : placeholder}
				className={cn(
					"resize-none border-0 bg-transparent text-base leading-normal tracking-[-0.01em] text-fg shadow-none outline-none focus-visible:ring-0 focus-visible:outline-none md:text-base",
					started ? "max-h-[200px] min-h-0 px-3.5 pt-2.5 pb-1" : "max-h-60 min-h-24 px-[18px] pt-4 pb-1.5 md:text-[17px]",
				)}
			/>
			<div className="flex items-center justify-between gap-3 py-1.5 pr-1.5 pl-2.5">
				<div className="-m-1 flex min-w-0 items-center gap-1.5 overflow-x-auto p-1 [scrollbar-width:none] [&>*]:shrink-0">
					<AttachButton />
					<SourceToggle name={strings.sourceOlx} on={sources.olx} onToggle={() => toggle("olx")} />
					<SourceToggle name={strings.sourceSvex} on={sources.svex} onToggle={() => toggle("svex")} />
					<ModelButton model={model} connected={connected} onChange={onModel} className="h-8 max-sm:hidden" />
				</div>
				<ActionButton busy={busy} onStop={onStop} />
			</div>
		</PromptInput>
	);
}
