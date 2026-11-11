import { CloudUpload } from "lucide-react";
import { useEffect, useState } from "react";
import { strings } from "@/lib/strings";

const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");

// Shown while the user drags files over the window. The drop itself is handled by the composer.
export function DropOverlay() {
	const [over, setOver] = useState(false);
	useEffect(() => {
		let depth = 0;
		const enter = (e: DragEvent) => {
			if (!hasFiles(e)) return;
			depth++;
			setOver(true);
		};
		const leave = () => {
			depth = Math.max(0, depth - 1);
			if (depth === 0) setOver(false);
		};
		const end = () => {
			depth = 0;
			setOver(false);
		};
		window.addEventListener("dragenter", enter);
		window.addEventListener("dragleave", leave);
		window.addEventListener("drop", end);
		return () => {
			window.removeEventListener("dragenter", enter);
			window.removeEventListener("dragleave", leave);
			window.removeEventListener("drop", end);
		};
	}, []);
	if (!over) return null;
	return (
		<div aria-hidden className="animate-in fade-in duration-150 ease-out pointer-events-none fixed inset-0 z-[8] bg-[rgba(14,16,32,.6)] p-2.5">
			<div className="grid size-full place-content-center justify-items-center gap-2 rounded-2xl border-2 border-dashed border-accent bg-accent/10 text-center">
				<CloudUpload className="size-7 text-accent" aria-hidden />
				<strong className="text-base">{strings.dropTitle}</strong>
				<span className="text-[13px] text-fg-3">{strings.dropSub}</span>
			</div>
		</div>
	);
}
