import type { MineStatus, MyListing, ProviderId } from "@lagano/providers";
import { Check, Plus, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useChatActions } from "@/components/shell/chat-actions";
import { useSidePanel } from "@/components/shell/side-panel";
import { tagAndFocus } from "@/components/shell/tagged-listing";
import { PROVIDER_NAME } from "@/lib/mine-api";
import { useSessions } from "@/lib/sessions";
import { strings } from "@/lib/strings";
import { ta } from "@/lib/strings-account";
import MineRow, { type RowActions } from "./MineRow";
import { btn, PanelBody, PanelHeader } from "./ui";
import { keyOf, type Notice as NoticeState, useMine } from "./use-mine";

const PROVIDERS: ProviderId[] = ["olx", "svex"];
// Same order as ta.tabs: Svi, Aktivni, Skice, Skriveni, Prodani, Istekli.
const TAB_STATUS: (MineStatus | null)[] = [null, "active", "draft", "hidden", "sold", "expired"];
const TOGGLE = "h-9 min-h-9 pointer-coarse:h-11 pointer-coarse:min-h-11 gap-1.5 px-3";

function Tabs({ items, tab, onTab }: { items: MyListing[]; tab: number; onTab: (i: number) => void }) {
	return (
		<div role="tablist" aria-label={ta.tabsAria} className="flex flex-wrap gap-1.5">
			{ta.tabs.map((label, i) => {
				const status = TAB_STATUS[i];
				const count = status ? items.filter((x) => x.status === status).length : items.length;
				return (
					<button
						key={label}
						type="button"
						role="tab"
						aria-selected={i === tab}
						onClick={() => onTab(i)}
						className={btn(i === tab ? "primary" : "chip", "h-9 min-h-9 pointer-coarse:h-11 pointer-coarse:min-h-11 px-3.5 font-medium")}
					>
						{label} <span className="opacity-60">{count}</span>
					</button>
				);
			})}
		</div>
	);
}

function SourceToggles({
	connected,
	on,
	onToggle,
}: {
	connected: Record<ProviderId, boolean>;
	on: Record<ProviderId, boolean>;
	onToggle: (p: ProviderId) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{PROVIDERS.map((p) => {
				const pressed = connected[p] && on[p];
				return (
					<button
						key={p}
						type="button"
						aria-pressed={pressed}
						aria-disabled={!connected[p] || undefined}
						title={connected[p] ? undefined : ta.sourceNotConnected(PROVIDER_NAME[p])}
						onClick={() => connected[p] && onToggle(p)}
						className={btn("chip", `${TOGGLE} ${pressed ? "pl-2.5" : ""}`)}
					>
						{pressed && <Check size={13} strokeWidth={2.8} aria-hidden className="text-accent" />} {PROVIDER_NAME[p]}
					</button>
				);
			})}
		</div>
	);
}

function DeleteConfirm({ item, onCancel, onConfirm }: { item: MyListing; onCancel: () => void; onConfirm: () => void }) {
	const name = PROVIDER_NAME[item.provider];
	return (
		<div role="alertdialog" aria-labelledby="del-t" className="animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out solid mx-5 mb-5 flex flex-none flex-col gap-2.5 rounded-[20px] p-4">
			<strong id="del-t" className="text-[15px]">
				{ta.deleteTitle(item.title)}
			</strong>
			<p className="m-0 text-[14px] leading-[1.45] text-fg-3">{ta.deleteBody(name)}</p>
			<div className="flex flex-wrap justify-end gap-2">
				<button type="button" onClick={onCancel} className={btn("ghost")}>
					{ta.cancel}
				</button>
				<button type="button" onClick={onConfirm} className={btn("danger")}>
					<Trash2 size={15} aria-hidden /> {ta.deleteConfirm(name)}
				</button>
			</div>
		</div>
	);
}

function Banner({ notice }: { notice: NonNullable<NoticeState> }) {
	const error = notice.kind === "error";
	return (
		<p role={error ? "alert" : "status"} className={`m-0 flex items-center gap-2 rounded-[14px] bg-white/6 px-3.5 py-2.5 text-[13px] ${error ? "text-danger" : "text-fg-3"}`}>
			{error && <TriangleAlert size={14} aria-hidden className="flex-none" />} {notice.text}
		</p>
	);
}

function Notice({ title, body, children }: { title?: string; body: string; children?: React.ReactNode }) {
	return (
		<section className="glass flex flex-col items-center gap-2.5 rounded-[24px] p-5 text-center shadow-none">
			{title && <h3 className="m-0 text-[17px] font-semibold tracking-[-0.02em]">{title}</h3>}
			<p className="m-0 text-[14px] leading-[1.45] text-fg-3">{body}</p>
			{children}
		</section>
	);
}

