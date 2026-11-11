import type { ProviderId } from "@lagano/providers";
import type { ProviderResult } from "@/lib/publish";
import { strings } from "@/lib/strings";
import { sell } from "@/lib/strings-sell";
import { ProviderRow, type RowState } from "./ProviderRow";

export const NAMES: Record<ProviderId, string> = { olx: "OLX", svex: "SVEX" };
export type Progress = Partial<Record<ProviderId, string>>;

type RowInfo = { state: RowState; status: string; percent: number };

// The generator yields a text per step. Photos give a counter, the other steps get a fixed share.
function workingInfo(text: string): RowInfo {
	const photos = /(\d+)\/(\d+)/.exec(text);
	if (photos) {
		const [sent, total] = [Number(photos[1]), Number(photos[2])];
		return { state: "working", status: sell.publish.sending(sent, total), percent: (sent / total) * 100 };
	}
	if (text === strings.progressPrepare) return { state: "working", status: text, percent: 5 };
	return { state: "working", status: text, percent: 97 };
}

export function rowInfo(provider: ProviderId, progress: Progress, results: ProviderResult[]): RowInfo {
	const result = results.find((r) => r.provider === provider);
	if (result?.ok) return { state: "done", status: sell.publish.done, percent: 100 };
	if (result) return { state: "error", status: sell.partial.failed, percent: 100 };
	const text = progress[provider];
	return text ? workingInfo(text) : { state: "pending", status: sell.publish.pending, percent: 0 };
}

export function ProviderList({ providers, progress, results }: { providers: ProviderId[]; progress: Progress; results: ProviderResult[] }) {
	return (
		<ul className="m-0 mt-3.5 flex list-none flex-col gap-3.5 p-0">
			{providers.map((p) => (
				<ProviderRow key={p} name={NAMES[p]} {...rowInfo(p, progress, results)} />
			))}
		</ul>
	);
}

export function PublishProgress(props: { providers: ProviderId[]; progress: Progress; results: ProviderResult[] }) {
	return (
		<section className="sell-glass rounded-[24px] p-5" role="status" aria-live="polite" aria-busy="true">
			<h2 className="m-0 text-[15px] font-semibold tracking-[-0.02em]">{sell.publish.title}</h2>
			<ProviderList {...props} />
		</section>
	);
}
