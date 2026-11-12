import { describe, expect, test } from "bun:test";
import { parseSetCookies } from "../src/cookies";
import { checkOlxImages, olxDescription, olxListingBody } from "../src/olx-account";
import { createOlxProvider } from "../src/olx";
import { ActionReplyError, actionData, parseActionReply } from "../src/rsc";
import { createSvexProvider, mergeSvexResults } from "../src/svex";
import { checkSvexListing, svexListingPayload } from "../src/svex-account";
import { discoverActions, findActions, KNOWN_ACTIONS } from "../src/svex-actions";
import type { Listing, SvexListingInput } from "../src/types";

const input: SvexListingInput = {
	title: "Earmor SE32 slusalice",
	description: "Line one\nLine two",
	categoryId: "cat",
	price: 220,
	condition: "used_excellent",
	cityId: "city",
	media: [{ kind: "image", id: "m1", urlOriginal: "https://x/m1.jpg" }],
	deliveryPrice: 0,
};

type Call = { url: string; init?: RequestInit };

function mockFetch(handler: (call: Call) => Response) {
	const calls: Call[] = [];
	const f = (async (url: string | URL, init?: RequestInit) => {
		const call = { url: String(url), init };
		calls.push(call);
		return handler(call);
	}) as unknown as typeof fetch;
	return { f, calls };
}

describe("rsc", () => {
	test("parses login and create replies", () => {
		const login = parseActionReply('0:["$@1"]\n1:{"ok":true,"data":"$undefined"}\n');
		expect(login.ok).toBe(true);
		const created = parseActionReply<{ id: string }>('1:{"ok":true,"data":{"id":"a","slug":"s","status":"DRAFT"}}');
		expect(actionData(created, "x").id).toBe("a");
	});

	test("throws on a failed reply", () => {
		const bad = parseActionReply('1:{"ok":false,"message":"bad password"}');
		expect(() => actionData(bad, "login")).toThrow("bad password");
		expect(() => parseActionReply("nothing")).toThrow("Unexpected");
	});

	test("marks an unreadable reply, because the action may have run", () => {
		expect(() => parseActionReply('1:{"ok":tru')).toThrow(ActionReplyError);
		expect(() => parseActionReply("nothing")).toThrow(ActionReplyError);
	});
});

describe("cookies", () => {
	test("reads a JSON array with commas in Expires", () => {
		const header = JSON.stringify([
			"sid=abc123; Path=/; Expires=Wed, 21 Oct 2026 07:28:00 GMT; HttpOnly",
			"theme=dark; Path=/",
		]);
		expect(parseSetCookies(header)).toEqual({ sid: "abc123", theme: "dark" });
		expect(parseSetCookies(null)).toEqual({});
		expect(parseSetCookies("not json")).toEqual({});
	});
});

describe("svex payload", () => {
	test("builds the create payload", () => {
		const payload = svexListingPayload(input, true);
		expect(payload).toMatchObject({
			currency: "BAM",
			priceType: "fixed",
			deliveryPrice: 0,
			courierExpressOne: null,
			availableCountrywide: true,
			mediaIds: ["m1"],
			publish: true,
		});
	});

	test("checks title, description and photos", () => {
		expect(() => checkSvexListing({ ...input, title: "short" })).toThrow("8 characters");
		expect(() => checkSvexListing({ ...input, description: "x".repeat(8001) })).toThrow("8000");
		expect(() => checkSvexListing({ ...input, media: [] })).toThrow("photo");
	});
});

describe("svex flows", () => {
	test("login sends the server action and keeps cookies", async () => {
		const { f, calls } = mockFetch(({ url }) =>
			url.endsWith("/svex/prijava")
				? new Response('1:{"ok":true,"data":"$undefined"}', {
						headers: { "x-lagano-set-cookie": JSON.stringify(["sid=s1; Expires=Wed, 21 Oct 2026 07:28:00 GMT"]) },
					})
				: Response.json({ user: { id: "u" } }),
		);
		const svex = createSvexProvider({ proxyUrl: "https://p.test/", fetch: f });
		const session = await svex.login({ identifier: "a@b.c", password: "pw" });
		expect(session).toEqual({ cookies: { sid: "s1" } });
		const headers = calls[0]!.init!.headers as Record<string, string>;
		expect(headers["next-action"]).toBe(KNOWN_ACTIONS.loginAction);
		expect(JSON.parse(String(calls[0]!.init!.body))).toEqual([
			{ identifier: "a@b.c", password: "pw", rememberMe: true, pool: "main" },
		]);
		expect((calls[1]!.init!.headers as Record<string, string>)["x-lagano-cookie"]).toBe("sid=s1");
	});

	test("rediscovers once when the action id is old", async () => {
		const page = '<script src="/_next/static/chunks/a.js"></script>';
		const chunk =
			'x.createServerReference)("1111",c.callServer,void 0,c.findSourceMapURL,"loginAction")' +
			'y.createServerReference)("2222",c.callServer,void 0,c.findSourceMapURL,"createListingAction")' +
			'z.createServerReference)("3333",c.callServer,void 0,c.findSourceMapURL,"publishListingAction")';
		const seen: string[] = [];
		const { f } = mockFetch(({ url, init }) => {
			const action = (init?.headers as Record<string, string> | undefined)?.["next-action"];
			if (action) {
				seen.push(action);
				return action === "2222"
					? new Response('1:{"ok":true,"data":{"id":"n","slug":"s","status":"DRAFT"}}')
					: new Response("Server action not found.", { status: 404 });
			}
			return new Response(url.endsWith("a.js") ? chunk : page);
		});
		const svex = createSvexProvider({ proxyUrl: "https://p.test", fetch: f });
		const out = await svex.createListing({ cookies: {} }, input, { publish: false });
		expect(out.id).toBe("n");
		expect(seen).toEqual([KNOWN_ACTIONS.createListingAction, "2222"]);
	});

	test("upload retries through the proxy after a network error", async () => {
		const { f, calls } = mockFetch(({ url, init }) => {
			if (url.includes("/api/listings/media")) {
				const op = JSON.parse(String(init!.body)).op;
				return Response.json({
					ok: true,
					data:
						op === "presign"
							? { mediaId: "m", key: "k", uploadUrl: "https://b.s3.eu.amazonaws.com/k?sig=1", publicUrl: "https://c/k" }
							: { thumbUrl: "https://c/t" },
				});
			}
			if (url.startsWith("https://b.s3")) throw new TypeError("CORS");
			return new Response(null, { status: 200 });
		});
		const svex = createSvexProvider({ proxyUrl: "https://p.test", fetch: f });
		const media = await svex.uploadPhoto({ cookies: {} }, new Blob(["x"], { type: "image/jpeg" }), "a.jpg");
		expect(media).toMatchObject({ id: "m", urlOriginal: "https://c/k", urlThumb: "https://c/t" });
		expect(calls.some((c) => c.url === `https://p.test/upload?url=${encodeURIComponent("https://b.s3.eu.amazonaws.com/k?sig=1")}`)).toBe(true);
	});
});

