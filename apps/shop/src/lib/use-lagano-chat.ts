import { useChat } from "@ai-sdk/react";
import { type ChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { createTransport, FREE_MODEL_ID, isFreeModel, type LaganoMessage } from "./agent";
import { clearKey, finishLogin, getKey, getModel, setKey, setModel as saveModel } from "./openrouter-auth";
import { strings } from "./strings";
import { KEY_CHANGED } from "@/components/shell/key-event";

// The known codes get their text from CHAT_ERRORS in the chat view.
const describeError = (error: Error | undefined) => (error ? strings.errorGeneric : null);

export function useLaganoChat() {
	const [apiKey, setApiKey] = useState<string | null>(null);
	const [model, setModelState] = useState<string>(FREE_MODEL_ID);
	const [authError, setAuthError] = useState<string | null>(null);
	// The transport is stable, so it reads the latest key and model from this ref.
	const latest = useRef({ apiKey, model });
	latest.current = { apiKey, model };

	// Browser storage is read after mount, so the server and client render the same.
	useEffect(() => {
		finishLogin()
			.catch(() => setAuthError(strings.loginFailed))
			.finally(() => setApiKey(getKey()));
		const readModel = () => {
			const saved = getModel();
			if (saved) setModelState(saved);
		};
		readModel();
		// The account panels save the key and the model directly, then fire this event.
		const sync = () => {
			setApiKey(getKey());
			readModel();
		};
		window.addEventListener(KEY_CHANGED, sync);
		return () => window.removeEventListener(KEY_CHANGED, sync);
	}, []);

	const [transport] = useState<ChatTransport<LaganoMessage>>(() => ({
		sendMessages: async (options) => {
			const { apiKey: key, model: m } = latest.current;
			if (!key && !isFreeModel(m)) throw new Error("no-key");
			return createTransport(key, m).sendMessages(options);
		},
		reconnectToStream: async () => null,
	}));
	const chat = useChat<LaganoMessage>({ transport, sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses });

	const connect = useCallback((key: string) => {
		setKey(key);
		setApiKey(key.trim());
		setAuthError(null);
	}, []);
	const disconnect = useCallback(() => {
		clearKey();
		setApiKey(null);
	}, []);
	const setModel = useCallback((m: string) => {
		saveModel(m);
		setModelState(m);
	}, []);

	// Free mode works without a key.
	const ready = !!apiKey || isFreeModel(model);
	return { ...chat, apiKey, ready, model, setModel, connect, disconnect, errorText: authError ?? describeError(chat.error) };
}
