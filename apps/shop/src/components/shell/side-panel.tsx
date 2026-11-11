import { animate, AnimatePresence, motion, useDragControls, useMotionValue, useTransform, type PanInfo, type Variants } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import ConnectPanel from "@/components/account/ConnectPanel";
import MyListingsPanel from "@/components/account/MyListingsPanel";
import SettingsPanel from "@/components/account/SettingsPanel";
import { DetailPanel, type DetailListing } from "@/components/detail/DetailPanel";

export type SidePanelView =
	| { kind: "detail"; listing: DetailListing }
	| { kind: "settings" }
	| { kind: "my-listings" }
	| { kind: "connect"; provider?: Provider };

type SidePanel = {
	view: SidePanelView | null;
	// Pushes the view on the history stack. Pass { fresh: true } from outside the panel to start a new stack.
	open: (view: SidePanelView, opts?: { fresh?: boolean }) => void;
	back: () => void;
	canGoBack: boolean;
	// Key of the top page and the slide direction: 1 push, -1 back, 0 fresh.
	pageKey: number;
	dir: number;
	// n bumps each time the view on top is asked for again. The card plays its cue and shows reason.
	cue: { n: number; reason?: string };
	// Opens the connect view for the provider. If it is already on top, only the cue plays.
	requireConnection: (provider: Provider, reason: string) => void;
	close: () => void;
};

const Ctx = createContext<SidePanel | null>(null);

export { KEY_CHANGED } from "./key-event";

function sameView(a: SidePanelView, b: SidePanelView) {
	if (a.kind !== b.kind) return false;
	if (a.kind === "connect" && b.kind === "connect") return a.provider === b.provider;
	if (a.kind === "detail" && b.kind === "detail") return a.listing.url === b.listing.url && a.listing.provider === b.listing.provider;
	return true;
}

type Provider = "olx" | "svex" | "openrouter";
type Entry = { view: SidePanelView; id: number };

