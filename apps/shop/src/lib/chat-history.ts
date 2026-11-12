import { useEffect, useSyncExternalStore } from "react";
import type { LaganoMessage } from "./agent";
import { stripNotes } from "./model-notes";

// Chats live in IndexedDB: tool outputs (search lists, price cards) can pass the 5 MB localStorage limit.
// The store holds no key and no session. Only messages are saved.
export type StoredChat = { id: string; title: string; createdAt: number; updatedAt: number; messages: LaganoMessage[] };
export type Backend = {
	all: () => Promise<StoredChat[]>;
	put: (chat: StoredChat) => Promise<void>;
	del: (id: string) => Promise<void>;
	clear: () => Promise<void>;
};

export const MAX_CHATS = 50;
const TITLE_MAX = 60;
const DB = "lagano.history";

export function titleOf(messages: LaganoMessage[]): string {
	const first = messages.find((m) => m.role === "user");
	const text = first ? stripNotes(first.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join(" ")) : "";
	const clean = text.replace(/\s+/g, " ").trim();
	return clean.length > TITLE_MAX ? `${clean.slice(0, TITLE_MAX - 1).trimEnd()}…` : clean;
}

export const newest = (chats: StoredChat[]) => [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

const isQuota = (e: unknown) => e instanceof Error && (e.name === "QuotaExceededError" || e.name === "QuotaExceeded");

// Writes the chat. On a full disk it drops the oldest other chat and tries again. Returns the kept list.
// onDrop tells the caller about each chat that the full disk cost.
export async function saveChat(backend: Backend, list: StoredChat[], chat: StoredChat, onDrop?: (id: string) => void): Promise<StoredChat[]> {
	let next = newest([chat, ...list.filter((c) => c.id !== chat.id)]);
	for (const extra of next.slice(MAX_CHATS)) await backend.del(extra.id);
	next = next.slice(0, MAX_CHATS);
	for (;;) {
		try {
			await backend.put(chat);
			return next;
		} catch (e) {
			const oldest = next.findLast((c) => c.id !== chat.id);
			if (!isQuota(e) || !oldest) throw e;
			await backend.del(oldest.id);
			onDrop?.(oldest.id);
			next = next.filter((c) => c.id !== oldest.id);
		}
	}
}

function idbBackend(): Backend {
	const open = () =>
		new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(DB, 1);
			req.onupgradeneeded = () => req.result.createObjectStore("chats", { keyPath: "id" });
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
		const db = await open();
		return new Promise<T>((resolve, reject) => {
			const tx = db.transaction("chats", mode);
			const req = fn(tx.objectStore("chats"));
			tx.oncomplete = () => (db.close(), resolve(req.result));
			tx.onabort = tx.onerror = () => (db.close(), reject(tx.error ?? req.error));
		});
	};
	return {
		all: () => run("readonly", (s) => s.getAll() as IDBRequest<StoredChat[]>),
		put: (chat) => run("readwrite", (s) => s.put(chat)).then(() => {}),
		del: (id) => run("readwrite", (s) => s.delete(id)).then(() => {}),
		clear: () => run("readwrite", (s) => s.clear()).then(() => {}),
	};
}

let backend: Backend | null = null;
let chats: StoredChat[] = [];
let started = false;
const listeners = new Set<() => void>();
const set = (next: StoredChat[]) => {
	chats = next;
	listeners.forEach((l) => l());
};
const db = () => (backend ??= idbBackend());
// One writer at a time, so a slow write never lands after a newer one.
let queue: Promise<unknown> = Promise.resolve();
const enqueue = (job: () => Promise<void>) => (queue = queue.then(job).catch(() => {}));

// A failed save, or a chat dropped to make room, is reported one time for each page session.
let saveListener: (() => void) | null = null;
let reported = false;
export const onSaveFailure = (cb: () => void) => {
	saveListener = cb;
	return () => void (saveListener = null);
};
function reportSaveFailure() {
	if (reported || !saveListener) return;
	reported = true;
	saveListener();
}