describe("svex discovery", () => {
	test("finds names in a chunk", () => {
		const found = {};
		findActions('a.createServerReference)("ab12",s.callServer,void 0,s.findSourceMapURL,"loginAction")', found);
		expect(found).toEqual({ loginAction: "ab12" });
	});

	test("falls back to the webpack chunk map", async () => {
		const page = '<script src="/_next/static/chunks/webpack-1.js"></script>';
		const runtime = 'r.u=e=>1===e?"static/chunks/lazy-1.js":void 0';
		const lazy =
			'a.createServerReference)("1",c.callServer,void 0,c.f,"loginAction")' +
			'a.createServerReference)("2",c.callServer,void 0,c.f,"createListingAction")' +
			'a.createServerReference)("3",c.callServer,void 0,c.f,"publishListingAction")';
		const result = await discoverActions(async (path) =>
			path.endsWith("webpack-1.js") ? runtime : path.endsWith("lazy-1.js") ? lazy : page,
		);
		expect(result.ids.createListingAction).toBe("2");
	});

	test("fails with the missing names", async () => {
		await expect(discoverActions(async () => "")).rejects.toThrow("loginAction");
	});
});

describe("svex search merge", () => {
	const l = (id: string, price: number): Listing => ({
		provider: "svex", id, title: id, price, priceText: "", currency: "BAM", url: "",
	});

	test("dedupes by id and sorts by price", () => {
		const out = mergeSvexResults(
			[{ listings: [l("a", 30), l("b", 10)], total: 2 }, { listings: [l("b", 10), l("c", 20)], total: 2 }],
			{ q: "x", sort: "price_asc" },
		);
		expect(out.listings.map((x) => x.id)).toEqual(["b", "c", "a"]);
		expect(out.total).toBe(4);
	});

	test("search runs one call for each used grade", async () => {
		const { f, calls } = mockFetch(() => Response.json({ items: [], total: 0 }));
		await createSvexProvider({ proxyUrl: "https://p.test", fetch: f }).search({ q: "x", condition: "used" });
		const grades = calls.map((c) => new URL(c.url).searchParams.get("condition")).sort();
		expect(grades).toEqual(["used_excellent", "used_fair", "used_good"]);
	});
});

describe("olx", () => {
	test("converts new lines to <br> and sets listing type", () => {
		expect(olxDescription("a\nb\r\nc")).toBe("a<br>b<br>c");
		const body = olxListingBody({ title: "t", description: "a\nb", category_id: 1, city_id: 2, price: 3, state: "used" });
		expect(body).toMatchObject({ description: "a<br>b", listing_type: "sell" });
	});

	test("refuses an image over 15 MB", () => {
		expect(() => checkOlxImages([{ size: 16 * 1024 * 1024 } as Blob])).toThrow("15 MB");
	});

	test("login uses the lagano device name and the bearer token", async () => {
		const { f, calls } = mockFetch(({ url }) =>
			url.endsWith("/auth/login") ? Response.json({ token: "T" }) : Response.json({ data: { id: 7, username: "u" } }),
		);
		const olx = createOlxProvider({ proxyUrl: "https://p.test", fetch: f });
		const session = await olx.login({ username: "u", password: "p" });
		expect(session).toEqual({ token: "T" });
		expect(JSON.parse(String(calls[0]!.init!.body)).device_name).toBe("lagano-shop");
		await olx.me(session);
		expect((calls[1]!.init!.headers as Record<string, string>).authorization).toBe("Bearer T");
	});

	test("createDraft returns the id and the shipping note", async () => {
		const { f } = mockFetch(() => Response.json({ id: 99 }));
		const olx = createOlxProvider({ proxyUrl: "https://p.test", fetch: f });
		const out = await olx.createDraft({ token: "T" }, { title: "t", description: "d", category_id: 1, city_id: 2, price: 3, state: "new" });
		expect(out.id).toBe(99);
		expect(out.notes[0]).toContain("OLX app");
	});
});