export function SidePanelProvider({ children }: { children: ReactNode }) {
	const [stack, setStack] = useState<Entry[]>([]);
	const [cue, setCue] = useState<{ n: number; reason?: string }>({ n: 0 });
	const dir = useRef(0);
	const nextId = useRef(0);
	const close = useCallback(() => {
		dir.current = 0;
		setStack([]);
		setCue((c) => ({ n: c.n }));
	}, []);
	const back = useCallback(() => {
		dir.current = -1;
		setStack((s) => s.slice(0, -1));
	}, []);
	const top = useRef<SidePanelView | null>(null);
	top.current = stack.at(-1)?.view ?? null;
	const open = useCallback((view: SidePanelView, opts?: { fresh?: boolean }) => {
		// Same view already on top: no page change, only an attention cue.
		if (top.current && sameView(top.current, view)) return setCue((c) => ({ ...c, n: c.n + 1 }));
		setCue((c) => ({ n: c.n }));
		dir.current = opts?.fresh ? 0 : 1;
		const entry = { view, id: nextId.current++ };
		setStack((s) => (opts?.fresh ? [entry] : [...s, entry]));
	}, []);
	const requireConnection = useCallback(
		(provider: Provider, reason: string) => {
			const view: SidePanelView = { kind: "connect", provider };
			if (top.current && sameView(top.current, view)) return setCue((c) => ({ n: c.n + 1, reason }));
			open(view, { fresh: !top.current });
			setCue((c) => ({ n: c.n, reason }));
		},
		[open],
	);
	const value = useMemo(
		() => ({ view: stack.at(-1)?.view ?? null, pageKey: stack.at(-1)?.id ?? -1, dir: dir.current, cue, requireConnection, open, back, canGoBack: stack.length > 1, close }),
		[stack, cue, requireConnection, open, back, close],
	);
	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSidePanel() {
	const ctx = useContext(Ctx);
	if (!ctx) throw new Error("useSidePanel needs SidePanelProvider");
	return ctx;
}

function Content({ view }: { view: SidePanelView }) {
	switch (view.kind) {
		case "detail":
			return <DetailPanel listing={view.listing} />;
		case "settings":
			return <SettingsPanel />;
		case "my-listings":
			return <MyListingsPanel />;
		case "connect":
			return <ConnectPanel provider={view.provider} />;
	}
}

const LABELS: Record<SidePanelView["kind"], string> = {
	detail: "Detalji oglasa",
	settings: "Postavke",
	"my-listings": "Moji oglasi",
	connect: "Povezivanje",
};

type PageCtx = { dir: number };

// Push: new page in from the right, old page moves 30% left, fades and blurs. Back mirrors it.
// Exit uses tweens only, so the node leaves exactly when the motion ends.
const EASE = [0.32, 0.72, 0, 1] as const;
const FADE = { duration: 0.28, ease: "easeOut" } as const;
const OFF = { opacity: 0, filter: "blur(8px)" };
const PAGE: Variants = {
	enter: ({ dir }: PageCtx) => ({ ...OFF, x: dir > 0 ? "100%" : dir < 0 ? "-30%" : 0 }),
	center: { x: 0, opacity: 1, filter: "blur(0px)", transition: { x: { type: "spring", stiffness: 400, damping: 40 }, opacity: FADE, filter: FADE } },
	exit: ({ dir }: PageCtx) => ({
		...OFF,
		x: dir > 0 ? "-30%" : dir < 0 ? "100%" : 0,
		transition: { x: { duration: 0.34, ease: EASE }, opacity: FADE, filter: FADE },
	}),
};

// Tiers: sheet below 640px, island floating over the chat to 1179px, island beside the chat from 1180px.
const useMedia = (query: string, server: boolean) =>
	useSyncExternalStore(
		(cb) => {
			const mq = window.matchMedia(query);
			mq.addEventListener("change", cb);
			return () => mq.removeEventListener("change", cb);
		},
		() => window.matchMedia(query).matches,
		() => server,
	);
const useWide = () => useMedia("(min-width: 640px)", true);
const useSplit = () => useMedia("(min-width: 1180px)", true);

// Island slides 32px right, fades, scales and blurs out. Sheet slides down. SLOT frees the chat column smoothly.
const ISLAND_TWEEN = { duration: 0.26, ease: EASE } as const;
type IslandCtx = { wide: boolean; split: boolean; vel: { current: number } };
const sheetHeight = () => Math.min(690, window.innerHeight * 0.88);
// After a thrown close the sheet leaves on a spring that starts at the release velocity.
const THROW = (v: number) => ({ type: "spring", stiffness: 300, damping: 40, velocity: v, restDelta: 2, restSpeed: 20 }) as const;
const ISLAND: Variants = {
	closed: ({ wide, vel }: IslandCtx) =>
		wide
			? { opacity: 0, x: 32, scale: 0.98, filter: "blur(4px)", transition: ISLAND_TWEEN }
			: { y: sheetHeight(), transition: vel.current > 0 ? THROW(vel.current) : ISLAND_TWEEN },
	open: { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)", transition: ISLAND_TWEEN },
};
const SLOT: Variants = { closed: { width: 0, transition: ISLAND_TWEEN }, open: { width: 492, transition: ISLAND_TWEEN } };
const SCRIM: Variants = { closed: { opacity: 0, transition: ISLAND_TWEEN }, open: { opacity: 1, transition: ISLAND_TWEEN } };
const CLOSE_DIST = 0.3;
const CLOSE_VELOCITY = 500;

// Desktop: a column next to the chat. Phone: a bottom sheet over a scrim.
// The content owns its header and its own scroll container (class "scroll").
// Island gets the view as props: AnimatePresence keeps the last props during exit.
export function SidePanelRegion() {
	const { view, close, pageKey, dir, canGoBack } = useSidePanel();
	const wide = useWide();
	const split = useSplit();
	const vel = useRef(0);
	const ctx = useMemo(() => ({ wide, split, vel }), [wide, split]);
	useEffect(() => {
		if (!view) return;
		vel.current = 0;
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [view, close]);
	return (
		<AnimatePresence custom={ctx}>
			{view && <Island key="island" view={view} close={close} pageKey={pageKey} dir={dir} canGoBack={canGoBack} ctx={ctx} />}
		</AnimatePresence>
	);
}

type IslandProps = { view: SidePanelView; close: () => void; pageKey: number; dir: number; canGoBack: boolean; ctx: IslandCtx };

function Island({ view, close, pageKey, dir, canGoBack, ctx }: IslandProps) {
	const { wide, split, vel } = ctx;
	const live = useSidePanel();
	const aside = useRef<HTMLElement>(null);
	const controls = useDragControls();
	const y = useMotionValue(wide ? 0 : sheetHeight());
	const scrim = useTransform(y, [0, sheetHeight()], [1, 0]);
	const pageCtx = { dir };
	// Drag starts from the grabber and the header, not from the scrolling body or a control.
	const onPointerDown = (e: React.PointerEvent) => {
		if (wide || (e.target as HTMLElement).closest(".scroll, button, a, input, select, textarea")) return;
		controls.start(e);
	};
	const onDragEnd = (_: unknown, info: PanInfo) => {
		const h = aside.current?.offsetHeight ?? sheetHeight();
		if (info.offset.y > h * CLOSE_DIST || info.velocity.y > CLOSE_VELOCITY) {
			vel.current = Math.max(info.velocity.y, 1);
			close();
		} else animate(y, 0, { type: "spring", stiffness: 400, damping: 40, velocity: info.velocity.y });
	};
	return (
		<motion.div variants={split ? SLOT : undefined} initial="closed" animate="open" exit="closed" className="contents min-[1180px]:flex min-[1180px]:flex-none">
			<motion.button
				type="button"
				aria-label="Zatvori panel"
				tabIndex={-1}
				onClick={close}
				variants={wide ? SCRIM : undefined}
				style={wide ? undefined : { opacity: scrim }}
				className="scrim fixed inset-0 z-[4] cursor-default bg-scrim sm:bg-scrim/40 min-[1180px]:hidden"
			/>
			<motion.aside
				ref={aside}
				variants={ISLAND}
				custom={ctx}
				style={{ y }}
				drag={wide ? false : "y"}
				dragControls={controls}
				dragListener={false}
				dragConstraints={{ top: 0, bottom: 0 }}
				dragElastic={{ top: 0.2, bottom: 1 }}
				dragMomentum={false}
				onDragEnd={onDragEnd}
				onPointerDown={onPointerDown}
				aria-label={LABELS[view.kind]}
				className="side-panel fixed inset-x-0 bottom-0 z-[5] flex h-[min(690px,88dvh)] min-h-0 flex-col overflow-hidden rounded-t-[30px] sm:inset-x-auto sm:top-[76px] sm:right-3 sm:bottom-3 sm:h-auto sm:w-[min(480px,calc(100vw-24px))] sm:rounded-[28px] min-[1180px]:static min-[1180px]:z-auto min-[1180px]:m-3 min-[1180px]:ml-0 min-[1180px]:w-[480px] min-[1180px]:flex-none"
			>
				<div aria-hidden className="flex h-[13px] shrink-0 justify-center pt-2 sm:hidden">
					<div className="h-[5px] w-10 rounded-[5px] bg-white/30" />
				</div>
				<div className="relative min-h-0 flex-1">
					<AnimatePresence initial={false} mode="popLayout" custom={pageCtx}>
						<motion.div key={pageKey} custom={pageCtx} variants={PAGE} initial="enter" animate="center" exit="exit" className="flex h-full min-h-0 flex-col">
							<Ctx.Provider value={{ ...live, canGoBack }}>
								<Content view={view} />
							</Ctx.Provider>
						</motion.div>
					</AnimatePresence>
				</div>
			</motion.aside>
		</motion.div>
	);
}
