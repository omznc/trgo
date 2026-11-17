type PartLike = { type: string; text?: string };

export type PartItem = { kind: "part"; index: number } | { kind: "steps"; start: number; indices: number[] };

export const SEARCH_TYPES = ["tool-search_listings", "tool-list_my_listings"];
export const isSearchType = (type: string) => SEARCH_TYPES.includes(type);
export const isStepType = (type: string) => isSearchType(type) || type === "tool-get_listings";

// The SDK adds step-start parts and models stream reasoning parts. They show nothing, so they do not end a run.
const isTransparent = (type: string) => type === "step-start" || type === "reasoning";

// Collects the parts after a step. Text counts only when another step follows it.
function collectRun(parts: PartLike[], first: number) {
	const indices = [first];
	let pending: number[] = [];
	let next = first + 1;
	for (; next < parts.length; next++) {
		const part = parts[next] as PartLike;
		if (part.type === "text") {
			if (part.text) pending.push(next);
		} else if (isStepType(part.type)) {
			indices.push(...pending, next);
			pending = [];
		} else if (!isTransparent(part.type)) break;
	}
	return { indices, trailing: pending, next };
}

// A run of steps becomes one item. The text before and after the run stays a normal part.
export function groupParts(parts: PartLike[]): PartItem[] {
	const items: PartItem[] = [];
	let i = 0;
	while (i < parts.length) {
		if (!isStepType((parts[i] as PartLike).type)) {
			items.push({ kind: "part", index: i });
			i++;
			continue;
		}
		const run = collectRun(parts, i);
		items.push({ kind: "steps", start: i, indices: run.indices });
		for (const index of run.trailing) items.push({ kind: "part", index });
		i = run.next;
	}
	return items;
}

type StepPart = { type: string; state?: string; input?: unknown; output?: unknown };

// Before the output arrives, the count is the number of listings that the model asked for.
export function readCount(part: StepPart) {
	if (part.state === "output-error") return 0;
	if (part.state === "output-available") return ((part.output as { results?: { detail?: unknown }[] } | undefined)?.results ?? []).filter((r) => r.detail).length;
	return (part.input as { listings?: unknown[] } | undefined)?.listings?.length ?? 0;
}

export function stepCounts(parts: StepPart[]) {
	const urls = new Set<string>();
	let searches = 0;
	let reads = 0;
	for (const part of parts) {
		if (part.type === "tool-get_listings") reads += readCount(part);
		if (!isSearchType(part.type)) continue;
		searches++;
		const found = part.state === "output-available" ? ((part.output as { listings?: { url: string }[] }).listings ?? []) : [];
		for (const l of found) urls.add(l.url);
	}
	return { searches, reads, listings: urls.size };
}

// The last search with results opens by default. A later search that loads does not close it,
// so the cards do not collapse and open again. Without results, the loading search opens,
// and then the last finished search, so its empty or failed state shows.
export function defaultOpenSearch(parts: StepPart[]) {
	const hasResults = (p: StepPart) => p.state === "output-available" && ((p.output as { listings?: unknown[] } | undefined)?.listings?.length ?? 0) > 0;
	const loading = (p: StepPart) => p.state === "input-streaming" || p.state === "input-available";
	const done = (p: StepPart) => p.state === "output-available";
	for (const match of [hasResults, loading, done]) {
		const at = parts.findLastIndex((p) => isSearchType(p.type) && match(p));
		if (at >= 0) return at;
	}
	return -1;
}
