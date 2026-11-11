import { Copy, RefreshCw } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { EditApprovalPart } from "@/components/EditApproval";
import { ListingApprovalPart } from "@/components/ListingApproval";
import { SearchPart } from "@/components/ListingCards";
import { PriceCheckPart } from "@/components/PriceCard";
import { Mascot, type MascotMood } from "@/components/Mascot";
import type { LaganoMessage } from "@/lib/agent";
import { getPhoto } from "@/lib/photos";
import { strings } from "@/lib/strings";
import { TaggedChip } from "./TaggedChip";

type Part = LaganoMessage["parts"][number];
export type Respond = (id: string, approved: boolean) => void;

// The attached-photo and source notes are for the model, not for the user.
const MODEL_NOTE = /\n\n\[(?:Attached photos|Search only on|Tagged listing):[^\]]*\]/g;
export const stripNotes = (text: string) => text.replace(MODEL_NOTE, "");

export function textOf(message: LaganoMessage) {
	return message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n\n");
}

function UserMessage({ message }: { message: LaganoMessage }) {
	const ids = message.metadata?.photoIds ?? [];
	const text = stripNotes(textOf(message));
	return (
		<div className="in flex max-w-[520px] flex-col items-end gap-1.5 self-end">
			{ids.length > 0 && (
				<div className="flex flex-wrap justify-end gap-1.5">
					{ids.map((id, i) => (
						<img key={id} src={getPhoto(id)?.url} alt={strings.attachmentAlt(i + 1)} className="size-[72px] rounded-[14px] border border-white/12 object-cover" />
					))}
				</div>
			)}
			{message.metadata?.tagged && <TaggedChip listing={message.metadata.tagged} small />}
			{text && (
				<div data-selectable className="rounded-[20px_20px_6px_20px] bg-accent px-4 py-[11px] text-base leading-[1.45] font-medium tracking-[-0.01em] whitespace-pre-wrap text-bg">
					{text}
				</div>
			)}
		</div>
	);
}

function moodOf(parts: Part[], streaming: boolean): MascotMood {
	const search = parts.find((p) => p.type === "tool-search_listings" || p.type === "tool-list_my_listings");
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

function PartView({ part, caret, onRespond, searchOpen }: { part: Part; caret: boolean; onRespond: Respond; searchOpen: boolean }) {
	switch (part.type) {
		case "text":
			return part.text ? (
				<div className="max-w-[680px] text-[17px] leading-[1.55] tracking-[-0.01em] max-sm:text-base max-sm:leading-normal">
					<MessageResponse caret={caret}>{part.text}</MessageResponse>
				</div>
			) : null;
		case "tool-search_listings":
		case "tool-list_my_listings":
			return <SearchPart part={part} defaultOpen={searchOpen} />;
		case "tool-price_check":
			return <PriceCheckPart part={part} />;
		case "tool-create_listing":
			return <ListingApprovalPart part={part} onRespond={onRespond} />;
		case "tool-edit_my_listing":
			return <EditApprovalPart part={part} onRespond={onRespond} />;
		default:
			return null;
	}
}

export function AssistantMessage({
	message,
	streaming,
	actions,
	onRespond,
}: {
	message: LaganoMessage;
	streaming: boolean;
	actions?: React.ReactNode;
	onRespond: Respond;
}) {
	const last = message.parts.length - 1;
	// Only the last search starts open. A price card is the main result, so it closes all of them.
	const isSearch = (p: Part) => p.type === "tool-search_listings" || p.type === "tool-list_my_listings";
	const lastSearch = message.parts.findLastIndex(isSearch);
	const hasPriceCard = message.parts.some((p) => p.type === "tool-price_check");
	return (
		<div className="in flex items-start gap-3">
			<div className="w-8 shrink-0 pt-0.5">
				<Mascot mood={moodOf(message.parts, streaming)} width={28} />
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-3.5">
				{message.parts.map((part, i) => (
					<PartView key={i} part={part} caret={streaming && i === last} onRespond={onRespond} searchOpen={!hasPriceCard && i === lastSearch} />
				))}
				{actions}
			</div>
		</div>
	);
}

export function Message({ message, ...rest }: { message: LaganoMessage; streaming: boolean; actions?: React.ReactNode; onRespond: Respond }) {
	return message.role === "user" ? <UserMessage message={message} /> : <AssistantMessage message={message} {...rest} />;
}

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
