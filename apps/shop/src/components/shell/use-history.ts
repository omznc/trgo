import { useEffect, useRef, useState } from "react";
import type { LaganoMessage } from "@/lib/agent";
import { clearHistory, getChat, listChats, persistChat, removeChat, respondedKey, restoreMessages, useChatHistory } from "@/lib/chat-history";
import { releasePhotos, usedPhotoIds } from "@/lib/photos";
import type { ProviderResult } from "@/lib/publish";
import { isPublishing, withListingResults } from "@/lib/publish-resume";
import { strings } from "@/lib/strings";
import { sell } from "@/lib/strings-sell";
import { useSidePanel } from "./side-panel";

type ChatLike = { messages: LaganoMessage[]; status: string; stop: () => void; setMessages: (m: LaganoMessage[]) => void };

const newId = () => crypto.randomUUID();

// Ties the open chat to the saved history: saves when an answer ends, loads, deletes, starts new.
export function useHistory(chat: ChatLike, setDocked: (v: boolean) => void, withTransition: (fn: () => void) => void, onBlocked: () => void) {
	const chats = useChatHistory();
	const panel = useSidePanel();
	const [chatId, setChatId] = useState<string>(newId);
	const live = useRef({ chatId, messages: chat.messages });
	live.current = { chatId, messages: chat.messages };
	const prev = useRef(chat.status);

	// A chat change or a clear frees the photos that the open chat does not show.
	useEffect(() => releasePhotos(usedPhotoIds(live.current.messages)), [chatId]);

	// An approved post can outlive the page. Save when the user answers, or a reload would show "cancelled".
	const answered = useRef("");
	useEffect(() => {
		const key = respondedKey(chat.messages);
		if (key === answered.current) return;
		answered.current = key;
		if (key) persistChat(live.current.chatId, chat.messages);
	}, [chat.messages]);

	// Save when a stream ends, not on each token.
	useEffect(() => {
		const was = prev.current;
		prev.current = chat.status;
		const wasBusy = was === "submitted" || was === "streaming";
		if (wasBusy && (chat.status === "ready" || chat.status === "error")) persistChat(live.current.chatId, live.current.messages);
	}, [chat.status]);

	// The list ends empty when the user deletes the last chat.
	const { history, closeHistory } = panel;
	useEffect(() => {
		if (history && chats.length === 0) closeHistory();
	}, [history, chats.length, closeHistory]);

	const busy = chat.status === "submitted" || chat.status === "streaming";
	// A stop during a post leaves a draft or a copy. The user waits until the post ends.
	const blocked = () => {
		const wait = busy && isPublishing(live.current.messages);
		if (wait) onBlocked();
		return wait;
	};
	const leave = () => {
		// A stopped stream keeps its partial answer.
		if (busy) persistChat(live.current.chatId, live.current.messages);
		chat.stop();
	};
	// A retry can end after the user opened another chat, so the saved chats are searched too.
	const saveResults = (toolCallId: string, results: ProviderResult[]) => {
		const next = withListingResults(live.current.messages, toolCallId, results);
		if (next) {
			chat.setMessages(next);
			return persistChat(live.current.chatId, next);
		}
		for (const c of listChats()) {
			const stored = withListingResults(c.messages, toolCallId, results);
			if (stored) return persistChat(c.id, stored);
		}
	};
	const show = (id: string, messages: LaganoMessage[]) => {
		withTransition(() => {
			setChatId(id);
			chat.setMessages(messages);
			setDocked(messages.length > 0);
		});
	};
	return {
		chats,
		chatId,
		saveResults,
		startNew: () => {
			if (blocked()) return;
			leave();
			show(newId(), []);
		},
		open: (id: string) => {
			const found = getChat(id);
			if (!found || id === chatId) return panel.leaveHistory();
			if (blocked()) return;
			leave();
			show(id, restoreMessages(found.messages, strings.historyInterrupted, sell.partial.unknown));
			panel.leaveHistory();
		},
		remove: (id: string) => {
			if (id === chatId && blocked()) return;
			removeChat(id);
			if (id === chatId) {
				chat.stop();
				show(newId(), []);
			}
		},
		clear: () => {
			if (blocked()) return;
			chat.stop();
			void clearHistory();
			show(newId(), []);
			panel.closeHistory();
		},
	};
}
