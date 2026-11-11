import { CloudUpload, GripVertical, X } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { addPhoto, getPhoto } from "@/lib/photos";
import { sell } from "@/lib/strings-sell";
import "./sell.css";

const MAX = 10;
const COUNT_ERR = sell.photos.tooMany;

function useUploader(ids: string[], onChange: (ids: string[]) => void) {
	const [pending, setPending] = useState(0);
	const [error, setError] = useState("");
	const idsRef = useRef(ids);
	idsRef.current = ids;
	const add = async (files: File[]) => {
		const images = files.filter((f) => f.type.startsWith("image/") || /\.hei[cf]$/i.test(f.name));
		const room = MAX - idsRef.current.length - pending;
		setError(images.length > room ? COUNT_ERR : "");
		const batch = images.slice(0, Math.max(0, room));
		setPending((n) => n + batch.length);
		// Photos are added in the order they finish. A file that cannot be decoded is reported and skipped.
		await Promise.all(
			batch.map(async (file) => {
				try {
					const photo = await addPhoto(file);
					onChange([...idsRef.current, photo.id]);
					idsRef.current = [...idsRef.current, photo.id];
				} catch {
					setError(sell.photos.badFile(file.name));
				} finally {
					setPending((n) => n - 1);
				}
			}),
		);
	};
	return { pending, error, add };
}

function move(ids: string[], from: number, to: number) {
	if (to < 0 || to >= ids.length || from === to) return ids;
	const next = [...ids];
	next.splice(to, 0, ...next.splice(from, 1));
	return next;
}

const ICON_BTN = "sell-btn absolute grid size-7 place-items-center bg-[rgba(14,16,32,.72)] text-fg after:absolute after:-inset-2 after:content-['']";

type TileProps = {
	id: string;
	index: number;
	dragging: boolean;
	onCover: () => void;
	onRemove: () => void;
	onMove: (to: number) => void;
	onDragStart: () => void;
	onDragEnter: () => void;
	onDragEnd: () => void;
};

function Tile(p: TileProps) {
	const onKey = (e: React.KeyboardEvent) => {
		if (e.key === "ArrowLeft") p.onMove(p.index - 1);
		else if (e.key === "ArrowRight") p.onMove(p.index + 1);
		else return;
		e.preventDefault();
	};
	const cover = p.index === 0;
	return (
		<motion.li layout="position" transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }} className="relative">
			<div
				draggable
				onDragStart={p.onDragStart}
				onDragEnter={p.onDragEnter}
				onDragOver={(e) => e.preventDefault()}
				onDragEnd={p.onDragEnd}
				className={`relative aspect-square overflow-hidden rounded-2xl border-2 transition-transform ${cover ? "border-accent" : "border-white/10"} ${p.dragging ? "z-10 rotate-[-3deg] scale-[1.06] shadow-[0_24px_48px_rgba(0,0,0,.5)]" : ""}`}
			>
			<button type="button" onClick={p.onCover} aria-label={sell.photos.setCoverAria(p.index + 1)} aria-pressed={cover} className="sell-btn absolute inset-0 block size-full p-0">
				<img src={getPhoto(p.id)?.url} alt={sell.photos.tileAlt(p.index + 1)} draggable={false} className="size-full object-cover" />
			</button>
			{cover && <span className="pointer-events-none absolute bottom-2 left-2 rounded-full sm:bottom-auto sm:top-2 bg-accent px-1.5 py-[3px] text-[10px] font-bold sm:px-2 sm:text-[11px] text-bg">{sell.photos.cover}</span>}
			<button type="button" onClick={p.onRemove} aria-label={sell.photos.removeAria(p.index + 1)} className={`${ICON_BTN} right-1.5 top-1.5 rounded-full border-0`}>
				<X size={13} strokeWidth={2.2} aria-hidden />
			</button>
			<button
				type="button"
				onKeyDown={onKey}
				aria-label={`${sell.photos.gripAria}. ${sell.photos.moveHint}`}
				className={`${ICON_BTN} bottom-1.5 right-1.5 cursor-grab rounded-lg border-0`}
			>
				<GripVertical size={14} aria-hidden />
			</button>
			</div>
		</motion.li>
	);
}

