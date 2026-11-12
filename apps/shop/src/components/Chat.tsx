import type { FileUIPart } from "ai";
import { Check, WifiOff } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { flushSync } from "react-dom";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Composer, type Sources } from "@/components/shell/Composer";
import { DropOverlay } from "@/components/shell/DropOverlay";
import { ChatActionsProvider } from "@/components/shell/chat-actions";
import { ConnectBanner, delay, Footer, Hero, Suggestions } from "@/components/shell/EmptyState";
import { ErrorCard, type ChatErrorKind } from "@/components/shell/ErrorCard";
import { Header } from "@/components/shell/Header";
import { Horizon } from "@/components/shell/Horizon";
import { AnswerActions, Message, stripNotes, textOf, Thinking } from "@/components/shell/Messages";
import { clearTaggedListing, getTaggedListings, taggedNote } from "@/components/shell/tagged-listing";
import { usePendingSend } from "@/components/shell/use-pending-send";
import { HistoryPanel } from "@/components/shell/HistoryPanel";
import { HistoryRegion, SidePanelRegion, useSidePanel } from "@/components/shell/side-panel";
import { useHistory } from "@/components/shell/use-history";
import type { LaganoMessage } from "@/lib/agent";
import { onSaveFailure } from "@/lib/chat-history";
import { applyPageLang } from "@/lib/page-lang";
import { addPhoto, photoNote } from "@/lib/photos";
import { isPublishing } from "@/lib/publish-resume";
import { useSessionExpired, useSessions } from "@/lib/sessions";
import { strings } from "@/lib/strings";
import { useLaganoChat } from "@/lib/use-lagano-chat";
import { cn } from "@/lib/utils";

// Moves the composer between the centre and the dock with a View Transition.
function withTransition(update: () => void) {
	if (!document.startViewTransition) return update();
	document.startViewTransition(() => flushSync(update));
}

function useOnline() {
	const [online, setOnline] = useState(true);
	useEffect(() => {
		const sync = () => setOnline(navigator.onLine);
		sync();
		window.addEventListener("online", sync);
		window.addEventListener("offline", sync);
		return () => {
			window.removeEventListener("online", sync);
			window.removeEventListener("offline", sync);
		};
	}, []);
	return online;
}

function sourceNote(s: Sources) {
	if (s.olx && s.svex) return "";
	return `\n\n[Search only on: ${s.olx ? "olx" : "svex"}]`;
}

function errorKind(error: Error | undefined): ChatErrorKind {
	const m = error?.message;
	const known: ChatErrorKind[] = ["401", "402", "404", "free-day", "free-minute", "free-down"];
	return known.find((k) => k === m) ?? "generic";
}

function Toast({ text, onDone }: { text: string; onDone: () => void }) {
	useEffect(() => {
		const id = setTimeout(onDone, 2400);
		return () => clearTimeout(id);
	}, [text, onDone]);
	return (
		<motion.div
			role="status"
			initial={{ opacity: 0, transform: "translateY(14px)" }}
			animate={{ opacity: 1, transform: "translateY(0px)" }}
			exit={{ opacity: 0, transform: "translateY(8px)", transition: { duration: 0.15 } }}
			transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
			className="solid fixed bottom-28 left-1/2 z-[30] flex w-[min(340px,calc(100vw-24px))] -translate-x-1/2 items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm"
		>
			<Check className="size-4 shrink-0 text-ok" strokeWidth={2.4} aria-hidden />
			<span className="flex-1">{text}</span>
		</motion.div>
	);
}

