# 010: Feedback when an action needs a connection

Status: DONE (header pill, Moji oglasi button and start banner pulse still need Header.tsx and EmptyState.tsx)

## Problem

When the user does an action that needs a connection, the feedback is weak or wrong:
- Send, Enter, or a suggestion chip with no OpenRouter key.
- Publish, retry, or "Moji oglasi" with no OLX or SVEX session.

The panel blurs and unblurs, or nothing visible happens.

## Required behaviour

1. One API in `src/components/shell/side-panel.tsx`: `requireConnection(provider: 'openrouter' | 'olx' | 'svex', reason: string)`.
   - If the connect view for that provider is not on top, open it (fresh when the panel is closed, push when another view is open).
   - If it is already on top, do not animate the page. Play the attention cue on that provider's card: a short horizontal shake of about 300 ms (Apple "wrong password" style, 3 decaying oscillations) plus an accent ring pulse. Move the focus to the card's primary button.
   - Show `reason` as a one-line banner at the top of that card, in Bosnian.
2. No OpenRouter key:
   - Send, Enter or a suggestion chip keeps the text in the composer. A suggestion chip fills the composer. The text is not lost.
   - Call `requireConnection('openrouter', 'Poveži OpenRouter da pošaljem poruku.')`.
   - The composer gives the same small shake on the send button.
   - The send button is never `disabled` for this case, because a disabled button gives no feedback.
   - After a successful connect, send the pending message automatically, one time, and close the panel.
3. No OLX or SVEX session:
   - The approval card "Objavi" for a provider without a session, a provider retry, "Moji oglasi", and a status pill dot all call `requireConnection(provider, ...)` with a reason. Examples: "Poveži OLX da objavim oglas.", "Poveži OLX da vidim tvoje oglase."
   - After a successful login, continue the action if it is safe: reopen "Moji oglasi", or enable "Objavi" again. Never publish automatically.
   - Search on OLX and SVEX needs no login. The OLX.ba / SVEX.ba chips in the composer stay plain source toggles and need no connect feedback.
4. The connect banner on the start screen pulses one time when a send is blocked and it is visible.
5. Motion: transform and opacity only. The shake keyframes go in `styles.css`. The app does not support reduced motion.

## Verify

Use Playwright with mocks, at 1440x900 and 390x844:
- Send with no key, with the panel closed and with the panel open. The text is kept, the cue plays, and the page does not re-animate.
- Do the connect. The pending message sends one time.
- Click "Moji oglasi" with no OLX session.
- Do an approval with no SVEX session.
