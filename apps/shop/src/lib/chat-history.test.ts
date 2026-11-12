import { expect, test } from "bun:test";
import type { LaganoMessage } from "./agent";
import { type Backend, MAX_CHATS, respondedKey, restoreMessages, saveChat, type StoredChat, titleOf } from "./chat-history";

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

test("quota cleanup reports each dropped chat", async () => {
	const { b } = memory(2);
	let list = await saveChat(b, [], chat("a", 1));
	list = await saveChat(b, list, chat("b", 2));
	const dropped: string[] = [];
	await saveChat(b, list, chat("c", 3), (id) => dropped.push(id));
	expect(dropped).toEqual(["a"]);
});

test("restore blocks an old approval", () => {
	const m = { id: "a", role: "assistant", parts: [{ type: "tool-create_listing", state: "approval-requested", approval: { id: "x" } }] } as unknown as LaganoMessage;
	const part = restoreMessages([m], "stop", "unknown")[0]?.parts[0] as { state: string };
	expect(part.state).toBe("output-denied");
});

type Restored = { state: string; errorText?: string; output?: { done: boolean; results: { provider: string; ok: boolean; unknown?: boolean; error?: string }[] } };
const restore = (part: object) => {
	const m = { id: "a", role: "assistant", parts: [part] } as unknown as LaganoMessage;
	return restoreMessages([m], "stop", "unknown")[0]?.parts[0] as unknown as Restored;
};

test("restore shows an approved listing as unknown, not cancelled", () => {
	const part = restore({
		type: "tool-create_listing",
		state: "approval-responded",
		approval: { id: "x", approved: true },
		input: { providers: ["olx", "svex"] },
	});
	expect(part.state).toBe("output-available");
	expect(part.output?.done).toBe(true);
	expect(part.output?.results.map((r) => [r.provider, r.ok, r.unknown, r.error])).toEqual([
		["olx", false, true, "unknown"],
		["svex", false, true, "unknown"],
	]);
});

test("restore keeps a finished provider of a half-done post", () => {
	const part = restore({
		type: "tool-create_listing",
		state: "output-available",
		input: { providers: ["olx", "svex"] },
		output: { done: false, progress: {}, results: [{ provider: "olx", ok: true, url: "u" }] },
	});
	expect(part.output?.results.map((r) => [r.provider, r.ok])).toEqual([
		["olx", true],
		["svex", false],
	]);
});

test("restore shows a refused approval as cancelled and other tools as interrupted", () => {
	expect(restore({ type: "tool-create_listing", state: "approval-responded", approval: { id: "x", approved: false } }).state).toBe("output-denied");
	const edit = restore({ type: "tool-edit_my_listing", state: "approval-responded", approval: { id: "y", approved: true } });
	expect([edit.state, edit.errorText]).toEqual(["output-error", "stop"]);
});

test("respondedKey changes when the user answers an approval", () => {
	const m = (state: string) => [{ id: "a", role: "assistant", parts: [{ type: "tool-create_listing", state, approval: { id: "x" } }] }] as unknown as LaganoMessage[];
	expect(respondedKey(m("approval-requested"))).toBe("");
	expect(respondedKey(m("approval-responded"))).toBe("x");
});
