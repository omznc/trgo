import { cookieHeader, parseSetCookies } from "./cookies";
import { createRequest, readJson } from "./http";
import { actionData, parseActionReply } from "./rsc";
import { type MyListing, parseSvexMine } from "./mine";
import { type ActionIds, type ActionName, discoverActions, KNOWN_ACTIONS, MINE_NAMES } from "./svex-actions";
import type { NamedId, ProviderOptions, SvexListingInput, SvexMedia, SvexSession } from "./types";

const MAX_TITLE = 8;
const MAX_DESCRIPTION = 8000;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const LISTING_API = "/svex-listing/v1";

type MediaOp = { mediaId: string; key: string; uploadUrl: string; publicUrl: string };

export const svexCookies = (session: SvexSession): Record<string, string> => ({
	"x-lagano-cookie": cookieHeader(session.cookies),
});

export function checkSvexListing(input: SvexListingInput) {
	if (input.title.trim().length < MAX_TITLE) throw new Error(`The title needs at least ${MAX_TITLE} characters.`);
	if (input.description.length > MAX_DESCRIPTION)
		throw new Error(`The description is over ${MAX_DESCRIPTION} characters.`);
	if (input.media.length === 0) throw new Error("Add at least one photo.");
}

export function svexListingPayload(input: SvexListingInput, publish: boolean) {
	return {
		title: input.title,
		description: input.description,
		categoryId: input.categoryId,
		price: input.price,
		currency: "BAM",
		priceType: "fixed",
		condition: input.condition,
		exchangePossible: input.exchangePossible ?? false,
		deliveryShipping: input.deliveryShipping ?? true,
		deliveryPickup: input.deliveryPickup ?? true,
		courierExpressOne: null,
		deliveryPrice: input.deliveryPrice ?? null,
		shippingWeight: input.shippingWeight ?? null,
		shippingDimensions: input.shippingDimensions ?? null,
		country: "ba",
		cityId: input.cityId,
		availableCountrywide: true,
		attributes: {},
		media: input.media,
		mediaIds: input.media.map((m) => m.id),
		publish,
	};
}