function PendingTile() {
	return (
		<li className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl border-2 border-white/10 bg-white/5 text-[13px] font-bold" role="status">
			<span className="sell-spin size-5 rounded-full border-2 border-white/20 border-t-accent" aria-hidden />
			<span className="sr-only">{sell.photos.processing}</span>
		</li>
	);
}

function Dropzone({ onFiles, full }: { onFiles: (f: File[]) => void; full: boolean }) {
	const input = useRef<HTMLInputElement>(null);
	const [over, setOver] = useState(false);
	return (
		// The whole zone is a mouse target. The link button below is the keyboard target.
		<div
			onClick={() => !full && input.current?.click()}
			onDragOver={(e) => {
				if (e.dataTransfer.types.includes("Files")) {
					e.preventDefault();
					setOver(true);
				}
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(e) => {
				if (!e.dataTransfer.files.length) return;
				e.preventDefault();
				setOver(false);
				onFiles([...e.dataTransfer.files]);
			}}
			className={`mt-4 flex items-center justify-center gap-3.5 rounded-[18px] border-2 border-dashed p-[22px] text-left ${over ? "border-focus bg-white/5" : "border-line-dashed"}`}
		>
			<span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/8">
				<CloudUpload size={22} strokeWidth={2.2} aria-hidden />
			</span>
			<div>
				<p className="m-0 text-[15px] font-semibold">
					{sell.photos.dropPrefix}{" "}
					<button type="button" disabled={full} onClick={() => input.current?.click()} className="sell-link inline cursor-pointer border-0 bg-transparent p-0 font-semibold text-focus disabled:opacity-50">
						{sell.photos.dropPick}
					</button>
				</p>
				<p className="m-0 text-[13px] text-fg-3">{sell.photos.dropHint}</p>
			</div>
			<input
				ref={input}
				type="file"
				accept="image/*,.heic,.heif"
				multiple
				className="sr-only"
				tabIndex={-1}
				aria-hidden
				onChange={(e) => {
					onFiles([...(e.target.files ?? [])]);
					e.target.value = "";
				}}
			/>
		</div>
	);
}

// Controlled by photo ids from photos.ts. The first id is the cover.
export function PhotoUploader({ ids, onChange, onNext }: { ids: string[]; onChange: (ids: string[]) => void; onNext: () => void }) {
	const { pending, error, add } = useUploader(ids, onChange);
	const [drag, setDrag] = useState<number | null>(null);
	const full = ids.length + pending >= MAX;
	const reorder = (from: number, to: number) => {
		onChange(move(ids, from, to));
		return to;
	};
	return (
		<section className="sell-glass rounded-[24px] p-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="m-0 text-[17px] font-semibold tracking-[-0.02em]">{sell.photos.title}</h2>
			</div>
			<Dropzone onFiles={add} full={full} />
			{error && (
				<p role="alert" className="m-0 mt-3 text-[13px] text-danger">
					{error}
				</p>
			)}
			{(ids.length > 0 || pending > 0) && (
				<ul aria-label={sell.photos.gridAria} className="m-0 mt-4 grid list-none grid-cols-3 gap-2.5 p-0 sm:grid-cols-5">
					{ids.map((id, i) => (
						<Tile
							key={id}
							id={id}
							index={i}
							dragging={drag === i}
							onCover={() => onChange(move(ids, i, 0))}
							onRemove={() => onChange(ids.filter((x) => x !== id))}
							onMove={(to) => reorder(i, to)}
							onDragStart={() => setDrag(i)}
							onDragEnter={() => drag !== null && drag !== i && setDrag(reorder(drag, i))}
							onDragEnd={() => setDrag(null)}
						/>
					))}
					{Array.from({ length: pending }, (_, i) => (
						<PendingTile key={`p${i}`} />
					))}
				</ul>
			)}
			<div className="mt-4 flex items-center justify-between gap-3">
				<span className="text-[13px] text-fg-3">
					{sell.photos.footerHintStart} <GripVertical size={13} className="inline align-[-2px]" aria-hidden /> {sell.photos.footerHintEnd}
				</span>
				<button
					type="button"
					disabled={ids.length === 0}
					onClick={onNext}
					className="sell-btn h-11 min-h-11 shrink-0 rounded-full border-0 bg-accent px-4 text-sm font-semibold tracking-[-0.01em] text-bg disabled:opacity-50"
				>
					{sell.photos.makeDraft}
				</button>
			</div>
		</section>
	);
}