function LoadError({ provider, kind, onRetry, onConnect }: { provider: ProviderId; kind?: "error" | "expired"; onRetry: () => void; onConnect: () => void }) {
	if (!kind) return null;
	const name = PROVIDER_NAME[provider];
	const expired = kind === "expired";
	return (
		<Notice body={expired ? ta.expired(name) : ta.listFailed(name)}>
			<button type="button" onClick={expired ? onConnect : onRetry} className={btn("chip")}>
				<RefreshCw size={15} aria-hidden /> {expired ? ta.connect : ta.retry}
			</button>
		</Notice>
	);
}

function Skeleton() {
	return (
		<ul aria-label={ta.listLoading} className="m-0 flex list-none flex-col gap-2.5 p-0">
			{[0, 1, 2].map((i) => (
				<li key={i} className="h-[112px] animate-pulse rounded-[20px] bg-white/6" />
			))}
		</ul>
	);
}

export default function MyListingsPanel() {
	const { close, requireConnection } = useSidePanel();
	const { ask } = useChatActions();
	const connected = useSessions();
	const [on, setOn] = useState<Record<ProviderId, boolean>>({ olx: true, svex: true });
	const [tab, setTab] = useState(0);
	const [deleting, setDeleting] = useState<MyListing | null>(null);
	const live = PROVIDERS.filter((p) => connected[p]);
	const { data, loading, busy, notice, reload, run } = useMine(live);

	const shown = PROVIDERS.filter((p) => connected[p] && on[p]);
	const inSources = data.items.filter((i) => shown.includes(i.provider));
	const status = TAB_STATUS[tab];
	const rows = status ? inSources.filter((i) => i.status === status) : inSources;

	function startSell(text = "") {
		close();
		ask(ta.sellPrompt + text);
	}
	// The panel stays open in the split view. Elsewhere it would cover the composer.
	function tag(item: MyListing) {
		tagAndFocus({ provider: item.provider, id: item.id, title: item.title, priceText: item.priceText, url: item.url, imageUrl: item.imageUrl, own: true }, close);
	}
	const actions: RowActions = {
		tag,
		run: (item, op, price) => void run(item, op, price),
		askDelete: setDeleting,
		continueDraft: (item) => startSell(item.title),
	};

	let body: React.ReactNode;
	if (!live.length)
		body = (
			<Notice body={ta.olxNeeded}>
				<button type="button" onClick={() => requireConnection("olx", strings.needMine)} className={btn("primary")}>
					{ta.connectAny}
				</button>
			</Notice>
		);
	else if (!shown.length) body = <Notice body={ta.noSource} />;
	else if (loading && !data.items.length) body = <Skeleton />;
	else if (!rows.length && !Object.keys(data.errors).length)
		body = <Notice title={ta.emptyTitle} body={inSources.length ? ta.emptyBody : ta.emptyNone} />;
	else
		body = (
			<ul className="m-0 flex list-none flex-col gap-2.5 p-0">
				{rows.map((item) => (
					<MineRow key={keyOf(item)} item={item} actions={actions} busy={busy.has(keyOf(item))} />
				))}
			</ul>
		);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<PanelHeader title={ta.myListings} onClose={close} />
			<PanelBody>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="m-0 text-[14px] leading-[1.45] text-fg-3">{ta.myListingsSub}</p>
					<button type="button" onClick={() => startSell()} className={btn("accent", "h-9 min-h-9 pointer-coarse:h-11 pointer-coarse:min-h-11 pl-3 pr-4 text-[13px]")}>
						<Plus size={15} aria-hidden /> {ta.newListing}
					</button>
				</div>
				<SourceToggles connected={connected} on={on} onToggle={(p) => setOn((s) => ({ ...s, [p]: !s[p] }))} />
				<Tabs items={inSources} tab={tab} onTab={setTab} />
				{notice && <Banner notice={notice} />}
				{shown.map((p) => (
					<LoadError key={p} provider={p} kind={data.errors[p]} onRetry={reload} onConnect={() => requireConnection(p, strings.needMine)} />
				))}
				{body}
			</PanelBody>
			{deleting && (
				<DeleteConfirm
					item={deleting}
					onCancel={() => setDeleting(null)}
					onConfirm={() => {
						void run(deleting, "delete");
						setDeleting(null);
					}}
				/>
			)}
		</div>
	);
}
