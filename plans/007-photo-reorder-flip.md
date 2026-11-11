# 007: Animate the photo tiles when the order changes

- **Status**: TODO
- **Commit**: no commit (working tree 2026-11-11)
- **Severity**: LOW (missed opportunity, the best one for spatial consistency)
- **Category**: Missed opportunities, Physicality
- **Estimated scope**: 1 file (`apps/shop/src/components/sell/PhotoUploader.tsx`), about 15 lines

## Problem

The user drags a photo tile to a new place, or moves it with the arrow keys, or sets a cover. The other tiles jump to their new cells with no motion.
The user cannot follow where each photo went.

```tsx
/* apps/shop/src/components/sell/PhotoUploader.tsx:69-76 - current */
<li
	draggable
	onDragStart={p.onDragStart}
	onDragEnter={p.onDragEnter}
	onDragOver={(e) => e.preventDefault()}
	onDragEnd={p.onDragEnd}
	className={`relative aspect-square overflow-hidden rounded-2xl border-2 transition-transform ${cover ? "border-accent" : "border-white/10"} ${p.dragging ? "z-10 rotate-[-3deg] scale-[1.06] shadow-[0_24px_48px_rgba(0,0,0,.5)]" : ""}`}
>
```

## Target

A layout animation (FLIP) moves each tile from its old cell to its new cell with a transform. The duration is 0.15 s with the strong ease-out. This also covers moves with the keyboard, so the time stays short.

Do not put `layout` on the native draggable element. `motion.li` has its own `onDragStart` and `onDragEnter` types, which clash with the native handlers.
Use an outer `motion.li` for the layout and make the inner element a `div` with the native drag handlers.

```tsx
import { motion } from "motion/react";

/* in Tile, replace the root <li ...> ... </li> with: */
<motion.li layout="position" transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }} className="relative">
	<div
		draggable
		onDragStart={p.onDragStart}
		onDragEnter={p.onDragEnter}
		onDragOver={(e) => e.preventDefault()}
		onDragEnd={p.onDragEnd}
		className={/* the exact current className string, unchanged */}
	>
		{/* the current children, unchanged */}
	</div>
</motion.li>
```

The inner `div` keeps `relative aspect-square overflow-hidden ...` so the tile keeps its size. The `ul` is a grid, so the outer `li` fills its cell.

## Repo conventions to follow

- The key stays `key={id}` on `<Tile>` (line 180). Layout animation depends on a stable key.
- `PendingTile` stays a plain `li`.

## Steps

1. Add `import { motion } from "motion/react";`.
2. Change the root of `Tile` as in the target. Move the closing tag to match.
3. Do not change `TileProps`, `move`, or `PhotoUploader`.

## Boundaries

- Do NOT add exit animation (`AnimatePresence`) in this plan.
- Do NOT change the drag tilt (`rotate-[-3deg] scale-[1.06]`). The design sets it.
- Do NOT add reduced-motion handling.
- If the code does not match the excerpts, STOP and report.

## Verification

- **Mechanical**: `bun --cwd /home/omznc/dev/lagano-shop/apps/shop run typecheck`. Then `cccc --table apps/shop/src/components/sell/PhotoUploader.tsx --max-cognitive 15 --max-cyclomatic 10`.
- **Feel check**: add 5 photos.
  - Drag the last tile over the first. The others must slide one cell and not jump.
  - Press Left or Right on the grip button. The tile must swap in about 150 ms.
  - Press a tile to set it as the cover. The tiles must slide.
  - The dragged tile must still tilt and grow. The browser drag image must still appear.
  - Remove a tile. The rest must slide into the gap.
- **Done when**: tiles slide on every reorder and the native drag still works.
