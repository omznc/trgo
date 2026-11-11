// Checks every search and price prompt against live OLX and SVEX search.
// Run: bun run apps/shop/scripts/check-suggestions.ts (the proxy must run on :8787).
import { POOL } from "../src/lib/suggestions";

const PROXY = process.env.PROXY_URL ?? "http://localhost:8787";
const headers = { Origin: "http://localhost:3000" };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(path: string, params: Record<string, string | number>): Promise<unknown> {
	const url = new URL(PROXY + path);
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
	await wait(500);
	const res = await fetch(url, { headers });
	if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
	return res.json();
}

// Prices of the listings for a query. `max` is a server-side price ceiling.
async function prices(q: string, max?: number): Promise<number[]> {
	const olx = (await get("/olx/search", { q, per_page: 40, ...(max ? { price_to: max } : {}) })) as {
		data: { price: number; show_price?: boolean }[];
	};
	const svex = (await get("/svex-search/v1/search", { q, limit: 40, ...(max ? { priceMax: max } : {}) })) as {
		items: { price: string }[];
	};
	return [...olx.data.filter((i) => i.show_price !== false).map((i) => i.price), ...svex.items.map((i) => Number(i.price))].filter(
		(p) => Number.isFinite(p) && p > 0,
	);
}

let failed = 0;
for (const p of POOL) {
	if (p.kind === "sell" || (process.argv[2] && !p.text.includes(process.argv[2]))) continue;
	try {
		if (p.kind === "search") {
			// Prices under 15% of the ceiling are mostly accessories, so they do not count.
			const hits = (await prices(p.q, p.max)).filter((x) => x >= (p.max as number) * 0.15 && x <= (p.max as number));
			const ok = hits.length >= 3;
			failed += ok ? 0 : 1;
			console.log(`${ok ? "OK  " : "FAIL"} search ${String(hits.length).padStart(2)} <= ${p.max}  ${p.text}`);
		} else {
			const n = (await prices(p.q)).length;
			const ok = n >= 5;
			failed += ok ? 0 : 1;
			console.log(`${ok ? "OK  " : "FAIL"} price  ${String(n).padStart(2)} listings  ${p.text}`);
		}
	} catch (e) {
		failed++;
		console.log(`FAIL ${p.text}: ${e instanceof Error ? e.message : e}`);
	}
}
console.log(failed ? `${failed} prompt(s) failed` : "all prompts passed");
process.exit(failed ? 1 : 0);
