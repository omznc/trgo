// Photos live in browser memory for the page session. The model sees only ids.
export type Photo = { id: string; blob: Blob; url: string };

const MAX_SIDE = 2400;
const QUALITY = 0.85;
const photos = new Map<string, Photo>();
let counter = 0;

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
	const id = `photo-${++counter}`;
	const blob = await shrinkImage(file);
	const photo = { id, blob, url: URL.createObjectURL(blob) };
	photos.set(photo.id, photo);
	return photo;
}

export const photoNote = (ids: string[]) =>
	ids.length ? `\n\n[Attached photos: ${ids.length} (${ids.join(", ")})]` : "";
