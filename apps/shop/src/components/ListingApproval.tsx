import { AlertCircle } from "lucide-react";
import type { LaganoMessage } from "@/lib/agent";
import type { ListingArgs, PublishOutput } from "@/lib/publish";
import { strings } from "@/lib/strings";
import { sell } from "@/lib/strings-sell";
import { useChatActions } from "./shell/chat-actions";
import { ApprovalCard } from "./sell/ApprovalCard";
import { PublishProgress } from "./sell/PublishProgress";
import { PublishResult } from "./sell/SuccessCard";

type Part = Extract<LaganoMessage["parts"][number], { type: "tool-create_listing" }>;

function Output({ input, out, toolCallId }: { input: ListingArgs; out: PublishOutput; toolCallId: string }) {
	const { saveResults } = useChatActions();
	if (out.done) return <PublishResult input={input} results={out.results} onSave={(results) => saveResults(toolCallId, results)} />;
	return <PublishProgress providers={input.providers} progress={out.progress} results={out.results} />;
}

export function ListingApprovalPart({ part, onRespond, expired }: { part: Part; onRespond: (id: string, approved: boolean) => void; expired: boolean }) {
	if (part.state === "approval-requested") {
		if (expired) return <p className="px-2 text-sm text-fg-3">{sell.expired}</p>;
		return <ApprovalCard input={part.input as ListingArgs} onRespond={(ok) => onRespond(part.approval.id, ok)} />;
	}
	if (part.state === "output-denied") return <p className="px-2 text-sm text-fg-3">{sell.cancelled}</p>;
	if (part.state === "output-error") {
		return (
			<p role="alert" className="flex items-center gap-2 px-2 text-sm text-danger">
				<AlertCircle className="size-4" aria-hidden />
				{strings.errorGeneric}
			</p>
		);
	}
	if (part.state === "output-available") return <Output input={part.input as ListingArgs} out={part.output as PublishOutput} toolCallId={part.toolCallId} />;
	if (part.state === "approval-responded") {
		const input = part.input as ListingArgs;
		const [name] = input.providers;
		const first = name ? { [name]: strings.progressPrepare } : {};
		return <PublishProgress providers={input.providers} progress={first} results={[]} />;
	}
	return null;
}
