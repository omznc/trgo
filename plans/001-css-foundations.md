# 001: Fix fill mode, gate hover, add reduced-transparency fallback

- **Status**: TODO
- **Commit**: no commit (working tree 2026-11-11)
- **Severity**: HIGH (fill mode), MEDIUM (hover gate, transparency)
- **Category**: Interruptibility, Accessibility, Materials (apple-design)
- **Estimated scope**: 1 file (`apps/shop/src/styles.css`), about 20 lines

## Problem

1. An animation with `both` fill keeps its last keyframe as an animation value after it ends.
   An animation value beats the normal rules of the author. The last keyframe of `springIn` is `transform: none`.
   So the base rule `button:not(:disabled):active { transform: scale(0.97) }` never applies to an element with class `in`.
   Each listing card is `<button class="glass in ...">` (`components/shell/ListingCard.tsx:53`).
   Result: a listing card gives no press feedback. This follows from the CSS cascade; the audit did not test it in a browser.

```css
/* apps/shop/src/styles.css:275-313 - current */
.in {
	animation: springIn 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.25) both;
}
.dock {
	animation: dock 0.7s cubic-bezier(0.2, 0.9, 0.3, 1) both;
}
.fly {
	animation: flyIn 0.45s cubic-bezier(0.2, 0.9, 0.3, 1) both;
}
.rise {
	animation: rise 0.4s cubic-bezier(0.2, 0.9, 0.3, 1) both;
}
```

2. The hover rule is not gated. On a touch screen the hover state stays after a tap, so the button stays brighter.

```css
/* apps/shop/src/styles.css:126-129 - current (inside @layer base) */
button:not(:disabled):hover,
a.btn:hover {
	filter: brightness(1.12);
}
```

3. The glass surfaces (`.glass`, `.solid`) use `backdrop-filter`. They have no fallback for `prefers-reduced-transparency`.
   Text on a blurred layer can lose contrast for a user who asks for less transparency.

## Target

The curves, durations and keyframes do not change. The design (SPEC S3) sets them.

```css
/* target 1: change "both" to "backwards" on .in, .dock, .fly, .rise */
.in {
	animation: springIn 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.25) backwards;
}
/* same change for .dock (0.7s), .fly (0.45s) and .rise (0.4s), values unchanged */

/* target 2: inside @layer base */
@media (hover: hover) and (pointer: fine) {
	button:not(:disabled):hover,
	a.btn:hover {
		filter: brightness(1.12);
	}
}

/* target 3: new block, placed directly after the ".solid { ... }" rule (about line 173) */
@media (prefers-reduced-transparency: reduce) {
	.glass,
	.solid,
	html .side-panel {
		-webkit-backdrop-filter: none;
		backdrop-filter: none;
		background: var(--color-solid);
	}
}
```

The end state of each keyframe equals the natural state of the element. So `backwards` looks the same as `both`.
`backwards` still holds the `from` keyframe during the delay, which the card stagger needs.

## Repo conventions to follow

- Tokens live in the `@theme` block at the top of `styles.css`. Do not add new tokens.
- Keep tab indentation, as the file does now.

## Steps

1. In `.in`, `.dock`, `.fly` and `.rise`, replace the word `both` with `backwards`.
2. Wrap the hover rule (lines 126-129) in `@media (hover: hover) and (pointer: fine) { ... }`. Keep it inside `@layer base`.
3. Add the reduced-transparency block from the target after the `.solid` rule.

## Boundaries

- Do NOT edit the `.side-panel` rules, the `@media (min-width: 640px)` block for `.side-panel`, or the `prefers-reduced-motion` block. Another worker owns them.
- Do NOT add any reduced-motion handling. The product keeps all animation on by design.
- Do NOT change any curve, duration or keyframe.
- Do NOT touch `sell.css`. Plan 004 owns it.
- If the code does not match the excerpts, STOP and report.

## Verification

- **Mechanical**: `bun --cwd /home/omznc/dev/lagano-shop/apps/shop run typecheck` passes. Run the dev server and confirm that the CSS has no parse error.
- **Feel check**:
  - Hold the mouse down on a listing card. The card must shrink to 0.97. Before the fix it did not.
  - Read the computed `transform` of the card in DevTools while the mouse is down.
  - Open the page with touch emulation and tap a button. The button must not stay bright after the tap.
  - Emulate `prefers-reduced-transparency: reduce` in the Rendering panel. The glass surfaces must have a solid background and no blur.
  - Set animation speed to 10 percent in the Animations panel. The message entrance must look the same as before.
- **Done when**: the four classes use `backwards`, the hover rule is gated, and the transparency block exists.
