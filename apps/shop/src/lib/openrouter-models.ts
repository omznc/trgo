import { useEffect, useState } from "react";

export type CatalogModel = { id: string; name: string; tools: boolean; input?: number; output?: number };

const URL_MODELS = "https://openrouter.ai/api/v1/models";
const names = new Map<string, string>();
let cached: Promise<CatalogModel[]> | null = null;

export const knownModelName = (id: string) => names.get(id);

const perMillion = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n * 1e6 : undefined;
};

type Raw = { id: string; name?: string; supported_parameters?: string[]; pricing?: { prompt?: string; completion?: string } };

function parse(raw: Raw[]): CatalogModel[] {
	const list = raw.map((m) => ({
		id: m.id,
		name: m.name ?? m.id,
		tools: !!m.supported_parameters?.includes("tools"),
		input: perMillion(m.pricing?.prompt),
		output: perMillion(m.pricing?.completion),
	}));
	for (const m of list) names.set(m.id, m.name.replace(/^[^:]+:\s*/, ""));
	return list.sort((a, b) => Number(b.tools) - Number(a.tools) || a.name.localeCompare(b.name));
}

// The list is public, so no key is sent. It is cached for the session.
export function loadModels(): Promise<CatalogModel[]> {
	cached ??= fetch(URL_MODELS)
		.then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
		.then((j: { data: Raw[] }) => parse(j.data))
		.catch((e) => {
			cached = null;
			throw e;
		});
	return cached;
}

export function useModelCatalog(enabled: boolean) {
	const [models, setModels] = useState<CatalogModel[] | null>(null);
	const [failed, setFailed] = useState(false);
	useEffect(() => {
		if (!enabled) return;
		setFailed(false);
		loadModels().then(setModels, () => setFailed(true));
	}, [enabled]);
	return { models, failed };
}
