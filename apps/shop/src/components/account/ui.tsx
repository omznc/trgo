import { ChevronLeft, X } from "lucide-react";
import { strings } from "@/lib/strings";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ta } from "@/lib/strings-account";
import { clearKey, getKey, setKey } from "@/lib/openrouter-auth";
import { PROXY_SOURCE } from "@/components/ConnectControls";
import { KEY_CHANGED } from "@/components/shell/key-event";
import { useSidePanel } from "@/components/shell/side-panel";

const BASE =
	"inline-flex items-center justify-center gap-[7px] rounded-full text-[14px] font-medium tracking-[-0.01em] h-11 min-h-11 px-4 whitespace-nowrap cursor-pointer no-underline transition-[transform,filter,background-color] duration-150 hover:brightness-[1.12] active:scale-[.97] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-focus disabled:opacity-40 disabled:pointer-events-none aria-disabled:opacity-40";

const VARIANT = {
	primary: "bg-fg text-bg font-semibold border-0 shadow-[0_8px_24px_rgba(0,0,0,.25)]",
	ghost: "bg-transparent text-fg-3 border-0",
	chip: "bg-chip text-fg border border-white/8",
	danger: "text-danger bg-[rgba(255,69,58,.14)] border border-[rgba(255,69,58,.28)]",
	accent: "bg-accent text-bg font-semibold border-0",
} as const;

export const btn = (variant: keyof typeof VARIANT, extra?: string) => cn(BASE, VARIANT[variant], extra);

export const FIELD =
	"w-full h-11 rounded-[12px] border border-line bg-white/6 px-3.5 text-[15px] text-fg placeholder:text-white/45 outline-none focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-focus";

export const LBL = "text-[12px] font-semibold uppercase tracking-[.02em] text-fg-3";

export { PROXY_SOURCE };

export function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
	const { canGoBack, back } = useSidePanel();
	return (
		<div className={cn("flex flex-none items-center justify-between gap-2.5 py-3.5 pr-3.5", canGoBack ? "pl-2.5" : "pl-5")}>
			<div className="flex min-w-0 items-center gap-1.5">
				{canGoBack && (
					<button type="button" aria-label={strings.back} onClick={back} className={btn("chip", "w-11 p-0")}>
						<ChevronLeft size={18} aria-hidden />
					</button>
				)}
				<h2 className="m-0 truncate text-[17px] font-semibold tracking-[-0.02em]">{title}</h2>
			</div>
			<button type="button" aria-label={ta.close} onClick={onClose} className={btn("chip", "w-11 p-0")}>
				<X size={15} aria-hidden />
			</button>
		</div>
	);
}

// The panel scrolls inside the shell's container. This is the only scroll area.
export function PanelBody({ children }: { children: ReactNode }) {
	return <div className="scroll min-h-0 flex-1 overflow-y-auto px-5 pt-1 pb-6 flex flex-col gap-[22px]">{children}</div>;
}

export function Section({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-1.5">
			<h3 className="mx-4 my-0 text-[12px] font-semibold uppercase tracking-[.04em] text-fg-4">{title}</h3>
			{children}
			{note && <p className="mx-4 mt-1.5 mb-0 text-[12px] text-fg-4">{note}</p>}
		</section>
	);
}

export function Group({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div className={cn("overflow-hidden rounded-[16px] border border-white/8 bg-white/6 [&>*+*]:border-t [&>*+*]:border-white/8", className)}>
			{children}
		</div>
	);
}

export function Dot({ on }: { on: boolean }) {
	return <span aria-hidden className={cn("size-2 flex-none rounded-full", on ? "bg-ok" : "bg-off")} />;
}

// Browser state is read after mount, so the server and client render the same.
export function useOpenRouterKey() {
	const [key, setState] = useState<string | null>(null);
	useEffect(() => {
		const read = () => setState(getKey());
		read();
		window.addEventListener(KEY_EVENT, read);
		window.addEventListener("storage", read);
		return () => {
			window.removeEventListener(KEY_EVENT, read);
			window.removeEventListener("storage", read);
		};
	}, []);
	return key;
}

const KEY_EVENT = KEY_CHANGED;
const notify = () => window.dispatchEvent(new Event(KEY_EVENT));

export const saveKey = (key: string) => {
	setKey(key);
	notify();
};
export const removeKey = () => {
	clearKey();
	notify();
};
export { notify as notifySettings };

export const maskKey = (key: string) => `${key.slice(0, 6)}…${key.slice(-4)}`;