function MessageList({
	messages,
	status,
	onRespond,
	onCopy,
	onRetry,
	footer,
}: {
	messages: LaganoMessage[];
	status: string;
	onRespond: (id: string, approved: boolean) => void;
	onCopy: (text: string) => void;
	onRetry: () => void;
	footer: ReactNode;
}) {
	const last = messages.at(-1);
	const canAct = (m: LaganoMessage) => m === last && m.role === "assistant" && status === "ready" && !!textOf(m);
	return (
		<Conversation className="min-h-0 flex-1" aria-label={strings.conversation}>
			<ConversationContent scrollClassName="scroll chat-fade min-h-0 flex-1" className="mx-auto w-full max-w-[1040px] gap-7 px-6 pt-8 pb-[calc(var(--composer-h,140px)+24px)] max-sm:gap-3.5 max-sm:px-3.5 max-sm:pt-4">
				{messages.map((m) => (
					<Message
						key={m.id}
						message={m}
						streaming={status === "streaming" && m === last}
						onRespond={onRespond}
						expired={m !== last}
						actions={canAct(m) ? <AnswerActions onCopy={() => onCopy(textOf(m))} onRetry={onRetry} /> : undefined}
					/>
				))}
				{status === "submitted" && <Thinking />}
				{footer}
			</ConversationContent>
			<ConversationScrollButton />
		</Conversation>
	);
}

