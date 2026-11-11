import { Check, ImageDown } from "lucide-react";
import { domToCanvas } from "modern-screenshot";
import { type RefObject, useEffect, useRef, useState } from "react";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

const SCALE = 2;
const PAD = 20;
const MARK_H = 18;

// Marks the elements that stay out of the image.
export const NO_CAPTURE = { "data-no-capture": "" };

// Renders the element, then draws it on the page color with padding and the site mark.
async function render(el: HTMLElement): Promise<Blob> {
	const card = await domToCanvas(el, {
		scale: SCALE,
		filter: (n) => !(n instanceof Element && n.hasAttribute("data-no-capture")),
		// A running entry animation would freeze the clone at its first frame.
		onCloneNode: (n) => {
			if (n instanceof HTMLElement) n.style.animation = "none";
		},
	});
	const body = getComputedStyle(document.body);
	const canvas = document.createElement("canvas");
	canvas.width = card.width + PAD * 2 * SCALE;
	canvas.height = card.height + (PAD * 2 + MARK_H) * SCALE;
	const ctx = canvas.getContext("2d")!;
	ctx.fillStyle = body.backgroundColor;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	// The clone leaves a faint square behind the rounded corners, so clip to the card shape.
	ctx.beginPath();
	ctx.roundRect(PAD * SCALE, PAD * SCALE, card.width, card.height, Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) * SCALE);
	ctx.save();
	ctx.clip();
	ctx.drawImage(card, PAD * SCALE, PAD * SCALE);
	ctx.restore();
	ctx.fillStyle = body.color;
	ctx.globalAlpha = 0.5;
	ctx.font = `${12 * SCALE}px ${body.fontFamily}`;
	ctx.textAlign = "center";
	ctx.fillText(strings.imageMark, canvas.width / 2, canvas.height - (PAD + 4) * SCALE);
	return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"));
}

// Copies the image. Falls back to share, then to a download.
async function deliver(blob: Promise<Blob>) {
	if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
		try {
			await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
			return;
		} catch {}
	}
	const file = new File([await blob], "trgo.png", { type: "image/png" });
	if (navigator.canShare?.({ files: [file] })) {
		try {
			await navigator.share({ files: [file] });
			return;
		} catch (e) {
			if (e instanceof DOMException && e.name === "AbortError") return;
		}
	}
	const a = document.createElement("a");
	a.href = URL.createObjectURL(file);
	a.download = file.name;
	a.click();
	URL.revokeObjectURL(a.href);
}

export function CopyImageButton({ target, className }: { target: RefObject<HTMLElement | null>; className?: string }) {
	const [done, setDone] = useState(false);
	const timer = useRef<number>(undefined);
	useEffect(() => () => window.clearTimeout(timer.current), []);
	const Icon = done ? Check : ImageDown;
	const onClick = async () => {
		const el = target.current;
		if (!el) return;
		try {
			await deliver(render(el));
		} catch {
			return;
		}
		setDone(true);
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setDone(false), 1800);
	};
	return (
		<button
			type="button"
			{...NO_CAPTURE}
			aria-label={done ? strings.imageCopied : strings.copyImage}
			title={strings.copyImage}
			onClick={onClick}
			className={cn("grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-fg-3", className)}
		>
			<Icon className="size-[13px]" strokeWidth={2.2} aria-hidden />
		</button>
	);
}
