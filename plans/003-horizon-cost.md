# 003: Measure the Horizon cost, then cut layout work

- **Status**: TODO
- **Commit**: no commit (working tree 2026-11-11)
- **Severity**: MEDIUM (from code only; the audit did not measure it)
- **Category**: Performance
- **Estimated scope**: 1 file (`apps/shop/src/components/shell/Horizon.tsx`), about 15 lines

## Problem

The start screen runs a timer every 120 ms. The design sets the timer, the sway, the breathing and the flicker (SPEC, Main, section 3). Keep all of them.

What the code does on each tick:

- `useClock` calls `setT`, so `Horizon` renders about 21 rings and 6 stars 8 times per second.
- `k` changes with the breathing. The `top` of `.sun` uses `sunOffset`, which depends on `k`. So `top` can change by 1 or 2 px several times per cycle. This is a layout change on the layer.
- A ring radius changes when a snapped value changes. Each ring is a circle up to about 17800 px wide, with a tiled conic-gradient and `clip-path`.
  A size change makes layout and a new raster for a very large layer.
- Every 0.9 s the flicker repaints each third ring (7 rings).
- Many glass elements on the start screen (composer, suggestion chips, footer, banner) use `backdrop-filter: blur(28px)`.
  Each repaint of the backdrop makes the browser blur those elements again.
- The inline style sets `willChange: "transform"` and `.sun` in `styles.css:257` sets it too. One of them is enough.

```tsx
/* apps/shop/src/components/shell/Horizon.tsx:65-66, 74 - current */
const sunOffset = main ? CORE - Math.round(18 * k) : indigoStart + snap(24);
const sunX = main ? Math.round((Math.sin((t * 2 * Math.PI) / 18) * 140) / PX) * PX : 0;
...
<div className="sun" style={{ top: `calc(100% + ${sunOffset}px)`, transform: `translateX(${sunX}px)`, willChange: "transform" }}>
```

## Target

Step 1 decides how far to go.

```tsx
/* main variant: top is fixed, the breathing offset moves into the transform */
const sunDy = main ? -Math.round(18 * k) : 0;
const sunTop = main ? CORE : indigoStart + snap(24);
<div className="sun" style={{ top: `calc(100% + ${sunTop}px)`, transform: `translate(${sunX}px, ${sunDy}px)` }}>
```

The result for the main variant equals the old one: old `top` = `CORE - round(18k)`, new `top` = `CORE` plus a `translateY` of `-round(18k)`.

```tsx
/* wrapper: isolate the paint work of the sun from the rest of the page */
<div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ "--p": `${PX}px`, contain: "strict" } as CSSProperties}>
```

## Repo conventions to follow

- The file keeps the math of the SPEC in plain functions. Keep `snap`, `buildRings`, `shiftOf` as they are.
- Do not move the sway to a CSS animation. The 2 px snap keeps the dither crisp, and the SPEC sets the 120 ms tick.

## Steps

1. Measure first. Run `bun --cwd /home/omznc/dev/lagano-shop/apps/shop run dev`. Open the start screen in Chrome.
   Record a 10 s trace in the Performance panel with CPU throttling 4x. Also turn on Paint flashing and look at the Layers panel.
   Write down: the longest frame, the count of frames above 20 ms, the Layout and Paint time per tick, and the memory of the layers.
2. Stop rule. If no frame is above 20 ms at 4x throttling, do only steps 3 and 4 (they are safe) and report the numbers. Do not do anything else.
3. Apply the `sunTop` and `sunDy` change and remove the inline `willChange` (the class sets it).
4. Add `contain: "strict"` to the wrapper. Check in the browser that the sun and stars still fill the screen.
5. Only if step 1 shows dropped frames: change `useClock` so that it calls `setT` only when a rendered value changes.
   Round `k` to 0.01 inside the interval, compute `sunX` and `flick`, and keep the last tuple in a ref. Skip `setT` when the tuple is equal.
   Measure again and report the change.

## Boundaries

- Do NOT change the tick of 120 ms, the 18 s sway, the 6 s breathing, or the 0.9 s flicker.
- Do NOT change `styles.css` (plan 001 owns it) or the ring math.
- Do NOT add reduced-motion handling.
- If the code does not match the excerpts, STOP and report.

## Verification

- **Mechanical**: `bun --cwd /home/omznc/dev/lagano-shop/apps/shop run typecheck`. Then `cccc --table apps/shop/src/components/shell/Horizon.tsx --max-cognitive 15 --max-cyclomatic 10`.
- **Feel check**: compare a screenshot of the start screen before and after at t = 0. The sun must sit at the same pixel position.
  Watch 20 s of the sway and the breathing. No jump of 1 or 2 px may appear at the breathing steps.
- **Done when**: the trace numbers from step 1 are in the report, and the applied steps match the stop rule.