export function Chat() {
	useEffect(applyPageLang, []);
	const chat = useLaganoChat();
	const { messages, apiKey, status } = chat;
	const panel = useSidePanel();
	const sessions = useSessions();
	const online = useOnline();
	const [sources, setSources] = useState<Sources>({ olx: true, svex: true });
	const [docked, setDocked] = useState(false);
	const [toast, setToast] = useState<string | null>(null);
	const textarea = useRef<HTMLTextAreaElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const clearAttachments = useRef<(() => void) | null>(null);
	const started = docked || messages.length > 0;
	// The docked composer floats over the list. The list pads its end by the composer height.
	useLayoutEffect(() => {
		const el = box.current;
		if (!started || !el?.parentElement) return;
		const host = el.parentElement;
		const ro = new ResizeObserver(() => host.style.setProperty("--composer-h", `${el.offsetHeight}px`));
		ro.observe(el);
		return () => ro.disconnect();
	}, [started]);
	const busy = status === "submitted" || status === "streaming";
	useEffect(() => onSaveFailure(() => setToast(strings.historySaveFailed)), []);
	const history = useHistory(chat, setDocked, withTransition, () => setToast(strings.publishWait));
	// A stop in the middle of a post would leave a draft, so the stop button waits.
	const publishing = busy && isPublishing(messages);
	// The first-load reveal (.boot) ends for good once the chat starts.
	const [boot, setBoot] = useState(true);
	useEffect(() => {
		if (started) setBoot(false);
	}, [started]);

	const openConnect = useCallback((provider?: "olx" | "svex" | "openrouter") => panel.open({ kind: "connect", provider }, { fresh: true }), [panel.open]);
	useSessionExpired(openConnect);

	// Photos shrink before the send. A second Enter in that time would send the same files again.
	const sendingRef = useRef(false);
	const [sending, setSending] = useState(false);
	const send = async (text: string, files: FileUIPart[] = []) => {
		if (!text.trim() && files.length === 0) return;
		if (sendingRef.current) return;
		sendingRef.current = true;
		setSending(true);
		try {
			if (!started) withTransition(() => setDocked(true));
			// A photo that cannot be decoded is skipped.
			const added = await Promise.allSettled(files.map(async (f) => addPhoto(await (await fetch(f.url)).blob())));
			const ids = added.flatMap((r) => (r.status === "fulfilled" ? [r.value.id] : []));
			const tagged = getTaggedListings();
			const note = tagged.map(taggedNote).join("");
			chat.sendMessage({ text: text.trim() + photoNote(ids) + note + sourceNote(sources), metadata: { photoIds: ids, tagged: tagged.length ? tagged : undefined } });
			clearTaggedListing();
		} finally {
			sendingRef.current = false;
			setSending(false);
		}
	};
	const hold = usePendingSend({ apiKey, send, textarea, box, clearAttachments });
	// A throw keeps the attached photos in the composer.
	const submit = async (text: string, files: FileUIPart[]) => {
		if (!chat.ready) {
			hold(text, files);
			throw new Error("no-key");
		}
		// A throw keeps the text and the files of the second try in the composer.
		if (sendingRef.current) throw new Error("sending");
		await send(text, files);
	};
	const pick = (text: string) => (chat.ready ? void send(text) : hold(text, []));
	const newChat = () => {
		history.startNew();
		panel.close();
		panel.leaveHistory();
	};
	const actions = useMemo(
		() => ({
			send: pick,
			ask: (text: string) => {
				const el = textarea.current;
				if (!el) return;
				el.value = text;
				el.focus();
				el.setSelectionRange(text.length, text.length);
			},
			openConnect: () => openConnect("openrouter"),
			saveResults: history.saveResults,
		}),
		// send reads the latest state on each render, so it is rebuilt with it.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[chat.ready, sources, started],
	);
	const respond = (id: string, approved: boolean) => chat.addToolApprovalResponse({ id, approved });
	const copy = (text: string) => navigator.clipboard.writeText(stripNotes(text)).then(() => setToast(strings.copied), () => {});
	const dismissToast = useCallback(() => setToast(null), []);

	const kind = errorKind(chat.error);
	const errorText = {
		"401": strings.error401Body,
		"402": strings.error402Body,
		"404": strings.errorModelBody,
		"free-day": strings.errorFreeDay,
		"free-minute": strings.errorFreeMinute,
		"free-down": strings.errorFreeDown,
		generic: chat.errorText ?? "",
	}[kind];
	const errorCard = chat.errorText ? (
		<ErrorCard
			kind={kind}
			text={errorText}
			onPasteKey={() => openConnect("openrouter")}
			onPickModel={() => panel.open({ kind: "settings" }, { fresh: true })}
onRetry={chat.error ? () => chat.regenerate() : undefined} />
	) : null;

	return (
		<ChatActionsProvider value={actions}>
			<div className={cn("relative flex h-dvh flex-col overflow-hidden bg-bg", boot && "boot")}>
				<Horizon variant={started ? "chat" : "main"} />
				<Header
					hasHistory={history.chats.length > 0}
					started={started}
					connections={{ openrouter: !!apiKey, ...sessions }}
					model={chat.model}
					onModel={chat.setModel}
					onNewChat={newChat}
				/>
				{!online && (
					<div role="status" className="relative z-[5] mx-3.5 mt-3 flex items-center gap-2.5 rounded-[14px] border border-[#8E8E9A40] bg-[#8E8E9A1F] px-3.5 py-2.5 text-sm sm:mx-6">
						<WifiOff className="size-4 shrink-0 text-off" aria-hidden />
						{strings.offline}
					</div>
				)}
				<div className="relative flex min-h-0 flex-1">
					<HistoryRegion>
						<HistoryPanel chats={history.chats} currentId={history.chatId} onPick={history.open} onDelete={history.remove} onNew={newChat} onClear={history.clear} />
					</HistoryRegion>
					<div className="flex min-w-0 flex-1 flex-col">
						<main className={cn("relative flex min-h-0 flex-1 flex-col", !started && "items-center justify-center gap-[22px] px-3.5 pb-6 sm:px-6 sm:pb-12")}>
							{started ? (
								<MessageList
									key={history.chatId}
									messages={messages}
									status={status}
									onRespond={respond}
									onCopy={copy}
									onRetry={() => chat.regenerate()}
									footer={errorCard}
								/>
							) : (
								<Hero connected={chat.ready} />
							)}
							{!started && !apiKey ? <ConnectBanner free={chat.ready} cue={panel.cue} onPasteKey={() => openConnect("openrouter")} /> : null}
							{!started && errorCard}
							<div ref={box} style={delay(550)} className={cn("ld w-full", started && "absolute inset-x-0 bottom-0 z-10 px-3.5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6 sm:pb-[22px]")}>
								<Composer
									started={started}
									busy={busy || sending}
									canStop={!publishing && !sending}
									model={chat.model}
									connected={!!apiKey}
									onModel={chat.setModel}
									sources={sources}
									onSources={setSources}
									onSubmit={submit}
									onStop={chat.stop}
									textareaRef={textarea}
									clearRef={clearAttachments}
								/>
							</div>
							{!started ? <Suggestions onPick={pick} /> : null}
						</main>
						{!started && <Footer />}
					</div>
					<SidePanelRegion />
				</div>
				<DropOverlay />
				<AnimatePresence>{toast && <Toast key="toast" text={toast} onDone={dismissToast} />}</AnimatePresence>
			</div>
		</ChatActionsProvider>
	);
}
