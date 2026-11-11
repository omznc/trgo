# Animation plans

Stamp: no commit (working tree 2026-11-11). Scope: `apps/shop/src`.

Product rule: the app does not support `prefers-reduced-motion`. No plan adds reduced-motion handling.
Another worker rebuilds the side panel transition (`components/shell/side-panel.tsx`). No plan touches that file.

| # | Title | Severity | Status | File set (one owner for each file) |
| --- | --- | --- | --- | --- |
| 001 | Fix fill mode, gate hover, reduced-transparency | HIGH | DONE | `src/styles.css` |
| 002 | Stop card stagger replay | HIGH | DONE | `src/components/ListingCards.tsx`, `src/components/shell/ListingCard.tsx` |
| 003 | Measure Horizon, cut layout work | MEDIUM | TODO | `src/components/shell/Horizon.tsx` |
| 004 | Sell progress bar with transform, fill mode | MEDIUM | DONE | `src/components/sell/sell.css`, `src/components/sell/ProviderRow.tsx` |
| 005 | Toggle thumb with transform | MEDIUM | DONE | `src/components/sell/DraftCard.tsx` |
| 006 | Enter and exit polish (toast, drop overlay, delete confirm, scroll button) | LOW | DONE | `src/components/Chat.tsx`, `src/components/shell/DropOverlay.tsx`, `src/components/account/MyListingsPanel.tsx`, `src/components/ai-elements/conversation.tsx` |
| 007 | Photo reorder FLIP | LOW | DONE | `src/components/sell/PhotoUploader.tsx` |
| 010 | Feedback when an action needs a connection | MEDIUM | DONE | `src/components/Chat.tsx`, `src/components/shell/use-pending-send.ts`, `src/components/sell/*`, `src/components/account/MyListingsPanel.tsx` |

## Execution order

All file sets are disjoint. All seven plans can run in parallel, with no dependency.

Suggested order if one executor does them in sequence: 001, 002, 004, 005, 006, 007, 003 (003 needs a browser trace).

## Not planned

- Phone bottom sheet: drag-to-close, momentum, rubber-band, exit animation, scrim press scale. The work is in `side-panel.tsx`, which another worker owns. SPEC (Phones 2.3) asks for "drag the grabber down to close". Plan this after the rebuild lands.
- Design-specified motion that stays: `springIn` overshoot and 0.55 s, the 0.7 s composer View Transition, the `attn` pulse, the confetti, the `shim` and `dot` loops, the typography tracking.
- Feel checks that code cannot decide: the composer View Transition can stretch or double-expose the composer (size 720 x 3 rows to 872 x 1 row), and it blocks pointer input for 0.7 s.
