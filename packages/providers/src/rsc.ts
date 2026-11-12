export type ActionReply<T> = { ok: true; data: T } | { ok: false; error?: unknown; message?: string };

// The server answered, but the reply is unreadable. The action may have run, so the caller must not repeat it.
export class ActionReplyError extends Error {}

// A server action reply is RSC text. The result is the line that starts with "1:".
export function parseActionReply<T = unknown>(text: string): ActionReply<T> {
	for (const line of text.split("\n")) {
		if (!line.startsWith("1:")) continue;
		try {
			return JSON.parse(line.slice(2)) as ActionReply<T>;
		} catch {
			throw new ActionReplyError(`Unreadable server action reply: ${text.slice(0, 200)}`);
		}
	}
	throw new ActionReplyError(`Unexpected server action reply: ${text.slice(0, 200)}`);
}

export function actionData<T>(reply: ActionReply<T>, label: string): T {
	if (reply.ok) return reply.data;
	const detail = reply.message ?? (reply.error ? JSON.stringify(reply.error) : "no detail");
	throw new Error(`${label} failed: ${detail.slice(0, 300)}`);
}
