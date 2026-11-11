import type { FileUIPart } from "ai";
import { type RefObject, useCallback, useEffect, useRef } from "react";
import { useSidePanel } from "@/components/shell/side-panel";
import { strings } from "@/lib/strings";

// Keeps a message that the missing key blocked, shakes the send button, and sends it once when the key arrives.
export function usePendingSend({
	apiKey,
	send,
	textarea,
	box,
	clearAttachments,
}: {
	apiKey: string | null;
	send: (text: string, files: FileUIPart[]) => void | Promise<void>;
	textarea: RefObject<HTMLTextAreaElement | null>;
	box: RefObject<HTMLElement | null>;
	clearAttachments: RefObject<(() => void) | null>;
}) {
	const { requireConnection, close } = useSidePanel();
	const pending = useRef<{ text: string; files: FileUIPart[] } | null>(null);

	const hold = useCallback(
		(text: string, files: FileUIPart[]) => {
			pending.current = { text, files };
			// The form clears the field on submit. A chip has not filled it yet.
			if (textarea.current) textarea.current.value = text;
			requireConnection("openrouter", strings.needKeySend);
			const btn = box.current?.querySelector<HTMLElement>("button[type=submit]");
			if (!btn) return;
			btn.dataset.cue = "";
			btn.classList.remove("cue-shake");
			void btn.offsetWidth;
			btn.classList.add("cue-shake");
		},
		[requireConnection, textarea, box],
	);

	useEffect(() => {
		const job = apiKey ? pending.current : null;
		if (!job) return;
		pending.current = null;
		if (textarea.current?.value === job.text) textarea.current.value = "";
		void send(job.text, job.files);
		clearAttachments.current?.();
		close();
	}, [apiKey, send, textarea, close, clearAttachments]);

	return hold;
}
