export type ActionName =
	| "loginAction"
	| "createListingAction"
	| "publishListingAction"
	| "pauseListingAction"
	| "renewListingAction"
	| "markSoldListingAction"
	| "deleteListingPermanentlyAction"
	| "bulkListingsAction";
export type ActionIds = Record<ActionName, string>;
export type Discovery = { ids: ActionIds; buildId?: string; requests: number };
export type DiscoverOptions = { pages?: string[]; names?: ActionName[] };

export const SELL_NAMES: ActionName[] = ["loginAction", "createListingAction", "publishListingAction"];
// These live in the chunks of the /moji-oglasi page.
export const MINE_NAMES: ActionName[] = [
	"publishListingAction",
	"pauseListingAction",
	"renewListingAction",
	"markSoldListingAction",
	"deleteListingPermanentlyAction",
	"bulkListingsAction",
];

// First guess. Ids change on each SVEX deploy, so a failed call triggers discovery.
export const KNOWN_ACTIONS: ActionIds = {
	loginAction: "4002933de076f5948b8c9b6a07ede73755168432c2",
	createListingAction: "4090a9e8b9b00b20c2c49a880d2c863905c4ad2246",
	publishListingAction: "4011340b6a2158807d3ee6ba95ba43d1f6b6a9ea84",
	pauseListingAction: "4097118472a52552a516aa66da87374f5aacae43e3",
	renewListingAction: "40894ae38deaf45cb8861a191ccaa887b9e1619b8a",
	markSoldListingAction: "40bc3e3aeef75eec48ead21f4031b915028809958c",
	deleteListingPermanentlyAction: "40f7daa7b61255cf2075963a3caf91abc5c18cf23d",
	bulkListingsAction: "406eb7aa9d0e8edcb174641557a29c10c0ad07b228",
};

const CHUNK_URL = /\/_next\/static\/chunks\/[^"'\\\s]+?\.js/g;
const REFERENCE = /createServerReference\)\("([0-9a-f]+)",[^)]*?"([A-Za-z]+)"\)/g;
const BATCH = 8;

export function findActions(source: string, into: Partial<ActionIds>, names: ActionName[] = SELL_NAMES) {
	for (const [, id, name] of source.matchAll(REFERENCE)) {
		if (names.includes(name as ActionName)) into[name as ActionName] = id;
	}
}

const unique = (items: string[]) => [...new Set(items)];

// getText fetches a path on svex.ba (through the proxy) and returns the body.
export async function discoverActions(
	getText: (path: string) => Promise<string>,
	{ pages: pagePaths = ["/prodaj", "/prijava"], names = SELL_NAMES }: DiscoverOptions = {},
): Promise<Discovery> {
	let requests = 0;
	const fetchText = (path: string) => (requests++, getText(path));
	const found: Partial<ActionIds> = {};
	const done = () => names.every((n) => found[n]);

	const pages = await Promise.all(pagePaths.map(fetchText));
	const buildId = pages[0]?.match(/\\"b\\":\\"([^\\"]+)\\"/)?.[1];
	// Page chunks first, and the webpack runtime last: it never holds actions.
	const rank = (u: string) => (u.includes("/app/") ? 0 : u.includes("/webpack-") ? 2 : 1);
	const linked = unique(pages.flatMap((html) => html.match(CHUNK_URL) ?? [])).sort((a, b) => rank(a) - rank(b));
	const seen = new Set<string>();

	const scan = async (urls: string[]) => {
		const todo = urls.filter((u) => !seen.has(u));
		for (let i = 0; i < todo.length && !done(); i += BATCH) {
			const batch = todo.slice(i, i + BATCH);
			batch.forEach((u) => seen.add(u));
			const bodies = await Promise.all(batch.map((u) => fetchText(u).catch(() => "")));
			bodies.forEach((body) => findActions(body, found, names));
		}
	};

	await scan(linked);
	if (!done()) {
		// Lazy chunks are not linked from the HTML. The webpack runtime lists all of them.
		const runtimeUrl = linked.find((u) => u.includes("/webpack-"));
		const runtime = runtimeUrl ? await fetchText(runtimeUrl).catch(() => "") : "";
		const lazy = (runtime.match(/static\/chunks\/[^"]+?\.js/g) ?? []).map((p) => `/_next/${p}`);
		await scan(unique(lazy));
	}
	if (!done()) {
		const missing = names.filter((n) => !found[n]).join(", ");
		throw new Error(`Could not find the SVEX server actions: ${missing}`);
	}
	return { ids: found as ActionIds, buildId, requests };
}
