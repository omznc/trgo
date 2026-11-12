import { describe, expect, test } from "bun:test";
import { mapSvexMine, parseSvexMine, parseSvexMinePage } from "../src/mine";
import { createOlxProvider } from "../src/olx";
import { createSvexProvider } from "../src/svex";
import { discoverActions, KNOWN_ACTIONS, MINE_NAMES } from "../src/svex-actions";
import olxActive from "./fixtures/olx-mine-active.json";

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

const session = { token: "T" };
const empty = { data: [], meta: { last_page: 1 } };

describe("olx my listings", () => {
	test("reads each state from its own endpoint and sets the status", async () => {
		const { f, calls } = mockFetch(({ url }) => {
			if (url.includes("/olx/me")) return Response.json({ data: { id: 7, username: "Omar" } });
			if (url.includes("/users/Omar/listings?")) return Response.json(olxActive);
			if (url.includes("/listings/hidden"))
				return Response.json({ data: [{ ...olxActive.data[0], id: 2, status: "hidden", visible: false }], meta: { last_page: 1 } });
			if (url.includes("/listings/finished"))
				return Response.json({ data: [{ ...olxActive.data[0], id: 3 }], meta: { last_page: 1 } });
			return Response.json(empty);
		});
		const olx = createOlxProvider({ proxyUrl: "https://p.test", fetch: f });
		const { listings: list, truncated } = await olx.listMine(session);
		expect(truncated).toBe(false);
		expect(list.map((l) => [l.id, l.status])).toEqual([
			["81109655", "active"],
			["2", "hidden"],
			["3", "sold"],
		]);
		expect(list[0]).toMatchObject({ provider: "olx", priceText: "550 KM", canRefresh: false });
		const urls = calls.map((c) => c.url);
		expect(urls.some((u) => u.includes("/users/7/listings/inactive"))).toBe(true);
		expect(urls.some((u) => u.includes("/users/7/listings/expired"))).toBe(true);
	});

	test("flags a list cut at the page cap", async () => {
		const { f } = mockFetch(({ url }) =>
			Response.json(url.includes("/olx/me") ? { data: { id: 7, username: "Omar" } } : { data: [], meta: { last_page: 9 } }),
		);
		const out = await createOlxProvider({ proxyUrl: "https://p.test", fetch: f }).listMine(session);
		expect(out.truncated).toBe(true);
	});

	test("encodes the username in the path", async () => {
		const { f, calls } = mockFetch(({ url }) =>
			Response.json(url.includes("/olx/me") ? { data: { id: 7, username: "a b/c?" } } : empty),
		);
		await createOlxProvider({ proxyUrl: "https://p.test", fetch: f }).listMine(session);
		expect(calls.some((c) => c.url.startsWith("https://p.test/olx/users/a%20b%2Fc%3F/listings?"))).toBe(true);
	});

	test("hide, unhide and finish use POST", async () => {
		const { f, calls } = mockFetch(() => Response.json({ data: {} }));
		const olx = createOlxProvider({ proxyUrl: "https://p.test", fetch: f });
		await olx.hide(session, 5);
		await olx.unhide(session, 5);
		await olx.finish(session, 5);
		expect(calls.map((c) => [c.init!.method, c.url])).toEqual([
			["POST", "https://p.test/olx/listings/5/hide"],
			["POST", "https://p.test/olx/listings/5/unhide"],
			["POST", "https://p.test/olx/listings/5/finish"],
		]);
	});

	test("updatePrice sends PUT with the price", async () => {
		const { f, calls } = mockFetch(() => Response.json({ data: {} }));
		await createOlxProvider({ proxyUrl: "https://p.test", fetch: f }).updatePrice(session, 5, 520);
		expect(calls[0]!.init!.method).toBe("PUT");
		expect(calls[0]!.url).toBe("https://p.test/olx/listings/5");
		expect(JSON.parse(String(calls[0]!.init!.body))).toEqual({ price: 520 });
	});

	test("refresh uses PUT and reports the free refreshes left", async () => {
		const { f, calls } = mockFetch(({ url }) =>
			url.endsWith("/limits")
				? Response.json({ free_limit: 60, free_count: 10, paid_count: 0, listing_count: 2 })
				: Response.json({ data: {} }),
		);
		const out = await createOlxProvider({ proxyUrl: "https://p.test", fetch: f }).refresh(session, 5);
		expect(out).toEqual({ freeLeft: 49, paid: false });
		expect(calls[1]!.init!.method).toBe("PUT");
		expect(calls[1]!.url).toBe("https://p.test/olx/listings/5/refresh");
	});

	test("refresh still works when the limits call fails", async () => {
		const { f } = mockFetch(({ url }) => (url.endsWith("/limits") ? new Response("no", { status: 500 }) : Response.json({})));
		expect(await createOlxProvider({ proxyUrl: "https://p.test", fetch: f }).refresh(session, 5)).toEqual({});
	});
});

