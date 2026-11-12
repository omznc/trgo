import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { useSidePanel } from "@/components/shell/side-panel";

const PX = 2; // dither pixel, px
const Q = 4 * PX;
const snap = (v: number) => Math.max(Q, Math.round(v / Q) * Q);

type Layer = readonly [cls: Dither, color: string, thickness: number];
type Dither = "d100" | "d75" | "d50" | "d25" | "d12" | "d6";
const PALE = "#FFE2A8";
const ACCENT = "accent";
const PINK = "#C2407A";
const INDIGO = "#33298F";
const LAYERS: Layer[] = [
	["d50", PALE, 8], ["d25", PALE, 8],
	["d100", ACCENT, 16], ["d75", ACCENT, 10], ["d50", ACCENT, 12], ["d25", ACCENT, 12], ["d12", ACCENT, 14], ["d6", ACCENT, 16],
	["d100", PINK, 24], ["d75", PINK, 18], ["d50", PINK, 18], ["d25", PINK, 20], ["d12", PINK, 22], ["d6", PINK, 24],
	["d100", INDIGO, 40], ["d75", INDIGO, 30], ["d50", INDIGO, 32], ["d25", INDIGO, 34], ["d12", INDIGO, 38], ["d6", INDIGO, 44],
];
const INDIGO_FIRST = LAYERS.findIndex((l) => l[1] === INDIGO);
const CORE = snap((720 * 720 + 30 * 30) / (2 * 30));

type Ring = { cls: Dither; color: number; r2: number; shifts: boolean };

const mod = (v: number, m: number) => ((v % m) + m) % m;

// The same 1-bit patterns as the CSS dither classes, in dither cells.
const LIT: Record<Dither, (x: number, y: number) => boolean> = {
	d100: () => true,
	d75: (x, y) => mod(x, 2) + mod(y, 2) > 0,
	d50: (x, y) => mod(x + y, 2) === 1,
	d25: (x, y) => mod(x, 2) === 0 && mod(y, 2) === 0,
	d12: (x, y) => (mod(x, 4) === 0 && mod(y, 4) === 0) || (mod(x, 4) === 2 && mod(y, 4) === 2),
	d6: (x, y) => mod(x, 4) === 0 && mod(y, 4) === 0,
};

// Little-endian RGBA packed for a Uint32Array view of ImageData.
function pack(hex: string) {
	const n = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
	return (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255);
}

function buildRings(k: number, accent: number) {
	const color = (c: string) => (c === ACCENT ? accent : pack(c));
	const rings: Ring[] = [{ cls: "d100", color: pack(PALE), r2: CORE * CORE, shifts: false }];
	let r = CORE;
	let indigoStart = CORE;
	LAYERS.forEach(([cls, c, thickness], i) => {
		if (i === INDIGO_FIRST) indigoStart = r;
		r += snap(thickness * k);
		rings.push({ cls, color: color(c), r2: r * r, shifts: i % 3 === 1 });
	});
	return { rings, indigoStart, outer: r };
}

const STARS = [
	[9, 14, 4, "#EEF0FA"], [21, 34, 2, "#8089AD"], [34, 8, 2, "#B4BAD6"],
	[63, 11, 2, "#8089AD"], [78, 24, 4, "#B4BAD6"], [92, 15, 2, "#EEF0FA"],
] as const;

// Fixed pseudo-random fade-in delays in ms, so server and client render the same.
const STAR_DELAY = [380, 140, 620, 260, 520, 90];

// Animated on the start screen (sway, breathing, flicker). Static in the chat.
function useClock(running: boolean) {
	const [t, setT] = useState(0);
	const clockStart = useRef(Date.now());
	useEffect(() => {
		if (!running) return;
		clockStart.current = Date.now();
		const id = setInterval(() => !document.hidden && setT((Date.now() - clockStart.current) / 1000), 120);
		return () => clearInterval(id);
	}, [running]);
	return { t, clockStart };
}

type Frame = { k: number; sunOffset: (indigoStart: number) => number; sunX: number; flick: boolean };

function colorAt(rings: Ring[], d2: number, x: number, y: number, shift: number) {
	for (const ring of rings) {
		if (d2 <= ring.r2 && LIT[ring.cls](x - (ring.shifts ? shift : 0), y)) return ring.color;
	}
	return 0;
}

