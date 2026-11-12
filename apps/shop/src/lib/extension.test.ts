import { expect, test } from "bun:test";
import { createCall } from "./extension";

const ORIGIN = "https://trgo.test";
const REQUEST = { key: "njuskalo", path: "/njuskalo/search/", search: "?keywords=x", accept: "" };
const RESULT = { status: 200, statusText: "OK", headers: {}, body: "ok" };

// A fake window. `send` plays a message event to the listeners.
function fakeWindow() {
	const listeners = new Set<(event: unknown) => void>();
	const posted: { id: string; origin: string }[] = [];
	const win = {
		postMessage: (message: { id: string }, origin: string) => void posted.push({ id: message.id, origin }),
		addEventListener: (_: string, l: (event: unknown) => void) => void listeners.add(l),
		removeEventListener: (_: string, l: (event: unknown) => void) => void listeners.delete(l),
	};
	const send = (event: { source?: unknown; origin?: string; data: unknown }) => {
		for (const l of [...listeners]) l({ source: win, origin: ORIGIN, ...event });
	};
	return { win: win as unknown as Window, posted, send, listeners };
}
const reply = (id: string) => ({ type: "trgo-ext:response", id, result: RESULT });

test("a call posts to its own origin and resolves on the matching id", async () => {
	const { win, posted, send, listeners } = fakeWindow();
	const pending = createCall(win, ORIGIN)(REQUEST);
	expect(posted).toHaveLength(1);
	expect(posted[0]!.origin).toBe(ORIGIN);
	send({ data: reply("other-id") });
	send({ data: reply(posted[0]!.id) });
	expect(await pending).toEqual(RESULT);
	expect(listeners.size).toBe(0);
});

test("a message from another source or origin is ignored", async () => {
	const { win, posted, send } = fakeWindow();
	const pending = createCall(win, ORIGIN, 50)(REQUEST);
	const data = reply(posted[0]!.id);
	send({ data, source: {} });
	send({ data, origin: "https://evil.test" });
	send({ data: { ...data, result: { status: "200" } } });
	await expect(pending).rejects.toThrow("did not answer");
});

test("the ids differ and a timeout or an abort removes the listener", async () => {
	const { win, posted, listeners } = fakeWindow();
	const call = createCall(win, ORIGIN, 20);
	const first = call(REQUEST);
	const control = new AbortController();
	const second = call(REQUEST, control.signal);
	expect(posted[0]!.id).not.toBe(posted[1]!.id);
	control.abort(new Error("stopped"));
	await expect(second).rejects.toThrow("stopped");
	await expect(first).rejects.toThrow("did not answer");
	expect(listeners.size).toBe(0);
	await expect(call(REQUEST, control.signal)).rejects.toThrow("stopped");
});
