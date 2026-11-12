import type { MineStatus, MyListing, ProviderId } from "@lagano/providers";
import { useCallback, useEffect, useRef, useState } from "react";
import { type MineLoad, type MineOp, type MineResult, loadMine, mineCall } from "@/lib/mine-api";
import { ta } from "@/lib/strings-account";

export const keyOf = (i: Pick<MyListing, "provider" | "id">) => `${i.provider}:${i.id}`;

export type Notice = { kind: "error" | "info"; text: string } | null;

// The row as it should look at once, before the provider answers. null removes the row.
function optimistic(item: MyListing, op: MineOp, price: number): MyListing | null {
	const status = (s: MineStatus): MyListing => ({ ...item, status: s });
	switch (op) {
		case "hide":
			return status("hidden");
		case "unhide":
			return status("active");
		case "finish":
			return { ...status("sold"), soldAt: new Date().toISOString() };
		case "price":
			return { ...item, price, priceText: `${price} KM` };
		case "delete":
			return null;
		default:
			return item;
	}
}

function afterRefresh(item: MyListing, res: MineResult): MyListing {
	return { ...item, canRefresh: false, status: "active", expiresAt: res.expiresAt ?? item.expiresAt };
}

const refreshNotice = (res: MineResult): Notice => ({
	kind: "info",
	text: res.paid ? ta.refreshPaid : ta.refreshDone(res.freeLeft),
});

export function useMine(providers: ProviderId[]) {
	const [data, setData] = useState<MineLoad>({ items: [], errors: {}, truncated: [] });
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState<Set<string>>(new Set());
	const [notice, setNotice] = useState<Notice>(null);
	const latest = useRef(data.items);
	latest.current = data.items;
	const wanted = providers.join();

	const setItems = (fn: (items: MyListing[]) => MyListing[]) => setData((d) => ({ ...d, items: fn(d.items) }));
	const replace = (key: string, next: MyListing | null) =>
		setItems((items) => items.flatMap((i) => (keyOf(i) !== key ? [i] : next ? [next] : [])));

	const reload = useCallback(async () => {
		setLoading(true);
		setNotice(null);
		setData(await loadMine(wanted ? (wanted.split(",") as ProviderId[]) : []));
		setLoading(false);
	}, [wanted]);

	useEffect(() => {
		void reload();
	}, [reload]);

	const setBusyKey = (key: string, on: boolean) =>
		setBusy((prev) => {
			const next = new Set(prev);
			if (on) next.add(key);
			else next.delete(key);
			return next;
		});

	async function run(item: MyListing, op: MineOp, price = 0) {
		const key = keyOf(item);
		const before = latest.current;
		setNotice(null);
		setBusyKey(key, true);
		if (op !== "refresh") replace(key, optimistic(item, op, price));
		try {
			const res = await mineCall(item, op, price);
			if (op === "refresh") {
				replace(key, afterRefresh(item, res));
				setNotice(refreshNotice(res));
			}
		} catch {
			// Put the row back as it was and say what failed.
			if (op === "delete") setItems(() => before);
			else replace(key, item);
			setNotice({ kind: "error", text: ta.errors[op] });
		} finally {
			setBusyKey(key, false);
		}
	}

	return { data, loading, busy, notice, setNotice, reload, run };
}
