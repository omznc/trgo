# 005: Move the toggle thumb with transform

- **Status**: TODO
- **Commit**: no commit (working tree 2026-11-11)
- **Severity**: MEDIUM
- **Category**: Performance, Easing
- **Estimated scope**: 1 file (`apps/shop/src/components/sell/DraftCard.tsx`), 2 lines

## Problem

The thumb of the switch animates `left`, a layout property. It uses the Tailwind default curve and 150 ms.

```tsx
/* apps/shop/src/components/sell/DraftCard.tsx:106-107 - current */
<span aria-hidden className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors ${on ? "bg-ok" : "bg-white/18"}`}>
	<span className={`absolute top-[3px] size-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.3)] transition-[left] ${on ? "left-[21px]" : "left-[3px]"}`} />
</span>
```

## Target

The thumb sits at `left: 3px` and moves 18 px (21 minus 3). A CSS transition retargets from the current state, so a fast double tap stays smooth.

```tsx
<span aria-hidden className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-ok" : "bg-white/18"}`}>
	<span className={`absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.3)] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${on ? "translate-x-[18px]" : "translate-x-0"}`} />
</span>
```

Tailwind v4 writes `translate-x-*` to the `translate` property. `transition-transform` covers the `translate` property in v4.

## Repo conventions to follow

- Arbitrary values in the form `ease-[cubic-bezier(...)]`, as `ProviderRow` and `ui.tsx` use arbitrary Tailwind values.

## Steps

1. Edit the two lines as in the target.

## Boundaries

- Do NOT change `Toggle` markup, the `sr-only` input, or `sell-focus-within`.
- Do NOT add reduced-motion handling.
- Do NOT touch other files.

## Verification

- **Mechanical**: `bun --cwd /home/omznc/dev/lagano-shop/apps/shop run typecheck`.
- **Feel check**: click a switch fast, 5 times. The thumb must reverse from where it is, with no jump. Check the final positions: on = right end, off = left end, 3 px from each edge.
- **Done when**: no `transition-[left]` remains in the file.