const item = (over: Record<string, unknown>) => ({
	id: "a1",
	slug: "earmor",
	title: "Earmor SE32",
	status: "ACTIVE",
	price: "220",
	views: 14,
	expiresAt: "2027-05-10T19:16:45.771Z",
	thumbnailUrl: "https://x/t.webp",
	...over,
});

// The page holds the RSC payload as JS strings. A title can hold a bracket.
const page = (items: unknown[]) => {
	const payload = `x:[{"items":${JSON.stringify(items)},"advisorEnabled":false,"totalListings":${items.length}}]`;
	return `<html><script>self.__next_f.push([1,${JSON.stringify(payload)}])</script></html>`;
};

describe("svex my listings", () => {
	test("parses the items and maps the status", () => {
		const html = page([
			item({}),
			item({ id: "b2", status: "PAUSED", title: "Has ] bracket" }),
			item({ id: "c3", status: "SOLD", soldAt: "2026-11-03T00:00:00Z" }),
			item({ id: "d4", status: "ARCHIVED" }),
		]);
		const list = parseSvexMine(html);
		expect(list.map((l) => [l.id, l.status])).toEqual([["a1", "active"], ["b2", "hidden"], ["c3", "sold"]]);
		expect(list[0]).toMatchObject({ price: 220, priceText: "220 KM", views: 14, url: "https://svex.ba/oglas/a1-earmor" });
		expect(list[1]!.title).toBe("Has ] bracket");
	});

	test("reads an empty list and fails on a page without data", () => {
		expect(parseSvexMine(page([]))).toEqual([]);
		expect(() => parseSvexMine("<html></html>")).toThrow("no listing data");
	});

	test("flags a page that holds fewer items than totalListings", () => {
		const cut = page([item({})]).replace('\\"totalListings\\":1', '\\"totalListings\\":3');
		expect(parseSvexMinePage(cut)).toMatchObject({ truncated: true });
		expect(parseSvexMinePage(cut).listings).toHaveLength(1);
		expect(parseSvexMinePage(page([item({})])).truncated).toBe(false);
	});

	test("maps a missing price", () => {
		expect(mapSvexMine(item({ price: null }) as never)).toMatchObject({ price: null, priceText: "Po dogovoru" });
	});

	test("each action posts the id to its own server action", async () => {
		const { f, calls } = mockFetch(() => new Response('0:["$@1"]\n1:{"ok":true,"data":{"expiresAt":"2027-01-01"}}\n'));
		const svex = createSvexProvider({ proxyUrl: "https://p.test", fetch: f });
		const s = { cookies: { svex_access: "x" } };
		await svex.hide(s, "a1");
		await svex.unhide(s, "a1");
		await svex.finish(s, "a1");
		await svex.deleteListing(s, "a1");
		const out = await svex.refresh(s, "a1");
		expect(out.expiresAt).toBe("2027-01-01");
		const sent = calls.map((c) => (c.init!.headers as Record<string, string>)["next-action"]);
		expect(sent).toEqual([
			KNOWN_ACTIONS.pauseListingAction,
			KNOWN_ACTIONS.publishListingAction,
			KNOWN_ACTIONS.markSoldListingAction,
			KNOWN_ACTIONS.deleteListingPermanentlyAction,
			KNOWN_ACTIONS.renewListingAction,
		]);
		expect(calls[0]!.init!.body).toBe('["a1"]');
		expect(calls[0]!.url).toBe("https://p.test/svex/moji-oglasi");
	});

	test("updatePrice uses the bulk action and fails on a skipped row", async () => {
		let reply = '1:{"ok":true,"data":{"results":[{"id":"a1","ok":true}]}}';
		const { f, calls } = mockFetch(() => new Response(reply));
		const svex = createSvexProvider({ proxyUrl: "https://p.test", fetch: f });
		const s = { cookies: {} };
		await svex.updatePrice(s, "a1", 200);
		expect(JSON.parse(String(calls[0]!.init!.body))).toEqual([{ ids: ["a1"], action: "price", price: 200 }]);
		reply = '1:{"ok":true,"data":{"results":[{"id":"a1","ok":false,"skipped":"price_type_has_no_price"}]}}';
		await expect(svex.updatePrice(s, "a1", 200)).rejects.toThrow("price_type_has_no_price");
	});

	test("a failed action reply throws the message", async () => {
		const { f } = mockFetch(() => new Response('1:{"ok":false,"message":"nope"}'));
		await expect(createSvexProvider({ proxyUrl: "https://p.test", fetch: f }).hide({ cookies: {} }, "a1")).rejects.toThrow("nope");
	});

	test("discovers the listing actions from the my listings page", async () => {
		const src = (id: string, name: string) => `a.createServerReference)("${id}",c.callServer,void 0,c.f,"${name}")`;
		const chunk = MINE_NAMES.map((n, i) => src(`${i}ab`, n)).join("");
		const html = '<script src="/_next/static/chunks/app/page-1.js"></script>';
		const out = await discoverActions(async (p) => (p === "/moji-oglasi" ? html : chunk), {
			pages: ["/moji-oglasi"],
			names: MINE_NAMES,
		});
		expect(out.ids.pauseListingAction).toBe("1ab");
	});
});
