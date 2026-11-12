import { expect, test } from "bun:test";
import type { LaganoMessage } from "./agent";
import { addPhoto, getPhoto, photoId, releasePhotos, usedPhotoIds } from "./photos";

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

test("release frees photos of gone chats and keeps shown ones", async () => {
	const revoked: string[] = [];
	URL.createObjectURL = () => `blob:${Math.random()}`;
	URL.revokeObjectURL = (u: string) => void revoked.push(u);
	globalThis.createImageBitmap = (async () => ({ width: 1, height: 1, close() {} })) as never;
	globalThis.OffscreenCanvas = class {
		getContext() {
			return { fillRect() {}, drawImage() {} };
		}
		convertToBlob = async () => new Blob(["x"]);
	} as never;
	const a = await addPhoto(new Blob(["a"]));
	const b = await addPhoto(new Blob(["b"]));
	const msg = (id: string) => ({ id: "m", role: "user", parts: [], metadata: { photoIds: [id] } }) as unknown as LaganoMessage;
	releasePhotos([msg(a.id), msg(b.id)], new Set([b.id]));
	expect(getPhoto(a.id)).toBeUndefined();
	expect(getPhoto(b.id)).toBeDefined();
	expect(revoked).toEqual([a.url]);
});
