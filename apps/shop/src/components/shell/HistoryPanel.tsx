import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { HoldButton } from "@/components/account/ClearData";
import { plural } from "@/components/detail/format";
import { PanelBody, PanelHeader, Section } from "@/components/account/ui";
import { useSidePanel } from "@/components/shell/side-panel";
import type { StoredChat } from "@/lib/chat-history";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

type Group = keyof typeof strings.historyGroups;
const GROUPS: Group[] = ["today", "yesterday", "week", "older"];
const DAY = 86_400_000;
const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0);

export function groupOf(ts: number, now: number): Group {
	const days = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
	if (days <= 0) return "today";
	if (days === 1) return "yesterday";
	return days < 7 ? "week" : "older";
}

function relTime(ts: number, now: number) {
	const mins = Math.floor((now - ts) / 60_000);
	// Browsers have no "bs" data for Intl.RelativeTimeFormat (it gives "-2 min"), so the words are ours.
	if (mins < 1) return strings.historyNow;
	if (mins < 60) return `prije ${mins} min`;
	const group = groupOf(ts, now);
	if (group === "today") {
		const h = Math.floor(mins / 60);
		return `prije ${h} ${plural(h, { one: "sat", few: "sata", other: "sati" })}`;
	}
	if (group === "yesterday") return "jučer";
	if (group === "older") return new Date(ts).toLocaleDateString("sr-Latn", { day: "numeric", month: "long" });
	const days = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
	return `prije ${days} ${plural(days, { one: "dan", few: "dana", other: "dana" })}`;
}

type RowProps = { chat: StoredChat; current: boolean; now: number; onPick: () => void; onDelete: () => void };

function Row({ chat, current, now, onPick, onDelete }: RowProps) {
	const [sure, setSure] = useState(false);
	const focus = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus";
	if (sure) {
		return (
			<li className="flex min-h-14 items-center gap-2 px-4 py-2">
				<span className="min-w-0 grow truncate text-[15px] text-fg-3">{chat.title || strings.historyUntitled}</span>
				<button type="button" autoFocus onClick={onDelete} className={cn("min-h-10 cursor-pointer rounded-full px-3 text-[14px] font-medium text-danger", focus)}>
					{strings.historyDeleteSure}
				</button>
				<button type="button" onClick={() => setSure(false)} className={cn("min-h-10 cursor-pointer rounded-full px-3 text-[14px] text-fg-3", focus)}>
					{strings.historyKeep}
				</button>
			</li>
		);
	}
	return (
		<li className={cn("flex items-center", current && "bg-white/10")}>
			<button type="button" onClick={onPick} aria-current={current || undefined} className={cn("min-h-14 min-w-0 grow cursor-pointer px-4 py-2.5 text-left", focus)}>
				<span className="block truncate text-[15px] text-fg">{chat.title || strings.historyUntitled}</span>
				<span className="block text-[13px] text-fg-4">{relTime(chat.updatedAt, now)}</span>
			</button>
			<button type="button" onClick={() => setSure(true)} aria-label={`${strings.historyDelete}: ${chat.title}`} title={strings.historyDelete} className={cn("mr-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-fg-4", focus)}>
				<Trash2 size={15} aria-hidden />
			</button>
		</li>
	);
}

type Props = { chats: StoredChat[]; currentId: string; onPick: (id: string) => void; onDelete: (id: string) => void; onNew: () => void; onClear: () => void };

export function HistoryPanel({ chats, currentId, onPick, onDelete, onNew, onClear }: Props) {
	const { closeHistory } = useSidePanel();
	// The relative times are fixed while the panel is open.
	const [now, setNow] = useState(Date.now);
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 30_000);
		return () => clearInterval(id);
	}, []);
	return (
		<>
			<PanelHeader title={strings.historyTitle} onClose={closeHistory} />
			<PanelBody>
				<button type="button" onClick={onNew} className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-[16px] border border-white/8 bg-white/6 px-4 text-[15px] text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus">
					<Pencil size={15} aria-hidden />
					{strings.newChat}
				</button>
				{GROUPS.map((g) => {
					const rows = chats.filter((c) => groupOf(c.updatedAt, now) === g);
					return (
						rows.length > 0 && (
							<Section key={g} title={strings.historyGroups[g]}>
								<ul className="m-0 list-none overflow-hidden rounded-[16px] border border-white/8 bg-white/6 p-0 [&>li+li]:border-t [&>li+li]:border-white/8">
									{rows.map((c) => (
										<Row key={c.id} chat={c} current={c.id === currentId} now={now} onPick={() => onPick(c.id)} onDelete={() => onDelete(c.id)} />
									))}
								</ul>
							</Section>
						)
					);
				})}
				<div className="overflow-hidden rounded-[16px] border border-white/8 bg-white/6">
					<HoldButton row onDone={onClear} label={strings.historyClear} armedLabel={strings.historyClearHold} />
				</div>
			</PanelBody>
		</>
	);
}
