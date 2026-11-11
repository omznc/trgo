import type { Listing } from "@lagano/providers";
import { Check, EyeOff, ExternalLink, ImageOff, MoreHorizontal, Pencil, RefreshCw, TriangleAlert, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSidePanel } from "@/components/shell/side-panel";
import { olxAccount } from "@/lib/publish";
import { expireSession, getSession, isAuthError, useSessions } from "@/lib/sessions";
import { strings } from "@/lib/strings";
import { ta } from "@/lib/strings-account";
import { btn, PanelBody, PanelHeader } from "./ui";

type Load = { state: "loading" } | { state: "ready"; items: Listing[] } | { state: "error" } | { state: "expired" };

function useMine(connected: boolean) {
	const [load, setLoad] = useState<Load>({ state: "loading" });
	const reload = useCallback(async () => {
		const session = getSession("olx");
		if (!session) return;
		setLoad({ state: "loading" });
		try {
			setLoad({ state: "ready", items: await olxAccount.listMine(session) });
		} catch (error) {
			if (isAuthError(error)) {
				expireSession("olx");
				setLoad({ state: "expired" });
			} else setLoad({ state: "error" });
		}
	}, []);
	useEffect(() => {
		if (connected) void reload();
	}, [connected, reload]);
	return { load, reload, remove: (id: string) => setLoad((l) => (l.state === "ready" ? { state: "ready", items: l.items.filter((i) => i.id !== id) } : l)) };
}

const ITEM = "flex h-11 cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 text-[14px] text-fg focus:bg-white/8 focus:text-fg aria-disabled:opacity-40";

const MENU_ICONS = [RefreshCw, EyeOff, Check, Pencil];

