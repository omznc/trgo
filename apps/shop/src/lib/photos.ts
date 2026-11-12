import type { LaganoMessage } from "./agent";

// Photos live in browser memory for the page session. The model sees only ids.
export type Photo = { id: string; blob: Blob; url: string };

const MAX_SIDE = 2400;
const QUALITY = 0.85;
const photos = new Map<string, Photo>();
let counter = 0;
// A saved chat keeps old ids. The prefix changes on each page load, so a new photo never reuses one.
// Made on first use: Workers refuse random values in the global scope, and the server imports this module.
let prefix: string | undefined;

export const photoId = (pre: string, n: number) => `photo-${pre}-${n}`;

export const getPhoto = (id: string) => photos.get(id);

export async function shrinkImage(file: Blob): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
	const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
	const ctx = canvas.getContext("2d")!;
	// JPEG has no alpha, so paint white first.
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	return canvas.convertToBlob({ type: "image/jpeg", quality: QUALITY });
}

export async function addPhoto(file: Blob): Promise<Photo> {
	// The id is taken before the await, so ids keep the attach order.
	prefix ??= crypto.randomUUID().slice(0, 6);
	const id = photoId(prefix, ++counter);
	const blob = await shrinkImage(file);
	const photo = { id, blob, url: URL.createObjectURL(blob) };
	photos.set(photo.id, photo);
	return photo;
}

// Ids that a message or a create_listing card still shows.
export function usedPhotoIds(messages: LaganoMessage[]): Set<string> {
	const used = new Set<string>();
	for (const m of messages) {
		m.metadata?.photoIds?.forEach((id) => used.add(id));
		for (const p of m.parts) if (p.type === "tool-create_listing") p.input?.photoIds?.forEach((id) => id && used.add(id));
	}
	return used;
}

// Frees the photos of chats that are gone. A photo in `keep` stays.
export function releasePhotos(gone: LaganoMessage[], keep: Set<string>) {
	for (const id of usedPhotoIds(gone)) {
		const photo = photos.get(id);
		if (!photo || keep.has(id)) continue;
		URL.revokeObjectURL(photo.url);
		photos.delete(id);
	}
}

export const photoNote = (ids: string[]) =>
	ids.length ? `\n\n[Attached photos: ${ids.length} (${ids.join(", ")})]` : "";
