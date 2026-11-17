import type { ToolUIPart } from "ai";
import { ChevronDown, Copy, FileText, ImageOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo, useState } from "react";
import type { RenderRef } from "@/components/ai-elements/markdown";
import { MessageResponse } from "@/components/ai-elements/message";
import { EditApprovalPart } from "@/components/EditApproval";
import { ListingApprovalPart } from "@/components/ListingApproval";
import { Collapsible, SearchPart } from "@/components/ListingCards";
import { PriceCheckPart } from "@/components/PriceCard";
import { Mascot, type MascotMood } from "@/components/Mascot";
import type { LaganoMessage } from "@/lib/agent";
import { getPhoto } from "@/lib/photos";
import { strings } from "@/lib/strings";
import { taggedKey } from "./tagged-listing";
import { defaultOpenSearch, groupParts, isSearchType, isStepType, readCount, stepCounts } from "./step-groups";
import { TaggedChip } from "./TaggedChip";

type Part = LaganoMessage["parts"][number];
export type Respond = (id: string, approved: boolean) => void;

import { stripNotes } from "@/lib/model-notes";
export { stripNotes };

// A listing ref such as " [olx:123]": a chip in the chat, noise in the copied text.
const REF = / ?\[[a-z]+:[\w-]+\](?!\()/g;

export function textOf(message: LaganoMessage) {
	return message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n\n");
}

function UserMessage({ message }: { message: LaganoMessage }) {
	const ids = message.metadata?.photoIds ?? [];
	const text = stripNotes(textOf(message));
	// An older saved message has one listing, not a list.
	const tagged = [message.metadata?.tagged ?? []].flat();
	const photoUrl = (id: string) => getPhoto(id)?.url;
	return (
		<div className="in flex max-w-[520px] flex-col items-end gap-1.5 self-end">
			{ids.length > 0 && (
				<div className="flex flex-wrap justify-end gap-1.5">
					{ids.map((id, i) => (
						photoUrl(id) ? (
								<img key={id} src={photoUrl(id)} alt={strings.attachmentAlt(i + 1)} className="size-[72px] rounded-[14px] border border-white/12 object-cover" />
							) : (
								// Photos live in memory only, so a restored chat has none.
								<div key={id} role="img" aria-label={strings.photoGone} title={strings.photoGone} className="grid size-[72px] place-items-center rounded-[14px] border border-white/12 bg-white/6 text-fg-4">
									<ImageOff className="size-5" aria-hidden />
								</div>
							)
					))}
				</div>
			)}
			{tagged.length > 0 && (
				<div className="flex flex-wrap justify-end gap-1.5">
					{tagged.map((l) => (
						<TaggedChip key={taggedKey(l)} listing={l} small />
					))}
				</div>
			)}
			{text && (
				<div data-selectable className="rounded-[20px_20px_6px_20px] bg-accent px-4 py-[11px] text-base leading-[1.45] font-medium tracking-[-0.01em] whitespace-pre-wrap text-bg">
					{text}
				</div>
			)}
		</div>
	);
}

function moodOf(parts: Part[], streaming: boolean): MascotMood {
	const search = parts.find((p) => isSearchType(p.type));
	if (search && "state" in search) {
		if (search.state === "input-streaming" || search.state === "input-available") return "searching";
		if (search.state === "output-available") {
			const out = search.output as { listings: unknown[] };
			return out.listings.length ? "found" : "empty";
		}
		if (search.state === "output-error") return "error";
	}
	return streaming ? "thinking" : "calm";
}

// The model reads the listings. The user already sees them as cards, so one quiet row is enough.
function ReadRow({ part }: { part: Part }) {
	const done = "state" in part && (part.state === "output-available" || part.state === "output-error");
	const count = readCount(part);
	return (
		<div className={cn("flex items-center gap-2 py-1.5 text-[13px] font-medium text-fg-3", !done && "animate-pulse")}>
			<FileText className="size-3.5 shrink-0" aria-hidden />
			<span className="min-w-0 truncate">{strings.readListings}</span>
			<span className="ml-auto tabular-nums">{count}</span>
			{/* The spacer keeps the count in line with the search rows. */}
			<span className="w-7 shrink-0" aria-hidden />
		</div>
	);
}

type StepGroupProps = { parts: Part[]; indices: number[]; defaultOpen: boolean; lastSearch: number; keepClosed: boolean; renderRef?: RenderRef };

// A run of one step has no header and no border, but it keeps the same tree as a longer run.
function StepGroup({ parts, indices, defaultOpen, lastSearch, keepClosed, renderRef }: StepGroupProps) {
	const [clicked, setClicked] = useState<boolean | null>(null);
	const steps = indices.map((i) => parts[i] as Part).filter((p) => isStepType(p.type));
	const { searches, reads, listings } = stepCounts(steps);
	// A run of reads only has no search summary to show, so it shows its rows without a header.
	const single = steps.length === 1 || searches === 0;
	const open = single || (clicked ?? defaultOpen);
	return (
		<div>
			{!single && (
				<button type="button" aria-expanded={open} onClick={() => setClicked(!open)} className="flex max-w-full items-center gap-2 py-1.5 text-left text-[13px] font-medium text-fg-3">
					<ChevronDown className={cn("size-3.5 shrink-0 transition-transform duration-300", !open && "-rotate-90")} strokeWidth={2.2} aria-hidden />
					<span className="min-w-0 truncate">{strings.steps(searches, reads)}</span>
					<span className="shrink-0 whitespace-nowrap text-fg-4">· {strings.listings(listings)}</span>
				</button>
			)}
			<Collapsible open={open} follow padClass={single ? "" : "pt-1"}>
				<div className={cn("flex flex-col gap-1", !single && "ml-[7px] border-l border-white/8 pl-4 max-sm:[--bleed:82px]")}>
					{indices.map((i) => (
						<StepItem key={i} part={parts[i] as Part} defaultOpen={!keepClosed && i === lastSearch} renderRef={renderRef} />
					))}
				</div>
			</Collapsible>
		</div>
	);
}

function StepItem({ part, defaultOpen, renderRef }: { part: Part; defaultOpen: boolean; renderRef?: RenderRef }) {
	if (part.type === "text") {
		return (
			<div className="py-1 text-[13px] leading-snug text-fg-4 italic">
				<MessageResponse renderRef={renderRef}>{part.text}</MessageResponse>
			</div>
		);
	}
	if (part.type === "tool-get_listings") return <ReadRow part={part} />;
	return <SearchPart part={part as ToolUIPart} defaultOpen={defaultOpen} />;
}

type PartProps = { part: Part; caret: boolean; onRespond: Respond; expired: boolean; renderRef?: RenderRef };

function PartView({ part, caret, onRespond, expired, renderRef }: PartProps) {
	switch (part.type) {
		case "text":
			return part.text ? (
				<div className="max-w-[680px] text-[17px] leading-[1.55] tracking-[-0.01em] max-sm:text-base max-sm:leading-normal">
					<MessageResponse caret={caret} renderRef={renderRef}>
						{part.text}
					</MessageResponse>
				</div>
			) : null;
		case "tool-price_check":
			return <PriceCheckPart part={part} />;
		case "tool-create_listing":
			return <ListingApprovalPart part={part} onRespond={onRespond} expired={expired} />;
		case "tool-edit_my_listing":
			return <EditApprovalPart part={part} onRespond={onRespond} expired={expired} />;
		default:
			return null;
	}
}

type MessageProps = {
	message: LaganoMessage;
	streaming: boolean;
	canAct: boolean;
	onCopy: (text: string) => void;
	onRetry: () => void;
	onRespond: Respond;
	// The SDK reads approvals only in the last message, so an answer here would never be sent.
	expired: boolean;
	// Keep it stable: the memo of each message compares it.
	renderRef?: RenderRef;
};

function AssistantMessage({
	message,
	streaming,
	canAct,
	onCopy,
	onRetry,
	onRespond,
	expired,
	renderRef,
}: MessageProps) {
	const last = message.parts.length - 1;
	const lastSearch = defaultOpenSearch(message.parts);
	// A price card is the main result, so it closes all of the searches.
	const hasPriceCard = message.parts.some((p) => p.type === "tool-price_check");
	const items = groupParts(message.parts);
	return (
		<div className="in flex items-start gap-3">
			<div className="w-8 shrink-0 pt-0.5">
				<Mascot mood={moodOf(message.parts, streaming)} width={28} />
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-3.5">
				{items.map((item) =>
					item.kind === "steps" ? (
						<StepGroup key={item.start} parts={message.parts} indices={item.indices} defaultOpen={!hasPriceCard && item.indices.includes(lastSearch)} lastSearch={lastSearch} keepClosed={hasPriceCard} renderRef={renderRef} />
					) : (
						<PartView key={item.index} part={message.parts[item.index] as Part} caret={streaming && item.index === last} onRespond={onRespond} expired={expired} renderRef={renderRef} />
					),
				)}
				{canAct && <AnswerActions onCopy={() => onCopy(textOf(message).replace(REF, ""))} onRetry={onRetry} />}
			</div>
		</div>
	);
}

// The SDK keeps the object of each finished message and replaces only the streaming one,
// so the shallow compare skips every message except the one that changes.
export const Message = memo(function Message({ message, ...rest }: MessageProps) {
	return message.role === "user" ? <UserMessage message={message} /> : <AssistantMessage message={message} {...rest} />;
});

export function AnswerActions({ onCopy, onRetry }: { onCopy: () => void; onRetry: () => void }) {
	const btn = "grid size-8 place-items-center rounded-full text-fg-3";
	return (
		<div className="flex gap-0.5">
			<button type="button" aria-label={strings.copyAnswer} onClick={onCopy} className={btn}>
				<Copy className="size-[13px]" strokeWidth={2.2} aria-hidden />
			</button>
			<button type="button" aria-label={strings.retry} onClick={onRetry} className={btn}>
				<RefreshCw className="size-[13px]" strokeWidth={2.2} aria-hidden />
			</button>
		</div>
	);
}

export function Thinking() {
	return (
		<div className="in flex items-center gap-2.5">
			<Mascot mood="thinking" width={32} />
			<span role="status" aria-label={strings.typing} className="glass inline-flex gap-[5px] rounded-bubble px-3.5 py-3 shadow-none">
				{["dot1", "dot2", "dot3"].map((c) => (
					<span key={c} className={`${c} size-[7px] rounded-full bg-fg`} />
				))}
			</span>
		</div>
	);
}
