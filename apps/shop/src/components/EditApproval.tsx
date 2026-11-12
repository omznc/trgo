import { AlertCircle, Check } from "lucide-react";
import { useMine } from "@/components/account/use-mine";
import type { z } from "zod";
import type { editSchema, LaganoMessage } from "@/lib/agent";
import { type EditProblem, editProblem } from "@/lib/mine-rules";
import { type MineStatus, PROVIDERS } from "@lagano/providers";
import { useSessions } from "@/lib/sessions";
import { strings } from "@/lib/strings";
import { ta } from "@/lib/strings-account";
import { btn } from "./account/ui";

type Part = Extract<LaganoMessage["parts"][number], { type: "tool-edit_my_listing" }>;
type Complete = z.infer<ReturnType<typeof editSchema>>;

function describe(input: Complete) {
	return `${ta.editAction[input.action](input.price, PROVIDERS[input.provider].currencyLabel)} · ${PROVIDERS[input.provider].name}`;
}

function warningFor(problem: EditProblem | null, status?: MineStatus) {
	if (problem === "not_connected") return strings.notConnected;
	if (problem === "list_cut") return ta.editListCut;
	if (problem === "not_found") return ta.editNotFound;
	if (problem === "status" && status) return ta.editStatusBlocked(ta.status[status]);
	if (problem === "too_early") return ta.editTooEarly;
	return null;
}

// The model wrote the id. The card shows the listing that the id really names in the user's account.
function useCheckedListing(input: Complete) {
	const { data, loading } = useMine([input.provider]);
	const item = data.items.find((l) => l.provider === input.provider && l.id === input.id);
	const loadFailed = !!data.errors[input.provider];
	const connected = useSessions()[input.provider];
	const cut = data.truncated.includes(input.provider);
	const problem = loadFailed || (loading && connected) ? null : editProblem(item, input.action, { connected, cut });
	const warning = loadFailed ? ta.editLoadFailed : warningFor(problem, item?.status);
	return { item, loading, warning, canApprove: !loading && !warning && !!item };
}

function ApprovalBody({ input, onRespond }: { input: Complete; onRespond: (approved: boolean) => void }) {
	const { item, loading, warning, canApprove } = useCheckedListing(input);
	return (
		<div role="group" aria-label={ta.editApproveTitle} className="solid flex max-w-[460px] flex-col gap-2.5 rounded-[20px] p-4">
			<strong className="text-[15px]">{ta.editApproveTitle}</strong>
			<p className="m-0 text-[14px] leading-[1.45] text-fg-3">{describe(input)}</p>
			{loading && <p className="m-0 text-[13px] text-fg-3">{ta.editChecking}</p>}
			{item && (
				<div className="flex flex-col gap-0.5 text-[14px]">
					<span className="break-words font-semibold">{item.title}</span>
					<span className="text-fg-3">
						{item.priceText} · {ta.editStatusLabel}: {ta.status[item.status]}
					</span>
				</div>
			)}
			{warning && (
				<p role="alert" className="m-0 flex items-start gap-2 text-[13px] text-danger">
					<AlertCircle className="mt-px size-4 shrink-0" aria-hidden /> {warning}
				</p>
			)}
			<div className="flex flex-wrap justify-end gap-2">
				<button type="button" onClick={() => onRespond(false)} className={btn("ghost")}>
					{ta.editReject}
				</button>
				<button type="button" disabled={!canApprove} onClick={() => onRespond(true)} className={`${btn("accent")} disabled:opacity-50`}>
					<Check size={15} aria-hidden /> {ta.editApprove}
				</button>
			</div>
		</div>
	);
}

export function EditApprovalPart({ part, onRespond, expired }: { part: Part; onRespond: (id: string, approved: boolean) => void; expired: boolean }) {
	if (part.state === "approval-requested") {
		const { provider, id, action, price } = part.input;
		// An incomplete input cannot be checked, so no card is shown.
		if (!provider || !id || !action) return null;
		if (expired) return <p className="px-2 text-sm text-fg-3">{ta.editExpired}</p>;
		return <ApprovalBody input={{ provider, id, action, price }} onRespond={(approved) => onRespond(part.approval.id, approved)} />;
	}
	if (part.state === "output-denied") return <p className="px-2 text-sm text-fg-3">{ta.editCancelled}</p>;
	if (part.state === "output-error") {
		return (
			<p role="alert" className="flex items-center gap-2 px-2 text-sm text-danger">
				<AlertCircle className="size-4" aria-hidden /> {ta.editFailed}
			</p>
		);
	}
	if (part.state === "output-available") return <p className="px-2 text-sm text-fg-3">{ta.editDone}</p>;
	return null;
}
