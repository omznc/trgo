import { Trash2 } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { ta } from "@/lib/strings-account";
import { cn } from "@/lib/utils";
import { btn } from "./ui";

const HOLD_MS = 1200;

// Removes every key of this app. Reload makes the chat state match.
function clearAll() {
	for (const store of [localStorage, sessionStorage]) {
		for (const key of Object.keys(store)) if (key.startsWith("lagano.")) store.removeItem(key);
	}
	navigator.vibrate?.(30);
	location.reload();
}

const isHoldKey = (e: KeyboardEvent) => e.key === " " || e.key === "Enter";

// Fills while held, drains back from the current point on release.
function useHoldFill(onDone: () => void) {
	const fill = useRef<HTMLSpanElement>(null);
	const anim = useRef<Animation | null>(null);
	const start = () => {
		const el = fill.current;
		if (!el) return;
		if (!anim.current) {
			anim.current = el.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: HOLD_MS, fill: "both" });
			anim.current.pause();
		}
		const a = anim.current;
		a.onfinish = () => a.playbackRate > 0 && onDone();
		a.updatePlaybackRate(1);
		a.play();
	};
	const stop = () => {
		const a = anim.current;
		if (a && a.playState === "running" && a.playbackRate > 0) a.updatePlaybackRate(-4);
	};
	return { fill, start, stop };
}

// First click arms it; then the user holds until the fill completes.
export default function ClearData({ row }: { row?: boolean }) {
	const [armed, setArmed] = useState(false);
	const hold = useHoldFill(clearAll);
	const start = () => armed && hold.start();
	return (
		<button
			type="button"
			onClick={() => setArmed(true)}
			onPointerDown={start}
			onPointerUp={hold.stop}
			onPointerLeave={hold.stop}
			onPointerCancel={hold.stop}
			onKeyDown={(e) => {
				if (!isHoldKey(e) || !armed) return;
				e.preventDefault();
				if (!e.repeat) start();
			}}
			onKeyUp={(e) => isHoldKey(e) && hold.stop()}
			onBlur={() => {
				setArmed(false);
				hold.stop();
			}}
			onContextMenu={(e) => armed && e.preventDefault()}
			className={cn(
				"relative isolate touch-none overflow-hidden select-none",
				row
					? "flex min-h-12 w-full cursor-pointer items-center rounded-[16px] border-0 bg-transparent px-4 py-2.5 text-left text-[15px] text-danger focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
					: btn("danger"),
			)}
		>
			<span ref={hold.fill} aria-hidden className="absolute inset-0 -z-10 origin-left rounded-[inherit] bg-danger/25" style={{ transform: "scaleX(0)" }} />
			{!row && <Trash2 size={15} aria-hidden />}
			{armed ? ta.deleteAllConfirm : ta.deleteAll}
		</button>
	);
}