// A pixel takes the color of the innermost ring that covers it and is lit there; unlit cells show the ring below.
function paint(canvas: HTMLCanvasElement, frame: Frame, accent: number) {
	const w = canvas.width;
	const h = canvas.height;
	const ctx = canvas.getContext("2d");
	if (!ctx || !w || !h) return;
	const { rings, indigoStart, outer } = buildRings(frame.k, accent);
	const cx = w / 2 + frame.sunX / PX;
	const cy = h + frame.sunOffset(indigoStart) / PX;
	const img = ctx.createImageData(w, h);
	const buf = new Uint32Array(img.data.buffer);
	const shift = frame.flick ? 1 : 0;
	for (let y = 0; y < h; y++) {
		const dy = (cy - y - 0.5) * PX;
		if (Math.abs(dy) > outer) continue;
		for (let x = 0; x < w; x++) {
			const dx = (x + 0.5 - cx) * PX;
			const d2 = dx * dx + dy * dy;
			buf[y * w + x] = colorAt(rings, d2, x, y, shift);
		}
	}
	ctx.putImageData(img, 0, 0);
}

const RISE_MS = 1600;
const RISE_DROP = 300; // px below the bottom edge where the glow is fully hidden
const RISE_SCALE = 0.8; // k at the start of the rise
// Soft expo ease-out, close to cubic-bezier(0.16, 1, 0.3, 1); exactly 1 at the end.
const easeOut = (x: number) => (x >= 1 ? 1 : (1 - 2 ** (-10 * x)) / (1 - 2 ** -10));

// rise: 0 = sun below the edge and small, 1 = at rest. The sway and breathing stay on the clock.
function frameAt(main: boolean, t: number, rise: number): Frame {
	const k = main ? (0.4 + 0.12 * 1.6) * (1 + 0.12 * Math.sin((t * 2 * Math.PI) / 6)) * (RISE_SCALE + (1 - RISE_SCALE) * rise) : 0.4 + 0.3 * 1.6;
	return {
		k,
		sunOffset: (indigoStart) => (main ? CORE - Math.round(18 * k) + (1 - rise) * RISE_DROP : indigoStart + snap(24)),
		sunX: main ? Math.round((Math.sin((t * 2 * Math.PI) / 18) * 140) / PX) * PX : 0,
		flick: main && Math.floor(t / 0.9) % 2 === 1,
	};
}

// Runs the first-load rise on requestAnimationFrame; the 120 ms clock paints before and after it.
function useRise(main: boolean, ready: boolean, draw: (rise: number) => void) {
	const rising = useRef(main);
	const startedAt = useRef<number | null>(null);
	if (!main) rising.current = false;
	useEffect(() => {
		if (!rising.current || !ready) return;
		let id = 0;
		const step = (now: number) => {
			startedAt.current ??= now;
			const x = (now - startedAt.current) / RISE_MS;
			if (x >= 1) rising.current = false;
			draw(easeOut(x));
			if (rising.current) id = requestAnimationFrame(step);
		};
		id = requestAnimationFrame(step);
		return () => cancelAnimationFrame(id);
	}, [ready, draw]);
	return rising;
}

export function Horizon({ variant }: { variant: "main" | "chat" }) {
	const main = variant === "main";
	// The phone sheet covers the screen: pause the clock so a repaint cannot cost a sheet frame.
	const panel = useSidePanel();
	const sheetOpen = (!!panel.view || panel.history) && typeof window !== "undefined" && window.innerWidth < 640;
	const { t, clockStart } = useClock(main && !sheetOpen);
	const canvas = useRef<HTMLCanvasElement>(null);
	const [size, setSize] = useState({ w: 0, h: 0 });
	const draw = useCallback(
		(rise: number) => {
			const el = canvas.current;
			if (!el) return;
			const accent = pack(getComputedStyle(el).getPropertyValue("--color-accent").trim() || "#FF9646");
			paint(el, frameAt(true, (Date.now() - clockStart.current) / 1000, rise), accent);
		},
		[clockStart],
	);
	const rising = useRise(main, size.w > 0, draw);

	useEffect(() => {
		const el = canvas.current?.parentElement;
		if (!el) return;
		const ro = new ResizeObserver(() => {
			const { width, height } = el.getBoundingClientRect();
			setSize({ w: Math.ceil(width / PX), h: Math.ceil(height / PX) });
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		const el = canvas.current;
		if (!el || !size.w || rising.current) return;
		const accent = pack(getComputedStyle(el).getPropertyValue("--color-accent").trim() || "#FF9646");
		paint(el, frameAt(main, t, 1), accent);
	}, [t, size, main, rising]);

	return (
		<div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
			{main &&
				STARS.map(([x, y, s, c], i) => (
					<span
						key={`${x}${y}`}
						className="ld-star absolute"
						style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, background: c, "--d": STAR_DELAY[i] } as CSSProperties}
					/>
				))}
			<canvas
				ref={canvas}
				width={size.w}
				height={size.h}
				className="absolute inset-0 h-full w-full"
				style={{ imageRendering: "pixelated" }}
			/>
		</div>
	);
}
