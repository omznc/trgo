import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/strings";
import { details } from "./strings-detail";

const ARROW = "grid size-10 place-items-center rounded-full border-0 bg-black/45 text-white backdrop-blur-sm";

function Arrow({ dir, onClick, className }: { dir: -1 | 1; onClick: () => void; className?: string }) {
	const Icon = dir < 0 ? ChevronLeft : ChevronRight;
	return (
		<button
			type="button"
			aria-label={dir < 0 ? details.prevImage : details.nextImage}
			onClick={onClick}
			className={cn(ARROW, className)}
		>
			<Icon size={20} aria-hidden />
		</button>
	);
}

const SWIPE = 60;

function Viewer({ images, index, alt, onIndex, onClose }: { images: string[]; index: number; alt: string; onIndex: (n: number) => void; onClose: () => void }) {
	const ref = useRef<HTMLDialogElement>(null);
	const start = useRef<{ x: number; y: number } | null>(null);
	const [drag, setDrag] = useState(0);
	useEffect(() => ref.current?.showModal(), []);
	const step = (d: number) => onIndex(Math.min(images.length - 1, Math.max(0, index + d)));
	const onKey = (e: KeyboardEvent) => {
		if (e.key === "Escape") e.stopPropagation();
		if (e.key === "ArrowLeft") step(-1);
		if (e.key === "ArrowRight") step(1);
	};
	const onMove = (e: PointerEvent) => {
		if (start.current) setDrag(Math.max(0, e.clientY - start.current.y));
	};
	const onUp = (e: PointerEvent) => {
		const s = start.current;
		start.current = null;
		setDrag(0);
		if (!s) return;
		const dx = e.clientX - s.x;
		const dy = e.clientY - s.y;
		if (dy > SWIPE && dy > Math.abs(dx)) onClose();
		else if (Math.abs(dx) > SWIPE) step(dx < 0 ? 1 : -1);
	};
	return createPortal(
		<dialog
			ref={ref}
			aria-label={alt}
			onCancel={(e) => {
				e.preventDefault();
				onClose();
			}}
			onKeyDown={onKey}
			onClick={(e) => e.target === ref.current && onClose()}
			className="m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-black/90 p-0 text-white open:grid open:place-items-center"
		>
			<button type="button" aria-label={details.closeViewer} onClick={onClose} className={cn(ARROW, "absolute top-4 right-4 z-10")}>
				<X size={18} aria-hidden />
			</button>
			<img
				src={images[index]}
				alt={`${alt}, ${index + 1}/${images.length}`}
				draggable={false}
				onPointerDown={(e) => {
					start.current = { x: e.clientX, y: e.clientY };
					e.currentTarget.setPointerCapture(e.pointerId);
				}}
				onPointerMove={onMove}
				onPointerUp={onUp}
				onPointerCancel={() => {
					start.current = null;
					setDrag(0);
				}}
				style={{ transform: `translateY(${drag}px)`, opacity: 1 - Math.min(drag / 400, 0.6) }}
				className="max-h-dvh max-w-dvw touch-none object-contain select-none"
			/>
			{images.length > 1 && (
				<>
					{index > 0 && <Arrow dir={-1} onClick={() => step(-1)} className="absolute top-1/2 left-4 -translate-y-1/2" />}
					{index < images.length - 1 && <Arrow dir={1} onClick={() => step(1)} className="absolute top-1/2 right-4 -translate-y-1/2" />}
					<div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-[13px] font-medium">
						{index + 1} / {images.length}
					</div>
				</>
			)}
		</dialog>,
		document.body,
	);
}

type GalleryProps = { images: string[]; alt: string; loading?: boolean };

export function Gallery({ images, alt, loading }: GalleryProps) {
	const track = useRef<HTMLDivElement>(null);
	const [index, setIndex] = useState(0);
	const [viewer, setViewer] = useState(false);
	const last = images.length - 1;
	const go = (n: number) => {
		const el = track.current;
		const to = Math.min(last, Math.max(0, n));
		setIndex(to);
		el?.scrollTo({ left: to * el.clientWidth, behavior: "smooth" });
	};
	const onKey = (e: KeyboardEvent) => {
		if (e.key === "ArrowLeft") go(index - 1);
		if (e.key === "ArrowRight") go(index + 1);
	};
	const closeViewer = () => {
		setViewer(false);
		const el = track.current;
		el?.scrollTo({ left: index * el.clientWidth });
	};
	return (
		<div className="flex shrink-0 flex-col gap-2">
			<div className="relative">
				<div
					ref={track}
					tabIndex={0}
					role="group"
					aria-roledescription="carousel"
					aria-label={alt}
					onKeyDown={onKey}
					onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
					className="flex aspect-[4/3] w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-bubble bg-card-img [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				>
					{images.length === 0 ? (
						<div className={cn("grid w-full shrink-0 place-content-center justify-items-center gap-1.5 text-xs text-fg-4", loading && "animate-pulse")}>
							{!loading && (
								<>
									<ImageOff className="size-[22px]" aria-hidden />
									{strings.noImage}
								</>
							)}
						</div>
					) : (
						images.map((src, i) => (
							<button
								key={src}
								type="button"
								tabIndex={-1}
								aria-label={details.openViewer(i + 1, images.length)}
								onClick={() => setViewer(true)}
								className="size-full shrink-0 cursor-zoom-in snap-center border-0 bg-transparent p-0"
							>
								<img src={src} alt={`${alt}, ${i + 1}/${images.length}`} className="size-full object-cover" draggable={false} loading={i === 0 ? "eager" : "lazy"} />
							</button>
						))
					)}
				</div>
				{images.length > 1 && (
					<>
						{index > 0 && <Arrow dir={-1} onClick={() => go(index - 1)} className="absolute top-1/2 left-2.5 hidden -translate-y-1/2 [@media(hover:hover)]:grid" />}
						{index < last && <Arrow dir={1} onClick={() => go(index + 1)} className="absolute top-1/2 right-2.5 hidden -translate-y-1/2 [@media(hover:hover)]:grid" />}
						<div className="pointer-events-none absolute right-2.5 bottom-2.5 rounded-full bg-black/45 px-2.5 py-0.5 text-xs font-medium text-white">
							{index + 1} / {images.length}
						</div>
					</>
				)}
			</div>
			{images.length > 1 && (
				<div className="scroll-x flex gap-2 pb-1">
					{images.map((src, i) => (
						<button
							key={src}
							type="button"
							aria-label={details.showImage(i + 1)}
							aria-current={i === index}
							onClick={() => go(i)}
							className={cn("h-12 w-16 shrink-0 overflow-hidden rounded-[10px] border-2 bg-card-img p-0", i === index ? "border-accent" : "border-transparent")}
						>
							<img src={src} alt="" className="size-full object-cover" draggable={false} loading="lazy" />
						</button>
					))}
				</div>
			)}
			{viewer && <Viewer images={images} index={index} alt={alt} onIndex={setIndex} onClose={closeViewer} />}
		</div>
	);
}
