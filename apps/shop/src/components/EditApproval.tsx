import { AlertCircle, Check } from "lucide-react";
import type { LaganoMessage } from "@/lib/agent";
import { ta } from "@/lib/strings-account";
import { btn } from "./account/ui";

type Part = Extract<LaganoMessage["parts"][number], { type: "tool-edit_my_listing" }>;
const NAMES = { olx: "OLX", svex: "SVEX" } as const;

function describe(input: Part["input"]) {
	const action = input?.action;
	if (!action) return "";
	return `${ta.editAction[action](input.price)} · ${input.provider ? NAMES[input.provider] : ""}`;
}

export function EditApprovalPart({ part, onRespond }: { part: Part; onRespond: (id: string, approved: boolean) => void }) {
	if (part.state === "approval-requested") {
		return (
			<div role="group" aria-label={ta.editApproveTitle} className="solid flex max-w-[460px] flex-col gap-2.5 rounded-[20px] p-4">
				<strong className="text-[15px]">{ta.editApproveTitle}</strong>
				<p className="m-0 text-[14px] leading-[1.45] text-fg-3">
					{part.input.title ? `${part.input.title}: ` : ""}
					{describe(part.input)}
				</p>
				<div className="flex flex-wrap justify-end gap-2">
					<button type="button" onClick={() => onRespond(part.approval.id, false)} className={btn("ghost")}>
						{ta.editReject}
					</button>
					<button type="button" onClick={() => onRespond(part.approval.id, true)} className={btn("accent")}>
						<Check size={15} aria-hidden /> {ta.editApprove}
					</button>
				</div>
			</div>
		);
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
