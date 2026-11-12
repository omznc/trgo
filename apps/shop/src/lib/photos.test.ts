import { expect, test } from "bun:test";
import type { LaganoMessage } from "./agent";
import { photoId, usedPhotoIds } from "./photos";

test("photo ids differ between sessions and keep the attach order", () => {
	expect(photoId("aaaaaa", 1)).not.toBe(photoId("bbbbbb", 1));
	expect(photoId("aaaaaa", 1)).toBe("photo-aaaaaa-1");
	expect(photoId("aaaaaa", 2) > photoId("aaaaaa", 1)).toBe(true);
});

test("used ids come from message metadata and listing cards", () => {
	const messages = [
		{ id: "1", role: "user", parts: [], metadata: { photoIds: ["photo-a-1"] } },
		{ id: "2", role: "assistant", parts: [{ type: "tool-create_listing", state: "input-available", toolCallId: "t", input: { photoIds: ["photo-a-2"] } }] },
		{ id: "3", role: "assistant", parts: [{ type: "tool-create_listing", state: "input-streaming", toolCallId: "u", input: undefined }] },
	] as unknown as LaganoMessage[];
	expect([...usedPhotoIds(messages)].sort()).toEqual(["photo-a-1", "photo-a-2"]);
});
