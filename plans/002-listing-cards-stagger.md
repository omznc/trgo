# 002: Stop the card stagger replay on sort and filter

- **Status**: DONE
- **Commit**: no commit (working tree 2026-11-11)
- **Severity**: HIGH
- **Category**: Purpose and frequency
- **Estimated scope**: 2 files, about 25 lines

## Problem

The user sorts or filters the results often. Each click replays the full card entrance. Two causes:

1. The key contains the index, so any reorder changes every key and React remounts every card.
   Each remount runs the 0.55 s entrance with a delay of up to 560 ms.
2. The delay is `min(index, 8) * 70` ms. A card from the "show more" click (index 8 or more) waits 560 ms.
   This is latency on a direct user action.

```tsx
/* apps/shop/src/components/ListingCards.tsx:118-120 - current */
{cards.slice(0, shown).map((card, i) => (
	<ListingCard key={`${card.url}-${i}`} card={card} index={i} view={view} />
))}
```

```tsx
/* apps/shop/src/components/shell/ListingCard.tsx:41 and :51 - current */
export function ListingCard({ card, index, view }: { card: DetailListing; index: number; view: ViewMode }) {
...
	style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
```

The design sets the 70 ms stagger for the first reveal of a result list (SPEC, Chat screen). Keep it for the first reveal only.

## Target

- The key is stable for one listing: the URL plus a counter for a repeated URL.
- The first reveal of a list keeps `min(i, 8) * 70` ms.
- A card that mounts after the first reveal (show more, filter) has a delay of 0 ms. The entrance (0.55 s, springIn) is unchanged.
- The delay is read once, at mount. A later render never changes the delay of a running animation.

```tsx
/* ListingCards.tsx - add above Results */
function stableKeys(cards: DetailListing[]) {
	const seen = new Map<string, number>();
	return cards.map((c) => {
		const n = seen.get(c.url) ?? 0;
		seen.set(c.url, n + 1);
		return `${c.url}#${n}`;
	});
}

/* inside Results */
const settled = useRef(false);
useEffect(() => {
	settled.current = true;
}, []);
const keys = stableKeys(cards);
...
{cards.slice(0, shown).map((card, i) => (
	<ListingCard key={keys[i]} card={card} stagger={settled.current ? 0 : Math.min(i, 8) * 70} view={view} />
))}
```

```tsx
/* ListingCard.tsx */
export function ListingCard({ card, stagger, view }: { card: DetailListing; stagger: number; view: ViewMode }) {
	const [delay] = useState(stagger); // read once at mount
...
	style={{ animationDelay: `${delay}ms` }}
```

## Repo conventions to follow

- Import hooks from "react" in the same line style as the file now has (`import { useMemo, useState } from "react"` at `ListingCards.tsx:3`).
- Keep tab indentation.

## Steps

1. In `ListingCard.tsx`, import `useState` from "react". Replace the `index` prop with `stagger`. Add the `delay` state and use it in the style.
2. In `ListingCards.tsx`, add `useEffect` and `useRef` to the React import. Add `stableKeys`. Edit `Results` as in the target.
3. Search for other users of the `index` prop of `ListingCard` with `rg -n "ListingCard\b" apps/shop/src`. At the audit time only `ListingCards.tsx:119` uses it.

## Boundaries

- Do NOT change `SkeletonCard`, the `.in` keyframes, or `styles.css`.
- Do NOT add a sort animation (FLIP). A reordered card may jump. That is accepted.
- Do NOT add reduced-motion handling.
- If the code does not match the excerpts, STOP and report.

## Verification

- **Mechanical**: `bun --cwd /home/omznc/dev/lagano-shop/apps/shop run typecheck`. Then `cccc --table apps/shop/src/components/ListingCards.tsx apps/shop/src/components/shell/ListingCard.tsx --max-cognitive 15 --max-cyclomatic 10`.
- **Feel check**: run a search that returns more than 8 results.
  - On first reveal, the cards enter one after the other with 70 ms steps.
  - Click the condition filter and the sort button. The cards that stay must not animate again.
  - Click "show more". The new cards must start at once, with no wait.
  - Use the Animations panel at 10 percent speed to confirm that no card restarts.
- **Done when**: no card remounts on sort or filter, and no delay is above 0 ms after the first reveal.
