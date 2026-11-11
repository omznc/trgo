import { createRequest, readJson } from "./http";
import { flattenOlxCities, mapOlxItem } from "./olx";
import type { Listing, NamedId, OlxListingInput, OlxSession, ProviderOptions } from "./types";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const DEVICE_NAME = "lagano-shop";

// The OLX API has no field for shipping, so the UI shows this to the user.
export const OLX_SHIPPING_NOTE = "OLX has no API field for shipping or free delivery. Set it in the OLX app.";

// OLX shows line breaks only as <br>.
export const olxDescription = (text: string) => text.replace(/\r?\n/g, "<br>");

export function olxListingBody(input: OlxListingInput) {
	return { ...input, description: olxDescription(input.description), listing_type: "sell", available: true };
}

export function checkOlxImages(files: Blob[]) {
	files.forEach((file, i) => {
		if (file.size > MAX_IMAGE_BYTES) {
			const mb = Math.round(file.size / 1024 / 1024);
			throw new Error(`Image ${i + 1} is ${mb} MB. The limit is 15 MB. Shrink the image first.`);
		}
	});
}

const unwrap = <T>(payload: unknown): T =>
	(payload && typeof payload === "object" && "data" in payload ? (payload as { data: T }).data : payload) as T;

export function createOlxAccount(options: ProviderOptions) {
	const request = createRequest(options);
	const auth = (s: OlxSession) => ({ authorization: `Bearer ${s.token}` });

	const get = async <T>(path: string, s?: OlxSession) =>
		unwrap<T>(await readJson<unknown>(await request(`/olx${path}`, { headers: s ? auth(s) : {} }), `OLX ${path}`));

	const send = async <T>(method: string, path: string, s: OlxSession, body?: unknown) =>
		unwrap<T>(
			await readJson<unknown>(
				await request(`/olx${path}`, {
					method,
					headers: { ...auth(s), "content-type": "application/json" },
					body: body === undefined ? undefined : JSON.stringify(body),
				}),
				`OLX ${method} ${path}`,
			),
		);

	async function login(credentials: { username: string; password: string }): Promise<OlxSession> {
		const res = await request("/olx/auth/login", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ ...credentials, device_name: DEVICE_NAME }),
		});
		const { token } = await readJson<{ token?: string }>(res, "OLX login");
		if (!token) throw new Error("OLX login returned no token.");
		return { token };
	}

	const me = (s: OlxSession) => get<{ id: number; username: string }>("/me", s);

	async function cities(): Promise<NamedId<number>[]> {
		const tree = await readJson<Parameters<typeof flattenOlxCities>[0]>(await request("/olx/cities"), "OLX cities");
		return [...flattenOlxCities(tree)].map(([id, name]) => ({ id, name }));
	}

	// Never send PUT /listings/:id on a draft: OLX publishes it. So there is no update method.
	async function createDraft(s: OlxSession, input: OlxListingInput) {
		const created = await send<{ id: number }>("POST", "/listings", s, olxListingBody(input));
		return { id: created.id, notes: [OLX_SHIPPING_NOTE] };
	}

	async function uploadImages(s: OlxSession, id: number, files: Blob[]) {
		checkOlxImages(files);
		const form = new FormData();
		files.forEach((file, i) => {
			const typed = file.type ? file : new Blob([file], { type: "image/jpeg" });
			form.append("images[]", typed, `photo-${i + 1}.jpg`);
		});
		// No content-type header: fetch adds the multipart boundary.
		const res = await request(`/olx/listings/${id}/image-upload`, { method: "POST", headers: auth(s), body: form });
		return readJson<unknown>(res, "OLX image upload");
	}

	async function listMine(s: OlxSession): Promise<Listing[]> {
		const user = await me(s);
		const items = await get<Parameters<typeof mapOlxItem>[0][]>(`/users/${user.id}/listings`, s);
		return items.map((item) => mapOlxItem(item));
	}

	return {
		login,
		me,
		cities,
		suggestCategory: (keyword: string) =>
			get<{ id: number; name: string; parent_categories?: string[] }[]>(
				`/categories/suggest?keyword=${encodeURIComponent(keyword)}`,
			),
		categoryAttributes: (id: number) => get<unknown[]>(`/categories/${id}/attributes`),
		createDraft,
		uploadImages,
		publish: (s: OlxSession, id: number) => send<unknown>("POST", `/listings/${id}/publish`, s),
		listMine,
		deleteListing: (s: OlxSession, id: number) => send<unknown>("DELETE", `/listings/${id}`, s),
	};
}
