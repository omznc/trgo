import { Check } from "lucide-react";
import { sell } from "@/lib/strings-sell";

const TONES = {
	dark: {
		done: "bg-white/10 text-fg",
		current: "bg-accent text-bg",
		next: "border border-white/12 text-fg-4",
	},
	light: {
		done: "bg-[rgba(14,16,32,.08)] text-bg",
		current: "bg-accent text-bg",
		next: "border border-[rgba(14,16,32,.14)] text-[rgba(14,16,32,.55)]",
	},
} as const;

// current is the index of the active step (0 to 3).
export function Steps({ current, tone = "dark" }: { current: number; tone?: keyof typeof TONES }) {
	return (
		<ol aria-label={sell.steps.aria} className="m-0 flex list-none flex-wrap gap-1.5 p-0 text-xs font-semibold">
			{sell.steps.list.map((name, i) => {
				const state = i < current ? "done" : i === current ? "current" : "next";
				return (
					<li
						key={name}
						aria-current={state === "current" ? "step" : undefined}
						className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${TONES[tone][state]}`}
					>
						{state === "done" && <Check size={11} strokeWidth={3} aria-hidden />}
						{name}
					</li>
				);
			})}
		</ol>
	);
}
