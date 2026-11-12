import { createContext, useContext } from "react";
import type { ProviderResult } from "@/lib/publish";

// What the cards and the detail panel can ask the chat to do.
export type ChatActions = {
	send: (text: string) => void;
	// Puts text in the composer and focuses it.
	ask: (text: string) => void;
	openConnect: () => void;
	// Saves the results of a publish retry in the message of that tool call.
	saveResults: (toolCallId: string, results: ProviderResult[]) => void;
};

const Ctx = createContext<ChatActions | null>(null);
export const ChatActionsProvider = Ctx.Provider;

export function useChatActions() {
	const ctx = useContext(Ctx);
	if (!ctx) throw new Error("useChatActions needs ChatActionsProvider");
	return ctx;
}
