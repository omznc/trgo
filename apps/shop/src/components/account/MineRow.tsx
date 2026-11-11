import type { MineStatus, MyListing } from "@lagano/providers";
import { Check, Eye, EyeOff, ExternalLink, ImageOff, MessageCircle, MoreHorizontal, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PROVIDER_NAME, type MineOp } from "@/lib/mine-api";
import { ta } from "@/lib/strings-account";
import { btn, FIELD } from "./ui";

export type RowActions = {
	tag: (item: MyListing) => void;
	run: (item: MyListing, op: MineOp, price?: number) => void;
	askDelete: (item: MyListing) => void;
	continueDraft: (item: MyListing) => void;
};

const ITEM =
	"flex h-11 cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 text-[14px] text-fg focus:bg-white/8 focus:text-fg aria-disabled:opacity-40";
const SMALL = "h-9 min-h-9 pointer-coarse:h-11 pointer-coarse:min-h-11 text-[13px] pl-3 pr-4";
const ICON = "h-9 min-h-9 w-9 pointer-coarse:h-11 pointer-coarse:min-h-11 pointer-coarse:w-11 p-0";

const day = (iso: string) => {
	const d = new Date(iso);
	return `${d.getDate()}. ${d.getMonth() + 1}.`;
};

const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5);

function stateMeta(item: MyListing): string | undefined {
	switch (item.status) {
		case "active":
			if (item.expiresAt) return ta.expiresIn(daysLeft(item.expiresAt));
			return item.postedAt ? ta.postedOn(day(item.postedAt)) : undefined;
		case "expired":
			return item.expiresAt ? `${ta.expiredOn} ${day(item.expiresAt)}` : ta.expiredOn;
		case "sold":
			return item.soldAt ? ta.soldOn(day(item.soldAt)) : undefined;
		case "draft":
			return ta.notPublished;
		default:
			return undefined;
	}
}

const statusMeta = (item: MyListing) =>
	[item.views === undefined ? undefined : ta.views(item.views), stateMeta(item)].filter(Boolean) as string[];

const can = {
	refresh: ["active", "expired"],
	hide: ["active"],
	unhide: ["hidden"],
	finish: ["active", "hidden"],
	price: ["active", "hidden"],
} satisfies Record<string, MineStatus[]>;

const allowed = (item: MyListing, op: keyof typeof can) => (can[op] as MineStatus[]).includes(item.status);

function PriceEdit({ item, onSave, onCancel }: { item: MyListing; onSave: (price: number) => void; onCancel: () => void }) {
	const [value, setValue] = useState(item.price ? String(item.price) : "");
	const [invalid, setInvalid] = useState(false);
	function save() {
		const price = Number(value.replace(",", "."));
		if (!Number.isFinite(price) || price <= 0) return setInvalid(true);
		onSave(price);
	}
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<label htmlFor={`np-${item.id}`} className="sr-only">
				{ta.priceLabel}
			</label>
			<input
				id={`np-${item.id}`}
				// biome-ignore lint/a11y/noAutofocus: the field opens from a click on the menu
				autoFocus
				inputMode="decimal"
				value={value}
				aria-invalid={invalid}
				onChange={(e) => {
					setValue(e.target.value);
					setInvalid(false);
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter") save();
					if (e.key === "Escape") {
						// Only the editor closes, not the panel.
						e.stopPropagation();
						onCancel();
					}
				}}
				className={`${FIELD} h-9 w-24 font-semibold`}
			/>
			<span className="text-[13px] text-fg-3">{ta.priceUnit}</span>
			<button type="button" onClick={save} className={btn("accent", "h-9 min-h-9 px-4 text-[13px]")}>
				{ta.priceSave}
			</button>
			<button type="button" aria-label={ta.priceCancel} onClick={onCancel} className={btn("ghost", ICON)}>
				<X size={16} aria-hidden />
			</button>
			{invalid && (
				<span role="alert" className="basis-full text-[12px] text-danger">
					{ta.priceInvalid}
				</span>
			)}
		</div>
	);
}