export function initHistory() {
	if (started || typeof indexedDB === "undefined") return;
	started = true;
	enqueue(async () => set(newest(await db().all()).slice(0, MAX_CHATS)));
}

export const getChat = (id: string) => chats.find((c) => c.id === id);
export const listChats = () => chats;

export function persistChat(id: string, messages: LaganoMessage[]) {
	if (messages.length === 0 || typeof indexedDB === "undefined") return;
	const now = Date.now();
	const chat: StoredChat = { id, title: titleOf(messages), createdAt: getChat(id)?.createdAt ?? now, updatedAt: now, messages };
	// The list shows the chat at once. The write follows.
	set(newest([chat, ...chats.filter((c) => c.id !== id)]).slice(0, MAX_CHATS));
	enqueue(async () => {
		try {
			const kept = new Set((await saveChat(db(), chats, chat, reportSaveFailure)).map((c) => c.id));
			set(chats.filter((c) => kept.has(c.id)));
		} catch {
			reportSaveFailure();
		}
	});
}

export function removeChat(id: string) {
	set(chats.filter((c) => c.id !== id));
	enqueue(() => db().del(id));
}

export async function clearHistory() {
	set([]);
	if (typeof indexedDB === "undefined") return;
	await enqueue(() => db().clear());
}

const subscribe = (cb: () => void) => (listeners.add(cb), () => void listeners.delete(cb));
export function useChatHistory() {
	useEffect(initHistory, []);
	return useSyncExternalStore(subscribe, () => chats, () => []);
}

type AnyPart = {
	type: string;
	state?: string;
	approval?: { id: string; approved?: boolean };
	errorText?: string;
	input?: { providers?: string[] };
	output?: { done?: boolean; results?: { provider: string }[] };
};

// The ids of the approvals that the user answered. A change means the chat needs a save.
export const respondedKey = (messages: LaganoMessage[]) =>
	messages
		.flatMap((m) => m.parts as AnyPart[])
		.filter((p) => p.state === "approval-responded")
		.map((p) => p.approval?.id)
		.join(",");

const isRunning = (p: AnyPart) =>
	(p.state === "approval-responded" && p.approval?.approved === true) || (p.state === "output-available" && p.output?.done === false);
const isDenied = (p: AnyPart) => p.state === "approval-requested" || (p.state === "approval-responded" && p.approval?.approved === false);

// The user approved a listing and the post may have run, but the result was never saved.
// The post is not safe to repeat, so the card says the result is unknown.
function unfinishedListing(p: AnyPart, unknown: string): AnyPart | null {
	if (!isRunning(p)) return null;
	const finished = p.output?.results ?? [];
	const missing = (p.input?.providers ?? [])
		.filter((provider) => !finished.some((r) => r.provider === provider))
		.map((provider) => ({ provider, ok: false, unknown: true, error: unknown }));
	return { ...p, state: "output-available", output: { done: true, results: [...finished, ...missing] } };
}

// An old approval must not be actionable. A tool that never finished shows as interrupted.
export function restoreMessages(messages: LaganoMessage[], interrupted: string, unknown: string): LaganoMessage[] {
	const fix = (p: AnyPart): AnyPart => {
		if (!p.type.startsWith("tool-")) return p;
		if (isDenied(p) && p.approval) return { ...p, state: "output-denied", approval: { ...p.approval, approved: false } as never };
		const listing = p.type === "tool-create_listing" ? unfinishedListing(p, unknown) : null;
		if (listing) return listing;
		if (p.state === "input-streaming" || p.state === "input-available" || p.state === "approval-responded") return { ...p, state: "output-error", errorText: interrupted };
		return p;
	};
	return messages.map((m) => ({ ...m, parts: m.parts.map((p) => fix(p as AnyPart)) as LaganoMessage["parts"] }));
}