export function createSvexAccount(options: ProviderOptions) {
	const request = createRequest(options);
	const doFetch = options.fetch ?? fetch;
	const proxyBase = options.proxyUrl.replace(/\/+$/, "");
	let ids: ActionIds = { ...KNOWN_ACTIONS };

	// The result keeps the build id with the ids. The cache lives in this instance only.
	const rediscover = async () => {
		const result = await discoverActions(async (path) => {
			const res = await request(`/svex${path}`);
			if (!res.ok) throw new Error(`${path} failed with HTTP ${res.status}`);
			return res.text();
		});
		ids = result.ids;
		return result;
	};

	// The /moji-oglasi chunks hold the listing actions. The page needs the session.
	const rediscoverMine = async (cookies: Record<string, string>) => {
		const result = await discoverActions(
			async (path) => {
				const res = await request(`/svex${path}`, { headers: cookies });
				if (!res.ok) throw new Error(`${path} failed with HTTP ${res.status}`);
				return res.text();
			},
			{ pages: ["/moji-oglasi"], names: MINE_NAMES },
		);
		ids = { ...ids, ...result.ids };
	};

	const post = (path: string, name: ActionName, args: unknown[], cookies: Record<string, string>) =>
		request(`/svex${path}`, {
			method: "POST",
			headers: {
				"next-action": ids[name],
				accept: "text/x-component",
				"content-type": "text/plain;charset=UTF-8",
				...cookies,
			},
			body: JSON.stringify(args),
		});

	// Next.js answers 404 or "Server action not found" when the id is from an old build.
	const notFound = async (res: Response) =>
		res.status === 404 || (!res.ok && /server action not found/i.test(await res.clone().text()));

	async function callAction(path: string, name: ActionName, args: unknown[], session: SvexSession) {
		const cookies = svexCookies(session);
		let res = await post(path, name, args, cookies);
		if (await notFound(res)) {
			await (MINE_NAMES.includes(name) && name !== "publishListingAction" ? rediscoverMine(cookies) : rediscover());
			res = await post(path, name, args, cookies);
		}
		return res;
	}

	async function me(session: SvexSession) {
		const res = await request("/svex/api/auth/session", { headers: svexCookies(session) });
		return readJson<{ user: Record<string, unknown> | null }>(res, "SVEX session");
	}

	async function login(credentials: { identifier: string; password: string }): Promise<SvexSession> {
		const args = [{ ...credentials, rememberMe: true, pool: "main" }];
		const res = await callAction("/prijava", "loginAction", args, { cookies: {} });
		if (!res.ok) throw new Error(`SVEX login failed with HTTP ${res.status}`);
		actionData(parseActionReply(await res.text()), "SVEX login");
		const session: SvexSession = { cookies: parseSetCookies(res.headers.get("x-lagano-set-cookie")) };
		if (!(await me(session)).user) throw new Error("SVEX login did not start a session.");
		return session;
	}

	async function mediaOp<T>(session: SvexSession, op: string, input: unknown): Promise<T> {
		const res = await request("/svex/api/listings/media", {
			method: "POST",
			headers: { "content-type": "application/json", ...svexCookies(session) },
			body: JSON.stringify({ op, input }),
		});
		const body = await readJson<{ ok: boolean; data?: T }>(res, `SVEX media ${op}`);
		if (!body.ok || !body.data) throw new Error(`SVEX media ${op} was refused.`);
		return body.data;
	}

	// The browser PUTs to the bucket first. A CORS failure shows as a TypeError, so retry through the proxy.
	async function putBytes(uploadUrl: string, file: Blob) {
		const headers = { "content-type": file.type };
		let res: Response;
		try {
			res = await doFetch(uploadUrl, { method: "PUT", headers, body: file });
		} catch {
			res = await doFetch(`${proxyBase}/upload?url=${encodeURIComponent(uploadUrl)}`, {
				method: "PUT",
				headers,
				body: file,
			});
		}
		if (!res.ok) throw new Error(`SVEX photo upload failed with HTTP ${res.status}`);
	}

	async function uploadPhoto(session: SvexSession, file: Blob, filename = "photo.jpg"): Promise<SvexMedia> {
		if (file.size > MAX_PHOTO_BYTES) throw new Error(`${filename} is over 15 MB. Shrink the image first.`);
		const contentType = file.type || "image/jpeg";
		const typed = file.type ? file : new Blob([file], { type: contentType });
		const pre = await mediaOp<MediaOp>(session, "presign", { filename, contentType, contentLength: file.size });
		await putBytes(pre.uploadUrl, typed);
		const conf = await mediaOp<Record<string, string>>(session, "confirm", {
			mediaId: pre.mediaId,
			key: pre.key,
			contentLength: file.size,
		});
		const media: SvexMedia = { kind: "image", id: pre.mediaId, urlOriginal: pre.publicUrl };
		if (conf.thumbUrl) media.urlThumb = conf.thumbUrl;
		if (conf.mediumUrl) media.urlMedium = conf.mediumUrl;
		if (conf.largeUrl) media.urlLarge = conf.largeUrl;
		return media;
	}

	async function createListing(session: SvexSession, input: SvexListingInput, opts: { publish: boolean }) {
		checkSvexListing(input);
		const res = await callAction("/prodaj", "createListingAction", [svexListingPayload(input, opts.publish)], session);
		if (!res.ok) throw new Error(`SVEX createListing failed with HTTP ${res.status}`);
		return actionData<{ id: string; slug: string; status: string }>(
			parseActionReply(await res.text()),
			"SVEX createListing",
		);
	}

	async function publishListing(session: SvexSession, id: string) {
		const res = await callAction("/prodaj", "publishListingAction", [id], session);
		if (!res.ok) throw new Error(`SVEX publishListing failed with HTTP ${res.status}`);
		return actionData(parseActionReply(await res.text()), "SVEX publishListing");
	}

	async function listMine(session: SvexSession): Promise<MyListing[]> {
		const res = await request("/svex/moji-oglasi", { headers: svexCookies(session) });
		if (!res.ok) throw new Error(`SVEX my listings failed with HTTP ${res.status}`);
		return parseSvexMine(await res.text());
	}

	// One call for a listing action. The reply has `ok` and `data`.
	async function mineAction<T = unknown>(session: SvexSession, name: ActionName, args: unknown[], label: string) {
		const res = await callAction("/moji-oglasi", name, args, session);
		if (!res.ok) throw new Error(`SVEX ${label} failed with HTTP ${res.status}`);
		return actionData<T>(parseActionReply<T>(await res.text()), `SVEX ${label}`);
	}

	// SVEX has no single price action. The bulk action takes one id.
	async function updatePrice(session: SvexSession, id: string, price: number) {
		const data = await mineAction<{ results: { id: string; ok: boolean; skipped?: string }[] }>(
			session,
			"bulkListingsAction",
			[{ ids: [id], action: "price", price }],
			"updatePrice",
		);
		const row = data.results.find((r) => r.id === id);
		if (!row?.ok || row.skipped) throw new Error(`SVEX updatePrice was refused${row?.skipped ? `: ${row.skipped}` : ""}`);
	}

	const publicList = async (path: string) =>
		readJson<NamedId[]>(await request(`${LISTING_API}${path}`), `SVEX ${path}`);

	return {
		login,
		me,
		uploadPhoto,
		createListing,
		publishListing,
		listMine,
		hide: (s: SvexSession, id: string) => mineAction(s, "pauseListingAction", [id], "hide"),
		unhide: (s: SvexSession, id: string) => mineAction(s, "publishListingAction", [id], "unhide"),
		refresh: (s: SvexSession, id: string) =>
			mineAction<{ expiresAt?: string }>(s, "renewListingAction", [id], "refresh"),
		finish: (s: SvexSession, id: string) => mineAction(s, "markSoldListingAction", [id], "finish"),
		updatePrice,
		deleteListing: (s: SvexSession, id: string) => mineAction(s, "deleteListingPermanentlyAction", [id], "delete"),
		categories: () => publicList("/categories"),
		cities: () => publicList("/cities?country=ba"),
		discoverActions: rediscover,
	};
}