function RowMenu({ onDelete }: { onDelete: () => void }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button type="button" aria-label={ta.moreAria} className={btn("chip", "w-11 p-0")}>
					<MoreHorizontal size={16} aria-hidden />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="solid w-[230px] rounded-[16px] p-1.5">
				{ta.menu.map((label, i) => {
					const Icon = MENU_ICONS[i]!;
					return (
						<DropdownMenuItem key={label} aria-disabled title={ta.notYet} onSelect={(e) => e.preventDefault()} className={ITEM}>
							<Icon size={15} aria-hidden /> {label}
						</DropdownMenuItem>
					);
				})}
				<DropdownMenuItem onSelect={onDelete} className={`${ITEM} text-danger focus:text-danger`}>
					<Trash2 size={15} aria-hidden className="text-danger" /> {ta.menuDelete}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ListingRow({ item, onDelete }: { item: Listing; onDelete: () => void }) {
	return (
		<li className="glass relative flex items-center gap-3 rounded-[20px] p-2.5 shadow-none">
			{item.imageUrl ? (
				<img src={item.imageUrl} alt="" className="size-16 flex-none rounded-[14px] object-cover" />
			) : (
				<span className="grid size-16 flex-none place-items-center rounded-[14px] bg-card-img text-fg-3">
					<ImageOff size={20} aria-hidden />
				</span>
			)}
			<div className="flex min-w-0 grow flex-col gap-1">
				<span className="line-clamp-2 text-[15px] font-semibold leading-[1.3]">{item.title}</span>
				<span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/7 px-2.5 py-1 text-[12px] font-semibold">
					<span aria-hidden className="size-2 rounded-full bg-ok" /> OLX · {ta.statusActive}
				</span>
				<span className="text-[13px] text-fg-3">
					<b className="text-[15px] font-bold tracking-[-0.02em] text-fg">{item.priceText}</b>
					{item.city ? ` · ${item.city}` : ""}
				</span>
			</div>
			<div className="flex flex-none gap-1">
				<a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${ta.open}: ${item.title}`} title={ta.open} className={btn("chip", "w-11 p-0")}>
					<ExternalLink size={15} aria-hidden />
				</a>
				<RowMenu onDelete={onDelete} />
			</div>
		</li>
	);
}

function Tabs({ total }: { total: number }) {
	return (
		<div role="tablist" aria-label={ta.tabsAria} className="flex flex-wrap gap-1.5">
			{ta.tabs.map((label, i) => {
				const live = i < 2;
				const selected = i === 0;
				return (
					<button
						key={label}
						type="button"
						role="tab"
						aria-selected={selected}
						aria-disabled={!live}
						title={live ? undefined : ta.tabNoStatus}
						onClick={(e) => !live && e.preventDefault()}
						className={btn(selected ? "primary" : "chip", "h-9 min-h-9 pointer-coarse:h-11 pointer-coarse:min-h-11 px-3.5 font-medium aria-disabled:cursor-not-allowed")}
					>
						{label} <span className="opacity-60">{live ? total : 0}</span>
					</button>
				);
			})}
		</div>
	);
}

function DeleteConfirm({ item, onCancel, onDone }: { item: Listing; onCancel: () => void; onDone: () => void }) {
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);
	async function confirm() {
		const session = getSession("olx");
		if (!session) return;
		setBusy(true);
		setFailed(false);
		try {
			await olxAccount.deleteListing(session, Number(item.id));
			onDone();
		} catch (error) {
			if (isAuthError(error)) expireSession("olx");
			setFailed(true);
			setBusy(false);
		}
	}
	return (
		<div role="alertdialog" aria-labelledby="del-t" className="animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out solid mx-5 mb-5 flex flex-none flex-col gap-2.5 rounded-[20px] p-4">
			<strong id="del-t" className="text-[15px]">
				{ta.deleteTitle(item.title)}
			</strong>
			<p className="m-0 text-[14px] leading-[1.45] text-fg-3">{ta.deleteBody}</p>
			{failed && (
				<p role="alert" className="m-0 flex items-center gap-2 text-[13px] text-danger">
					<TriangleAlert size={14} aria-hidden /> {ta.deleteFailed}
				</p>
			)}
			<div className="flex flex-wrap justify-end gap-2">
				<button type="button" onClick={onCancel} className={btn("ghost")}>
					{ta.cancel}
				</button>
				<button type="button" disabled={busy} onClick={confirm} className={btn("danger")}>
					<Trash2 size={15} aria-hidden /> {ta.deleteConfirm}
				</button>
			</div>
		</div>
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

function Skeleton() {
	return (
		<ul aria-label={ta.listLoading} className="m-0 flex list-none flex-col gap-2.5 p-0">
			{[0, 1, 2].map((i) => (
				<li key={i} className="h-[84px] rounded-[20px] bg-white/6 animate-pulse" />
			))}
		</ul>
	);
}

export default function MyListingsPanel() {
	const { close, requireConnection } = useSidePanel();
	const { olx } = useSessions();
	const { load, reload, remove } = useMine(olx);
	const [deleting, setDeleting] = useState<Listing | null>(null);
	const connectOlx = () => requireConnection("olx", strings.needMine);
	const items = load.state === "ready" ? load.items : [];

	let body: React.ReactNode;
	if (!olx || load.state === "expired") {
		body = (
			<Notice body={load.state === "expired" ? ta.expired : ta.olxNeeded}>
				<button type="button" onClick={connectOlx} className={btn("primary")}>
					{ta.connectOlx}
				</button>
			</Notice>
		);
	} else if (load.state === "loading") body = <Skeleton />;
	else if (load.state === "error")
		body = (
			<Notice body={ta.listFailed}>
				<button type="button" onClick={reload} className={btn("chip")}>
					<RefreshCw size={15} aria-hidden /> {ta.retry}
				</button>
			</Notice>
		);
	else if (!items.length) body = <Notice title={ta.emptyTitle} body={ta.emptyBody} />;
	else
		body = (
			<ul className="m-0 flex list-none flex-col gap-2.5 p-0">
				{items.map((item) => (
					<ListingRow key={item.id} item={item} onDelete={() => setDeleting(item)} />
				))}
			</ul>
		);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<PanelHeader title={ta.myListings} onClose={close} />
			<PanelBody>
				<p className="m-0 -mt-1 text-[14px] leading-[1.45] text-fg-3">{ta.myListingsSub}</p>
				<div className="flex flex-wrap items-center gap-1.5">
					<button type="button" aria-pressed="true" className={btn("chip", "h-9 min-h-9 pointer-coarse:h-11 pointer-coarse:min-h-11 gap-1.5 px-3 pl-2.5")}>
						<Check size={13} strokeWidth={2.8} aria-hidden className="text-accent" /> OLX
					</button>
					<button type="button" aria-pressed="false" aria-disabled title={ta.svexUnsupported} onClick={(e) => e.preventDefault()} className={btn("chip", "h-9 min-h-9 pointer-coarse:h-11 pointer-coarse:min-h-11 px-3")}>
						SVEX
					</button>
				</div>
				<p className="m-0 -mt-3.5 text-[12px] text-fg-4">{ta.svexUnsupported}</p>
				<Tabs total={items.length} />
				{body}
			</PanelBody>
			{deleting && (
				<DeleteConfirm
					item={deleting}
					onCancel={() => setDeleting(null)}
					onDone={() => {
						remove(deleting.id);
						setDeleting(null);
					}}
				/>
			)}
		</div>
	);
}
