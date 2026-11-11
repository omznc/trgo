# 004: Animate the sell progress bar with transform, fix fill mode

- **Status**: TODO
- **Commit**: no commit (working tree 2026-11-11)
- **Severity**: MEDIUM
- **Category**: Performance, Interruptibility, Materials
- **Estimated scope**: 2 files (`components/sell/sell.css`, `components/sell/ProviderRow.tsx`), about 15 lines

## Problem

1. The progress bar animates `width`. This is a layout property.

```css
/* apps/shop/src/components/sell/sell.css:96-98 - current */
.sell-bar {
	transition: width 0.3s ease;
}
```

```tsx
/* apps/shop/src/components/sell/ProviderRow.tsx:36 - current */
<div className={`sell-bar h-full ${FILL[props.state]}`} style={{ width: `${width}%` }} />
```

2. `.sell-in` uses `both` fill mode. The last keyframe keeps `transform: none` as an animation value (same cause as plan 001).

```css
/* sell.css:48-50 - current */
.sell-in {
	animation: sell-spring-in 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.25) both;
}
```

3. `.sell-glass` has no fallback for `prefers-reduced-transparency` (`sell.css:100-104`).

## Target

```css
/* sell.css */
.sell-in {
	animation: sell-spring-in 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.25) backwards;
}
.sell-bar {
	transform-origin: left;
	transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}
/* directly after the .sell-glass rule, inside @layer components */
@media (prefers-reduced-transparency: reduce) {
	.sell-glass {
		background: var(--color-solid, rgba(20, 22, 42, 0.94));
		-webkit-backdrop-filter: none;
		backdrop-filter: none;
	}
}
```

```tsx
/* ProviderRow.tsx:36 */
<div className={`sell-bar h-full ${FILL[props.state]}`} style={{ transform: `scaleX(${width / 100})` }} />
```

The bar sits in a track with `overflow-hidden rounded-md`. The scaled bar has no corner radius of its own, so the track clips it as before.

## Repo conventions to follow

- Prefix names with `sell-` in `sell.css`. Keep the `@layer` structure at the top of the file.
- Easing: the curve `cubic-bezier(0.23, 1, 0.32, 1)` is the strong ease-out for UI.

## Steps

1. In `sell.css`, change `both` to `backwards` in `.sell-in`.
2. Replace the `.sell-bar` rule as in the target.
3. Add the reduced-transparency block after the `.sell-glass` rule.
4. In `ProviderRow.tsx`, change the style of the bar as in the target.

## Boundaries

- Do NOT edit the `prefers-reduced-motion` block in `sell.css`. Another worker owns it. Do NOT add reduced-motion handling.
- Do NOT change `styles.css`, `ApprovalCard.tsx`, `SuccessCard.tsx` or the confetti. The pulse and the confetti are set by the design.
- If the code does not match the excerpts, STOP and report.

## Verification

- **Mechanical**: `bun --cwd /home/omznc/dev/lagano-shop/apps/shop run typecheck`.
- **Feel check**: start a publish. The bar must grow from the left without a jump at 0 percent and at 100 percent.
  Look at the Performance panel: no Layout event may run for the bar.
  Emulate `prefers-reduced-transparency: reduce` and confirm a solid background on the photo card.
- **Done when**: no `width` transition remains in `sell.css`, and the bar uses `scaleX`.