function RowMenu({ item, actions, onPrice }: { item: MyListing; actions: RowActions; onPrice: () => void }) {
	const tooEarly = item.provider === "olx" && item.status === "active" && item.canRefresh === false;
	const pricing = useRef(false);
	// The menu gives focus back to its button on close. The price field needs the focus instead.
	const focusField = (e: Event) => {
		if (!pricing.current) return;
		e.preventDefault();
		pricing.current = false;
		document.getElementById(`np-${item.id}`)?.focus();
	};
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button type="button" aria-label={ta.moreAria} className={btn("chip", ICON)}>
					<MoreHorizontal size={16} aria-hidden />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" onCloseAutoFocus={focusField} className="solid w-[230px] rounded-[16px] p-1.5">
				{allowed(item, "refresh") && (
					<DropdownMenuItem
						aria-disabled={tooEarly || undefined}
						title={tooEarly ? ta.refreshTooEarly : undefined}
						onSelect={(e) => (tooEarly ? e.preventDefault() : actions.run(item, "refresh"))}
						className={ITEM}
					>
						<RefreshCw size={15} aria-hidden /> {ta.actRefresh}
					</DropdownMenuItem>
				)}
				{allowed(item, "hide") && (
					<DropdownMenuItem onSelect={() => actions.run(item, "hide")} className={ITEM}>
						<EyeOff size={15} aria-hidden /> {ta.actHide}
					</DropdownMenuItem>
				)}
				{allowed(item, "unhide") && (
					<DropdownMenuItem onSelect={() => actions.run(item, "unhide")} className={ITEM}>
						<Eye size={15} aria-hidden /> {ta.actUnhide}
					</DropdownMenuItem>
				)}
				{allowed(item, "finish") && (
					<DropdownMenuItem onSelect={() => actions.run(item, "finish")} className={ITEM}>
						<Check size={15} aria-hidden /> {ta.actSold}
					</DropdownMenuItem>
				)}
				{allowed(item, "price") && (
					<DropdownMenuItem
						onSelect={() => {
							pricing.current = true;
							onPrice();
						}}
						className={ITEM}
					>
						<Pencil size={15} aria-hidden /> {ta.actPrice}
					</DropdownMenuItem>
				)}
				<DropdownMenuItem onSelect={() => actions.askDelete(item)} className={`${ITEM} text-danger focus:text-danger`}>
					<Trash2 size={15} aria-hidden className="text-danger" /> {ta.menuDelete}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function PrimaryAction({ item, actions, busy }: { item: MyListing; actions: RowActions; busy: boolean }) {
	const name = PROVIDER_NAME[item.provider];
	switch (item.status) {
		case "active":
			return (
				<button type="button" disabled={busy} onClick={() => actions.run(item, "finish")} className={btn("chip", SMALL)}>
					<Check size={15} aria-hidden /> {ta.actSoldShort}
				</button>
			);
		case "hidden":
			return (
				<button type="button" disabled={busy} onClick={() => actions.run(item, "unhide")} className={btn("chip", SMALL)}>
					<Eye size={15} aria-hidden /> {ta.actUnhide} {name}
				</button>
			);
		case "expired":
			return (
				<button type="button" disabled={busy} onClick={() => actions.run(item, "refresh")} className={btn("accent", SMALL)}>
					<RefreshCw size={15} aria-hidden /> {ta.actRefreshShort}
				</button>
			);
		case "draft":
			return (
				<button type="button" onClick={() => actions.continueDraft(item)} className={btn("chip", SMALL)}>
					<Pencil size={15} aria-hidden /> {ta.actContinue}
				</button>
			);
		case "sold":
			return (
				<button
					type="button"
					aria-label={ta.deleteAria}
					onClick={() => actions.askDelete(item)}
					className={btn("danger", ICON)}
				>
					<Trash2 size={15} aria-hidden />
				</button>
			);
	}
}

export default function MineRow({ item, actions, busy }: { item: MyListing; actions: RowActions; busy: boolean }) {
	const [editing, setEditing] = useState(false);
	const name = PROVIDER_NAME[item.provider];
	const meta = statusMeta(item);
	return (
		<li aria-busy={busy} className={`glass relative flex flex-col gap-2 rounded-[20px] p-2.5 shadow-none ${busy ? "opacity-70" : ""}`}>
			<div className="flex items-center gap-3">
				{item.imageUrl ? (
					<img src={item.imageUrl} alt="" className="size-16 flex-none rounded-[14px] object-cover" />
				) : (
					<span className="grid size-16 flex-none place-items-center rounded-[14px] bg-card-img text-fg-3">
						<ImageOff size={20} aria-hidden />
					</span>
				)}
				<div className="flex min-w-0 grow flex-col gap-1.5">
					<span className="truncate text-[15px] font-semibold">{item.title}</span>
					<span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/7 px-2.5 py-1 text-[12px] font-semibold">
						<span aria-hidden className={`size-2 rounded-full ${ta.statusDot[item.status]}`} /> {name} · {ta.status[item.status]}
					</span>
					{editing ? (
						<PriceEdit
							item={item}
							onCancel={() => setEditing(false)}
							onSave={(price) => {
								setEditing(false);
								actions.run(item, "price", price);
							}}
						/>
					) : (
						<span className="text-[12px] text-fg-4">
							<b className="mr-1.5 text-[18px] font-bold tracking-[-0.02em] text-fg">{item.priceText}</b>
							{meta.join(" · ")}
						</span>
					)}
				</div>
			</div>
			<div className="flex flex-wrap items-center justify-end gap-1">
				<button type="button" aria-label={ta.askTrgoAria(item.title)} onClick={() => actions.tag(item)} className={btn("chip", SMALL)}>
					<MessageCircle size={15} aria-hidden /> {ta.askTrgo}
				</button>
				<PrimaryAction item={item} actions={actions} busy={busy} />
				<a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${ta.open(name)}: ${item.title}`} title={ta.open(name)} className={btn("chip", ICON)}>
					<ExternalLink size={15} aria-hidden />
				</a>
				<RowMenu item={item} actions={actions} onPrice={() => setEditing(true)} />
			</div>
		</li>
	);
}
