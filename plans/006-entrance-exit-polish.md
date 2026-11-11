# 006: Add the missing enter and exit motion (toast, drop overlay, delete confirm, scroll button)

- **Status**: DONE
- **Commit**: no commit (working tree 2026-11-11)
- **Severity**: LOW (missed opportunities)
- **Category**: Missed opportunities
- **Estimated scope**: 4 files, about 25 lines

## Problem

Four elements change state with a hard cut.

1. The toast enters with `.in` but leaves at once after 2.4 s.
2. The drop overlay (a full-screen dim layer) pops in at once when a file is dragged over the window.
3. The delete confirm in "Moji oglasi" appears at once at the bottom of the panel.
4. The scroll-to-bottom button appears at once.

```tsx
/* apps/shop/src/components/Chat.tsx:53-64 - current */
function Toast({ text, onDone }: { text: string; onDone: () => void }) {
	useEffect(() => {
		const id = setTimeout(onDone, 2400);
		return () => clearTimeout(id);
	}, [text, onDone]);
	return (
		<div role="status" className="solid in fixed bottom-28 left-1/2 z-[6] flex w-[min(340px,calc(100vw-24px))] -translate-x-1/2 items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm">
			<Check className="size-4 shrink-0 text-ok" strokeWidth={2.4} aria-hidden />
			<span className="flex-1">{text}</span>
		</div>
	);
}
/* Chat.tsx:216 - current */
{toast && <Toast text={toast} onDone={dismissToast} />}
```

```tsx
/* apps/shop/src/components/shell/DropOverlay.tsx:36 - current */
<div aria-hidden className="pointer-events-none fixed inset-0 z-[8] bg-[rgba(14,16,32,.6)] p-2.5">
```

```tsx
/* apps/shop/src/components/account/MyListingsPanel.tsx:136 - current */
<div role="alertdialog" aria-labelledby="del-t" className="solid mx-5 mb-5 flex flex-none flex-col gap-2.5 rounded-[20px] p-4">
```

```tsx
/* apps/shop/src/components/ai-elements/conversation.tsx:47 - current */
"glass absolute bottom-3 left-1/2 z-[4] grid size-11 -translate-x-1/2 place-items-center rounded-full text-fg shadow-none sm:size-10",
```

## Target

Values: strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)`, 150 to 200 ms. Exit is shorter than enter.

```tsx
/* Chat.tsx */
import { AnimatePresence, motion } from "motion/react";

function Toast({ text, onDone }: { text: string; onDone: () => void }) {
	useEffect(() => {
		const id = setTimeout(onDone, 2400);
		return () => clearTimeout(id);
	}, [text, onDone]);
	return (
		<motion.div
			role="status"
			initial={{ opacity: 0, transform: "translateY(14px)" }}
			animate={{ opacity: 1, transform: "translateY(0px)" }}
			exit={{ opacity: 0, transform: "translateY(8px)", transition: { duration: 0.15 } }}
			transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
			className="solid fixed bottom-28 left-1/2 z-[6] flex w-[min(340px,calc(100vw-24px))] -translate-x-1/2 items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm"
		>
			<Check className="size-4 shrink-0 text-ok" strokeWidth={2.4} aria-hidden />
			<span className="flex-1">{text}</span>
		</motion.div>
	);
}
/* line 216 */
<AnimatePresence>{toast && <Toast key="toast" text={toast} onDone={dismissToast} />}</AnimatePresence>
```

The class `-translate-x-1/2` writes the CSS `translate` property. The motion value writes `transform`. The two compose, so they do not fight.

```tsx
/* DropOverlay.tsx: add classes (tw-animate-css is already imported in styles.css) */
className="animate-in fade-in duration-150 ease-out pointer-events-none fixed inset-0 z-[8] bg-[rgba(14,16,32,.6)] p-2.5"

/* MyListingsPanel.tsx:136: add classes */
className="animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out solid mx-5 mb-5 flex flex-none flex-col gap-2.5 rounded-[20px] p-4"

/* conversation.tsx:47: add classes at the start of the string */
"animate-in fade-in zoom-in-95 duration-150 ease-out glass absolute bottom-3 ..."
```

The drop overlay exit stays instant on purpose: after a drop the user wants the page back at once.

## Repo conventions to follow

- `components/ui/dropdown-menu.tsx:43` already uses the tw-animate classes `animate-in fade-in-0 zoom-in-95`. Follow the same naming.
- `motion` 14.12 is in `package.json` but no file imports it yet. Import from `"motion/react"`.
- Use the `transform` string, not the `y` shorthand, for the toast (the shorthand runs on the main thread).

## Steps

1. Edit `Chat.tsx` as in the target. Add the import. Keep `dismissToast` as it is.
2. Add the classes to `DropOverlay.tsx`, `MyListingsPanel.tsx` (line 136 only) and `conversation.tsx` (line 47 only).
3. Check that `slide-in-from-bottom-2` and `zoom-in-95` exist in `node_modules/tw-animate-css`. If a class does not exist, STOP and report.

## Boundaries

- Do NOT edit `side-panel.tsx` or any panel push/back transition. Another worker owns them.
- Do NOT change `useStickToBottom` options in `conversation.tsx`, the View Transition code in `Chat.tsx`, or `withTransition`.
- Do NOT add reduced-motion handling.
- Do NOT touch `styles.css`.
- If the code does not match the excerpts, STOP and report.

## Verification

- **Mechanical**: `bun --cwd /home/omznc/dev/lagano-shop/apps/shop run typecheck`. Then `cccc --table apps/shop/src/components/Chat.tsx apps/shop/src/components/shell/DropOverlay.tsx apps/shop/src/components/account/MyListingsPanel.tsx apps/shop/src/components/ai-elements/conversation.tsx --max-cognitive 15 --max-cyclomatic 10`. Report old functions over the limit; do not refactor them.
- **Feel check**:
  - Copy an answer. The toast must rise in, stay 2.4 s, and fade out and sink. Copy twice fast: no flash or restart.
  - Drag a file over the window. The dim layer must fade in, not pop.
  - Open "Moji oglasi" and press delete. The confirm must slide up a little and fade in.
  - Scroll up in a long chat. The scroll button must fade in.
  - Use the Animations panel at 10 percent speed to confirm the toast does not jump horizontally.
- **Done when**: the four elements animate, and the toast animates on exit.
