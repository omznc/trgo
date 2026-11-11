import { AlertTriangle, Check, RefreshCw } from "lucide-react";
import "./sell.css";

export type RowState = "pending" | "working" | "done" | "error";

const FILL: Record<RowState, string> = {
	pending: "bg-transparent",
	working: "bg-accent",
	done: "bg-ok",
	error: "bg-danger",
};

function RowIcon({ state }: { state: RowState }) {
	if (state === "done") return <Check size={14} strokeWidth={3} className="text-ok" aria-hidden />;
	if (state === "error") return <AlertTriangle size={14} strokeWidth={2.2} className="text-danger" aria-hidden />;
	return (
		<span className={`${state === "working" ? "sell-spin" : ""} inline-grid text-fg-3`}>
			<RefreshCw size={14} strokeWidth={2.2} aria-hidden />
		</span>
	);
}

// One provider line: icon, name, status text and a progress bar.
export function ProviderRow(props: { name: string; state: RowState; status: string; percent: number }) {
	const width = props.state === "done" || props.state === "error" ? 100 : props.percent;
	return (
		<li className="flex flex-col gap-1.5">
			<div className="flex justify-between gap-3 text-sm">
				<span className="inline-flex items-center gap-2 font-semibold">
					<RowIcon state={props.state} />
					{props.name}
				</span>
				<span className="text-fg-3">{props.status}</span>
			</div>
			<div className="h-1.5 overflow-hidden rounded-md bg-white/10" aria-hidden>
				<div className={`sell-bar h-full ${FILL[props.state]}`} style={{ transform: `scaleX(${width / 100})` }} />
			</div>
		</li>
	);
}
