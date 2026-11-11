import { useEffect, useState } from "react";

export type Credits = {
	balance: number;
	// Only set when the key itself has a spending limit.
	keyRemaining: number | null;
	keyLimit: number | null;
	monthUsage: number;
};

const API = "https://openrouter.ai/api/v1";

async function getJson(path: string, key: string) {
	const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${key}` } });
	if (!res.ok) throw new Error(String(res.status));
	return (await res.json()).data;
}

export async function fetchCredits(key: string): Promise<Credits> {
	const [credits, info] = await Promise.all([getJson("/credits", key), getJson("/key", key)]);
	return {
		balance: credits.total_credits - credits.total_usage,
		keyRemaining: info.limit_remaining ?? null,
		keyLimit: info.limit ?? null,
		monthUsage: info.usage_monthly ?? 0,
	};
}

const usd = new Intl.NumberFormat("bs-BA", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
export const formatUsd = (v: number) => usd.format(Math.max(0, v));

// Re-fetches each time a panel that shows it mounts.
export function useCredits(key: string | null) {
	const [credits, setCredits] = useState<Credits | null>(null);
	useEffect(() => {
		if (!key) return setCredits(null);
		let live = true;
		fetchCredits(key)
			.then((c) => live && setCredits(c))
			.catch(() => live && setCredits(null));
		return () => {
			live = false;
		};
	}, [key]);
	return credits;
}
