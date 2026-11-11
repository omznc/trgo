import { useEffect, useRef, useState } from "react";
import type { LaganoMessage } from "@/lib/agent";
import { clearHistory, getChat, persistChat, removeChat, restoreMessages, useChatHistory } from "@/lib/chat-history";
import { strings } from "@/lib/strings";
import { useSidePanel } from "./side-panel";

type ChatLike = { messages: LaganoMessage[]; status: string; stop: () => void; setMessages: (m: LaganoMessage[]) => void };

const newId = () => crypto.randomUUID();

// Ties the open chat to the saved history: saves when an answer ends, loads, deletes, starts new.
export function useHistory(chat: ChatLike, setDocked: (v: boolean) => void, withTransition: (fn: () => void) => void) {
	const chats = useChatHistory();
	const panel = useSidePanel();
	const [chatId, setChatId] = useState<string>(newId);
	const live = useRef({ chatId, messages: chat.messages });
	live.current = { chatId, messages: chat.messages };
	const prev = useRef(chat.status);

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

	const leave = () => {
		const busy = chat.status === "submitted" || chat.status === "streaming";
		// A stopped stream keeps its partial answer.
		if (busy) persistChat(live.current.chatId, live.current.messages);
		chat.stop();
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
		startNew: () => {
			leave();
			show(newId(), []);
		},
		open: (id: string) => {
			const found = getChat(id);
			if (!found || id === chatId) return panel.leaveHistory();
			leave();
			show(id, restoreMessages(found.messages, strings.historyInterrupted));
			panel.leaveHistory();
		},
		remove: (id: string) => {
			removeChat(id);
			if (id === chatId) {
				chat.stop();
				show(newId(), []);
			}
		},
		clear: () => {
			chat.stop();
			void clearHistory();
			show(newId(), []);
			panel.closeHistory();
		},
	};
}
