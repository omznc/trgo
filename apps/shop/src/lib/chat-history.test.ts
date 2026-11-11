import { expect, test } from "bun:test";
import type { LaganoMessage } from "./agent";
import { type Backend, MAX_CHATS, restoreMessages, saveChat, type StoredChat, titleOf } from "./chat-history";

const user = (text: string) => ({ id: "u", role: "user", parts: [{ type: "text", text }] }) as LaganoMessage;
const chat = (id: string, updatedAt: number): StoredChat => ({ id, title: id, createdAt: updatedAt, updatedAt, messages: [user(id)] });

function memory(limit = Infinity) {
	const rows = new Map<string, StoredChat>();
	const b: Backend = {
		all: async () => [...rows.values()],
		put: async (c) => {
			if (rows.size >= limit && !rows.has(c.id)) throw Object.assign(new Error("full"), { name: "QuotaExceededError" });
			rows.set(c.id, c);
		},
		del: async (id) => void rows.delete(id),
		clear: async () => rows.clear(),
	};
	return { rows, b };
}

test("title drops model notes and is truncated", () => {
	expect(titleOf([user("Samsung S22\n\n[Attached photos: 1 (photo-1)]")])).toBe("Samsung S22");
	const t = titleOf([user("a".repeat(200))]);
	expect(t.length).toBe(60);
	expect(t.endsWith("…")).toBe(true);
});

test("cap keeps the newest chats", async () => {
	const { rows, b } = memory();
	let list: StoredChat[] = [];
	for (let i = 0; i < MAX_CHATS + 5; i++) {
		const c = chat(`c${i}`, i);
		list = await saveChat(b, list, c);
	}
	expect(list.length).toBe(MAX_CHATS);
	expect(rows.size).toBe(MAX_CHATS);
	expect(rows.has("c0")).toBe(false);
	expect(rows.has(`c${MAX_CHATS + 4}`)).toBe(true);
});

test("quota error drops the oldest chat and retries", async () => {
	const { rows, b } = memory(2);
	let list = await saveChat(b, [], chat("a", 1));
	list = await saveChat(b, list, chat("b", 2));
	list = await saveChat(b, list, chat("c", 3));
	expect([...rows.keys()].sort()).toEqual(["b", "c"]);
	expect(list.map((c) => c.id).sort()).toEqual(["b", "c"]);
});

test("restore blocks an old approval", () => {
	const m = { id: "a", role: "assistant", parts: [{ type: "tool-create_listing", state: "approval-requested", approval: { id: "x" } }] } as unknown as LaganoMessage;
	const part = restoreMessages([m], "stop")[0]?.parts[0] as { state: string };
	expect(part.state).toBe("output-denied");
});
