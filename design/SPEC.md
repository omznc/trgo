# SPEC: trgo UI redesign (from canvas "Lagano Shop – UI redesign")

Source: claude.ai artifact `f46c0b1f-f452-4235-a480-62b6130c1d8d`, version `1794429211-2650`. The saved artboards are in `design/canvas/` and are byte-exact (sha256 matches the artifact file list). Target: React + Tailwind v4 in `apps/shop` (TanStack Start).

## 0. Rename (read first)

- The project is renamed. The brand is "trgo" (domain trgo.dev). Write the wordmark as TRGO. The mascot (the robot at the stall) is named "Trgo".
- The canvas has no wordmark text: the header shows only the mascot SVG (30x24) as logo link. The word "Lagano" appears in the canvas file `canvas.json` title only. Where a wordmark is needed (for example the page title or a header text), use TRGO.
- Do not rename files or folders yet. The owner does that after this spec.

### Rename list (strings that use "lagano"; decide each one)

Source: `apps/shop/src/lib/strings.ts`. The canvas has no equivalent string for items 1-3 marked "no canvas text".

| # | Key | Current text | Note |
|---|---|---|---|
| 1 | `brand` | Lagano Shop | no canvas text; becomes "trgo" / TRGO |
| 2 | `tagline` | Kupi i prodaj lagano. | no canvas text; the canvas hero says "Šta tražimo?" |
| 3 | `typing` | Lagano razmišlja... | the canvas thinking indicator has no name; see States 2.11 |
| 4 | `connectBody` | Lagano koristi tvoj OpenRouter račun za razgovor. ... | canvas banner says "Prijavi se jednim klikom. Ključ ostaje samo u ovom pregledniku." |
| 5 | package, route and repo names | `lagano-shop`, `lagano` | do after the spec |

Search again with `rg -n -i "lagan"` in `apps/shop`, `README` and the package manifests before the rename.

## 1. Layout and scroll rules (these override the artboards)

1. The page never scrolls. The app shell is fixed to the viewport: `html, body { height: 100%; overflow: hidden }` and the root element `height: 100dvh; overflow: hidden; display: flex; flex-direction: column`.
2. Each region scrolls on its own. The chat message list has its own scroll container. A side panel (Detail board 3, Settings board 7, any split view) has its own scroll container. A list screen (My listings, Connect, States) scrolls inside its `main`.
3. The chat input is always visible. It is pinned at the bottom of the chat column, outside the chat scroll container. It is a flex child (`flex: none`), not `position: sticky` inside a scrolling page. The keyboard on phones must not hide it: use `100dvh` and `<meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">`.
4. Custom scrollbars match the tokens. Put them on every scroll container with the class `.scroll`:

```css
.scroll {
  overflow-y: auto;
  scrollbar-gutter: stable;
  scrollbar-width: thin;                              /* Firefox, Chrome 121+ */
  scrollbar-color: rgba(255,255,255,.18) transparent; /* thumb, track */
}
.scroll:hover { scrollbar-color: rgba(255,255,255,.32) transparent; }
.scroll::-webkit-scrollbar { width: 8px; height: 8px; }          /* Safari */
.scroll::-webkit-scrollbar-track { background: transparent; }
.scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18); border-radius: 0; }
.scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.32); }
```

   Values: thumb `rgba(255,255,255,.18)` is the glass border color family (`.10` border, `.18` dashed border); hover `.32`; square (no radius); track transparent; width 8px.

What the artboards do now, and what to change:

| Artboard | In the canvas | In the app |
|---|---|---|
| Main (1) | root `height:100vh; min-height:760px; overflow:hidden` | scroll container: none (content centered); use `100dvh`, drop `min-height` or let `main` scroll |
| Chat (2) | root `min-height:100vh`; whole document scrolls; header `position:sticky; top:0; z-index:5`; composer dock `position:sticky; bottom:0; z-index:4` | header and composer are flex children; scroll container: the message list (`flex:1; min-height:0`) |
| Detail (3) | chat column scrolls with the page; panel `aside` has `overflow-y:auto` | scroll containers: chat list and panel body, each separate |
| Settings (7) | page scrolls and the panel has its own scrollbar | KNOWN DESIGN ERROR: two scrollbars. Keep only the panel scroll container (and the chat list if the chat is shown) |
| Sell 4a-4d | sticky header and composer inside a scrolling page | same as Chat: scroll container is the message column |
| My listings (5), Connect (6), States (8) | page scroll | scroll container: `main` below the header |
| Phones (9) | content `overflow:hidden` (canvas does not scroll it); sheet body `overflow-y:auto`; card carousel `overflow-x:auto` | scroll containers: message list, sheet body, carousel (x) |

Each screen section in part 4 names its scroll container again.

## 2. Tokens

The canvas has no `:root` custom properties. Colors are literals. The only variables are `--p` (dither pixel, px), `--c` (ring color) and `--r` (ring radius). Put the tokens below in the Tailwind v4 `@theme` block.

### 2.1 Colors (dark only; the canvas has no light theme, except the light "approval" card, see SellApprove)

| Token (suggested) | Hex / value | Role and where used |
|---|---|---|
| `--color-bg` | `#0E1020` | page background, text on accent buttons, send icon |
| `--color-fg` | `#F5F5F7` | main text, primary button background |
| `--color-fg-hover` | `#FFFFFF` | link hover |
| `--color-fg-2` | `rgba(235,235,245,.82)` | footer pill text, description text (`.86` in sheet) |
| `--color-fg-3` | `rgba(235,235,245,.68)` | secondary text, ghost buttons, `.lbl` |
| `--color-fg-4` | `rgba(235,235,245,.56)` | meta text, "nije povezan" suffix |
| `--color-placeholder` | `rgba(235,235,245,.45)` | textarea and input placeholder |
| `--color-accent` | `#FF9646` (prop `accent`; options `#FF9646`, `#F5C518`, `#7DD3A8`, `#8FB4FF`) | send button, user bubble, selected card border, progress fill, mascot body |
| `--color-focus` | `#8FB4FF` | focus ring `2px solid`, offset 3px |
| `--color-ok` | `#34C759` | connected dot, success |
| `--color-off` | `#8E8E9A` | not-connected dot |
| `--color-warn` | `#FFB340` | warning banner |
| `--color-danger` | `#FF6B61` (also `#FF8A80`) | error text, delete |
| `--color-glass` | `rgba(22,24,46,.58)` | `.glass` fill |
| `--color-solid` | `rgba(20,22,42,.94)` | `.solid` fill (menus, dialogs, sheet) |
| `--color-chip` | `rgba(255,255,255,.07)` (border `.08`) | `.chip`, `.field` fill is `.06` |
| `--color-border` | `rgba(255,255,255,.10)` | glass, solid and field border; dashed off-toggle `.18` |
| `--color-card-img` | `#232745` | image placeholder behind card images |
| Horizon pale / pink / indigo | `#FFE2A8` / `#C2407A` / `#33298F` | sun rings (pale core, accent, pink, indigo outwards) |
| Mascot feet | `#C9672A` | mascot SVG |
| Stars | `#EEF0FA`, `#B4BAD6`, `#8089AD` | 6 square stars on Main |
| Keyboard mock | `#2B2C31`, keys `#4A4B52`, special `#3A3B40` | Phones mock only, not a real component |
| Scrim | `rgba(5,6,15,.55)` | bottom sheet scrim |

### 2.2 Fonts

- Family: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Inter, system-ui, sans-serif`. Inter is the web font (Google Fonts `Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700`, `display=swap`). Weights: 400, 500, 600, 700.
- Mono (version link only): `ui-monospace, 'SF Mono', Menlo, monospace`. System font: no file needed.
- The canvas does not use Silkscreen or Nunito. The app now loads `@fontsource-variable/nunito` and `@fontsource/silkscreen`: remove them, or keep Silkscreen only if the mascot or a pixel label needs it (the canvas does not).
- Self-host. Do not link Google Fonts at run time. Use `@fontsource-variable/inter` (wght axis) and, to match the canvas optical size, `@fontsource-variable/inter/opsz.css` (axes wght + opsz). Import the `latin` and `latin-ext` subsets. Inter supports Latin Extended-A (č ć š ž đ: U+010D, U+0107, U+0161, U+017E, U+0111). Check in the browser: write "Šta tražimo? čćšžđ ČĆŠŽĐ" in each weight 400-700 and confirm that no fallback glyph shows. The `unicode-range` for `latin-ext` must be loaded, or the diacritics fall back to the system font.
- Rendering: `-webkit-font-smoothing: antialiased` on the root.

### 2.3 Type styles (size / weight / line-height / letter-spacing)

| Style | Value | Where |
|---|---|---|
| Hero h1 | 56px / 700 / 1.07 / -0.035em | "Šta tražimo?" (Main). No clamp in the canvas: add `clamp(32px, 9vw, 56px)` for phones |
| Composer input | 17px / 400 / 1.5 / -0.01em | Main, Chat composer (phone: 16px to stop iOS zoom) |
| AI text | 16px / 400 / 1.5 | assistant message (phone) |
| Price large | 28px / 700 / - / -0.03em | detail sheet price |
| Card price | 18px / 700 | result card |
| Banner title | 15px / 600 | connect banner |
| Button / chip | 14px / 500 / - / -0.01em | pills (height 40) |
| Status chip, model button | 13px / 500 | header |
| Subtitle, meta | 13px / 400, 12px, 11px | see parts |
| `.lbl` | 12px / 600 / - / .02em, uppercase | form labels |
| Footer pill | 12px / 500 | footer |

Part 4 gives every other value per component.

### 2.4 Spacing, radii, borders, shadows

- Spacing in use: 2, 4, 6, 7, 8, 10, 12, 14, 16, 18, 20, 22, 24, 48 px. The scale is a 2 px grid, not a strict 4 px scale. Use arbitrary values (`p-[14px]`) where the part says so.
- Radii: 999px (pills, send, chips), 28px (composer), 24px (connect cards), 22px (banner, cards), 20px (phone cards), 18px (bubbles, sheet image), 16px, 15px (card image), 14px, 12px (`.field`), 6px (bubble tail corner, keys), 54px/44px (phone device mock, not for the app), 0 (scrollbar, header border-radius when sticky).
- Borders: 1px solid `rgba(255,255,255,.10)` (glass, solid, field); 1px `.08` (chip); dashed 1px `.18` (off toggle); header bottom `border-width:0 0 1px`; selected card `1px {{accent}}`.
- Shadows:
  - glass: `inset 0 1px 0 rgba(255,255,255,.07), 0 24px 60px rgba(0,0,0,.35)`
  - solid: `0 30px 80px rgba(0,0,0,.5)`
  - primary button: `0 8px 24px rgba(0,0,0,.25)`
  - many cards set `box-shadow:none` inline.
- Blur: glass `backdrop-filter: blur(28px) saturate(170%)`; solid `blur(30px)`.
- z-index: header 5 (Chat), composer dock 4, scroll button 4, phone header 3, composer 3, scrim 4, sheet 5.

### 2.5 Patterns (exact CSS)

Dither classes for the sun (`--p` = pixel size, default 2px; `--c` ring color):

```css
.d6  { background: conic-gradient(at var(--p) var(--p), transparent 0 75%, var(--c) 0) 0 0/calc(var(--p)*4) calc(var(--p)*4) }
.d12 { background: conic-gradient(at var(--p) var(--p), transparent 0 75%, var(--c) 0) 0 0/calc(var(--p)*4) calc(var(--p)*4),
                   conic-gradient(at var(--p) var(--p), transparent 0 75%, var(--c) 0) calc(var(--p)*2) calc(var(--p)*2)/calc(var(--p)*4) calc(var(--p)*4) }
.d25 { background: conic-gradient(at var(--p) var(--p), transparent 0 75%, var(--c) 0) 0 0/calc(var(--p)*2) calc(var(--p)*2) }
.d50 { background: repeating-conic-gradient(var(--c) 0 25%, transparent 0 50%) 0 0/calc(var(--p)*2) calc(var(--p)*2) } /* checkerboard */
.d75 { background: conic-gradient(at var(--p) var(--p), var(--c) 0 75%, transparent 0) 0 0/calc(var(--p)*2) calc(var(--p)*2) }
.d100 { background: var(--c) }
.sun  { position: absolute; left: 50%; width: 0; height: 0; pointer-events: none }
.ring { position: absolute; border-radius: 50%; left: calc(var(--r)*-1); top: calc(var(--r)*-1); width: calc(var(--r)*2); height: calc(var(--r)*2) }
```

The sun script (ring list, sway, breathing, flicker) is in part 4, Main section 3. No scanlines. No `image-rendering: pixelated` anywhere: the mascot uses SVG `shape-rendering="crispEdges"` on `viewBox="0 0 20 16"` (1 unit = 1 pixel cell). Listing photos use `object-fit: cover`, no filter except `grayscale(...)` on the unavailable card (States 2.8).

Animation keyframes (defined in every artboard): `springIn` .55s `cubic-bezier(.2,.9,.3,1.25)` both; `dock` .7s `cubic-bezier(.2,.9,.3,1)`; `attn` 2.6s ease-in-out .8s infinite; `shim` 1.4s linear infinite; `spin` .9s linear infinite; `blink` 1.2s ease-in-out infinite (dots delay 0, .15s, .3s); `caret` 1s steps(1) infinite; `fall` 2.8s linear infinite; `flyIn` .45s `cubic-bezier(.2,.9,.3,1)` both; `fade`. Reduced motion: `.in, .dock, .fly` use `fade .3s ease both`; `.attn, .shim, .spin, .conf, .caret, .dot1-3` use `animation:none`; the sun timer does not start. Exact keyframe bodies are in Main section 4 and States "Keyframes".

Global interaction rules (same in every artboard): all `button, a`: `transition: transform .15s ease, filter .15s ease, background-color .15s ease`; hover `filter: brightness(1.12)`; active `transform: scale(.97)`; focus-visible `outline: 2px solid #8FB4FF; outline-offset: 3px`. No disabled and no error style is defined in Main: see States 2.12 and the Connect "Form field states" for those.

## 3. Components inventory (index)

Each component has full structure, styles, states and copy in the part named. 33 components.

| # | Component | Part (section) |
|---|---|---|
| 1 | Header (desktop, glass, sticky) | Chat "Header"; Main 2 "Header"; States 2.1 |
| 2 | Account status chips (3 dots) | Main "Header"; States 2.3 |
| 3 | Model picker button | Main "Header"; Chat |
| 4 | Prompt input / composer (idle, docked, generating) | Main "Composer"; Chat "Composer"; Detail "Composer" |
| 5 | Source toggles (OLX.ba, SVEX.ba) | Main "Composer"; MyListings "Source filter toggles" |
| 6 | Suggestion chips | Main "Suggestion chips" |
| 7 | User message bubble (+ attached images) | Chat "User bubble"; Settings |
| 8 | Assistant message row and text | Chat "Assistant row", "Assistant text" |
| 9 | Tool / search status line (loading, done) | Chat "Search status line" |
| 10 | Filter bar | Chat "Filter bar" |
| 11 | Result grid and "Prikaži još" | Chat "Result grid"; Settings "Result grid" |
| 12 | Listing card and its states | Chat; Settings "Result card"; States 2.8 |
| 13 | Price-check card | Chat "Price-check card" |
| 14 | Scroll-to-bottom button | Chat |
| 15 | Detail panel (side) | Detail "Detail panel" |
| 16 | Detail bottom sheet (phone) | Phones 2.3 |
| 17 | Photo uploader (dropzone, thumbnails) | SellPhotos 2.4-2.6; States 2.10 |
| 18 | Draft card, editable fields, segmented control, toggle row, select | SellDraft 2.1-2.10 |
| 19 | Warning banner | SellDraft 2.9; States 2.4 |
| 20 | Approval card (light) | SellApprove 2.1 |
| 21 | Publish progress card | SellApprove 2.3 |
| 22 | Success card, partial-failure card | SellSuccess 2.2, 2.3 |
| 23 | My-listings row, status tabs, row menu, inline price edit, delete confirm | MyListings |
| 24 | Connect card, return-from-OpenRouter loading | Connect cells 1-2 |
| 25 | Key dialog (paste key, error state) | Connect cell 3 |
| 26 | OLX and SVEX login dialogs | Connect cells 4-5 |
| 27 | Connected accounts card | Connect cell 6 |
| 28 | "Šta čuvamo?" privacy panel | Connect cell 7 |
| 29 | Settings panel | Settings "Settings panel" |
| 30 | Toast, banner | States 2.4, 2.9 |
| 31 | Error cards (3 variants), empty result, thinking indicator | States 2.6, 2.7, 2.11 |
| 32 | Mascot (8 states) | States 2.5; Main; SellSuccess 2.1 |
| 33 | Footer pill, buttons row, form field states | Main "Footer pill"; States 2.12; Connect |

## 4. Screens and components (full detail per artboard)

The parts below are written per artboard. Each has: layout, components, interactions and script, tokens and patterns, a copy table and mobile rules. The Sell parts end with a shared-shell section (S1-S10) that repeats the same header, composer and tokens: read it once.

Scroll container per screen (apply section 1): Main none; Chat message list; Detail chat list + panel body; SellPhotos/Draft/Approve/Success message column; MyListings `main`; Connect `main`; Settings panel body (and chat list); States `main`; Phones message list, sheet body, card carousel (x).

## Screen: Main.dc.html - Početna, prazan chat (OpenRouter not connected)

Source: /home/omznc/dev/lagano-shop/design/canvas/Main.dc.html. Title: "Početna – prazan chat". `<html lang="bs">`. Preview 1440x900.

### 1. Layout
Root div: `position:relative; height:100vh; min-height:760px; overflow:hidden; background:#0E1020; color:#F5F5F7; display:flex; flex-direction:column; -webkit-font-smoothing:antialiased; --p:{{dither}}px`.
Font stack: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Inter, system-ui, sans-serif`.
Layers, back to front:
1. Sky layer: `position:absolute; inset:0; pointer-events:none; overflow:hidden; aria-hidden`. Holds 6 star spans and the sun (rings).
2. `header` (not sticky, not glass on this page): `position:relative; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:10px 24px`.
3. `main`: `position:relative; flex-grow:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:0 24px 48px; gap:22px`.
4. `footer`: `position:relative; padding:0 24px 18px; display:flex; justify-content:center`.
Nothing scrolls. The page is fixed at 100vh (min 760px). `main` centers its children vertically. Content max-width: 720px (cards), 760px (suggestion chips).
Stars (6 spans, `position:absolute`, square, no radius):
- left 9%, top 14%, 4x4, #EEF0FA
- left 21%, top 34%, 2x2, #8089AD
- left 34%, top 8%, 2x2, #B4BAD6
- left 63%, top 11%, 2x2, #8089AD
- left 78%, top 24%, 4x4, #B4BAD6
- left 92%, top 15%, 2x2, #EEF0FA

### 2. Components

### Global base CSS
- `html,body{margin:0;background:#0E1020}`; `*{box-sizing:border-box}`.
- `a{color:#F5F5F7} a:hover{color:#FFFFFF}`.
- `.sr` visually hidden: `position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap`.
- Placeholder color: `rgba(235,235,245,.45)` (textarea, input).
- All `button, a`: `-webkit-tap-highlight-color:transparent; transition:transform .15s ease, filter .15s ease, background-color .15s ease`.
- Hover: `button:hover, a.btn:hover {filter:brightness(1.12)}`.
- Active: `button:active, a.btn:active {transform:scale(.97)}`.
- Focus: `button/a/textarea/input/select:focus-visible {outline:2px solid #8FB4FF; outline-offset:3px}`.
- No disabled style is defined. No error style is defined.

### Surface classes
- `.glass`: `background:rgba(22,24,46,.58); backdrop-filter:blur(28px) saturate(170%) (+ -webkit-); border:1px solid rgba(255,255,255,.10); box-shadow:inset 0 1px 0 rgba(255,255,255,.07), 0 24px 60px rgba(0,0,0,.35)`.
- `.solid`: `background:rgba(20,22,42,.94); backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,.10); box-shadow:0 30px 80px rgba(0,0,0,.5)`. Not used on this page.
- `.chip`: `background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.08)`.
- `.field`: `background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); border-radius:12px; color:#F5F5F7; font:inherit; font-size:15px; padding:0 14px; height:44px; width:100%; outline:none`. Not used on this page.
- `.lbl`: `font-size:12px; font-weight:600; letter-spacing:.02em; color:rgba(235,235,245,.68); text-transform:uppercase`. Not used on this page.

### Header
Left group: `display:flex; align-items:center; gap:10px`.
- Logo link `a[href=Main.dc.html] aria-label="Početna"`: `display:grid; place-items:center; width:44px; height:44px`. Holds the mascot SVG 30x24 (see section 4).
- Button "Novi razgovor": `a.btn.chip href=Main.dc.html`. Style: `font-family:inherit; font-size:14px; font-weight:500; letter-spacing:-0.01em; display:inline-flex; align-items:center; gap:7px; border-radius:999px; padding:0 16px 0 13px; height:40px; min-height:40px; cursor:pointer; text-decoration:none; white-space:nowrap; color:#F5F5F7`. Icon: pencil, 15x15 stroke 2.2.
Right group: `display:flex; align-items:center; gap:8px; flex-wrap:wrap`.
- Status chip `.chip role=status aria-label="Status veza"`: `display:inline-flex; align-items:center; gap:14px; height:40px; padding:0 14px; border-radius:999px; font-size:13px; font-weight:500; color:#F5F5F7`. Three items, each `inline-flex; gap:6px`, with a dot `8x8; border-radius:999px; flex-shrink:0`:
  - OpenRouter: dot #8E8E9A (off), suffix span color `rgba(235,235,245,.56)` text " · nije povezan".
  - OLX: dot #34C759 (on), no suffix.
  - SVEX: dot #8E8E9A (off), suffix " · nije povezan".
- Model button `button aria-haspopup=listbox`: `font-size:13px; font-weight:500; display:inline-flex; gap:4px; color:rgba(235,235,245,.68); background:transparent; border:0; border-radius:999px; padding:0 10px; height:40px`. Text "Sonnet 5.5" plus chevron-down 14x14.
- "Moji oglasi": `a.btn href=MyListings.dc.html`; ghost button: same base as "Novi razgovor" but `color:rgba(235,235,245,.68); background:transparent; border:0`. Icon: layers 15x15.
- Settings: `a.btn.chip href=Settings.dc.html aria-label="Postavke"`; `padding:0; width:40px; justify-content:center; height:40px`. Icon: gear 15x15.

### Hero (in main)
`display:flex; flex-direction:column; align-items:center; gap:14px; text-align:center`.
- Sleeping mascot SVG `88x70`, `role=img aria-label="Maskota spava: OpenRouter nije povezan"`.
- `h1`: `margin:0; font-weight:700; font-size:56px; line-height:1.07; letter-spacing:-0.035em`. Text "Šta tražimo?".

### Connect banner
`div.glass.in`: `width:100%; max-width:720px; border-radius:22px; padding:14px 14px 14px 18px; display:flex; align-items:center; gap:14px; box-shadow:none`.
- Mascot SVG 44x35 (variant without sleep Z marks? it has the Z shape at top right, same as hero).
- Text block `flex-grow:1; display:flex; flex-direction:column; gap:2px`:
  - `strong` 15px/600: "Poveži OpenRouter da počnemo".
  - `span` 13px, `color:rgba(235,235,245,.68)`: "Prijavi se jednim klikom. Ključ ostaje samo u ovom pregledniku."
- Ghost button `a.btn href=Connect.dc.html`: "Zalijepi ključ" with key icon 15x15. Color `rgba(235,235,245,.68)`, transparent, no border, height 40.
- Primary button `a.btn href=Connect.dc.html`: "Poveži". `padding:0 16px; color:#0E1020; background:#F5F5F7; border:0; box-shadow:0 8px 24px rgba(0,0,0,.25); height:40px`.

### Composer
`form.glass`: `width:100%; max-width:720px; border-radius:28px; display:flex; flex-direction:column; padding:6px`.
- `label.sr for=prompt`: "Poruka".
- `textarea#prompt rows=3 placeholder="Npr. Ender 3 V3 printer ispod 600 KM"`: `resize:none; field-sizing:content; min-height:96px; max-height:240px; border:0; outline:none; background:transparent; color:#F5F5F7; font-family:inherit; font-size:17px; line-height:1.5; letter-spacing:-0.01em; padding:16px 18px 6px`.
- Toolbar: `display:flex; justify-content:space-between; align-items:center; padding:8px 6px 6px 10px; gap:12px; flex-wrap:wrap`.
  - Left group: `display:flex; gap:6px; flex-wrap:wrap; align-items:center; font-size:13px; font-weight:500`.
  - Attach `button.chip aria-label="Dodaj slike"`: `32x32; border-radius:999px; display:grid; place-items:center; color:#F5F5F7`. Icon: image 15x15.
  - Source toggle ON "OLX.ba": `button.chip aria-pressed=true`; `font:inherit; inline-flex; gap:6px; color:#F5F5F7; border-radius:999px; padding:0 12px 0 9px; height:32px`. Leading check icon 13x13, stroke = accent, stroke-width 2.8.
  - Source toggle OFF "SVEX.ba": `button aria-pressed=false`; `color:rgba(235,235,245,.68); background:transparent; border:1px dashed rgba(255,255,255,.18); border-radius:999px; padding:0 12px; height:32px`. No icon.
  - Model button "Sonnet 5.5": same as header but `height:32px`.
  - Send `button[type=submit] aria-label="Pošalji"`: `40x40; border:0; border-radius:999px; background:{{accent}}; color:#0E1020; display:grid; place-items:center`. Icon: arrow-up 18x18 stroke 2.6.

### Suggestion chips
Row: `display:flex; gap:8px; flex-wrap:wrap; justify-content:center; max-width:760px`. Three `a.btn.glass href=Chat.dc.html`: `font-size:14px; font-weight:500; letter-spacing:-0.01em; inline-flex; gap:7px; border-radius:999px; padding:0 16px 0 13px; height:40px; color:#F5F5F7; box-shadow:none`.
- search icon + "Nađi Ender 3 V3 ispod 600 KM"
- tag icon + "Koliko vrijedi moj iPhone 13?"
- plus icon + "Objavi oglas za slušalice"

### Footer pill
`div.glass`: `display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:center; font-size:12px; font-weight:500; color:rgba(235,235,245,.82); border-radius:999px; padding:7px 14px; box-shadow:none`.
Order: lock icon 12x12 (stroke 2.4), "Otvoreni kod", dot, "Ključ ostaje u tvom pregledniku", dot, "Proxy ništa ne čuva", dot, link "Izvorni kod" (`href=#`, `inline-flex; gap:4px; text-decoration:none; color:#F5F5F7`, external-link icon 11x11), dot, link "v0.4.2 · a1b2c3d" (`href=#`, `font-family:ui-monospace,'SF Mono',Menlo,monospace; text-decoration:none; color:#F5F5F7`). Dot = `span aria-hidden opacity:.5` with "·".

### 3. Interactions and script
Component class `Component extends DCLogic` (runtime `./support.js`; template tags `x-dc`, `sc-for`, `{{var}}`).
Props (editor panel, `data-props`):
- `accent`: color, default #FF9646, options #FF9646, #F5C518, #7DD3A8, #8FB4FF.
- `dither`: range 1..8 step 1 px, default 2, section "Horizont".
- `intensity`: range 0..100 step 1 %, default 12, section "Horizont".
- `bend`: range 0..100 step 1, default 0, section "Horizont".
- `$preview`: width 1440, height 900.
State: `t` (seconds since mount).
Lifecycle:
- `componentDidMount`: if `prefers-reduced-motion: reduce` matches, return (no timer, t stays 0). Else `setInterval` every 120 ms: `setState({t:(Date.now()-start)/1000})`.
- `componentWillUnmount`: `clearInterval`.
`renderVals` math:
- `p = max(1, round(dither))`; `q = 4*p`; `snap(v) = max(q, round(v/q)*q)`.
- `lx = sin(t*2π/18)` (18 s horizontal sway).
- `k = (0.4 + intensity/100*1.6) * (1 + 0.12*sin(t*2π/6))` (6 s breathing, +-12 %).
- `sag = 30 + bend*2.2`; `core = snap((720*720 + sag*sag)/(2*sag))` (circle radius for a 720 px chord with the sag height).
- Layers (class, color, thickness): pale `#FFE2A8`: d50 8, d25 8. accent: d100 16, d75 10, d50 12, d25 12, d12 14, d6 16. pink `#C2407A`: d100 24, d75 18, d50 18, d25 20, d12 22, d6 24. indigo `#33298F`: d100 40, d75 30, d50 32, d25 34, d12 38, d6 44.
- Rings list: first ring d100 pale radius `core`; then each layer adds `snap(thickness*k)` to the radius. List is reversed (largest ring first, so smaller rings paint on top).
- `flick = floor(t/0.9) % 2` (0.9 s toggle). A ring at layer index `i` with `i%3===1` shifts its `background-position` while `flick` is 1: `var(--p) 0` (d12: `var(--p) 0, calc(var(--p)*3) calc(var(--p)*2)`). Off value: `0 0` (d12: `0 0, calc(var(--p)*2) calc(var(--p)*2)`). This gives a shimmer of the dither.
- `sunOffset = core - round(18*k)` (Main only; Chat/Detail use `indigoStart + snap(24)`).
- `sunX = round((lx*140)/p)*p` (+-140 px, snapped to the dither pixel).
- Returns `{accent, dither:p, rings, sunOffset, sunX}`.
Sun placement: `.sun` at `top:calc(100% + {{sunOffset}}px); transform:translateX({{sunX}}px)`.
Click behaviour (links only, no JS):
- Logo and "Novi razgovor" -> Main.dc.html.
- "Moji oglasi" -> MyListings.dc.html. Settings -> Settings.dc.html.
- "Zalijepi ključ" and "Poveži" -> Connect.dc.html.
- Each of the 3 suggestion chips -> Chat.dc.html.
- Footer links -> `#`.
CSS animations: `.in` on the connect banner only (see section 4 keyframes). All other animation classes are defined but unused on this page.
Implied behaviour (not coded):
- Composer submit sends the message and goes to Chat.
- Model button opens a listbox (aria-haspopup).
- Source toggles flip `aria-pressed`; OLX.ba is on and SVEX.ba is off here because SVEX is not connected.
- Attach button opens a file picker for images.
- Textarea grows with content (`field-sizing:content`) between 96px and 240px.
- Status chip: green dot = connected, grey dot + "nije povezan" = not connected.

### 4. Patterns, tokens, fonts, images
Fonts: Google Fonts link `Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700` (`display=swap`, preconnect to fonts.googleapis.com and fonts.gstatic.com). Primary stack uses SF first; Inter is the fallback. Weights used: 400, 500, 600, 700. Mono: `ui-monospace,'SF Mono',Menlo,monospace`.
Colors (no CSS custom properties except `--p`, `--c`, `--r`; the values below are inline literals):
- bg #0E1020; text #F5F5F7; hover text #FFFFFF; link blue #8FB4FF (focus ring).
- Text alpha ramp: `rgba(235,235,245,.82)`, `.68`, `.56`, `.45` (placeholder).
- Glass fill `rgba(22,24,46,.58)`; solid fill `rgba(20,22,42,.94)`; chip fill `rgba(255,255,255,.07)`, chip border `.08`; glass border `.10`.
- Status on #34C759, off #8E8E9A.
- Accent default #FF9646 (prop).
- Horizon palette: pale #FFE2A8, pink #C2407A, indigo #33298F. Mascot: body = accent, #FFE2A8 hat/cap, #0E1020 eyes/mouth, #C2407A cheeks, #C9672A feet, #B4BAD6 Z marks.
Custom properties: `--p` (dither pixel, px) set on root; `--c` (ring color) and `--r` (ring radius px) set per ring.
Dither classes (exact CSS):
- `.d6{background:conic-gradient(at var(--p) var(--p),transparent 0 75%,var(--c) 0) 0 0/calc(var(--p)*4) calc(var(--p)*4)}`
- `.d12{background:conic-gradient(at var(--p) var(--p),transparent 0 75%,var(--c) 0) 0 0/calc(var(--p)*4) calc(var(--p)*4),conic-gradient(at var(--p) var(--p),transparent 0 75%,var(--c) 0) calc(var(--p)*2) calc(var(--p)*2)/calc(var(--p)*4) calc(var(--p)*4)}`
- `.d25{background:conic-gradient(at var(--p) var(--p),transparent 0 75%,var(--c) 0) 0 0/calc(var(--p)*2) calc(var(--p)*2)}`
- `.d50{background:repeating-conic-gradient(var(--c) 0 25%,transparent 0 50%) 0 0/calc(var(--p)*2) calc(var(--p)*2)}` (checkerboard)
- `.d75{background:conic-gradient(at var(--p) var(--p),var(--c) 0 75%,transparent 0) 0 0/calc(var(--p)*2) calc(var(--p)*2)}`
- `.d100{background:var(--c)}`
- `.sun{position:absolute;left:50%;width:0;height:0;pointer-events:none}`
- `.ring{position:absolute;border-radius:50%;left:calc(var(--r)*-1);top:calc(var(--r)*-1);width:calc(var(--r)*2);height:calc(var(--r)*2)}`
No scanlines, no `image-rendering` rule. Mascot SVG uses `shape-rendering="crispEdges"`, `viewBox="0 0 20 16"` (1 unit = 1 pixel cell, paths `Mx yh1v1h-1z`).
Mascot SVGs on this page:
- Header logo: 30x24, awake, no Z. Layers: #FFE2A8, accent, #0E1020, #C2407A, #C9672A.
- Hero: 88x70, sleeping: adds #B4BAD6 Z marks at top right; eyes closed (#0E1020 on row 9 only).
- Banner: 44x35, same as hero. `aria-hidden`.
Keyframes (all defined in every canvas):
- `springIn` .55s `cubic-bezier(.2,.9,.3,1.25)` both: from `opacity:0; transform:translateY(14px) scale(.97)` to `none`. Class `.in`. Used here on the banner.
- `dock` .7s `cubic-bezier(.2,.9,.3,1)` both: from `opacity:.6; translateY(-40vh)`. Class `.dock`. Unused here.
- `attn` 2.6s ease-in-out .8s infinite: box-shadow ring pulse 0 -> 8px `rgba(255,150,70,.22)` (30 %) -> 14px alpha 0 (60 %), plus base `0 30px 80px rgba(0,0,0,.45)`. Class `.attn`. Unused.
- `shim` 1.4s linear infinite: gradient `linear-gradient(90deg,rgba(255,255,255,.05) 0%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.05) 100%) 0 0/200% 100%`, `background-position` to `-200% 0`. Class `.shim`. Unused.
- `spin` .9s linear infinite, `blink` 1.2s ease-in-out infinite (opacity .25 to 1, `.dot2` delay .15s, `.dot3` .3s), `caret` 1s `steps(1)` infinite (opacity 50 % 0), `fall` 2.8s linear infinite (translateY -30px to 520px, class `.conf`), `flyIn` .45s `cubic-bezier(.2,.9,.3,1)` both (translateX 48px to none, class `.fly`), `fade` (opacity 0 to 1). Unused here.
- Reduced motion: `.in, .dock, .fly {animation: fade .3s ease both}`; `.attn, .shim, .spin, .conf, .caret, .dot1, .dot2, .dot3 {animation:none}`.
/_blob images: none in this file.
External links: `Main.dc.html`, `MyListings.dc.html`, `Settings.dc.html`, `Connect.dc.html`, `Chat.dc.html`; script `./support.js`.
z-index: none set on this page.

### 6. Mobile and responsive
- No `@media` rule for width. Only `@media (prefers-reduced-motion: reduce)`.
- Fluid behaviour only: header `flex-wrap:wrap` (gap 12px); right header group `flex-wrap:wrap`; composer toolbar `flex-wrap:wrap`; suggestions row `flex-wrap:wrap; justify-content:center`; footer pill `flex-wrap:wrap; justify-content:center`; cards `width:100%; max-width:720px`.
- Page `min-height:760px` with `overflow:hidden` and `height:100vh`: content clips below 760px height.
- Hero `h1` stays 56px at all widths (no clamp).
- Touch target heights: 40px buttons, 44px logo link, 32px composer chips.

## Screen: Chat.dc.html - Chat s rezultatima

Source: /home/omznc/dev/lagano-shop/design/canvas/Chat.dc.html. Title: "Chat s rezultatima". `<html lang="bs">`. Preview 1440x2000. Static page (no timer, no state).
Shared base CSS, surface classes (.glass .solid .chip .field .lbl .sr), dither classes, keyframes, fonts and color tokens are identical to Main.md section 4. Only the differences are listed here.

### 1. Layout
Root: `position:relative; min-height:100vh; overflow:hidden; background:#0E1020; color:#F5F5F7; display:flex; flex-direction:column; --p:{{dither}}px`. Same font stack as Main. The root scrolls with the page (no fixed height).
Children, in order:
1. Sky layer (`position:absolute; inset:0; pointer-events:none; overflow:hidden`) with only the sun (no stars).
2. `header.glass`: `position:sticky; top:0; z-index:5; border-width:0 0 1px 0; border-radius:0; box-shadow:none; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:10px 24px`. Height about 65px (used by Detail for `top:65px`).
3. `main`: `position:relative; flex-grow:1; width:100%; max-width:1040px; margin:0 auto; padding:32px 24px 24px; display:flex; flex-direction:column; gap:28px`.
4. Scroll-to-bottom button: `position:sticky; bottom:140px; z-index:4; align-self:center; margin-bottom:-40px`.
5. Dock wrapper: `position:sticky; bottom:0; z-index:4; padding:12px 24px 22px`. Holds the composer form.
Scrolls: whole document. Fixed: header (top), composer dock (bottom), scroll button.
Message column: user bubbles right-aligned (`align-self:flex-end; max-width:520px`); assistant rows left, full width.

### 2. Components

### Header
Same as Main header with these differences: it is `.glass` and sticky. Status chip shows all three connected: OpenRouter, OLX, SVEX each with dot #34C759 and no suffix text. Other items identical: logo (30x24), "Novi razgovor" chip button, "Sonnet 5.5" model button (height 40), "Moji oglasi" ghost link, Settings icon chip link (40x40).

### User bubble
Wrapper `.in`: `animation-delay:0ms; align-self:flex-end; max-width:520px; display:flex; flex-direction:column; gap:6px; align-items:flex-end`.
Bubble: `background:{{accent}}; color:#0E1020; padding:11px 16px; border-radius:20px 20px 6px 20px; font-size:16px; font-weight:500; line-height:1.45; letter-spacing:-0.01em`.
Image strip (first message only): `display:flex; gap:6px; justify-content:flex-end`. Each `img`: `72x72; object-fit:cover; border-radius:14px; border:1px solid rgba(255,255,255,.12)`.

### Assistant row
`.in`: `display:flex; gap:12px; align-items:flex-start`. First assistant row `animation-delay:80ms`; others 0ms.
- Avatar cell: `width:32px; flex-shrink:0; padding-top:2px` with mascot SVG 28x22 (viewBox 0 0 20 16, crispEdges). Variants by state: search done (sparkles #FFD36E, mouth line #0E1020 row 11), idle/value (plain), searching (magnifier in #F5F5F7 + #8FB4FF lens fill at cols 12-16, rows 6-10).
- Content cell: `flex-grow:1; min-width:0; display:flex; flex-direction:column; gap:14px`.
- Action row under finished answers: `display:flex; gap:2px`; two icon buttons (ghost): `font-size:14px; font-weight:500; display:inline-flex; border-radius:999px; padding:0; height:32px; min-height:32px; width:32px; justify-content:center; color:rgba(235,235,245,.68); background:transparent; border:0`. Icons 13x13: copy (aria-label "Kopiraj odgovor"), retry (aria-label "Pokušaj ponovo").

### Search status line
`display:flex; align-items:center; gap:10px; font-size:13px; font-weight:500; color:rgba(235,235,245,.68); flex-wrap:wrap`.
Done state: search icon 14x14, text "Pretražio OLX · SVEX", then two `.chip` pills: `inline-flex; align-items:center; gap:6px; padding:3px 10px; border-radius:999px` with check icon 12x12 stroke #34C759 width 3 and text " OLX 12 oglasa" / " SVEX 3 oglasa" (leading space is in the source).
Loading state: `span.spin` (`display:inline-grid`) holding retry icon 14x14; text "Tražim na OLX · SVEX…"; pill with check + " OLX 3 oglasa"; pill (`gap:8px`) "SVEX" + progress track (`width:64px; height:4px; border-radius:4px; background:rgba(255,255,255,.12); overflow:hidden`) with fill (`display:block; height:100%; width:60%; background:{{accent}}`) + "60%".

### Filter bar
`display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap`.
Left group (`gap:6px; flex-wrap:wrap`) pill buttons, base: `font-size:13px; font-weight:500; letter-spacing:-0.01em; inline-flex; gap:7px; border-radius:999px; padding:0 16px 0 13px; height:34px; min-height:34px; white-space:nowrap; color:#F5F5F7`, `.chip` fill, icons 13x13:
- "Do 700 KM" with x icon (applied filter, removable)
- "Stanje: sve" with chevron-down
- "Grad" with chevron-down
- "Filteri": ghost (transparent, no border, color `rgba(235,235,245,.68)`), sliders icon.
Right group (`gap:6px; align-items:center`):
- "Najjeftinije prvo" `.chip` pill with sort icon.
- View toggle `.chip role=group aria-label="Prikaz"`: `inline-flex; padding:3px; border-radius:999px; gap:2px`. Two buttons `34x30; border:0; border-radius:999px; display:grid; place-items:center`. "Mreža" (`aria-pressed=true`): `background:rgba(255,255,255,.16); color:#F5F5F7`, grid icon 15x15. "Lista" (`aria-pressed=false`): `background:transparent; color:rgba(235,235,245,.68)`, list icon.

### Result grid
`display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:14px`. 6 listing cards + 2 skeleton cards = 8 cells (2 rows).

Listing card `a.glass.in href=Detail.dc.html`: `animation-delay:{i*70}ms` (0, 70, 140, 210, 280, 350); `position:relative; display:flex; flex-direction:column; gap:10px; padding:8px 8px 14px; text-decoration:none; color:#F5F5F7; border-radius:22px; box-shadow:none; border-color:{{item.border}}`. Border = accent for the best offer, else `rgba(255,255,255,.10)`.
- Image box: `position:relative; border-radius:15px; overflow:hidden; aspect-ratio:4/3; background:#232745`. `img`: `width:100%; height:100%; object-fit:cover; filter:{{imgFilter}}`.
- No-image state: `div` `position:absolute; inset:0; display:grid; place-items:center; align-content:center; justify-items:center; gap:6px; color:rgba(235,235,245,.56); font-size:12px`, image icon 22x22 + "Nema slike". The `img` gets `display:none`.
- Provider badge (top-left): `position:absolute; top:8px; left:8px; font-size:11px; font-weight:600; padding:4px 9px; border-radius:999px; background:rgba(14,16,32,.72); backdrop-filter:blur(12px); color:#F5F5F7`. Text "OLX" or "SVEX".
- Best-offer badge (top-right, only when `best`): `position:absolute; top:8px; right:8px; font-size:11px; font-weight:600; padding:4px 9px; border-radius:999px; background:{{accent}}; color:#0E1020`. Text "Najbolja ponuda".
- Sold overlay (only when `sold`): `position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(14,16,32,.45)`. Inner pill `font-size:13px; font-weight:700; letter-spacing:.04em; padding:6px 12px; border-radius:999px; background:#F5F5F7; color:#0E1020`. Text "PRODANO". Image filter `grayscale(1) brightness(.7)`.
- Info block: `display:flex; flex-direction:column; gap:4px; padding:0 6px; opacity:{{opacity}}` (1; sold = .6).
  - Price: `font-size:20px; font-weight:700; letter-spacing:-0.02em; line-height:1.2; text-decoration:{{strike}}` (sold = line-through).
  - Title: `font-size:13px; line-height:1.35; color:rgba(235,235,245,.68)`.
  - Meta row: `display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:12px; color:rgba(235,235,245,.56)`: pin icon 12x12 + city (`inline-flex; gap:4px`), condition, date.
- States: hover and active come from the global `a.btn` rule only if class `btn` is set; these cards have no `btn` class, so no hover or active style. Focus ring from `a:focus-visible`.

Skeleton card (x2) `.glass[aria-hidden]`: `flex column; gap:10px; padding:8px 8px 14px; border-radius:22px; box-shadow:none`. Children use `.shim`: image block `aspect-ratio:4/3; border-radius:15px`; then column `gap:8px; padding:0 6px` with bars `height:18px; width:50%; border-radius:6px`, `height:12px; width:90%; border-radius:6px`, `height:12px; width:60%; border-radius:6px`.

### "Prikaži još" button
Centered (`display:flex; justify-content:center`). `button.glass`: `font-size:14px; font-weight:500; letter-spacing:-0.01em; inline-flex; gap:7px; border-radius:999px; padding:0 16px 0 13px; height:40px; color:#F5F5F7; box-shadow:none`. Arrow-down icon 15x15.

### Assistant text
Summary block: `font-size:17px; line-height:1.55; letter-spacing:-0.01em; display:flex; flex-direction:column; gap:10px; max-width:680px`. `p` margin 0. `ul`: `margin:0; padding-left:20px; display:flex; flex-direction:column; gap:4px`. Inline link: `color:#8FB4FF; href=#`.
Streaming text (last message): `font-size:17px; line-height:1.55; letter-spacing:-0.01em; max-width:680px`, ending with a caret span `.caret`: `display:inline-block; width:9px; height:18px; margin-left:3px; vertical-align:-3px; background:{{accent}}; border-radius:2px`.

### Price-check card
`section.glass.in`: `animation-delay:120ms; max-width:560px; border-radius:24px; padding:20px; display:flex; flex-direction:column; gap:16px; box-shadow:none`.
- Head row: `flex; justify-content:space-between; align-items:baseline; gap:12px`. Left: tag icon 16x16 stroke accent + `h3` (`margin:0; font-size:15px; font-weight:600`). Right: `font-size:12px; color:rgba(235,235,245,.56)`.
- Stat row: `flex; gap:28px; align-items:flex-end; flex-wrap:wrap`. Two stats with `.lbl`: "Medijan" value `font-size:40px; font-weight:700; letter-spacing:-0.03em; line-height:1.1`; "Raspon" value `font-size:20px; font-weight:600; letter-spacing:-0.02em`.
- Histogram: `role=img aria-label="Histogram cijena: najviše oglasa između 750 i 800 KM"`; `flex; align-items:flex-end; gap:4px; height:72px`. 12 bars, each `flex:1; --c:{{accent}}; border-radius:3px 3px 0 0`, heights (%): 14, 22, 30, 48, 70, 100, 82, 56, 34, 20, 12, 8. Bar 6 (peak) class `d100` (solid), the rest `d50` (checkerboard dither).
- Axis row: `flex; justify-content:space-between; font-size:12px; color:rgba(235,235,245,.56)`: "600 KM", "750", "950 KM".
- Follow-up text: `p` `margin:0; font-size:17px; line-height:1.55; max-width:680px`.

### Scroll-to-bottom button
`button.glass aria-label="Skroluj na dno"`: `position:sticky; bottom:140px; z-index:4; align-self:center; width:40px; height:40px; border-radius:999px; color:#F5F5F7; display:grid; place-items:center; margin-bottom:-40px`. Arrow-down icon 18x18.

### Composer (docked, generating state)
Wrapper `.dock` (animation `dock` .7s). Form `.glass`: `width:100%; max-width:872px; margin:0 auto; border-radius:26px; display:flex; flex-direction:column; padding:6px`.
- `textarea#msg rows=1 placeholder="Pitaj dalje…"`: `resize:none; field-sizing:content; max-height:200px; border:0; outline:none; background:transparent; color:#F5F5F7; font-size:16px; line-height:1.5; letter-spacing:-0.01em; padding:10px 14px 4px`.
- Toolbar: `flex; justify-content:space-between; align-items:center; gap:10px; padding:4px 4px 4px 8px`.
  - Left: attach chip (32x32), "OLX.ba" ON chip, "SVEX.ba" ON chip (both `aria-pressed=true`, `.chip`, `padding:0 12px 0 9px; height:32px`, check icon stroke accent), model button "Sonnet 5.5" (height 32).
  - Right: stop button `aria-label="Zaustavi"`: `40x40; flex-shrink:0; border:0; border-radius:999px; background:#F5F5F7; color:#0E1020`. Icon: filled rounded square 14x14 (`rect 5,5 14x14 rx3`). In idle state the send arrow (Main composer) replaces it.

### 3. Interactions and script
`Component extends DCLogic`, no `componentDidMount`, no timer. `renderVals` runs once with `t=0, lx=0`.
Props: `accent` (#FF9646 default; options #FF9646 #F5C518 #7DD3A8 #8FB4FF), `dither` (1..8, default 2), `intensity` (0..100 %, default 30), `bend` (0..100, default 0), `$preview` 1440x2000.
Math: `k = 0.4 + intensity/100*1.6` (no breathing). `sag = 30 + bend*2.2`. `core = snap((720*720+sag*sag)/(2*sag))`, `snap` as in Main. Same layer list as Main. No `flick` (t=0 gives off positions). `sunOffset = indigoStart + snap(24)` where `indigoStart` is the radius at the indigo `d100` layer start. `sunX = 0`.
Listing data (`L`, mapped to `listings`):
| # | provider | title | price | city | condition | date | image | flags |
|---|---|---|---|---|---|---|---|---|
| 1 | OLX | Creality Ender-3 V3 KE 3D printer | 550 KM | Livno | Korišteno | Danas | 44d310d9... | best |
| 2 | SVEX | 3D Printer Creality Ender 3 Pro | 400 KM | Bihać | Korišteno | Jučer | df4e2008... | |
| 3 | SVEX | Creality 3D Printer Ender-3 V3 SE | 625 KM | Lukavac | Novo | 3 dana | f60fcfa9... | |
| 4 | OLX | Ender 3 V3 SE, malo korišten | 480 KM | Mostar | Kao novo | 5 dana | none | noimg |
| 5 | OLX | Creality Ender-3 V3 SE + filament | 590 KM | Sarajevo | Korišteno | 1 sedm. | f60fcfa9... | sold |
| 6 | SVEX | Creality 3D Printer Ender-3 V3 SE | 671 KM | Živinice | Novo | 2 sedm. | df4e2008... | |
Derived per item: `delay=(i*70)+'ms'`; `border = best ? accent : rgba(255,255,255,.10)`; `badgeDisplay = best ? block : none`; `soldDisplay = sold ? flex : none`; `imgDisplay = noimg ? none : block`; `noImgDisplay = noimg ? grid : none`; `imgFilter = sold ? grayscale(1) brightness(.7) : none`; `opacity = sold ? .6 : 1`; `strike = sold ? line-through : none`.
Note: the data is not sorted by price although the sort chip says "Najjeftinije prvo". Real data must be sorted.
Click targets: every listing card -> Detail.dc.html (opens the side panel page). Logo and "Novi razgovor" -> Main.dc.html; "Moji oglasi" -> MyListings.dc.html; Settings -> Settings.dc.html. Link "već prodan" -> `#`.
Animations on this page:
- `.in` springIn .55s `cubic-bezier(.2,.9,.3,1.25)` both on each message and card; card delay is `i*70ms`.
- `.dock` .7s `cubic-bezier(.2,.9,.3,1)` both on the composer: it slides from `translateY(-40vh)`, opacity .6 to 1 (docks from the Main centre position to the bottom).
- `.spin` .9s linear infinite on the loading icon.
- `.shim` 1.4s linear infinite on skeletons.
- `.caret` 1s `steps(1)` infinite on the streaming caret.
- Reduced motion: `.in, .dock, .fly` become `fade .3s ease both`; `.spin, .shim, .caret` off.
Implied behaviour (not coded):
- Message flow: user sends -> composer docks -> assistant row appears with the loading status line -> source pills fill with counts -> skeleton cards turn into listing cards (2 skeletons mark pending slots) -> summary text streams with the caret.
- "Prikaži još" loads more cards into the grid.
- Filter pills open menus; the x on "Do 700 KM" removes that filter.
- View toggle switches grid/list (aria-pressed).
- Stop button cancels generation; it becomes send when idle.
- Scroll button appears when scrolled up from the bottom and scrolls to the end.
- Copy copies the answer text; retry regenerates it.
- Progress "60%" is SVEX search progress.

### 4. Patterns, tokens, fonts, images
Fonts and tokens: see Main.md section 4 (Inter 400/500/600/700; SF stack first; same palette). Extra colors on this page: card image bg #232745; badge bg `rgba(14,16,32,.72)`; sold overlay `rgba(14,16,32,.45)`; image strip border `rgba(255,255,255,.12)`; sparkle #FFD36E; lens #8FB4FF; link #8FB4FF; progress track `rgba(255,255,255,.12)`; view-toggle active `rgba(255,255,255,.16)`.
Dither: histogram bars use `.d50` (checkerboard, 2*p px cell) and `.d100` (solid) with `--c` = accent. Sun rings same as Main.
/_blob images:
- `/_blob/44d310d932b0fe647b478ab95165dc21`: user message attachment 1 (72x72, cover, radius 14px); listing 1 card image (4:3, cover).
- `/_blob/f60fcfa9ea5a0a5d2889a1e0c901f068`: user message attachment 2 (72x72); listing 3 and listing 5 card image (listing 5 grayscale, sold).
- `/_blob/df4e2008cb50c49c6ac755a1a645c6be`: listing 2 and listing 6 card image.
No `image-rendering` rule is set (smooth scaling). Alt texts: "Priložena slika 1", "Priložena slika 2", `{{item.title}}`.

### 6. Mobile and responsive
- No width `@media` rule. Only `prefers-reduced-motion`.
- Result grid is a fixed `repeat(4, minmax(0,1fr))`: it does not collapse on narrow screens (canvas gap; production needs a breakpoint rule).
- Fluid parts: header, filter bar, status line and meta rows use `flex-wrap:wrap`. Main content `max-width:1040px` with `padding:32px 24px 24px`. Composer `max-width:872px`.
- Sticky header (z-index 5) and sticky composer dock (z-index 4) stay on mobile too.
- z-index list: header 5; scroll button 4; dock 4.

## Screen: Detail.dc.html - Detalji oglasa

Source: /home/omznc/dev/lagano-shop/design/canvas/Detail.dc.html. Title: "Detalji oglasa". `<html lang="bs">`. Preview 1440x900. Static page (no timer, no state).
Shared base CSS, surface classes, dither classes, keyframes, fonts and color tokens are identical to Main.md section 4. The header, listing cards, user bubble, status line, assistant avatar and composer are identical to Chat.md except where noted below.

### 1. Layout
Root: `position:relative; min-height:100vh; overflow:hidden; background:#0E1020; color:#F5F5F7; display:flex; flex-direction:column; --p:{{dither}}px`.
Children:
1. Sky layer with sun only (same as Chat).
2. `header.glass` sticky, `top:0; z-index:5`, same as Chat header. Height about 65px.
3. Body row: `position:relative; flex-grow:1; display:flex; min-height:0`. Two columns:
   - Left column (chat): `flex:1 1 0; min-width:0; display:flex; flex-direction:column`. Holds `main` and the composer wrapper.
   - Right column: `aside` detail panel, `flex:0 0 480px`.
Left `main`: `position:relative; flex-grow:1; padding:28px 24px 24px; display:flex; flex-direction:column; gap:20px` (no max-width, no centering; compare Chat: 1040px, gap 28px).
Composer wrapper (no `dock` animation here; `class=""`): `position:sticky; bottom:0; z-index:4; padding:12px 24px 22px`. Form `max-width:760px; margin:0 auto` (Chat: 872px).
Aside: `position:sticky; top:65px; align-self:flex-start; height:calc(100vh - 65px); display:flex; flex-direction:column`. The panel is fixed to the viewport under the header; its middle section scrolls.
Grid in the chat column: `repeat(3, minmax(0,1fr)); gap:12px` (Chat: 4 columns, gap 14px). 6 cards, no skeletons, no "Prikaži još".

### 2. Components

### Chat column content
Only two messages, both `.in` with `animation-delay:0ms`:
- User bubble: "Nađi nešto ovakvo ispod 700 KM" (no image strip). Same style as Chat.
- Assistant row: avatar (sparkle variant, 28x22), status line "Pretražio OLX · SVEX" with pills " OLX 12 oglasa" and " SVEX 3 oglasa", then the 3-column listing grid. No filter bar, no answer text.
Listing card: identical to Chat (see Chat.md "Listing card"), data from the same 6-item list (see Chat.md table). Card links to `Detail.dc.html`. The selected card (#1) has the accent border as "best offer" (`border-color:{{accent}}`, badge "Najbolja ponuda").

### Composer (idle state)
Same structure as Chat composer, but: no `dock` animation; `max-width:760px`; right button is send `button[type=submit] aria-label="Pošalji"`: `40x40; flex-shrink:0; border:0; border-radius:999px; background:{{accent}}; color:#0E1020`, arrow-up icon 18x18 stroke 2.6. Both source chips (OLX.ba, SVEX.ba) `aria-pressed=true`. Placeholder "Pitaj dalje…".

### Detail panel (`aside.glass.fly`)
`aria-label="Detalji oglasa"`. Style: `flex:0 0 480px; position:sticky; top:65px; align-self:flex-start; height:calc(100vh - 65px); display:flex; flex-direction:column; border-width:0 0 0 1px; border-radius:0; box-shadow:none; background:rgba(18,20,40,.72)` (overrides the `.glass` background; the border is left only). Enter animation `.fly`: `flyIn .45s cubic-bezier(.2,.9,.3,1) both`, from `opacity:0; translateX(48px)` to none.
Three zones:

1. Top bar: `display:flex; justify-content:space-between; align-items:center; gap:10px; padding:14px 14px 10px 20px`.
   - Source pill (span): `font-size:12px; font-weight:600; padding:4px 10px; border-radius:999px; background:rgba(255,255,255,.1)`. Text "OLX · Objavljeno danas".
   - Close button `button.chip aria-label="Zatvori panel"`: `36x36; padding:0; border-radius:999px; justify-content:center; color:#F5F5F7`, x icon 15x15.

2. Scroll zone: `flex-grow:1; overflow-y:auto; min-height:0`. Inner: `padding:0 20px 20px; display:flex; flex-direction:column; gap:16px`.
   - Main image: `width:100%; aspect-ratio:4/3; object-fit:cover; border-radius:18px`. alt "Creality Ender-3 V3 KE, glavna slika".
   - Thumbnail row: `display:flex; gap:8px`. Each `img`: `64x48; object-fit:cover; border-radius:10px; border:2px solid ...`. Selected thumb (first) `border-color:{{accent}}`; others `border:2px solid transparent`. alts "Slika 2", "Slika 3", "Slika 4". State: selected vs unselected. (No hover style defined.)
   - Price and title: price `font-size:32px; font-weight:700; letter-spacing:-0.03em` "550 KM"; `h2` `margin:2px 0 0; font-size:18px; font-weight:600; letter-spacing:-0.02em`.
   - Facts row: `display:flex; gap:8px; flex-wrap:wrap`. Four `button.chip` pills: `font-size:13px; font-weight:500; letter-spacing:-0.01em; inline-flex; gap:7px; border-radius:999px; padding:0 16px 0 13px; height:32px; color:#F5F5F7`. Icons 13x13: pin "Livno"; box "Korišteno"; calendar "Danas"; truck "Lično preuzimanje".
   - Description: column `gap:6px`. `.lbl` "Opis". `p`: `margin:0; font-size:15px; line-height:1.55; color:rgba(235,235,245,.86)`. Text: "Printer je korišten oko 6 mjeseci. Nova mlaznica, 3 rezervne i 2 kg PLA filamenta. Radi bez problema, prodajem jer sam uzeo veći."
   - Seller card `.chip`: `display:flex; align-items:center; gap:12px; padding:12px; border-radius:16px`. Avatar span `40x40; border-radius:999px; background:#C2407A; display:grid; place-items:center; font-weight:700; aria-hidden` text "MK". Text column `flex-grow:1`: name `font-size:15px; font-weight:600` "Marko K."; meta `font-size:13px; color:rgba(235,235,245,.56)` "Na OLX-u od 2019 · 42 oglasa · Livno". Chevron-right icon 16x16 stroke `rgba(235,235,245,.56)` width 2.2. The card looks tappable (opens seller); no href set.

3. Footer bar: `padding:14px 20px 20px; display:flex; gap:8px; border-top:1px solid rgba(255,255,255,.08)`.
   - Primary "Otvori na OLX": `button`: `font-size:14px; font-weight:600; letter-spacing:-0.01em; inline-flex; gap:7px; border-radius:999px; padding:0 16px 0 13px; height:48px; min-height:48px; color:#0E1020; background:#F5F5F7; border:0; box-shadow:0 8px 24px rgba(0,0,0,.25); flex-grow:1; justify-content:center`. External-link icon 15x15.
   - Secondary "Pitaj o oglasu": `button.glass`: `font-size:14px; font-weight:500; height:48px; min-height:48px; border-radius:999px; padding:0 16px 0 13px; color:#F5F5F7; box-shadow:none`. Chat-bubble icon 15x15.
   - States: global hover `filter:brightness(1.12)`, active `transform:scale(.97)`, focus ring `2px solid #8FB4FF` offset 3px. No disabled or loading style.

### 3. Interactions and script
`Component extends DCLogic`; no lifecycle hooks, no timers, no state. `renderVals` runs once (`t=0, lx=0`).
Props: `accent` (default #FF9646; options #FF9646 #F5C518 #7DD3A8 #8FB4FF), `dither` (1..8, default 2), `intensity` (0..100, default 30), `bend` (0..100, default 0), `$preview` 1440x900.
Sun and ring math: identical to Chat (`k = 0.4 + intensity/100*1.6`, `sunOffset = indigoStart + snap(24)`, `sunX = 0`).
Listing data and derived fields: identical to Chat.md table (6 items; delay `i*70ms`).
Coded interactions: only links. Card -> `Detail.dc.html`. Logo, "Novi razgovor" -> `Main.dc.html`. "Moji oglasi" -> `MyListings.dc.html`. Settings -> `Settings.dc.html`.
Animations: `.in` springIn .55s `cubic-bezier(.2,.9,.3,1.25)` both (messages, cards with `i*70ms` delay); `.fly` flyIn .45s `cubic-bezier(.2,.9,.3,1)` both (panel). Reduced motion: `.in, .fly` become `fade .3s ease both`.
Implied behaviour (not coded):
- Clicking a listing card opens the aside with that listing's data and highlights the card (the accent border on card #1 doubles as "selected" here).
- Close button hides the panel and the chat column takes full width.
- Thumbnails switch the main image; the selected thumb gets the accent border.
- "Otvori na OLX" opens the source listing in a new tab.
- "Pitaj o oglasu" puts a question about this listing into the composer.
- Seller card opens seller info.
- Panel keeps its own scroll; the chat column scrolls with the page.

### 4. Patterns, tokens, fonts, images
Fonts, palette and dither classes: Main.md section 4. Extra values here: aside fill `rgba(18,20,40,.72)`; footer divider `rgba(255,255,255,.08)`; description text `rgba(235,235,245,.86)`; seller avatar #C2407A.
Panel top offset `65px` is the sticky header height; the height `calc(100vh - 65px)` depends on it.
/_blob images:
- `/_blob/44d310d932b0fe647b478ab95165dc21`: aside main image (100% wide, 4:3, cover, radius 18px); aside thumb 1 (64x48, radius 10px, accent border); listing card 1 image.
- `/_blob/f60fcfa9ea5a0a5d2889a1e0c901f068`: aside thumb 2 (64x48, transparent border); listing card 3 and card 5 (card 5 grayscale, sold).
- `/_blob/df4e2008cb50c49c6ac755a1a645c6be`: aside thumb 3 (64x48, transparent border); listing card 2 and card 6.
All `object-fit:cover`, no `image-rendering` rule.
z-index: header 5; composer wrapper 4. The aside has no z-index (it sits in normal flow, sticky).

### 6. Mobile and responsive
- No width `@media` rule. Only `prefers-reduced-motion`.
- Aside is a fixed `480px` flex-basis with `flex:0 0 480px`: on narrow screens the chat column shrinks (`min-width:0`) with no stacking or drawer rule. Production needs a breakpoint where the panel becomes a full-screen sheet.
- Grid is 3 columns fixed (`minmax(0,1fr)`), no collapse.
- Header uses `flex-wrap:wrap`; this changes the header height, so `top:65px` for the aside is only exact for the single-row header.

## Screen: SellPhotos (Prodaja 1 – slike)

Source: `/home/omznc/dev/lagano-shop/design/canvas/SellPhotos.dc.html` (32443 bytes). `<title>Prodaja 1 – slike</title>`. `$preview` 1440 x 980. `<html lang="bs">`.

### 1. Layout
- Page shell, header, main column and composer: see section S.
- Main children, top to bottom, `gap:24px`: (a) user bubble, right aligned; (b) assistant row with the intro text and the "Slike oglasa" card.
- The header and the composer are sticky. The main column scrolls between them.
- Card "Slike oglasa": `glass; border-radius:24px; padding:20px`. Children in order: title row, dropzone (`margin-top:16px`), thumbnail grid (`margin-top:16px`), footer row (`margin-top:16px`).

### 2. Components
### 2.1 User bubble
Text: "Prodajem svoj Ender-3 V3 KE". Style in S6.

### 2.2 Intro line
"Super! Pošalji mi nekoliko slika, a ja ću napisati oglas." Style `17px/1.55`. Mascot pose: neutral (eyes 2x2 at x4-5 and x10-11, y8-9; mouth bar y11 x6-9; cheeks `#C2407A` at (3,10) and (12,10)).

### 2.3 Card title row
`display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap`. `<h2 style="margin:0; font-size:17px; font-weight:600; letter-spacing:-.02em">Slike oglasa</h2>` and the step list (S6). Current step: "Slike". The other three are upcoming.

### 2.4 Dropzone
- `margin-top:16px; border:2px dashed rgba(255,255,255,.18); border-radius:18px; padding:22px; display:flex; align-items:center; justify-content:center; gap:14px; text-align:left`.
- Icon disc: `44x44; border-radius:999px; background:rgba(255,255,255,.08); display:grid; place-items:center`. Icon: cloud-upload 22x22, stroke currentColor, stroke-width 2.2.
- Line 1: `15px/600`: "Prevuci slike ovdje ili " + `<a href="#" style="color:#8FB4FF">odaberi</a>`.
- Line 2: `13px; color:rgba(235,235,245,.68)`: "Do 10 slika · JPG, PNG, HEIC · prva je naslovna".
- States: only the default state is drawn. Hover, drag-over, error and disabled are not drawn. The link follows the global `a:hover{color:#FFFFFF}` only if the inline color is overridden (inline `#8FB4FF` wins, so the link does not change color on hover). `a` has no `.btn` class, so it has no brightness filter on hover.

### 2.5 Thumbnail grid
- `<ul aria-label="Slike, povuci za redoslijed">`: `list-style:none; margin:16px 0 0; padding:0; display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:10px`. Five tiles. Maximum is 10 per the dropzone text, so a second row appears after 5.
- Tile `<li>`: `position:relative; aspect-ratio:1; border-radius:16px; overflow:hidden; border:2px solid rgba(255,255,255,.1)`.
- Image: `<img style="width:100%; height:100%; object-fit:cover">`, alt "Slika N". No `image-rendering` rule.
- Tile variants drawn:
  1. **Cover, normal** (tile 1): `border:2px solid {{accent}}`. Badge visible.
  2. **Dragging** (tile 2): `border:2px solid rgba(255,255,255,.1); transform:rotate(-3deg) scale(1.06); box-shadow:0 24px 48px rgba(0,0,0,.5); z-index:2`. Badge hidden.
  3. **Normal** (tile 3): default. Badge hidden.
  4. **Uploading 72 %** (tile 4): progress track + percent overlay. Badge hidden. Drag handle hidden (`display:none`).
  5. **Uploading 28 %** (tile 5): same as 4 with 28.
- Cover badge `<span>`: `position:absolute; left:8px; top:8px; font-size:11px; font-weight:700; padding:3px 8px; border-radius:999px; background:{{accent}}; color:#0E1020`. Text "Naslovna". Hidden tiles use `display:none` on the same element (so the markup is one template with a toggled display).
- Remove button: `<button type="button" aria-label="Ukloni sliku N">`, `position:absolute; right:6px; top:6px; width:28px; height:28px; border-radius:999px; border:0; background:rgba(14,16,32,.72); color:#F5F5F7; display:grid; place-items:center; cursor:pointer`. X icon 13x13 (`M6 6l12 12`, `M18 6L6 18`), stroke-width 2.2.
- Drag handle: `<span role="img" aria-label="Povuci za promjenu redoslijeda">`, `position:absolute; right:6px; bottom:6px; width:28px; height:28px; border-radius:8px; background:rgba(14,16,32,.72); color:#F5F5F7; display:grid; place-items:center; cursor:grab`. Icon: 6-dot grip 14x14 (circles r=1 at x 9 and 15, y 6/12/18). On uploading tiles `display:none`.
- Progress track (uploading tiles): `position:absolute; left:8px; right:8px; bottom:8px; height:5px; border-radius:5px; background:rgba(14,16,32,.6); overflow:hidden`. Fill: `height:100%; width:72%` (tile 4) or `28%` (tile 5); `background:{{accent}}`. No transition is set on the fill.
- Percent overlay: `position:absolute; inset:0; display:grid; place-items:center; font-size:13px; font-weight:700; background:rgba(14,16,32,.35)`. Text "72%" / "28%".

### 2.5.1 Images (blobs)
| Blob | Used in | Size | Rendering |
|---|---|---|---|
| `/_blob/44d310d932b0fe647b478ab95165dc21` | tile 1 (alt "Slika 1") and tile 4 (alt "Slika 4") | 100% x 100% of a square tile | `object-fit:cover` |
| `/_blob/f60fcfa9ea5a0a5d2889a1e0c901f068` | tile 2 (alt "Slika 2") and tile 5 (alt "Slika 5") | same | `object-fit:cover` |
| `/_blob/df4e2008cb50c49c6ac755a1a645c6be` | tile 3 (alt "Slika 3") | same | `object-fit:cover` |
Three images repeat as stand-ins for five photos.

### 2.6 Footer row
`margin-top:16px; display:flex; justify-content:space-between; align-items:center; gap:12px`.
- Hint `<span style="font-size:13px; color:rgba(235,235,245,.68)">`: "Dodirni sliku za naslovnu · povuci " + inline 13x13 grip icon + " za redoslijed".
- Primary button "Napravi nacrt": `14px/600; height:44px; min-height:44px; padding:0 16px; border-radius:999px; color:#0E1020; background:{{accent}}; border:0`. No icon. It is a `<button type="button">` with no `href` in this file. It implies a step to SellDraft.

### 3. Interactions and script
- No handlers. The following behaviour is implied, not coded:
  - Drop or "odaberi" opens the file picker (JPG, PNG, HEIC, max 10 files).
  - Tapping a thumbnail makes it the cover ("Dodirni sliku za naslovnu"). The "Naslovna" badge and the `{{accent}}` border move to it.
  - Dragging a tile (via the grip handle) reorders the list; the dragged tile gets the tile-2 style (rotate -3deg, scale 1.06, shadow, z-index 2).
  - Uploading tiles show a progress bar and a percent; the grip handle is hidden until upload ends.
  - "Ukloni sliku N" removes a tile.
  - "Napravi nacrt" moves to the draft step (SellDraft).
- Links: logo and "Novi razgovor" -> `Main.dc.html`; "Moji oglasi" -> `MyListings.dc.html`; settings -> `Settings.dc.html`.
- Animations used: `.in` on the user bubble and on the assistant row (both `animation-delay:0ms`). Transitions: S2.

### 4. Patterns, tokens, fonts, blobs
See S1-S4 for tokens, fonts and the horizon dither pattern. No scanlines, no `image-rendering: pixelated`. The mascot uses `shape-rendering="crispEdges"`. Blobs: see 2.5.1.

### 6. Responsive
No breakpoints. The grid stays at 5 columns at all widths (`repeat(5, minmax(0,1fr))`), so tiles shrink. Title row wraps (`flex-wrap:wrap`). The footer row does not wrap.

## S. Shared shell (identical in SellPhotos, SellDraft, SellApprove, SellSuccess)

Only the title, the `<main>` content and `$preview.height` differ between the four files.

### S1. Tokens and props
- Script props (`data-props`): `accent` color default `#FF9646`, options `#FF9646 #F5C518 #7DD3A8 #8FB4FF`. `dither` range 1-8 px, default 2. `intensity` range 0-100 %, default 30. `bend` range 0-100, default 0. `$preview.width` 1440.
- CSS custom properties: `--p: {{dither}}px` on the root div. `--r` (ring radius, px) and `--c` (ring color) on each `.ring`.
- Template variable `{{accent}}` is used for: active step pill, primary button background, own bubble, borders, check icons, progress fill, mascot body fill.
- Fixed colors: page `#0E1020`; text `#F5F5F7`; muted text `rgba(235,235,245,.68)`; dim text `rgba(235,235,245,.56)`; placeholder `rgba(235,235,245,.45)`; link `#8FB4FF`; ok green `#34C759`; focus ring `#8FB4FF`; sun pale `#FFE2A8`; sun pink `#C2407A`; sun indigo `#33298F`; mascot orange `#C9672A`; hover link `#FFFFFF`.
- Font: root `font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Inter, system-ui, sans-serif`; `-webkit-font-smoothing: antialiased`. Google Font loaded: `Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700` with `display=swap` (preconnect to fonts.googleapis.com and fonts.gstatic.com crossorigin). Inter is only the 5th fallback.
- Global CSS: `html,body{margin:0;background:#0E1020}`, `*{box-sizing:border-box}`, `a{color:#F5F5F7}`, `a:hover{color:#FFFFFF}`.

### S2. Global classes (exact)
- `.sr`: `position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap`.
- `.glass`: `background:rgba(22,24,46,.58); backdrop-filter:blur(28px) saturate(170%); border:1px solid rgba(255,255,255,.10); box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 24px 60px rgba(0,0,0,.35)`.
- `.solid`: `background:rgba(20,22,42,.94); backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,.10); box-shadow:0 30px 80px rgba(0,0,0,.5)` (unused in these four).
- `.chip`: `background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.08)`.
- `.field`: `background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); border-radius:12px; color:#F5F5F7; font:inherit; font-size:15px; padding:0 14px; height:44px; width:100%; outline:none`.
- `.lbl`: `font-size:12px; font-weight:600; letter-spacing:.02em; color:rgba(235,235,245,.68); text-transform:uppercase`.
- Buttons and links: `-webkit-tap-highlight-color:transparent; transition:transform .15s ease, filter .15s ease, background-color .15s ease`. `button:hover, a.btn:hover {filter:brightness(1.12)}`. `button:active, a.btn:active {transform:scale(.97)}`.
- Focus: `button/a/textarea/input/select :focus-visible {outline:2px solid #8FB4FF; outline-offset:3px}`.
- Placeholder: `textarea::placeholder, input::placeholder {color:rgba(235,235,245,.45)}`.
- Note: `.field` has `outline:none` inline in the class, but the `:focus-visible` rule still sets a 2px outline. No separate `:focus` border change exists. No disabled or error style exists in these four files.

### S3. Animation classes and keyframes (exact)
- `.in {animation: springIn .55s cubic-bezier(.2,.9,.3,1.25) both}`; `@keyframes springIn {from{opacity:0; transform:translateY(14px) scale(.97)} to{opacity:1; transform:none}}`. Used on each message row with `animation-delay: 0ms`.
- `.dock {animation: dock .7s cubic-bezier(.2,.9,.3,1) both}`; `dock: from{opacity:.6; transform:translateY(-40vh)} to{opacity:1; transform:none}`. Not used in these four files.
- `.attn {animation: attn 2.6s ease-in-out .8s infinite}`; `attn: 0%,100%{box-shadow:0 0 0 0 rgba(255,150,70,.0),0 30px 80px rgba(0,0,0,.45)} 30%{box-shadow:0 0 0 8px rgba(255,150,70,.22),0 30px 80px rgba(0,0,0,.45)} 60%{box-shadow:0 0 0 14px rgba(255,150,70,0),0 30px 80px rgba(0,0,0,.45)}`. The ring color is hard-coded `255,150,70` and does not follow `accent`.
- `.shim {background:linear-gradient(90deg,rgba(255,255,255,.05) 0%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.05) 100%) 0 0/200% 100%; animation: shim 1.4s linear infinite}`; `shim: to{background-position:-200% 0}`. Unused here.
- `.spin {animation: spin .9s linear infinite}`; `spin: to{transform:rotate(360deg)}`.
- `.dot1,.dot2,.dot3 {animation: blink 1.2s ease-in-out infinite}`; `.dot2{animation-delay:.15s}`; `.dot3{animation-delay:.3s}`; `blink: 0%,100%{opacity:.25} 50%{opacity:1}`. Unused here.
- `.caret {animation: caret 1s steps(1) infinite}`; `caret: 50%{opacity:0}`. Unused here.
- `.conf {animation: fall 2.8s linear infinite}`; `fall: from{transform:translateY(-30px)} to{transform:translateY(520px)}`.
- `.fly {animation: flyIn .45s cubic-bezier(.2,.9,.3,1) both}`; `flyIn: from{opacity:0; transform:translateX(48px)} to{opacity:1; transform:none}`. Unused here.
- `@keyframes fade {from{opacity:0} to{opacity:1}}`.
- `@media (prefers-reduced-motion: reduce) { .in,.dock,.fly {animation: fade .3s ease both} .attn,.shim,.spin,.conf,.caret,.dot1,.dot2,.dot3 {animation: none} }`.

### S4. Horizon (sun) background pattern
Markup: `<div aria-hidden="true" style="position:absolute; inset:0; pointer-events:none; overflow:hidden"><div class="sun" style="top:calc(100% + {{sunOffset}}px); transform:translateX({{sunX}}px)"> rings </div></div>`. It sits as the first child of the root div. The root is `position:relative; min-height:100vh; overflow:hidden; display:flex; flex-direction:column; background:#0E1020; color:#F5F5F7`. The header, main and composer have `position: relative`/`sticky` and paint above it.
- `.sun {position:absolute; left:50%; width:0; height:0; pointer-events:none}`.
- `.ring {position:absolute; border-radius:50%; left:calc(var(--r)*-1); top:calc(var(--r)*-1); width:calc(var(--r)*2); height:calc(var(--r)*2)}`. Each ring is a circle of radius `--r` centred on the `.sun` point. Rings are painted from the largest to the smallest (the array is reversed), so the smallest ring is on top.
- Dither classes (`--p` = dither px, `--c` = ring color):
  - `.d6`: `background: conic-gradient(at var(--p) var(--p), transparent 0 75%, var(--c) 0) 0 0/calc(var(--p)*4) calc(var(--p)*4)`.
  - `.d12`: two layers of the `.d6` gradient. Layer 1 at `0 0/calc(var(--p)*4) calc(var(--p)*4)`. Layer 2 at `calc(var(--p)*2) calc(var(--p)*2)/calc(var(--p)*4) calc(var(--p)*4)`.
  - `.d25`: `conic-gradient(at var(--p) var(--p), transparent 0 75%, var(--c) 0) 0 0/calc(var(--p)*2) calc(var(--p)*2)`.
  - `.d50`: `repeating-conic-gradient(var(--c) 0 25%, transparent 0 50%) 0 0/calc(var(--p)*2) calc(var(--p)*2)` (checkerboard).
  - `.d75`: `conic-gradient(at var(--p) var(--p), var(--c) 0 75%, transparent 0) 0 0/calc(var(--p)*2) calc(var(--p)*2)`.
  - `.d100`: `background: var(--c)`.
- Ring generation (script `renderVals`): `p = max(1, round(dither))`; `k = 0.4 + (intensity/100)*1.6`; `sag = 30 + bend*2.2`; `q = 4*p`; `snap(v) = max(q, round(v/q)*q)`; `core = snap((720*720 + sag*sag) / (2*sag))`.
  - First ring: `{cls:'d100', c:'#FFE2A8', r:core}`.
  - Layers (class, color, thickness): `d50 pale 8; d25 pale 8; d100 accent 16; d75 accent 10; d50 accent 12; d25 accent 12; d12 accent 14; d6 accent 16; d100 pink 24; d75 pink 18; d50 pink 18; d25 pink 20; d12 pink 22; d6 pink 24; d100 indigo 40; d75 indigo 30; d50 indigo 32; d25 indigo 34; d12 indigo 38; d6 indigo 44`. For each layer: `r += snap(thickness*k)`, push `{cls, c, r, bp}`.
  - `sunOffset = indigoStart + snap(24)`. `indigoStart` = `r` just before the first indigo `d100` layer is added.
  - `sunX = round((lx*140)/p)*p`. In the canvas `lx = 0` and `t = 0`, so `sunX = 0` and no flicker is applied.
  - Flicker (disabled in canvas, `t=0`): `flick = floor(t/0.9) % 2`. When `flick` and `i % 3 === 1`, `background-position` becomes `var(--p) 0` (for `d12`: `var(--p) 0, calc(var(--p)*3) calc(var(--p)*2)`). Normal position is `0 0` (for `d12`: `0 0, calc(var(--p)*2) calc(var(--p)*2)`). The production page needs a timer that advances `t` to animate this.
  - Defaults give: `p=2, q=8, k=0.88, sag=30, core=8656`.

### S5. Header (`<header class="glass">`)
- Style: `position:sticky; top:0; z-index:5; border-width:0 0 1px 0; border-radius:0; box-shadow:none; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:10px 24px`.
- Left group (`flex; align-items:center; gap:10px`):
  - Logo link `href=Main.dc.html`, `aria-label="Početna"`, `display:grid; place-items:center; width:44px; height:44px`. Contains the pixel mascot SVG `width=30 height=24 viewBox="0 0 20 16" shape-rendering="crispEdges"`.
  - "Novi razgovor": `<a class="btn chip" href=Main.dc.html>`, `font:inherit 14px/500; letter-spacing:-.01em; display:inline-flex; align-items:center; gap:7px; border-radius:999px; padding:0 16px 0 13px; height:40px; min-height:40px; cursor:pointer; text-decoration:none; white-space:nowrap; color:#F5F5F7`. Icon: pencil, 15x15, stroke currentColor, stroke-width 2.2, round caps and joins.
- Right group (`flex; align-items:center; gap:8px; flex-wrap:wrap`):
  - Status chip `class="chip" role="status" aria-label="Status veza"`: `inline-flex; gap:14px; height:40px; padding:0 14px; border-radius:999px; font-size:13px; font-weight:500`. Three items (`inline-flex; gap:6px`), each with an 8x8 dot (`border-radius:999px; background:#34C759; flex-shrink:0`). Labels: OpenRouter, OLX, SVEX. All three are green in all four files (no other status state exists in the files).
  - Model button `aria-haspopup="listbox"`: `13px/500; color:rgba(235,235,245,.68); background:transparent; border:0; border-radius:999px; padding:0 10px; height:40px; gap:4px`. Text "Sonnet 5.5" and a chevron-down 14x14 (`M7 10l5 5 5-5`). No popup is drawn.
  - "Moji oglasi": `<a class="btn" href=MyListings.dc.html>`, same base style as "Novi razgovor" but `color:rgba(235,235,245,.68); background:transparent; border:0`. Icon: layers, 15x15.
  - Settings: `<a class="btn chip" href=Settings.dc.html aria-label="Postavke">`, `padding:0; width:40px; height:40px; justify-content:center`. Gear icon 15x15.

### S6. Main column and message rows
- `<main>`: `position:relative; flex-grow:1; width:100%; max-width:860px; margin:0 auto; padding:32px 24px 24px; display:flex; flex-direction:column; gap:24px`.
- Assistant row: `class="in"; display:flex; gap:12px; align-items:flex-start`. Avatar cell `width:32px; flex-shrink:0; padding-top:2px` with the mascot SVG `28x22`. Body cell `flex-grow:1; min-width:0; display:flex; flex-direction:column; gap:14px`. Text `<p style="margin:0; font-size:17px; line-height:1.55">`.
- User bubble (used only in SellPhotos): wrapper `class="in"; align-self:flex-end; max-width:520px; display:flex; flex-direction:column; gap:6px; align-items:flex-end`. Bubble: `background:{{accent}}; color:#0E1020; padding:11px 16px; border-radius:20px 20px 6px 20px; font-size:16px; font-weight:500; line-height:1.45; letter-spacing:-.01em`.
- Mascot (pixel art): SVG `viewBox="0 0 20 16"` with `shape-rendering="crispEdges"`; each pixel is a `h1v1h-1z` path. Colors: hat/hair `#FFE2A8`, body `{{accent}}`, eyes/mouth `#0E1020`, cheeks `#C2407A`, feet `#C9672A`. Pose variants per file are listed in each file's section.
- Section card base (used for all cards except the approve dialog and success hero): `class="glass"; border-radius:24px; padding:20px; box-shadow:none`. The style string ends with the stray token `in` (`...box-shadow: none; in"`), which is invalid CSS and ignored. The `.in` animation is NOT applied to these cards.
- Step indicator `<ol aria-label="Koraci objave">`: `list-style:none; margin:0; padding:0; display:flex; gap:6px; font-size:12px; font-weight:600`. Each `<li>`: `display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px`. Items: Slike, Nacrt, Odobrenje, Objava.
  - Current (dark card): `background:{{accent}}; color:#0E1020`.
  - Done (dark card): `background:rgba(255,255,255,.1); color:#F5F5F7`, with a 11x11 check icon (`M5 12.5l4.5 4.5L19 7`, stroke-width 3).
  - Upcoming (dark card): `background:transparent; color:rgba(235,235,245,.56); border:1px solid rgba(255,255,255,.12)`.
  - Light card (SellApprove) variants: done `background:rgba(14,16,32,.08); color:#0E1020` with check; current `{{accent}}` bg, `#0E1020`; upcoming `transparent; color:rgba(14,16,32,.55); border:1px solid rgba(14,16,32,.14)`.
- Primary button (accent): `font:inherit; 14px/500 (600 when style adds font-weight:600); letter-spacing:-.01em; inline-flex; align-items:center; gap:7px; border-radius:999px; padding:0 16px (0 16px 0 13px with icon); height:44px; min-height:44px; cursor:pointer; white-space:nowrap; color:#0E1020; background:{{accent}}; border:0`. Hover/active/focus from S2.
- Ghost button: same geometry, `color:rgba(235,235,245,.68); background:transparent; border:0`.

### S7. Composer (`<div style="position:sticky; bottom:0; z-index:4; padding:12px 24px 22px">`)
- `<form class="glass">`: `width:100%; max-width:812px; margin:0 auto; border-radius:26px; display:flex; flex-direction:column; padding:6px`.
- `<label for="msg" class="sr">Poruka</label>` and `<textarea id="msg" rows="1" placeholder="Napiši nešto…">`: `resize:none; field-sizing:content; max-height:200px; border:0; outline:none; background:transparent; color:#F5F5F7; font-family:inherit; font-size:16px; line-height:1.5; letter-spacing:-.01em; padding:10px 14px 4px`.
- Toolbar: `display:flex; justify-content:space-between; align-items:center; gap:10px; padding:4px 4px 4px 8px`. Left group `flex; gap:6px; align-items:center; font-size:13px; font-weight:500`:
  - Add images: `button.chip aria-label="Dodaj slike"`, `32x32; border-radius:999px; display:grid; place-items:center`. Icon: image (rect 18x14 rx3 + circle + path), 15x15.
  - Toggle chips "OLX.ba" and "SVEX.ba": `button.chip aria-pressed="true"`, `font:inherit; inline-flex; gap:6px; border-radius:999px; padding:0 12px 0 9px; height:32px`. Check icon 13x13, `stroke:{{accent}}`, stroke-width 2.8. Both pressed (on) in all four files. The off state is not drawn.
  - Model button "Sonnet 5.5" `height:32px` (same style as header model button).
- Send: `button[type=submit] aria-label="Pošalji"`, `40x40; flex-shrink:0; border:0; border-radius:999px; background:{{accent}}; color:#0E1020; display:grid; place-items:center`. Arrow-up icon 18x18, stroke-width 2.6.

### S8. Script
`<script type="text/x-dc" data-dc-script>`: `class Component extends DCLogic { renderVals() {...} }`. It has NO state variables, NO event handlers, NO timers. It returns `{accent, dither, rings, sunOffset, sunX}` from the props. All interactivity in the canvas is anchors (`href` to other canvas files) or static markup. Behaviour the canvas implies but does not code is listed per file.

### S9. Shared copy (keys)
| Component | Text | Key |
|---|---|---|
| Header | Početna (aria) | `header.homeAria` |
| Header | Novi razgovor | `header.newChat` |
| Header | Status veza (aria) | `header.statusAria` |
| Header | OpenRouter / OLX / SVEX | `header.status.openRouter` / `.olx` / `.svex` |
| Header | Sonnet 5.5 | `header.model` |
| Header | Moji oglasi | `header.myListings` |
| Header | Postavke (aria) | `header.settingsAria` |
| Steps | Koraci objave (aria) | `steps.aria` |
| Steps | Slike / Nacrt / Odobrenje / Objava | `steps.photos` / `steps.draft` / `steps.approve` / `steps.publish` |
| Composer | Poruka (label) | `composer.label` |
| Composer | Napiši nešto… | `composer.placeholder` |
| Composer | Dodaj slike (aria) | `composer.addPhotosAria` |
| Composer | OLX.ba / SVEX.ba | `composer.targetOlx` / `composer.targetSvex` |
| Composer | Pošalji (aria) | `composer.sendAria` |

### S10. Responsive
No `@media` query except `prefers-reduced-motion`. No breakpoints. Wrapping is by `flex-wrap:wrap` on the header, its right group and the section title row. `$preview.width` is 1440. Content width is capped by `max-width:860px` (main) and `812px` (composer).

## Screen: SellDraft (Prodaja 2 – nacrt)

Source: `/home/omznc/dev/lagano-shop/design/canvas/SellDraft.dc.html` (32740 bytes). `<title>Prodaja 2 – nacrt</title>`. `$preview` 1440 x 1300.

### 1. Layout
- Shell: see section S. Main has one assistant row (no user bubble).
- Mascot pose: "writing". It has extra sparkle pixels in `#FFD36E` (1,1; 15,2; 14,3; 16,3; 15,4; 18,6; 4,7; 10,7; 3,8; 4,8; 5,8; 9,8; 10,8; 11,8; 4,9; 10,9) and a flat mouth bar `#0E1020` at y11 x5-10. No eye pixels (eyes closed or blank).
- Intro: "Napisao sam nacrt na osnovu slika i sličnih oglasa. Promijeni šta god želiš." `17px/1.55`.
- Card "Nacrt oglasa": `glass; border-radius:24px; padding:20px; box-shadow:none`. Rows: title row; two-column body; publish block.
- Two-column body: `margin-top:16px; display:grid; grid-template-columns:180px minmax(0, 1fr); gap:18px`.
  - Left (180px): `flex column; gap:8px`: cover image + caption.
  - Right: `flex column; gap:14px`: Naslov; (Cijena + Kategorija) grid; Stanje; (Grad + Dostava) grid; Opis.
- Publish block: `margin-top:18px; padding-top:18px; border-top:1px solid rgba(255,255,255,.08); display:flex; flex-direction:column; gap:10px`.
- Two-up grids: `display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px`.

### 2. Components
### 2.1 Step list
Current: "Nacrt". "Slike" is done (dark done style with check). "Odobrenje" and "Objava" upcoming.

### 2.2 Cover thumbnail
`<img src="/_blob/44d310d932b0fe647b478ab95165dc21" alt="Naslovna slika" style="width:100%; aspect-ratio:1; object-fit:cover; border-radius:16px">`. Caption `12px; color:rgba(235,235,245,.68)`: "5 slika · " + `<a href="SellPhotos.dc.html" style="color:#8FB4FF">uredi</a>`.

### 2.3 Form field wrapper
`display:flex; flex-direction:column; gap:6px`. Header row `display:flex; justify-content:space-between; align-items:center` holding the label (`<label class="lbl" for=...>` or `<span class="lbl">`) and, for AI-filled fields, the AI tag.
- AI tag: `display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; color:{{accent}}`. Star icon 11x11 (`M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z`), `stroke:{{accent}}; stroke-width:2.4; fill:none`. Text " AI" (leading space). AI tag is on: Naslov, Cijena, Kategorija, Stanje, Dostava, Opis. Not on: Grad.
- Text input `.field` (S2): 44px high.
- Field values drawn: Naslov `id=f-naslov` value "Creality Ender-3 V3 KE 3D printer + 3 mlaznice". Grad `id=f-grad` value "Livno".
- States: only default is drawn. Focus uses the global 2px `#8FB4FF` outline. No error or disabled style.

### 2.4 Price field
`<input id="f-cijena" class="field" value="560" style="padding-right:48px; font-weight:600">` in a `position:relative; flex-grow:1` box inside `display:flex; gap:8px; align-items:center`. Suffix `<span style="position:absolute; right:14px; top:12px; font-size:14px; color:rgba(235,235,245,.68)">KM</span>`. Label is a `<span class="lbl">Cijena</span>` (no `for`; the input id `f-cijena` has no label). Help line below: `font-size:12px; color:rgba(235,235,245,.68); display:flex; align-items:center; gap:6px` with info icon 13x13 (circle r9, `M12 11v5`, `M12 7.5v.5`) and text " Prijedlog: 520 – 600 KM · medijan 560 KM (18 oglasa)".

### 2.5 Category select
`<select id="f-kategorija" class="field" style="appearance:none; -webkit-appearance:none; cursor:pointer">` with one option "Kompjuteri › 3D printeri", in `position:relative`. Chevron `<span style="position:absolute; right:12px; top:14px; pointer-events:none">` with a 16x16 chevron-down, `stroke:rgba(235,235,245,.68)`, stroke-width 2.2. Note the select has `padding:0 14px` from `.field`, so long text can run under the chevron (no `padding-right`).

### 2.6 Segmented control (Stanje, Gdje objaviti)
- Container: `<div role="radiogroup" class="chip" aria-label=...>`: `display:flex; padding:3px; border-radius:12px; gap:2px`.
- Option: `<button type="button" role="radio" aria-checked>`: `flex:1; font:inherit; font-size:14px; font-weight:500; height:38px; border:0; border-radius:10px; cursor:pointer`.
  - Off: `background:transparent; color:#F5F5F7`.
  - Selected (`aria-checked="true"`): `background:#F5F5F7; color:#0E1020`.
- Stanje options: Novo, Kao novo, Korišteno (selected), Oštećeno.
- Gdje objaviti options: OLX, SVEX, Oba (selected).
- States: hover brightness(1.12) and active scale(.97) from S2. No other states.

### 2.7 Toggle row (Dostava)
`<label>`: `display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px; border-radius:12px; background:rgba(255,255,255,.05); cursor:pointer`. Wrapper column `gap:6px`.
- Text stack `flex column`: main `font-size:15px`; sub `font-size:12px; color:rgba(235,235,245,.56)` (can be empty).
- Hidden `<input type="checkbox" class="sr">` (`checked` on the first).
- Switch `<span aria-hidden style="width:44px; height:26px; border-radius:999px; position:relative; flex-shrink:0">`. On: `background:#34C759`, knob `left:21px`. Off: `background:rgba(255,255,255,.18)`, knob `left:3px`. Knob: `position:absolute; top:3px; width:20px; height:20px; border-radius:999px; background:#FFFFFF; box-shadow:0 2px 6px rgba(0,0,0,.3)`. No transition on `left` is set.
- Rows: "Lično preuzimanje" (sub empty, on); "Besplatna dostava" (sub "Samo SVEX", off).

### 2.8 Description
`<textarea id="f-opis" rows="4" class="field" style="height:auto; padding:12px 14px; line-height:1.5; resize:vertical">` value "Printer korišten oko 6 mjeseci. Nova mlaznica, 3 rezervne i 2 kg PLA filamenta. Radi bez problema."

### 2.9 Warning banner
`<div role="status">`: `display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:14px; font-size:14px; background:#FFB3401F; border:1px solid #FFB34040; color:#FFB340`. Icon info 16x16 `currentColor` (so `#FFB340`). Text span `flex-grow:1; color:#F5F5F7`: "Dostavu uključi u OLX aplikaciji. API ne može postaviti dostavu."

### 2.10 Action row
`display:flex; justify-content:flex-end; gap:8px`.
- "Odbaci": ghost button, `height:44px; padding:0 16px; color:rgba(235,235,245,.68); background:transparent; border:0`.
- "Pregledaj prije objave": accent button, `padding:0 16px 0 13px; font-weight:600`, leading chevron-right icon 15x15 (`M9 6l6 6-6 6`).

### 3. Interactions and script
- No handlers in the file. Implied behaviour:
  - Every field is editable. The AI tag marks fields the model filled. Editing a field likely removes or keeps the tag (not specified).
  - Price suggestion: range 520 – 600 KM, median 560 KM from 18 similar listings. The default value is the median.
  - "Dostava" switches are independent toggles. "Besplatna dostava" is only for SVEX.
  - "Gdje objaviti" selects OLX, SVEX or both. The warning banner is about OLX; it is shown while "Oba" is selected (implied: visible when OLX is included).
  - "Pregledaj prije objave" goes to SellApprove. "Odbaci" discards the draft. "uredi" goes to `SellPhotos.dc.html`.
- Animations: `.in` on the assistant row only.

### 4. Patterns, tokens, fonts, blobs
Tokens and fonts: S1. Horizon pattern: S4. Blob: `/_blob/44d310d932b0fe647b478ab95165dc21`, used once: `<img alt="Naslovna slika">`, `width:100%; aspect-ratio:1; object-fit:cover; border-radius:16px` in the 180px left column. No `image-rendering` rule.

### 6. Responsive
No breakpoints. The 180px + 1fr grid and the two-up grids stay fixed at all widths. Narrow screens would need a stack rule (not drawn).

## S. Shared shell (identical in SellPhotos, SellDraft, SellApprove, SellSuccess)

Only the title, the `<main>` content and `$preview.height` differ between the four files.

### S1. Tokens and props
- Script props (`data-props`): `accent` color default `#FF9646`, options `#FF9646 #F5C518 #7DD3A8 #8FB4FF`. `dither` range 1-8 px, default 2. `intensity` range 0-100 %, default 30. `bend` range 0-100, default 0. `$preview.width` 1440.
- CSS custom properties: `--p: {{dither}}px` on the root div. `--r` (ring radius, px) and `--c` (ring color) on each `.ring`.
- Template variable `{{accent}}` is used for: active step pill, primary button background, own bubble, borders, check icons, progress fill, mascot body fill.
- Fixed colors: page `#0E1020`; text `#F5F5F7`; muted text `rgba(235,235,245,.68)`; dim text `rgba(235,235,245,.56)`; placeholder `rgba(235,235,245,.45)`; link `#8FB4FF`; ok green `#34C759`; focus ring `#8FB4FF`; sun pale `#FFE2A8`; sun pink `#C2407A`; sun indigo `#33298F`; mascot orange `#C9672A`; hover link `#FFFFFF`.
- Font: root `font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Inter, system-ui, sans-serif`; `-webkit-font-smoothing: antialiased`. Google Font loaded: `Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700` with `display=swap` (preconnect to fonts.googleapis.com and fonts.gstatic.com crossorigin). Inter is only the 5th fallback.
- Global CSS: `html,body{margin:0;background:#0E1020}`, `*{box-sizing:border-box}`, `a{color:#F5F5F7}`, `a:hover{color:#FFFFFF}`.

### S2. Global classes (exact)
- `.sr`: `position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap`.
- `.glass`: `background:rgba(22,24,46,.58); backdrop-filter:blur(28px) saturate(170%); border:1px solid rgba(255,255,255,.10); box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 24px 60px rgba(0,0,0,.35)`.
- `.solid`: `background:rgba(20,22,42,.94); backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,.10); box-shadow:0 30px 80px rgba(0,0,0,.5)` (unused in these four).
- `.chip`: `background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.08)`.
- `.field`: `background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); border-radius:12px; color:#F5F5F7; font:inherit; font-size:15px; padding:0 14px; height:44px; width:100%; outline:none`.
- `.lbl`: `font-size:12px; font-weight:600; letter-spacing:.02em; color:rgba(235,235,245,.68); text-transform:uppercase`.
- Buttons and links: `-webkit-tap-highlight-color:transparent; transition:transform .15s ease, filter .15s ease, background-color .15s ease`. `button:hover, a.btn:hover {filter:brightness(1.12)}`. `button:active, a.btn:active {transform:scale(.97)}`.
- Focus: `button/a/textarea/input/select :focus-visible {outline:2px solid #8FB4FF; outline-offset:3px}`.
- Placeholder: `textarea::placeholder, input::placeholder {color:rgba(235,235,245,.45)}`.
- Note: `.field` has `outline:none` inline in the class, but the `:focus-visible` rule still sets a 2px outline. No separate `:focus` border change exists. No disabled or error style exists in these four files.

### S3. Animation classes and keyframes (exact)
- `.in {animation: springIn .55s cubic-bezier(.2,.9,.3,1.25) both}`; `@keyframes springIn {from{opacity:0; transform:translateY(14px) scale(.97)} to{opacity:1; transform:none}}`. Used on each message row with `animation-delay: 0ms`.
- `.dock {animation: dock .7s cubic-bezier(.2,.9,.3,1) both}`; `dock: from{opacity:.6; transform:translateY(-40vh)} to{opacity:1; transform:none}`. Not used in these four files.
- `.attn {animation: attn 2.6s ease-in-out .8s infinite}`; `attn: 0%,100%{box-shadow:0 0 0 0 rgba(255,150,70,.0),0 30px 80px rgba(0,0,0,.45)} 30%{box-shadow:0 0 0 8px rgba(255,150,70,.22),0 30px 80px rgba(0,0,0,.45)} 60%{box-shadow:0 0 0 14px rgba(255,150,70,0),0 30px 80px rgba(0,0,0,.45)}`. The ring color is hard-coded `255,150,70` and does not follow `accent`.
- `.shim {background:linear-gradient(90deg,rgba(255,255,255,.05) 0%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.05) 100%) 0 0/200% 100%; animation: shim 1.4s linear infinite}`; `shim: to{background-position:-200% 0}`. Unused here.
- `.spin {animation: spin .9s linear infinite}`; `spin: to{transform:rotate(360deg)}`.
- `.dot1,.dot2,.dot3 {animation: blink 1.2s ease-in-out infinite}`; `.dot2{animation-delay:.15s}`; `.dot3{animation-delay:.3s}`; `blink: 0%,100%{opacity:.25} 50%{opacity:1}`. Unused here.
- `.caret {animation: caret 1s steps(1) infinite}`; `caret: 50%{opacity:0}`. Unused here.
- `.conf {animation: fall 2.8s linear infinite}`; `fall: from{transform:translateY(-30px)} to{transform:translateY(520px)}`.
- `.fly {animation: flyIn .45s cubic-bezier(.2,.9,.3,1) both}`; `flyIn: from{opacity:0; transform:translateX(48px)} to{opacity:1; transform:none}`. Unused here.
- `@keyframes fade {from{opacity:0} to{opacity:1}}`.
- `@media (prefers-reduced-motion: reduce) { .in,.dock,.fly {animation: fade .3s ease both} .attn,.shim,.spin,.conf,.caret,.dot1,.dot2,.dot3 {animation: none} }`.

### S4. Horizon (sun) background pattern
Markup: `<div aria-hidden="true" style="position:absolute; inset:0; pointer-events:none; overflow:hidden"><div class="sun" style="top:calc(100% + {{sunOffset}}px); transform:translateX({{sunX}}px)"> rings </div></div>`. It sits as the first child of the root div. The root is `position:relative; min-height:100vh; overflow:hidden; display:flex; flex-direction:column; background:#0E1020; color:#F5F5F7`. The header, main and composer have `position: relative`/`sticky` and paint above it.
- `.sun {position:absolute; left:50%; width:0; height:0; pointer-events:none}`.
- `.ring {position:absolute; border-radius:50%; left:calc(var(--r)*-1); top:calc(var(--r)*-1); width:calc(var(--r)*2); height:calc(var(--r)*2)}`. Each ring is a circle of radius `--r` centred on the `.sun` point. Rings are painted from the largest to the smallest (the array is reversed), so the smallest ring is on top.
- Dither classes (`--p` = dither px, `--c` = ring color):
  - `.d6`: `background: conic-gradient(at var(--p) var(--p), transparent 0 75%, var(--c) 0) 0 0/calc(var(--p)*4) calc(var(--p)*4)`.
  - `.d12`: two layers of the `.d6` gradient. Layer 1 at `0 0/calc(var(--p)*4) calc(var(--p)*4)`. Layer 2 at `calc(var(--p)*2) calc(var(--p)*2)/calc(var(--p)*4) calc(var(--p)*4)`.
  - `.d25`: `conic-gradient(at var(--p) var(--p), transparent 0 75%, var(--c) 0) 0 0/calc(var(--p)*2) calc(var(--p)*2)`.
  - `.d50`: `repeating-conic-gradient(var(--c) 0 25%, transparent 0 50%) 0 0/calc(var(--p)*2) calc(var(--p)*2)` (checkerboard).
  - `.d75`: `conic-gradient(at var(--p) var(--p), var(--c) 0 75%, transparent 0) 0 0/calc(var(--p)*2) calc(var(--p)*2)`.
  - `.d100`: `background: var(--c)`.
- Ring generation (script `renderVals`): `p = max(1, round(dither))`; `k = 0.4 + (intensity/100)*1.6`; `sag = 30 + bend*2.2`; `q = 4*p`; `snap(v) = max(q, round(v/q)*q)`; `core = snap((720*720 + sag*sag) / (2*sag))`.
  - First ring: `{cls:'d100', c:'#FFE2A8', r:core}`.
  - Layers (class, color, thickness): `d50 pale 8; d25 pale 8; d100 accent 16; d75 accent 10; d50 accent 12; d25 accent 12; d12 accent 14; d6 accent 16; d100 pink 24; d75 pink 18; d50 pink 18; d25 pink 20; d12 pink 22; d6 pink 24; d100 indigo 40; d75 indigo 30; d50 indigo 32; d25 indigo 34; d12 indigo 38; d6 indigo 44`. For each layer: `r += snap(thickness*k)`, push `{cls, c, r, bp}`.
  - `sunOffset = indigoStart + snap(24)`. `indigoStart` = `r` just before the first indigo `d100` layer is added.
  - `sunX = round((lx*140)/p)*p`. In the canvas `lx = 0` and `t = 0`, so `sunX = 0` and no flicker is applied.
  - Flicker (disabled in canvas, `t=0`): `flick = floor(t/0.9) % 2`. When `flick` and `i % 3 === 1`, `background-position` becomes `var(--p) 0` (for `d12`: `var(--p) 0, calc(var(--p)*3) calc(var(--p)*2)`). Normal position is `0 0` (for `d12`: `0 0, calc(var(--p)*2) calc(var(--p)*2)`). The production page needs a timer that advances `t` to animate this.
  - Defaults give: `p=2, q=8, k=0.88, sag=30, core=8656`.

### S5. Header (`<header class="glass">`)
- Style: `position:sticky; top:0; z-index:5; border-width:0 0 1px 0; border-radius:0; box-shadow:none; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:10px 24px`.
- Left group (`flex; align-items:center; gap:10px`):
  - Logo link `href=Main.dc.html`, `aria-label="Početna"`, `display:grid; place-items:center; width:44px; height:44px`. Contains the pixel mascot SVG `width=30 height=24 viewBox="0 0 20 16" shape-rendering="crispEdges"`.
  - "Novi razgovor": `<a class="btn chip" href=Main.dc.html>`, `font:inherit 14px/500; letter-spacing:-.01em; display:inline-flex; align-items:center; gap:7px; border-radius:999px; padding:0 16px 0 13px; height:40px; min-height:40px; cursor:pointer; text-decoration:none; white-space:nowrap; color:#F5F5F7`. Icon: pencil, 15x15, stroke currentColor, stroke-width 2.2, round caps and joins.
- Right group (`flex; align-items:center; gap:8px; flex-wrap:wrap`):
  - Status chip `class="chip" role="status" aria-label="Status veza"`: `inline-flex; gap:14px; height:40px; padding:0 14px; border-radius:999px; font-size:13px; font-weight:500`. Three items (`inline-flex; gap:6px`), each with an 8x8 dot (`border-radius:999px; background:#34C759; flex-shrink:0`). Labels: OpenRouter, OLX, SVEX. All three are green in all four files (no other status state exists in the files).
  - Model button `aria-haspopup="listbox"`: `13px/500; color:rgba(235,235,245,.68); background:transparent; border:0; border-radius:999px; padding:0 10px; height:40px; gap:4px`. Text "Sonnet 5.5" and a chevron-down 14x14 (`M7 10l5 5 5-5`). No popup is drawn.
  - "Moji oglasi": `<a class="btn" href=MyListings.dc.html>`, same base style as "Novi razgovor" but `color:rgba(235,235,245,.68); background:transparent; border:0`. Icon: layers, 15x15.
  - Settings: `<a class="btn chip" href=Settings.dc.html aria-label="Postavke">`, `padding:0; width:40px; height:40px; justify-content:center`. Gear icon 15x15.

### S6. Main column and message rows
- `<main>`: `position:relative; flex-grow:1; width:100%; max-width:860px; margin:0 auto; padding:32px 24px 24px; display:flex; flex-direction:column; gap:24px`.
- Assistant row: `class="in"; display:flex; gap:12px; align-items:flex-start`. Avatar cell `width:32px; flex-shrink:0; padding-top:2px` with the mascot SVG `28x22`. Body cell `flex-grow:1; min-width:0; display:flex; flex-direction:column; gap:14px`. Text `<p style="margin:0; font-size:17px; line-height:1.55">`.
- User bubble (used only in SellPhotos): wrapper `class="in"; align-self:flex-end; max-width:520px; display:flex; flex-direction:column; gap:6px; align-items:flex-end`. Bubble: `background:{{accent}}; color:#0E1020; padding:11px 16px; border-radius:20px 20px 6px 20px; font-size:16px; font-weight:500; line-height:1.45; letter-spacing:-.01em`.
- Mascot (pixel art): SVG `viewBox="0 0 20 16"` with `shape-rendering="crispEdges"`; each pixel is a `h1v1h-1z` path. Colors: hat/hair `#FFE2A8`, body `{{accent}}`, eyes/mouth `#0E1020`, cheeks `#C2407A`, feet `#C9672A`. Pose variants per file are listed in each file's section.
- Section card base (used for all cards except the approve dialog and success hero): `class="glass"; border-radius:24px; padding:20px; box-shadow:none`. The style string ends with the stray token `in` (`...box-shadow: none; in"`), which is invalid CSS and ignored. The `.in` animation is NOT applied to these cards.
- Step indicator `<ol aria-label="Koraci objave">`: `list-style:none; margin:0; padding:0; display:flex; gap:6px; font-size:12px; font-weight:600`. Each `<li>`: `display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px`. Items: Slike, Nacrt, Odobrenje, Objava.
  - Current (dark card): `background:{{accent}}; color:#0E1020`.
  - Done (dark card): `background:rgba(255,255,255,.1); color:#F5F5F7`, with a 11x11 check icon (`M5 12.5l4.5 4.5L19 7`, stroke-width 3).
  - Upcoming (dark card): `background:transparent; color:rgba(235,235,245,.56); border:1px solid rgba(255,255,255,.12)`.
  - Light card (SellApprove) variants: done `background:rgba(14,16,32,.08); color:#0E1020` with check; current `{{accent}}` bg, `#0E1020`; upcoming `transparent; color:rgba(14,16,32,.55); border:1px solid rgba(14,16,32,.14)`.
- Primary button (accent): `font:inherit; 14px/500 (600 when style adds font-weight:600); letter-spacing:-.01em; inline-flex; align-items:center; gap:7px; border-radius:999px; padding:0 16px (0 16px 0 13px with icon); height:44px; min-height:44px; cursor:pointer; white-space:nowrap; color:#0E1020; background:{{accent}}; border:0`. Hover/active/focus from S2.
- Ghost button: same geometry, `color:rgba(235,235,245,.68); background:transparent; border:0`.

### S7. Composer (`<div style="position:sticky; bottom:0; z-index:4; padding:12px 24px 22px">`)
- `<form class="glass">`: `width:100%; max-width:812px; margin:0 auto; border-radius:26px; display:flex; flex-direction:column; padding:6px`.
- `<label for="msg" class="sr">Poruka</label>` and `<textarea id="msg" rows="1" placeholder="Napiši nešto…">`: `resize:none; field-sizing:content; max-height:200px; border:0; outline:none; background:transparent; color:#F5F5F7; font-family:inherit; font-size:16px; line-height:1.5; letter-spacing:-.01em; padding:10px 14px 4px`.
- Toolbar: `display:flex; justify-content:space-between; align-items:center; gap:10px; padding:4px 4px 4px 8px`. Left group `flex; gap:6px; align-items:center; font-size:13px; font-weight:500`:
  - Add images: `button.chip aria-label="Dodaj slike"`, `32x32; border-radius:999px; display:grid; place-items:center`. Icon: image (rect 18x14 rx3 + circle + path), 15x15.
  - Toggle chips "OLX.ba" and "SVEX.ba": `button.chip aria-pressed="true"`, `font:inherit; inline-flex; gap:6px; border-radius:999px; padding:0 12px 0 9px; height:32px`. Check icon 13x13, `stroke:{{accent}}`, stroke-width 2.8. Both pressed (on) in all four files. The off state is not drawn.
  - Model button "Sonnet 5.5" `height:32px` (same style as header model button).
- Send: `button[type=submit] aria-label="Pošalji"`, `40x40; flex-shrink:0; border:0; border-radius:999px; background:{{accent}}; color:#0E1020; display:grid; place-items:center`. Arrow-up icon 18x18, stroke-width 2.6.

### S8. Script
`<script type="text/x-dc" data-dc-script>`: `class Component extends DCLogic { renderVals() {...} }`. It has NO state variables, NO event handlers, NO timers. It returns `{accent, dither, rings, sunOffset, sunX}` from the props. All interactivity in the canvas is anchors (`href` to other canvas files) or static markup. Behaviour the canvas implies but does not code is listed per file.

### S9. Shared copy (keys)
| Component | Text | Key |
|---|---|---|
| Header | Početna (aria) | `header.homeAria` |
| Header | Novi razgovor | `header.newChat` |
| Header | Status veza (aria) | `header.statusAria` |
| Header | OpenRouter / OLX / SVEX | `header.status.openRouter` / `.olx` / `.svex` |
| Header | Sonnet 5.5 | `header.model` |
| Header | Moji oglasi | `header.myListings` |
| Header | Postavke (aria) | `header.settingsAria` |
| Steps | Koraci objave (aria) | `steps.aria` |
| Steps | Slike / Nacrt / Odobrenje / Objava | `steps.photos` / `steps.draft` / `steps.approve` / `steps.publish` |
| Composer | Poruka (label) | `composer.label` |
| Composer | Napiši nešto… | `composer.placeholder` |
| Composer | Dodaj slike (aria) | `composer.addPhotosAria` |
| Composer | OLX.ba / SVEX.ba | `composer.targetOlx` / `composer.targetSvex` |
| Composer | Pošalji (aria) | `composer.sendAria` |

### S10. Responsive
No `@media` query except `prefers-reduced-motion`. No breakpoints. Wrapping is by `flex-wrap:wrap` on the header, its right group and the section title row. `$preview.width` is 1440. Content width is capped by `max-width:860px` (main) and `812px` (composer).

## Screen: SellApprove (Prodaja 3 – odobrenje)

Source: `/home/omznc/dev/lagano-shop/design/canvas/SellApprove.dc.html` (33002 bytes). `<title>Prodaja 3 – odobrenje</title>`. `$preview` 1440 x 1240.

### 1. Layout
- Shell: section S. Main has one assistant row. Its body column (`gap:14px`) holds, in order: intro `<p>`; approval dialog (light card); label "Nakon klika na Objavi:"; progress card (dark glass).
- The second part (label + progress card) shows the state AFTER the user clicks "Objavi na OLX i SVEX". The canvas draws both states stacked for design review.
- Mascot pose: neutral (same as SellPhotos).
- Intro: "Sve je spremno. Ovo je tačno ono što šaljem:" `17px/1.55`.

### 2. Components
### 2.1 Approval dialog (light card)
- `<section role="alertdialog" aria-labelledby="ap-t" class="attn in">`: `background:#F5F5F7; color:#0E1020; border-radius:28px; padding:22px; border:2px solid {{accent}}; display:flex; flex-direction:column; gap:16px`.
- Animation: `.in` (springIn .55s) once, then `.attn` pulse (2.6s ease-in-out, delay .8s, infinite). `.attn` and `.in` both set `animation`; `.attn` is declared later so it wins and `.in` does NOT play (cascade: same specificity, later rule). The card therefore only pulses.
- The pulse draws `box-shadow` rings (S3). It is not removed on focus. Reduced motion: `.attn` animation none.
- Header row: `display:flex; align-items:center; gap:14px`. Children: mascot SVG `56x44` (neutral pose); text block `flex-grow:1` with `<h2 id="ap-t" style="margin:0; font-size:24px; font-weight:700; letter-spacing:-.03em">Objaviti?</h2>` and `<p style="margin:2px 0 0; font-size:14px; color:rgba(14,16,32,.65)">`; step list (light variant, S6). Current step "Odobrenje"; "Slike" and "Nacrt" done with check; "Objava" upcoming.
- Thumbnails row: `display:flex; gap:8px; align-items:center`. Five `<img>`: `width:56px; height:56px; object-fit:cover; border-radius:12px`. First: `border:2px solid {{accent}}` (cover). Others: `border:1px solid rgba(14,16,32,.1)`.
- Platform grid: `display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px`. Two cards (OLX, SVEX).
- Platform card: `background:#FFFFFF; border-radius:18px; padding:14px 16px; border:1px solid rgba(14,16,32,.08)`.
  - Head: `display:flex; align-items:center; gap:8px; margin-bottom:4px`. Pill `font-size:12px; font-weight:700; padding:3px 9px; border-radius:999px; background:#0E1020; color:#F5F5F7` (text "OLX" or "SVEX"); text `font-size:13px; color:rgba(14,16,32,.6)` "ide ovo:".
  - Row: `display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px solid rgba(14,16,32,.08); font-size:14px`. Key span `color:rgba(14,16,32,.6)`. Value span `font-weight:600; text-align:right`. (Every row, including the last, has the bottom border.)
  - OLX warning note (OLX card only): `margin-top:10px; display:flex; gap:8px; align-items:flex-start; font-size:13px; color:#8A4B00; background:#FFF1DC; padding:10px 12px; border-radius:12px`. Icon info 15x15, `stroke:#8A4B00`. Text: "Dostavu uključi u OLX aplikaciji. API ne može postaviti dostavu."
- Rows OLX: Naslov, Cijena, Stanje, Grad, Slike, Kategorija, Dostava. Rows SVEX: Naslov, Cijena, Stanje, Grad, Slike, Kategorija, Dostava (no note). Values differ: category OLX "Kompjuteri › 3D printeri", SVEX "Računari › Printeri"; delivery OLX "Nije postavljena", SVEX "Lično preuzimanje".
- Action row: `display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap`. All three controls have `height:48px; border-radius:999px; font-size:15px`.
  - "Otkaži": `<button>`; `font:inherit; font-weight:500; padding:0 18px; border:0; background:transparent; color:#0E1020; cursor:pointer`.
  - "Uredi": `<a class="btn" href="SellDraft.dc.html">`; `font-weight:500; padding:0 18px; border:1px solid rgba(14,16,32,.16); color:#0E1020; text-decoration:none; display:inline-flex; align-items:center; gap:6px`. Pencil icon 15x15.
  - "Objavi na OLX i SVEX": `<a class="btn" href="SellSuccess.dc.html">`; `font-weight:600; padding:0 22px; background:#0E1020; color:#F5F5F7; text-decoration:none; display:inline-flex; align-items:center; gap:8px`.
  - Global `a:hover{color:#FFFFFF}` is overridden by inline color on "Uredi" (#0E1020). Hover filter brightness(1.12) and active scale(.97) apply to the two `a.btn` and to the button.

### 2.2 Label
`<p style="margin:8px 0 0; font-size:13px; color:rgba(235,235,245,.56)">Nakon klika na Objavi:</p>`. This is a design annotation, not product UI.

### 2.3 Publishing progress card
- `glass; border-radius:24px; padding:20px; box-shadow:none` (stray `in` token ignored).
- Title: `<h2 style="margin:0; font-size:15px; font-weight:600; letter-spacing:-.02em">Objavljujem…</h2>`.
- List: `margin-top:14px; display:flex; flex-direction:column; gap:14px`. Each item `flex column; gap:6px`: row (`display:flex; justify-content:space-between; font-size:14px`) and bar.
  - Left: `inline-flex; align-items:center; gap:8px; font-weight:600` with icon + platform name.
  - Right: `color:rgba(235,235,245,.68)` status.
  - Bar: `height:6px; border-radius:6px; background:rgba(255,255,255,.1); overflow:hidden`; fill `height:100%; width:N%`. No `transition` on the fill.
- State "done" (OLX): icon check 14x14, `stroke:#34C759`, stroke-width 3. Status "Objavljeno". Fill `width:100%; background:#34C759`.
- State "working" (SVEX): icon refresh 14x14 (`M4 12a8 8 0 1 0 2.3-5.6`, `M4 4v5h5`), `stroke:rgba(235,235,245,.68)`, stroke-width 2.2, inside `<span class="spin" style="display:inline-grid">` (rotate 360deg, .9s linear, infinite). Status "Šaljem slike 3 / 5". Fill `width:60%` (3 of 5); `background:{{accent}}`.
- The error state is not in this file (see SellSuccess).

### 3. Interactions and script
- No handlers. Links: "Uredi" -> `SellDraft.dc.html`; "Objavi na OLX i SVEX" -> `SellSuccess.dc.html`. "Otkaži" has no target.
- Implied: the dialog opens when the draft step ends and blocks publishing until the user clicks the dark button ("Ništa se ne objavljuje bez tvog odobrenja"). After the click, the dialog is replaced by the progress card. Each platform uploads independently, images are sent one by one, and the fill width = sent images / total images (3/5 = 60%).
- Animations: `.attn` on the dialog; `.spin` on the SVEX icon; `.in` on the assistant row.

### 4. Patterns, tokens, fonts, blobs
Tokens and fonts: S1. Horizon: S4. Light-card palette: `#F5F5F7` surface, `#FFFFFF` inner cards, `#0E1020` ink, muted ink `rgba(14,16,32,.6)` / `.65` / `.55`, hairline `rgba(14,16,32,.08)`, `rgba(14,16,32,.1)`, `rgba(14,16,32,.14)`, `rgba(14,16,32,.16)`; warning `#8A4B00` on `#FFF1DC`.
Blobs (thumbnail row, 56 x 56, `object-fit:cover`, `border-radius:12px`, no `image-rendering`):
- `/_blob/44d310d932b0fe647b478ab95165dc21`: "Slika 1" (cover, accent border), "Slika 4".
- `/_blob/f60fcfa9ea5a0a5d2889a1e0c901f068`: "Slika 2", "Slika 5".
- `/_blob/df4e2008cb50c49c6ac755a1a645c6be`: "Slika 3".

### 6. Responsive
No breakpoints. Platform grid is fixed 2 columns; the action row wraps (`flex-wrap:wrap`). The thumbnail row does not wrap.

## S. Shared shell (identical in SellPhotos, SellDraft, SellApprove, SellSuccess)

Only the title, the `<main>` content and `$preview.height` differ between the four files.

### S1. Tokens and props
- Script props (`data-props`): `accent` color default `#FF9646`, options `#FF9646 #F5C518 #7DD3A8 #8FB4FF`. `dither` range 1-8 px, default 2. `intensity` range 0-100 %, default 30. `bend` range 0-100, default 0. `$preview.width` 1440.
- CSS custom properties: `--p: {{dither}}px` on the root div. `--r` (ring radius, px) and `--c` (ring color) on each `.ring`.
- Template variable `{{accent}}` is used for: active step pill, primary button background, own bubble, borders, check icons, progress fill, mascot body fill.
- Fixed colors: page `#0E1020`; text `#F5F5F7`; muted text `rgba(235,235,245,.68)`; dim text `rgba(235,235,245,.56)`; placeholder `rgba(235,235,245,.45)`; link `#8FB4FF`; ok green `#34C759`; focus ring `#8FB4FF`; sun pale `#FFE2A8`; sun pink `#C2407A`; sun indigo `#33298F`; mascot orange `#C9672A`; hover link `#FFFFFF`.
- Font: root `font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Inter, system-ui, sans-serif`; `-webkit-font-smoothing: antialiased`. Google Font loaded: `Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700` with `display=swap` (preconnect to fonts.googleapis.com and fonts.gstatic.com crossorigin). Inter is only the 5th fallback.
- Global CSS: `html,body{margin:0;background:#0E1020}`, `*{box-sizing:border-box}`, `a{color:#F5F5F7}`, `a:hover{color:#FFFFFF}`.

### S2. Global classes (exact)
- `.sr`: `position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap`.
- `.glass`: `background:rgba(22,24,46,.58); backdrop-filter:blur(28px) saturate(170%); border:1px solid rgba(255,255,255,.10); box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 24px 60px rgba(0,0,0,.35)`.
- `.solid`: `background:rgba(20,22,42,.94); backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,.10); box-shadow:0 30px 80px rgba(0,0,0,.5)` (unused in these four).
- `.chip`: `background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.08)`.
- `.field`: `background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); border-radius:12px; color:#F5F5F7; font:inherit; font-size:15px; padding:0 14px; height:44px; width:100%; outline:none`.
- `.lbl`: `font-size:12px; font-weight:600; letter-spacing:.02em; color:rgba(235,235,245,.68); text-transform:uppercase`.
- Buttons and links: `-webkit-tap-highlight-color:transparent; transition:transform .15s ease, filter .15s ease, background-color .15s ease`. `button:hover, a.btn:hover {filter:brightness(1.12)}`. `button:active, a.btn:active {transform:scale(.97)}`.
- Focus: `button/a/textarea/input/select :focus-visible {outline:2px solid #8FB4FF; outline-offset:3px}`.
- Placeholder: `textarea::placeholder, input::placeholder {color:rgba(235,235,245,.45)}`.
- Note: `.field` has `outline:none` inline in the class, but the `:focus-visible` rule still sets a 2px outline. No separate `:focus` border change exists. No disabled or error style exists in these four files.

### S3. Animation classes and keyframes (exact)
- `.in {animation: springIn .55s cubic-bezier(.2,.9,.3,1.25) both}`; `@keyframes springIn {from{opacity:0; transform:translateY(14px) scale(.97)} to{opacity:1; transform:none}}`. Used on each message row with `animation-delay: 0ms`.
- `.dock {animation: dock .7s cubic-bezier(.2,.9,.3,1) both}`; `dock: from{opacity:.6; transform:translateY(-40vh)} to{opacity:1; transform:none}`. Not used in these four files.
- `.attn {animation: attn 2.6s ease-in-out .8s infinite}`; `attn: 0%,100%{box-shadow:0 0 0 0 rgba(255,150,70,.0),0 30px 80px rgba(0,0,0,.45)} 30%{box-shadow:0 0 0 8px rgba(255,150,70,.22),0 30px 80px rgba(0,0,0,.45)} 60%{box-shadow:0 0 0 14px rgba(255,150,70,0),0 30px 80px rgba(0,0,0,.45)}`. The ring color is hard-coded `255,150,70` and does not follow `accent`.
- `.shim {background:linear-gradient(90deg,rgba(255,255,255,.05) 0%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.05) 100%) 0 0/200% 100%; animation: shim 1.4s linear infinite}`; `shim: to{background-position:-200% 0}`. Unused here.
- `.spin {animation: spin .9s linear infinite}`; `spin: to{transform:rotate(360deg)}`.
- `.dot1,.dot2,.dot3 {animation: blink 1.2s ease-in-out infinite}`; `.dot2{animation-delay:.15s}`; `.dot3{animation-delay:.3s}`; `blink: 0%,100%{opacity:.25} 50%{opacity:1}`. Unused here.
- `.caret {animation: caret 1s steps(1) infinite}`; `caret: 50%{opacity:0}`. Unused here.
- `.conf {animation: fall 2.8s linear infinite}`; `fall: from{transform:translateY(-30px)} to{transform:translateY(520px)}`.
- `.fly {animation: flyIn .45s cubic-bezier(.2,.9,.3,1) both}`; `flyIn: from{opacity:0; transform:translateX(48px)} to{opacity:1; transform:none}`. Unused here.
- `@keyframes fade {from{opacity:0} to{opacity:1}}`.
- `@media (prefers-reduced-motion: reduce) { .in,.dock,.fly {animation: fade .3s ease both} .attn,.shim,.spin,.conf,.caret,.dot1,.dot2,.dot3 {animation: none} }`.

### S4. Horizon (sun) background pattern
Markup: `<div aria-hidden="true" style="position:absolute; inset:0; pointer-events:none; overflow:hidden"><div class="sun" style="top:calc(100% + {{sunOffset}}px); transform:translateX({{sunX}}px)"> rings </div></div>`. It sits as the first child of the root div. The root is `position:relative; min-height:100vh; overflow:hidden; display:flex; flex-direction:column; background:#0E1020; color:#F5F5F7`. The header, main and composer have `position: relative`/`sticky` and paint above it.
- `.sun {position:absolute; left:50%; width:0; height:0; pointer-events:none}`.
- `.ring {position:absolute; border-radius:50%; left:calc(var(--r)*-1); top:calc(var(--r)*-1); width:calc(var(--r)*2); height:calc(var(--r)*2)}`. Each ring is a circle of radius `--r` centred on the `.sun` point. Rings are painted from the largest to the smallest (the array is reversed), so the smallest ring is on top.
- Dither classes (`--p` = dither px, `--c` = ring color):
  - `.d6`: `background: conic-gradient(at var(--p) var(--p), transparent 0 75%, var(--c) 0) 0 0/calc(var(--p)*4) calc(var(--p)*4)`.
  - `.d12`: two layers of the `.d6` gradient. Layer 1 at `0 0/calc(var(--p)*4) calc(var(--p)*4)`. Layer 2 at `calc(var(--p)*2) calc(var(--p)*2)/calc(var(--p)*4) calc(var(--p)*4)`.
  - `.d25`: `conic-gradient(at var(--p) var(--p), transparent 0 75%, var(--c) 0) 0 0/calc(var(--p)*2) calc(var(--p)*2)`.
  - `.d50`: `repeating-conic-gradient(var(--c) 0 25%, transparent 0 50%) 0 0/calc(var(--p)*2) calc(var(--p)*2)` (checkerboard).
  - `.d75`: `conic-gradient(at var(--p) var(--p), var(--c) 0 75%, transparent 0) 0 0/calc(var(--p)*2) calc(var(--p)*2)`.
  - `.d100`: `background: var(--c)`.
- Ring generation (script `renderVals`): `p = max(1, round(dither))`; `k = 0.4 + (intensity/100)*1.6`; `sag = 30 + bend*2.2`; `q = 4*p`; `snap(v) = max(q, round(v/q)*q)`; `core = snap((720*720 + sag*sag) / (2*sag))`.
  - First ring: `{cls:'d100', c:'#FFE2A8', r:core}`.
  - Layers (class, color, thickness): `d50 pale 8; d25 pale 8; d100 accent 16; d75 accent 10; d50 accent 12; d25 accent 12; d12 accent 14; d6 accent 16; d100 pink 24; d75 pink 18; d50 pink 18; d25 pink 20; d12 pink 22; d6 pink 24; d100 indigo 40; d75 indigo 30; d50 indigo 32; d25 indigo 34; d12 indigo 38; d6 indigo 44`. For each layer: `r += snap(thickness*k)`, push `{cls, c, r, bp}`.
  - `sunOffset = indigoStart + snap(24)`. `indigoStart` = `r` just before the first indigo `d100` layer is added.
  - `sunX = round((lx*140)/p)*p`. In the canvas `lx = 0` and `t = 0`, so `sunX = 0` and no flicker is applied.
  - Flicker (disabled in canvas, `t=0`): `flick = floor(t/0.9) % 2`. When `flick` and `i % 3 === 1`, `background-position` becomes `var(--p) 0` (for `d12`: `var(--p) 0, calc(var(--p)*3) calc(var(--p)*2)`). Normal position is `0 0` (for `d12`: `0 0, calc(var(--p)*2) calc(var(--p)*2)`). The production page needs a timer that advances `t` to animate this.
  - Defaults give: `p=2, q=8, k=0.88, sag=30, core=8656`.

### S5. Header (`<header class="glass">`)
- Style: `position:sticky; top:0; z-index:5; border-width:0 0 1px 0; border-radius:0; box-shadow:none; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:10px 24px`.
- Left group (`flex; align-items:center; gap:10px`):
  - Logo link `href=Main.dc.html`, `aria-label="Početna"`, `display:grid; place-items:center; width:44px; height:44px`. Contains the pixel mascot SVG `width=30 height=24 viewBox="0 0 20 16" shape-rendering="crispEdges"`.
  - "Novi razgovor": `<a class="btn chip" href=Main.dc.html>`, `font:inherit 14px/500; letter-spacing:-.01em; display:inline-flex; align-items:center; gap:7px; border-radius:999px; padding:0 16px 0 13px; height:40px; min-height:40px; cursor:pointer; text-decoration:none; white-space:nowrap; color:#F5F5F7`. Icon: pencil, 15x15, stroke currentColor, stroke-width 2.2, round caps and joins.
- Right group (`flex; align-items:center; gap:8px; flex-wrap:wrap`):
  - Status chip `class="chip" role="status" aria-label="Status veza"`: `inline-flex; gap:14px; height:40px; padding:0 14px; border-radius:999px; font-size:13px; font-weight:500`. Three items (`inline-flex; gap:6px`), each with an 8x8 dot (`border-radius:999px; background:#34C759; flex-shrink:0`). Labels: OpenRouter, OLX, SVEX. All three are green in all four files (no other status state exists in the files).
  - Model button `aria-haspopup="listbox"`: `13px/500; color:rgba(235,235,245,.68); background:transparent; border:0; border-radius:999px; padding:0 10px; height:40px; gap:4px`. Text "Sonnet 5.5" and a chevron-down 14x14 (`M7 10l5 5 5-5`). No popup is drawn.
  - "Moji oglasi": `<a class="btn" href=MyListings.dc.html>`, same base style as "Novi razgovor" but `color:rgba(235,235,245,.68); background:transparent; border:0`. Icon: layers, 15x15.
  - Settings: `<a class="btn chip" href=Settings.dc.html aria-label="Postavke">`, `padding:0; width:40px; height:40px; justify-content:center`. Gear icon 15x15.

### S6. Main column and message rows
- `<main>`: `position:relative; flex-grow:1; width:100%; max-width:860px; margin:0 auto; padding:32px 24px 24px; display:flex; flex-direction:column; gap:24px`.
- Assistant row: `class="in"; display:flex; gap:12px; align-items:flex-start`. Avatar cell `width:32px; flex-shrink:0; padding-top:2px` with the mascot SVG `28x22`. Body cell `flex-grow:1; min-width:0; display:flex; flex-direction:column; gap:14px`. Text `<p style="margin:0; font-size:17px; line-height:1.55">`.
- User bubble (used only in SellPhotos): wrapper `class="in"; align-self:flex-end; max-width:520px; display:flex; flex-direction:column; gap:6px; align-items:flex-end`. Bubble: `background:{{accent}}; color:#0E1020; padding:11px 16px; border-radius:20px 20px 6px 20px; font-size:16px; font-weight:500; line-height:1.45; letter-spacing:-.01em`.
- Mascot (pixel art): SVG `viewBox="0 0 20 16"` with `shape-rendering="crispEdges"`; each pixel is a `h1v1h-1z` path. Colors: hat/hair `#FFE2A8`, body `{{accent}}`, eyes/mouth `#0E1020`, cheeks `#C2407A`, feet `#C9672A`. Pose variants per file are listed in each file's section.
- Section card base (used for all cards except the approve dialog and success hero): `class="glass"; border-radius:24px; padding:20px; box-shadow:none`. The style string ends with the stray token `in` (`...box-shadow: none; in"`), which is invalid CSS and ignored. The `.in` animation is NOT applied to these cards.
- Step indicator `<ol aria-label="Koraci objave">`: `list-style:none; margin:0; padding:0; display:flex; gap:6px; font-size:12px; font-weight:600`. Each `<li>`: `display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px`. Items: Slike, Nacrt, Odobrenje, Objava.
  - Current (dark card): `background:{{accent}}; color:#0E1020`.
  - Done (dark card): `background:rgba(255,255,255,.1); color:#F5F5F7`, with a 11x11 check icon (`M5 12.5l4.5 4.5L19 7`, stroke-width 3).
  - Upcoming (dark card): `background:transparent; color:rgba(235,235,245,.56); border:1px solid rgba(255,255,255,.12)`.
  - Light card (SellApprove) variants: done `background:rgba(14,16,32,.08); color:#0E1020` with check; current `{{accent}}` bg, `#0E1020`; upcoming `transparent; color:rgba(14,16,32,.55); border:1px solid rgba(14,16,32,.14)`.
- Primary button (accent): `font:inherit; 14px/500 (600 when style adds font-weight:600); letter-spacing:-.01em; inline-flex; align-items:center; gap:7px; border-radius:999px; padding:0 16px (0 16px 0 13px with icon); height:44px; min-height:44px; cursor:pointer; white-space:nowrap; color:#0E1020; background:{{accent}}; border:0`. Hover/active/focus from S2.
- Ghost button: same geometry, `color:rgba(235,235,245,.68); background:transparent; border:0`.

### S7. Composer (`<div style="position:sticky; bottom:0; z-index:4; padding:12px 24px 22px">`)
- `<form class="glass">`: `width:100%; max-width:812px; margin:0 auto; border-radius:26px; display:flex; flex-direction:column; padding:6px`.
- `<label for="msg" class="sr">Poruka</label>` and `<textarea id="msg" rows="1" placeholder="Napiši nešto…">`: `resize:none; field-sizing:content; max-height:200px; border:0; outline:none; background:transparent; color:#F5F5F7; font-family:inherit; font-size:16px; line-height:1.5; letter-spacing:-.01em; padding:10px 14px 4px`.
- Toolbar: `display:flex; justify-content:space-between; align-items:center; gap:10px; padding:4px 4px 4px 8px`. Left group `flex; gap:6px; align-items:center; font-size:13px; font-weight:500`:
  - Add images: `button.chip aria-label="Dodaj slike"`, `32x32; border-radius:999px; display:grid; place-items:center`. Icon: image (rect 18x14 rx3 + circle + path), 15x15.
  - Toggle chips "OLX.ba" and "SVEX.ba": `button.chip aria-pressed="true"`, `font:inherit; inline-flex; gap:6px; border-radius:999px; padding:0 12px 0 9px; height:32px`. Check icon 13x13, `stroke:{{accent}}`, stroke-width 2.8. Both pressed (on) in all four files. The off state is not drawn.
  - Model button "Sonnet 5.5" `height:32px` (same style as header model button).
- Send: `button[type=submit] aria-label="Pošalji"`, `40x40; flex-shrink:0; border:0; border-radius:999px; background:{{accent}}; color:#0E1020; display:grid; place-items:center`. Arrow-up icon 18x18, stroke-width 2.6.

### S8. Script
`<script type="text/x-dc" data-dc-script>`: `class Component extends DCLogic { renderVals() {...} }`. It has NO state variables, NO event handlers, NO timers. It returns `{accent, dither, rings, sunOffset, sunX}` from the props. All interactivity in the canvas is anchors (`href` to other canvas files) or static markup. Behaviour the canvas implies but does not code is listed per file.

### S9. Shared copy (keys)
| Component | Text | Key |
|---|---|---|
| Header | Početna (aria) | `header.homeAria` |
| Header | Novi razgovor | `header.newChat` |
| Header | Status veza (aria) | `header.statusAria` |
| Header | OpenRouter / OLX / SVEX | `header.status.openRouter` / `.olx` / `.svex` |
| Header | Sonnet 5.5 | `header.model` |
| Header | Moji oglasi | `header.myListings` |
| Header | Postavke (aria) | `header.settingsAria` |
| Steps | Koraci objave (aria) | `steps.aria` |
| Steps | Slike / Nacrt / Odobrenje / Objava | `steps.photos` / `steps.draft` / `steps.approve` / `steps.publish` |
| Composer | Poruka (label) | `composer.label` |
| Composer | Napiši nešto… | `composer.placeholder` |
| Composer | Dodaj slike (aria) | `composer.addPhotosAria` |
| Composer | OLX.ba / SVEX.ba | `composer.targetOlx` / `composer.targetSvex` |
| Composer | Pošalji (aria) | `composer.sendAria` |

### S10. Responsive
No `@media` query except `prefers-reduced-motion`. No breakpoints. Wrapping is by `flex-wrap:wrap` on the header, its right group and the section title row. `$preview.width` is 1440. Content width is capped by `max-width:860px` (main) and `812px` (composer).

## Screen: SellSuccess (Prodaja 4 – uspjeh)

Source: `/home/omznc/dev/lagano-shop/design/canvas/SellSuccess.dc.html` (34868 bytes). `<title>Prodaja 4 – uspjeh</title>`. `$preview` 1440 x 1060.

### 1. Layout
- Shell: section S. Main has TWO assistant rows (`gap:24px`), each with its own mascot:
  1. Success hero (all platforms published).
  2. Partial failure card (OLX ok, SVEX failed). This is an alternative state drawn below the success state, for design review.
- No intro `<p>` in either row.

### 2. Components
### 2.1 Mascots
- Celebrate (row 1, 28x22 and 96x76 in the hero): extra pixels: green `#34C759` at (15,0), (18,8); gold `#FFD36E` at (0,1), (16,5); pink `#C2407A` at (19,1), (0,6); blue `#8FB4FF` at (17,2), (1,3). Eyes: arcs (`#0E1020`) at y7 x4-5, x10-11; y8 x3, x6, x9, x12. Mouth: wide smile `#0E1020`: y10 x5-10, y11 x6-9.
- Worried (row 2, 28x22 and 48x38): red `#FF453A` at (15,4), (15,5), (15,6), (15,8) (sweat drop). Eyes `#0E1020` at y7 x3, 6, 9, 12; y8 x4-5, 10-11; y9 x3, 6, 9, 12. Mouth y11 x6-9.
- Hero mascot has `role="img" aria-label="Maskota slavi"`; others `aria-hidden`.

### 2.2 Success hero card
- `<section class="glass in">`: `position:relative; overflow:hidden; border-radius:28px; padding:28px; display:flex; flex-direction:column; align-items:center; gap:14px; text-align:center; box-shadow:none`.
- Confetti: 11 `<span class="conf" aria-hidden>` children: `position:absolute; top:-20px; left:L; width:W; height:W; background:C; animation-delay:D; animation-duration:T` (square pixels, no `border-radius`). `.conf` runs `fall` (translateY -30px to 520px, linear, infinite). The `animation-duration` inline overrides the 2.8s class value.
  | # | left | size | color | delay | duration |
  |---|---|---|---|---|---|
  | 1 | 6% | 6px | `{{accent}}` | 0ms | 2600ms |
  | 2 | 14% | 4px | `#FFD36E` | 400ms | 3000ms |
  | 3 | 22% | 6px | `#8FB4FF` | 900ms | 2400ms |
  | 4 | 31% | 4px | `#C2407A` | 200ms | 2800ms |
  | 5 | 40% | 6px | `#34C759` | 1200ms | 3200ms |
  | 6 | 52% | 4px | `{{accent}}` | 600ms | 2500ms |
  | 7 | 61% | 6px | `#FFD36E` | 100ms | 2900ms |
  | 8 | 70% | 4px | `#8FB4FF` | 1500ms | 2700ms |
  | 9 | 79% | 6px | `#C2407A` | 700ms | 3100ms |
  | 10 | 88% | 4px | `#34C759` | 300ms | 2600ms |
  | 11 | 94% | 6px | `{{accent}}` | 1100ms | 2800ms |
  The card clips the pieces with `overflow:hidden`. The fall distance 520px is a fixed value, so a card shorter than about 520px clips them early. Confetti does not set `pointer-events`, `z-index` or `opacity`; the pieces are painted before the content in DOM order, so content paints on top (the content has no `position`, so the abs-positioned spans paint above non-positioned siblings; the text can be crossed by pieces). Reduced motion: `.conf` animation none (pieces stay at `top:-20px`, off-card).
- Mascot 96x76. `<h2 style="margin:0; font-size:26px; font-weight:700; letter-spacing:-.03em">Oglas je objavljen!</h2>`. `<p style="margin:0; font-size:15px; color:rgba(235,235,245,.68)">Creality Ender-3 V3 KE · 560 KM</p>`.
- Button row: `display:flex; gap:8px; flex-wrap:wrap; justify-content:center`. Three buttons, `height:44px; padding:0 16px 0 13px; border-radius:999px; font-size:14px; letter-spacing:-.01em; gap:7px`:
  - "Otvori na OLX" and "Otvori na SVEX": light button `background:#F5F5F7; color:#0E1020; border:0; box-shadow:0 8px 24px rgba(0,0,0,.25); font-weight:600`. Icon external-link 15x15 (`M14 4h6v6`, `M20 4l-9 9`, `M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4`).
  - "Kopiraj linkove": `class="glass"`, `color:#F5F5F7; box-shadow:none; font-weight:500`. Icon copy 15x15 (`rect x8 y8 12x12 rx2.5`, `M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2`).
  - All three are `<button type="button">` with no handler or href.

### 2.3 Partial-failure card
- `glass; border-radius:24px; padding:20px; box-shadow:none` (stray `in` ignored).
- Head: `display:flex; align-items:center; gap:14px`. Worried mascot 48x38. Text block `flex-grow:1`: `<h2 style="margin:0; font-size:15px; font-weight:600; letter-spacing:-.02em">Djelimično objavljeno</h2>` and `<p style="margin:0; font-size:14px; line-height:1.45; color:rgba(235,235,245,.68)">OLX je objavio oglas. SVEX je vratio grešku 503 (sajt ne radi).</p>`.
- Status list: `margin-top:14px; display:flex; flex-direction:column; gap:12px`. Row structure as in SellApprove 2.3.
  - OLX: check icon `#34C759`; right text "Objavljeno"; fill `width:100%; background:#34C759`.
  - SVEX (error): warning-triangle icon 14x14 (`M12 3.5l9.5 16.5h-19z`, `M12 10v4`, `M12 17v.5`), `stroke:#FF6B61`, stroke-width 2.2. Right text "Nije uspjelo". Fill `width:100%; background:#FF6B61`.
  - Error color tokens: `#FF6B61` (UI) and `#FF453A` (mascot sweat).
- Action row: `margin-top:14px; display:flex; justify-content:flex-end; gap:8px`. Both buttons `height:40px; min-height:40px; padding:0 16px 0 13px`.
  - "Otvori na OLX": `class="glass"`, `color:#F5F5F7; box-shadow:none`, external-link icon.
  - "Pokušaj ponovo na SVEX": accent button (`background:{{accent}}; color:#0E1020; font-weight:600; border:0`), retry icon 15x15 (`M4 12a8 8 0 1 0 2.3-5.6`, `M4 4v5h5`). No spin on the icon in this state.

### 3. Interactions and script
- No handlers. Implied:
  - "Otvori na OLX" / "Otvori na SVEX" open the live listing URL in a new tab.
  - "Kopiraj linkove" copies both listing URLs to the clipboard (no copied-state is drawn).
  - "Pokušaj ponovo na SVEX" re-runs the SVEX upload only; OLX is not re-sent. While it runs, the SVEX row would go back to the working state (spinner, accent fill, SellApprove 2.3).
  - A 503 from SVEX gives the partial state; the OLX listing stays published.
- Animations: `.in` on both rows and on the hero card; `.conf` x11.

### 4. Patterns, tokens, fonts, blobs
Tokens and fonts: S1. Horizon: S4. No `/_blob/` image is referenced in this file. Added colors: `#FFD36E`, `#8FB4FF`, `#FF6B61`, `#FF453A`.

### 6. Responsive
No breakpoints. Hero buttons wrap and centre. The partial card action row does not wrap.

## S. Shared shell (identical in SellPhotos, SellDraft, SellApprove, SellSuccess)

Only the title, the `<main>` content and `$preview.height` differ between the four files.

### S1. Tokens and props
- Script props (`data-props`): `accent` color default `#FF9646`, options `#FF9646 #F5C518 #7DD3A8 #8FB4FF`. `dither` range 1-8 px, default 2. `intensity` range 0-100 %, default 30. `bend` range 0-100, default 0. `$preview.width` 1440.
- CSS custom properties: `--p: {{dither}}px` on the root div. `--r` (ring radius, px) and `--c` (ring color) on each `.ring`.
- Template variable `{{accent}}` is used for: active step pill, primary button background, own bubble, borders, check icons, progress fill, mascot body fill.
- Fixed colors: page `#0E1020`; text `#F5F5F7`; muted text `rgba(235,235,245,.68)`; dim text `rgba(235,235,245,.56)`; placeholder `rgba(235,235,245,.45)`; link `#8FB4FF`; ok green `#34C759`; focus ring `#8FB4FF`; sun pale `#FFE2A8`; sun pink `#C2407A`; sun indigo `#33298F`; mascot orange `#C9672A`; hover link `#FFFFFF`.
- Font: root `font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Inter, system-ui, sans-serif`; `-webkit-font-smoothing: antialiased`. Google Font loaded: `Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700` with `display=swap` (preconnect to fonts.googleapis.com and fonts.gstatic.com crossorigin). Inter is only the 5th fallback.
- Global CSS: `html,body{margin:0;background:#0E1020}`, `*{box-sizing:border-box}`, `a{color:#F5F5F7}`, `a:hover{color:#FFFFFF}`.

### S2. Global classes (exact)
- `.sr`: `position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap`.
- `.glass`: `background:rgba(22,24,46,.58); backdrop-filter:blur(28px) saturate(170%); border:1px solid rgba(255,255,255,.10); box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 24px 60px rgba(0,0,0,.35)`.
- `.solid`: `background:rgba(20,22,42,.94); backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,.10); box-shadow:0 30px 80px rgba(0,0,0,.5)` (unused in these four).
- `.chip`: `background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.08)`.
- `.field`: `background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); border-radius:12px; color:#F5F5F7; font:inherit; font-size:15px; padding:0 14px; height:44px; width:100%; outline:none`.
- `.lbl`: `font-size:12px; font-weight:600; letter-spacing:.02em; color:rgba(235,235,245,.68); text-transform:uppercase`.
- Buttons and links: `-webkit-tap-highlight-color:transparent; transition:transform .15s ease, filter .15s ease, background-color .15s ease`. `button:hover, a.btn:hover {filter:brightness(1.12)}`. `button:active, a.btn:active {transform:scale(.97)}`.
- Focus: `button/a/textarea/input/select :focus-visible {outline:2px solid #8FB4FF; outline-offset:3px}`.
- Placeholder: `textarea::placeholder, input::placeholder {color:rgba(235,235,245,.45)}`.
- Note: `.field` has `outline:none` inline in the class, but the `:focus-visible` rule still sets a 2px outline. No separate `:focus` border change exists. No disabled or error style exists in these four files.

### S3. Animation classes and keyframes (exact)
- `.in {animation: springIn .55s cubic-bezier(.2,.9,.3,1.25) both}`; `@keyframes springIn {from{opacity:0; transform:translateY(14px) scale(.97)} to{opacity:1; transform:none}}`. Used on each message row with `animation-delay: 0ms`.
- `.dock {animation: dock .7s cubic-bezier(.2,.9,.3,1) both}`; `dock: from{opacity:.6; transform:translateY(-40vh)} to{opacity:1; transform:none}`. Not used in these four files.
- `.attn {animation: attn 2.6s ease-in-out .8s infinite}`; `attn: 0%,100%{box-shadow:0 0 0 0 rgba(255,150,70,.0),0 30px 80px rgba(0,0,0,.45)} 30%{box-shadow:0 0 0 8px rgba(255,150,70,.22),0 30px 80px rgba(0,0,0,.45)} 60%{box-shadow:0 0 0 14px rgba(255,150,70,0),0 30px 80px rgba(0,0,0,.45)}`. The ring color is hard-coded `255,150,70` and does not follow `accent`.
- `.shim {background:linear-gradient(90deg,rgba(255,255,255,.05) 0%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.05) 100%) 0 0/200% 100%; animation: shim 1.4s linear infinite}`; `shim: to{background-position:-200% 0}`. Unused here.
- `.spin {animation: spin .9s linear infinite}`; `spin: to{transform:rotate(360deg)}`.
- `.dot1,.dot2,.dot3 {animation: blink 1.2s ease-in-out infinite}`; `.dot2{animation-delay:.15s}`; `.dot3{animation-delay:.3s}`; `blink: 0%,100%{opacity:.25} 50%{opacity:1}`. Unused here.
- `.caret {animation: caret 1s steps(1) infinite}`; `caret: 50%{opacity:0}`. Unused here.
- `.conf {animation: fall 2.8s linear infinite}`; `fall: from{transform:translateY(-30px)} to{transform:translateY(520px)}`.
- `.fly {animation: flyIn .45s cubic-bezier(.2,.9,.3,1) both}`; `flyIn: from{opacity:0; transform:translateX(48px)} to{opacity:1; transform:none}`. Unused here.
- `@keyframes fade {from{opacity:0} to{opacity:1}}`.
- `@media (prefers-reduced-motion: reduce) { .in,.dock,.fly {animation: fade .3s ease both} .attn,.shim,.spin,.conf,.caret,.dot1,.dot2,.dot3 {animation: none} }`.

### S4. Horizon (sun) background pattern
Markup: `<div aria-hidden="true" style="position:absolute; inset:0; pointer-events:none; overflow:hidden"><div class="sun" style="top:calc(100% + {{sunOffset}}px); transform:translateX({{sunX}}px)"> rings </div></div>`. It sits as the first child of the root div. The root is `position:relative; min-height:100vh; overflow:hidden; display:flex; flex-direction:column; background:#0E1020; color:#F5F5F7`. The header, main and composer have `position: relative`/`sticky` and paint above it.
- `.sun {position:absolute; left:50%; width:0; height:0; pointer-events:none}`.
- `.ring {position:absolute; border-radius:50%; left:calc(var(--r)*-1); top:calc(var(--r)*-1); width:calc(var(--r)*2); height:calc(var(--r)*2)}`. Each ring is a circle of radius `--r` centred on the `.sun` point. Rings are painted from the largest to the smallest (the array is reversed), so the smallest ring is on top.
- Dither classes (`--p` = dither px, `--c` = ring color):
  - `.d6`: `background: conic-gradient(at var(--p) var(--p), transparent 0 75%, var(--c) 0) 0 0/calc(var(--p)*4) calc(var(--p)*4)`.
  - `.d12`: two layers of the `.d6` gradient. Layer 1 at `0 0/calc(var(--p)*4) calc(var(--p)*4)`. Layer 2 at `calc(var(--p)*2) calc(var(--p)*2)/calc(var(--p)*4) calc(var(--p)*4)`.
  - `.d25`: `conic-gradient(at var(--p) var(--p), transparent 0 75%, var(--c) 0) 0 0/calc(var(--p)*2) calc(var(--p)*2)`.
  - `.d50`: `repeating-conic-gradient(var(--c) 0 25%, transparent 0 50%) 0 0/calc(var(--p)*2) calc(var(--p)*2)` (checkerboard).
  - `.d75`: `conic-gradient(at var(--p) var(--p), var(--c) 0 75%, transparent 0) 0 0/calc(var(--p)*2) calc(var(--p)*2)`.
  - `.d100`: `background: var(--c)`.
- Ring generation (script `renderVals`): `p = max(1, round(dither))`; `k = 0.4 + (intensity/100)*1.6`; `sag = 30 + bend*2.2`; `q = 4*p`; `snap(v) = max(q, round(v/q)*q)`; `core = snap((720*720 + sag*sag) / (2*sag))`.
  - First ring: `{cls:'d100', c:'#FFE2A8', r:core}`.
  - Layers (class, color, thickness): `d50 pale 8; d25 pale 8; d100 accent 16; d75 accent 10; d50 accent 12; d25 accent 12; d12 accent 14; d6 accent 16; d100 pink 24; d75 pink 18; d50 pink 18; d25 pink 20; d12 pink 22; d6 pink 24; d100 indigo 40; d75 indigo 30; d50 indigo 32; d25 indigo 34; d12 indigo 38; d6 indigo 44`. For each layer: `r += snap(thickness*k)`, push `{cls, c, r, bp}`.
  - `sunOffset = indigoStart + snap(24)`. `indigoStart` = `r` just before the first indigo `d100` layer is added.
  - `sunX = round((lx*140)/p)*p`. In the canvas `lx = 0` and `t = 0`, so `sunX = 0` and no flicker is applied.
  - Flicker (disabled in canvas, `t=0`): `flick = floor(t/0.9) % 2`. When `flick` and `i % 3 === 1`, `background-position` becomes `var(--p) 0` (for `d12`: `var(--p) 0, calc(var(--p)*3) calc(var(--p)*2)`). Normal position is `0 0` (for `d12`: `0 0, calc(var(--p)*2) calc(var(--p)*2)`). The production page needs a timer that advances `t` to animate this.
  - Defaults give: `p=2, q=8, k=0.88, sag=30, core=8656`.

### S5. Header (`<header class="glass">`)
- Style: `position:sticky; top:0; z-index:5; border-width:0 0 1px 0; border-radius:0; box-shadow:none; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:10px 24px`.
- Left group (`flex; align-items:center; gap:10px`):
  - Logo link `href=Main.dc.html`, `aria-label="Početna"`, `display:grid; place-items:center; width:44px; height:44px`. Contains the pixel mascot SVG `width=30 height=24 viewBox="0 0 20 16" shape-rendering="crispEdges"`.
  - "Novi razgovor": `<a class="btn chip" href=Main.dc.html>`, `font:inherit 14px/500; letter-spacing:-.01em; display:inline-flex; align-items:center; gap:7px; border-radius:999px; padding:0 16px 0 13px; height:40px; min-height:40px; cursor:pointer; text-decoration:none; white-space:nowrap; color:#F5F5F7`. Icon: pencil, 15x15, stroke currentColor, stroke-width 2.2, round caps and joins.
- Right group (`flex; align-items:center; gap:8px; flex-wrap:wrap`):
  - Status chip `class="chip" role="status" aria-label="Status veza"`: `inline-flex; gap:14px; height:40px; padding:0 14px; border-radius:999px; font-size:13px; font-weight:500`. Three items (`inline-flex; gap:6px`), each with an 8x8 dot (`border-radius:999px; background:#34C759; flex-shrink:0`). Labels: OpenRouter, OLX, SVEX. All three are green in all four files (no other status state exists in the files).
  - Model button `aria-haspopup="listbox"`: `13px/500; color:rgba(235,235,245,.68); background:transparent; border:0; border-radius:999px; padding:0 10px; height:40px; gap:4px`. Text "Sonnet 5.5" and a chevron-down 14x14 (`M7 10l5 5 5-5`). No popup is drawn.
  - "Moji oglasi": `<a class="btn" href=MyListings.dc.html>`, same base style as "Novi razgovor" but `color:rgba(235,235,245,.68); background:transparent; border:0`. Icon: layers, 15x15.
  - Settings: `<a class="btn chip" href=Settings.dc.html aria-label="Postavke">`, `padding:0; width:40px; height:40px; justify-content:center`. Gear icon 15x15.

### S6. Main column and message rows
- `<main>`: `position:relative; flex-grow:1; width:100%; max-width:860px; margin:0 auto; padding:32px 24px 24px; display:flex; flex-direction:column; gap:24px`.
- Assistant row: `class="in"; display:flex; gap:12px; align-items:flex-start`. Avatar cell `width:32px; flex-shrink:0; padding-top:2px` with the mascot SVG `28x22`. Body cell `flex-grow:1; min-width:0; display:flex; flex-direction:column; gap:14px`. Text `<p style="margin:0; font-size:17px; line-height:1.55">`.
- User bubble (used only in SellPhotos): wrapper `class="in"; align-self:flex-end; max-width:520px; display:flex; flex-direction:column; gap:6px; align-items:flex-end`. Bubble: `background:{{accent}}; color:#0E1020; padding:11px 16px; border-radius:20px 20px 6px 20px; font-size:16px; font-weight:500; line-height:1.45; letter-spacing:-.01em`.
- Mascot (pixel art): SVG `viewBox="0 0 20 16"` with `shape-rendering="crispEdges"`; each pixel is a `h1v1h-1z` path. Colors: hat/hair `#FFE2A8`, body `{{accent}}`, eyes/mouth `#0E1020`, cheeks `#C2407A`, feet `#C9672A`. Pose variants per file are listed in each file's section.
- Section card base (used for all cards except the approve dialog and success hero): `class="glass"; border-radius:24px; padding:20px; box-shadow:none`. The style string ends with the stray token `in` (`...box-shadow: none; in"`), which is invalid CSS and ignored. The `.in` animation is NOT applied to these cards.
- Step indicator `<ol aria-label="Koraci objave">`: `list-style:none; margin:0; padding:0; display:flex; gap:6px; font-size:12px; font-weight:600`. Each `<li>`: `display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px`. Items: Slike, Nacrt, Odobrenje, Objava.
  - Current (dark card): `background:{{accent}}; color:#0E1020`.
  - Done (dark card): `background:rgba(255,255,255,.1); color:#F5F5F7`, with a 11x11 check icon (`M5 12.5l4.5 4.5L19 7`, stroke-width 3).
  - Upcoming (dark card): `background:transparent; color:rgba(235,235,245,.56); border:1px solid rgba(255,255,255,.12)`.
  - Light card (SellApprove) variants: done `background:rgba(14,16,32,.08); color:#0E1020` with check; current `{{accent}}` bg, `#0E1020`; upcoming `transparent; color:rgba(14,16,32,.55); border:1px solid rgba(14,16,32,.14)`.
- Primary button (accent): `font:inherit; 14px/500 (600 when style adds font-weight:600); letter-spacing:-.01em; inline-flex; align-items:center; gap:7px; border-radius:999px; padding:0 16px (0 16px 0 13px with icon); height:44px; min-height:44px; cursor:pointer; white-space:nowrap; color:#0E1020; background:{{accent}}; border:0`. Hover/active/focus from S2.
- Ghost button: same geometry, `color:rgba(235,235,245,.68); background:transparent; border:0`.

### S7. Composer (`<div style="position:sticky; bottom:0; z-index:4; padding:12px 24px 22px">`)
- `<form class="glass">`: `width:100%; max-width:812px; margin:0 auto; border-radius:26px; display:flex; flex-direction:column; padding:6px`.
- `<label for="msg" class="sr">Poruka</label>` and `<textarea id="msg" rows="1" placeholder="Napiši nešto…">`: `resize:none; field-sizing:content; max-height:200px; border:0; outline:none; background:transparent; color:#F5F5F7; font-family:inherit; font-size:16px; line-height:1.5; letter-spacing:-.01em; padding:10px 14px 4px`.
- Toolbar: `display:flex; justify-content:space-between; align-items:center; gap:10px; padding:4px 4px 4px 8px`. Left group `flex; gap:6px; align-items:center; font-size:13px; font-weight:500`:
  - Add images: `button.chip aria-label="Dodaj slike"`, `32x32; border-radius:999px; display:grid; place-items:center`. Icon: image (rect 18x14 rx3 + circle + path), 15x15.
  - Toggle chips "OLX.ba" and "SVEX.ba": `button.chip aria-pressed="true"`, `font:inherit; inline-flex; gap:6px; border-radius:999px; padding:0 12px 0 9px; height:32px`. Check icon 13x13, `stroke:{{accent}}`, stroke-width 2.8. Both pressed (on) in all four files. The off state is not drawn.
  - Model button "Sonnet 5.5" `height:32px` (same style as header model button).
- Send: `button[type=submit] aria-label="Pošalji"`, `40x40; flex-shrink:0; border:0; border-radius:999px; background:{{accent}}; color:#0E1020; display:grid; place-items:center`. Arrow-up icon 18x18, stroke-width 2.6.

### S8. Script
`<script type="text/x-dc" data-dc-script>`: `class Component extends DCLogic { renderVals() {...} }`. It has NO state variables, NO event handlers, NO timers. It returns `{accent, dither, rings, sunOffset, sunX}` from the props. All interactivity in the canvas is anchors (`href` to other canvas files) or static markup. Behaviour the canvas implies but does not code is listed per file.

### S9. Shared copy (keys)
| Component | Text | Key |
|---|---|---|
| Header | Početna (aria) | `header.homeAria` |
| Header | Novi razgovor | `header.newChat` |
| Header | Status veza (aria) | `header.statusAria` |
| Header | OpenRouter / OLX / SVEX | `header.status.openRouter` / `.olx` / `.svex` |
| Header | Sonnet 5.5 | `header.model` |
| Header | Moji oglasi | `header.myListings` |
| Header | Postavke (aria) | `header.settingsAria` |
| Steps | Koraci objave (aria) | `steps.aria` |
| Steps | Slike / Nacrt / Odobrenje / Objava | `steps.photos` / `steps.draft` / `steps.approve` / `steps.publish` |
| Composer | Poruka (label) | `composer.label` |
| Composer | Napiši nešto… | `composer.placeholder` |
| Composer | Dodaj slike (aria) | `composer.addPhotosAria` |
| Composer | OLX.ba / SVEX.ba | `composer.targetOlx` / `composer.targetSvex` |
| Composer | Pošalji (aria) | `composer.sendAria` |

### S10. Responsive
No `@media` query except `prefers-reduced-motion`. No breakpoints. Wrapping is by `flex-wrap:wrap` on the header, its right group and the section title row. `$preview.width` is 1440. Content width is capped by `max-width:860px` (main) and `812px` (composer).

## Screen: MyListings.dc.html ("Moji oglasi")

Source: design/canvas/MyListings.dc.html. Preview artboard: 1440 x 1000. Language: lang="bs". Title: "Moji oglasi".

### 1. Layout

- Root: `position:relative; min-height:100vh; overflow:hidden; background:#0E1020; color:#F5F5F7; display:flex; flex-direction:column; -webkit-font-smoothing:antialiased`. Custom property `--p:{{dither}}px` (default 2).
- Font stack: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Inter, system-ui, sans-serif`.
- Layer 0: horizon layer `position:absolute; inset:0; pointer-events:none; overflow:hidden; aria-hidden`. See section 4.
- Header (shared shell): `header.glass`, `position:sticky; top:0; z-index:5; border-width:0 0 1px 0; border-radius:0; box-shadow:none; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:10px 24px`.
  - Left group: flex, gap 10px. Items: logo link, "Novi razgovor" chip button.
  - Right group: flex, gap 8px, wrap. Items: status chip, model button, "Moji oglasi" nav link, settings icon button.
- Main: `position:relative; flex-grow:1; width:100%; max-width:1040px; margin:0 auto; padding:32px 24px; display:flex; flex-direction:column; gap:18px`.
  - Row 1: title block + toolbar. `display:flex; justify-content:space-between; align-items:flex-end; gap:12px; flex-wrap:wrap`.
  - Row 2: status tabs. `display:flex; gap:6px; flex-wrap:wrap`.
  - Row 3: listing `ul`. `list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px`.
  - Row 4: delete confirm dialog. `align-self:flex-end; width:340px`.
- Whole page scrolls. Only the header is sticky. No fixed footer.

### 2. Components

### Shared header (identical in Connect, Settings)
- Logo link: `<a href="Main.dc.html" aria-label="Početna">`, `display:grid; place-items:center; width:44px; height:44px`. Inner SVG 30x24, viewBox `0 0 20 16`, `shape-rendering:crispEdges`. Pixel mascot with fills `#FFE2A8` (top), `{{accent}}` (body), `#0E1020` (eyes/mouth), `#C2407A` (cheeks), `#C9672A` (feet).
- Button base (all pill buttons): `font-family:inherit; font-size:14px; font-weight:500; letter-spacing:-0.01em; display:inline-flex; align-items:center; gap:7px; border-radius:999px; padding:0 16px 0 13px; height:40px; min-height:40px; cursor:pointer; text-decoration:none; white-space:nowrap`.
- "Novi razgovor": `a.btn.chip`, href Main.dc.html, color `#F5F5F7`, pencil icon 15px (stroke 2.2, round caps/joins).
- Status chip: `div.chip[role=status][aria-label="Status veza"]`, `display:inline-flex; gap:14px; height:40px; padding:0 14px; border-radius:999px; font-size:13px; font-weight:500`. Items "OpenRouter", "OLX", "SVEX", each with dot `8x8px; border-radius:999px; background:#34C759` (connected). Dot gap 6px.
- Model button: `font-size:13px; font-weight:500; color:rgba(235,235,245,.68); background:transparent; border:0; padding:0 10px; height:40px; gap:4px`; `aria-haspopup="listbox"`; text "Sonnet 5.5" + chevron-down 14px.
- Nav link "Moji oglasi" (current page): `a.btn`, color `rgba(235,235,245,.68)`, `background:transparent; border:0`, layers icon 15px. Not highlighted as active in this file.
- Settings icon button: `a.btn.chip`, `aria-label="Postavke"`, `padding:0; width:40px; justify-content:center`, gear icon 15px.

### Surfaces
- `.glass`: see section 4. `.solid`: see section 4. `.chip`: `background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.08)`.

### Source filter toggles (OLX, SVEX)
- `button.chip[aria-pressed=true]`: `font:inherit; display:inline-flex; align-items:center; gap:6px; color:#F5F5F7; border-radius:999px; padding:0 12px 0 9px; height:32px`. Check icon 13px, `stroke:{{accent}}; stroke-width:2.8`, path `M5 12.5l4.5 4.5L19 7`. Container: flex, gap 6px.
- Unpressed style is not drawn. Canvas implies: no check icon.

### "Novi oglas" button
- `a.btn` href SellPhotos.dc.html. `font-size:13px; height:36px; min-height:36px; padding:0 16px 0 13px; color:#0E1020; background:{{accent}}; border:0; font-weight:600`. Plus icon 15px.

### Page title
- h1: `margin:0; font-size:34px; font-weight:700; letter-spacing:-0.03em`. Sub: `p margin:0; font-size:14px; line-height:1.45; color:rgba(235,235,245,.68)`.

### Status tabs
- `div[role=tablist][aria-label="Status"]`. Tab: `button[role=tab]; font:inherit; font-size:14px; font-weight:500; height:36px; padding:0 14px; border-radius:999px`.
- Selected (`aria-selected=true`): `background:#F5F5F7; color:#0E1020; border:0`.
- Unselected: `background:rgba(255,255,255,.07); color:#F5F5F7; border:1px solid rgba(255,255,255,.08)`.
- Count: `span` `opacity:.6`, after one space. Tabs: Svi 5 (selected), Aktivni 2, Skice 1, Skriveni 1, Prodani 1, Istekli 1.

### Listing row (`li.glass`)
- `position:relative; display:flex; align-items:center; gap:14px; padding:10px 12px; border-radius:20px; box-shadow:none`. First row has `z-index:10` (above siblings, so its open menu overlays), others `z-index:auto`.
- Thumbnail: `img 64x64; object-fit:cover; border-radius:14px; flex-shrink:0; alt=""`.
- Middle column: `flex-grow:1; min-width:0; flex column; gap:6px`.
  - Title: `font-size:15px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis`.
  - Badge row: flex, gap 6px, wrap. Badge: `inline-flex; gap:6px; font-size:12px; font-weight:600; padding:4px 10px; border-radius:999px; background:rgba(255,255,255,.07)`; dot 8x8 radius 999px.
- Price column: `flex column; align-items:flex-end; gap:4px; min-width:120px`.
  - Price: `font-size:18px; font-weight:700; letter-spacing:-0.02em`.
  - Meta: `font-size:12px; color:rgba(235,235,245,.56)`.
- Action group: flex, gap 4px.
  - Text action (chip): `font-size:13px; height:36px; min-height:36px; padding:0 16px 0 13px; color:#F5F5F7`, icon 15px.
  - Primary action ("Obnovi"): same size, `color:#0E1020; background:{{accent}}; border:0`.
  - Icon "more" button: `aria-label="Više radnji"`, `.chip`, `width:36px; height:36px; padding:0; justify-content:center`, three-dot icon (circles r=1.2 at x 5/12/19, y 12).
  - Icon delete button (sold row): `aria-label="Obriši"`, 36x36, `color:#FF8A80; background:rgba(255,69,58,.14); border:1px solid rgba(255,69,58,.28)`.

#### Status dot colors
| Status | Dot color |
|---|---|
| Aktivan | #34C759 |
| Skriven | #FFB340 |
| Istekao | #FF6B61 |
| Skica | #8E8E9A |
| Prodano | #8FB4FF |

#### Row variants (data in file)
| # | Title | Badges | Price / meta | Actions |
|---|---|---|---|---|
| 1 | Creality Ender-3 V3 KE 3D printer + 3 mlaznice | OLX · Aktivan; SVEX · Aktivan | 560 KM / 214 pregleda · ističe za 24 d | Prodano (check icon), more. Menu open. |
| 2 | Sony WH-1000XM4 slušalice | OLX · Aktivan; SVEX · Skriven | inline price edit, 58 pregleda | Prikaži na SVEX (eye icon), more |
| 3 | Ender 3 Pro, rezervni dijelovi | SVEX · Istekao | 90 KM / Istekao prije 2 d | Obnovi (primary, refresh icon), more |
| 4 | iPhone 13, 128 GB, plavi | OLX · Skica | 780 KM / Nije objavljeno | Nastavi (pencil icon), more |
| 5 | Monitor Dell 27" | OLX · Prodano; SVEX · Prodano | 250 KM / Prodano 3. 11. | delete icon button, more |

### Row action menu (`div[role=menu].solid`, row 1 open)
- `position:absolute; right:12px; top:64px; z-index:6; width:230px; border-radius:16px; padding:6px; flex column`.
- Item: `button[role=menuitem]; font:inherit; font-size:14px; display:flex; align-items:center; gap:10px; height:40px; padding:0 10px; border:0; border-radius:10px; background:transparent; color:#F5F5F7; text-align:left`. Icon 15px.
- Highlighted/first item: `background:rgba(255,255,255,.08)`.
- Danger item: `color:#FF6B61`.
- Items: Obnovi oglas; Sakrij; Označi kao prodano; Promijeni cijenu; Obriši… (danger).

### Inline price edit (row 2)
- Container: `flex; align-items:center; gap:6px`. Label `.sr` "Nova cijena" for `#np`.
- Input `.field`, `value=520`, `width:96px; height:36px; font-weight:600`.
- Unit span "KM": `font-size:13px; color:rgba(235,235,245,.68)`.
- "Spremi": `font-size:13px; padding:0 16px; height:36px; color:#0E1020; background:{{accent}}; border:0`.
- "Odustani" icon button: `aria-label="Odustani"`, 36x36, `color:rgba(235,235,245,.68); background:transparent; border:0`, x icon.
- Views meta "58 pregleda" below, `font-size:12px; color:rgba(235,235,245,.56)`.

### `.field` (input)
- `background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); border-radius:12px; color:#F5F5F7; font:inherit; font-size:15px; padding:0 14px; height:44px; width:100%; outline:none`. Placeholder `rgba(235,235,245,.45)`.

### Delete confirm (`div[role=alertdialog][aria-labelledby=del-t].solid`)
- `align-self:flex-end; width:340px; border-radius:20px; padding:16px; flex column; gap:10px`.
- Title `strong#del-t` `font-size:15px`. Body `p` `font-size:14px; line-height:1.45; color:rgba(235,235,245,.68)`.
- Buttons row: `justify-content:flex-end; gap:8px`. "Odustani": `padding:0 16px; height:40px; color:rgba(235,235,245,.68); background:transparent; border:0`. "Obriši s oba sajta": `padding:0 16px 0 13px; height:40px; color:#FF8A80; background:rgba(255,69,58,.14); border:1px solid rgba(255,69,58,.28)`, trash icon 15px.

### Global states (all `button`, `a`)
- `transition: transform .15s ease, filter .15s ease, background-color .15s ease`. `-webkit-tap-highlight-color:transparent`.
- Hover: `button:hover, a.btn:hover {filter:brightness(1.12)}`. Link hover color `#FFFFFF` (base `a{color:#F5F5F7}`).
- Active: `transform:scale(.97)`.
- Focus-visible (button, a, textarea, input, select): `outline:2px solid #8FB4FF; outline-offset:3px`.
- Disabled, loading, error: none drawn in this file.

### 3. Interactions and script

- Script: `class Component extends DCLogic { renderVals() }`. No handlers, no timers, no event wiring. Static mock.
- Props (data-props): `accent` color default `#FF9646`, options `#FF9646 #F5C518 #7DD3A8 #8FB4FF`; `dither` range 1-8 step 1 default 2 unit px; `intensity` 0-100 default 30 %; `bend` 0-100 default 0. `$preview` 1440x1000.
- `renderVals` returns `{accent, dither:p, rings, sunOffset, sunX}`. `t=0` and `lx=0` are constants. `flick` is always 0, so the ring `bp` is always `0 0`. Canvas implies the horizon may flicker (every 0.9 s, rings with `i%3===1` shift by `var(--p) 0`) in the real app.
- Links: logo and "Novi razgovor" to Main.dc.html; "Moji oglasi" to MyListings.dc.html; Settings icon to Settings.dc.html; "Novi oglas" to SellPhotos.dc.html.
- Implied behaviour: tabs filter the list by status; the toggles OLX/SVEX filter by source; the more button opens the menu; "Promijeni cijenu" swaps the price column for the inline edit; "Obriši…" and the sold-row trash open the alertdialog; "Obriši s oba sajta" deletes on both sites; "Prikaži na SVEX" unhides.
- Keyframes defined (shared CSS): `springIn`, `dock`, `attn`, `shim`, `spin`, `blink`, `caret`, `fall`, `flyIn`, `fade`. None applied in this file's DOM (classes `.in .dock .attn .shim .spin .dot1-3 .caret .conf .fly` unused here). Definitions:
  - `.in` springIn .55s cubic-bezier(.2,.9,.3,1.25) both: from `opacity:0; translateY(14px) scale(.97)` to none.
  - `.dock` dock .7s cubic-bezier(.2,.9,.3,1) both: from `opacity:.6; translateY(-40vh)`.
  - `.attn` attn 2.6s ease-in-out .8s infinite: box-shadow ring `0 0 0 8px rgba(255,150,70,.22)` at 30%, `0 0 0 14px rgba(255,150,70,0)` at 60%, plus `0 30px 80px rgba(0,0,0,.45)`.
  - `.shim` shim 1.4s linear infinite: gradient `linear-gradient(90deg,rgba(255,255,255,.05) 0%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.05) 100%)`, size `200% 100%`, to `background-position:-200% 0`.
  - `.spin` spin .9s linear infinite. `.dot1,.dot2,.dot3` blink 1.2s ease-in-out infinite (opacity .25 to 1 at 50%); `.dot2` delay .15s; `.dot3` delay .3s.
  - `.caret` caret 1s steps(1) infinite (opacity 0 at 50%). `.conf` fall 2.8s linear infinite (translateY -30px to 520px).
  - `.fly` flyIn .45s cubic-bezier(.2,.9,.3,1) both: from `opacity:0; translateX(48px)`.
- Reduced motion: `@media (prefers-reduced-motion: reduce) { .in,.dock,.fly {animation: fade .3s ease both} .attn,.shim,.spin,.conf,.caret,.dot1,.dot2,.dot3 {animation:none} }`.

### 4. Patterns, tokens, fonts, blobs

### Tokens (no CSS variables except `--p`, `--c`, `--r`; the rest is literal values)
| Name | Value |
|---|---|
| bg | #0E1020 |
| text | #F5F5F7 |
| text-secondary | rgba(235,235,245,.68) |
| text-tertiary | rgba(235,235,245,.56) |
| placeholder | rgba(235,235,245,.45) |
| accent (prop) | #FF9646 |
| focus ring | #8FB4FF |
| ok | #34C759 |
| warn | #FFB340 |
| danger text | #FF6B61 |
| danger button text | #FF8A80 |
| danger fill / border | rgba(255,69,58,.14) / rgba(255,69,58,.28) |
| neutral dot | #8E8E9A |
| sold dot | #8FB4FF |
| hairline | rgba(255,255,255,.07) / .08 / .10 |
| pale | #FFE2A8 |
| pink | #C2407A |
| indigo | #33298F |
| foot orange | #C9672A |
- `--p` pixel size (px). `--c` ring color. `--r` ring radius.

### Fonts
- Inter, Google Fonts: `https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&display=swap`, preconnect to fonts.googleapis.com and fonts.gstatic.com (crossorigin). Weights 400, 500, 600, 700. Inter comes after SF in the stack. Monospace (other files): `ui-monospace, Menlo, monospace`.
- Body line-height: not set at root. Used: 1.45 (descriptions).

### CSS patterns (exact)
```css
.glass{background:rgba(22,24,46,.58);-webkit-backdrop-filter:blur(28px) saturate(170%);backdrop-filter:blur(28px) saturate(170%);border:1px solid rgba(255,255,255,.10);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 24px 60px rgba(0,0,0,.35)}
.solid{background:rgba(20,22,42,.94);-webkit-backdrop-filter:blur(30px);backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,.10);box-shadow:0 30px 80px rgba(0,0,0,.5)}
.chip{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.lbl{font-size:12px;font-weight:600;letter-spacing:.02em;color:rgba(235,235,245,.68);text-transform:uppercase}
.d6{background:conic-gradient(at var(--p) var(--p),transparent 0 75%,var(--c) 0) 0 0/calc(var(--p)*4) calc(var(--p)*4)}
.d12{background:conic-gradient(at var(--p) var(--p),transparent 0 75%,var(--c) 0) 0 0/calc(var(--p)*4) calc(var(--p)*4),conic-gradient(at var(--p) var(--p),transparent 0 75%,var(--c) 0) calc(var(--p)*2) calc(var(--p)*2)/calc(var(--p)*4) calc(var(--p)*4)}
.d25{background:conic-gradient(at var(--p) var(--p),transparent 0 75%,var(--c) 0) 0 0/calc(var(--p)*2) calc(var(--p)*2)}
.d50{background:repeating-conic-gradient(var(--c) 0 25%,transparent 0 50%) 0 0/calc(var(--p)*2) calc(var(--p)*2)}
.d75{background:conic-gradient(at var(--p) var(--p),var(--c) 0 75%,transparent 0) 0 0/calc(var(--p)*2) calc(var(--p)*2)}
.d100{background:var(--c)}
.sun{position:absolute;left:50%;width:0;height:0;pointer-events:none}
.ring{position:absolute;border-radius:50%;left:calc(var(--r)*-1);top:calc(var(--r)*-1);width:calc(var(--r)*2);height:calc(var(--r)*2)}
```
- Ordered Bayer-like dither: classes d6 (6%), d12 (12.5%), d25, d50 (checkerboard), d75, d100 (solid).
- Horizon ("sun"): `.sun` placed `top:calc(100% + {{sunOffset}}px)`, `transform:translateX({{sunX}}px)`. Rings are concentric circles, listed outermost first (array reversed). Defaults (dither 2, intensity 30, bend 0): `p=2; k=(0.4+0.3*1.6)=0.88; sag=30; q=8; core=snap((720*720+900)/60)=8640`. `snap(v)=max(q, round(v/q)*q)`. Radius step per layer = `snap(size*k)`.
- Layer list (class, color, size): d50 pale 8; d25 pale 8; d100/d75/d50/d25/d12/d6 accent 16/10/12/12/14/16; d100/d75/d50/d25/d12/d6 pink 24/18/18/20/22/24; d100/d75/d50/d25/d12/d6 indigo 40/30/32/34/38/44. First ring: d100 pale at r=core.
- `sunOffset = radius at the start of indigo d100 + snap(24)`.
- Pixel-art mascot: SVG paths of 1x1 rects, `shape-rendering="crispEdges"`. Not image-rendering based.
- Scanlines: none. Checkerboard: `.d50`. Pixelated `image-rendering`: none.
- Input placeholder: `textarea::placeholder, input::placeholder {color:rgba(235,235,245,.45)}`.

### /_blob images
| Id | Where | Size | Rendering |
|---|---|---|---|
| /_blob/44d310d932b0fe647b478ab95165dc21 | row 1 (Creality Ender-3 V3 KE) and row 5 (Monitor Dell) thumbnail | 64x64 | `object-fit:cover; border-radius:14px; alt=""` |
| /_blob/f60fcfa9ea5a0a5d2889a1e0c901f068 | row 2 (Sony) and row 4 (iPhone) thumbnail | 64x64 | same |
| /_blob/df4e2008cb50c49c6ac755a1a645c6be | row 3 (Ender 3 Pro) thumbnail | 64x64 | same |

### 6. Responsive

- No `@media` width breakpoints. Only `prefers-reduced-motion`.
- Header and toolbar use `flex-wrap:wrap`. Tabs wrap. Row title truncates with ellipsis (`min-width:0`). Price column keeps `min-width:120px`. Row has no wrap: on narrow widths the row can overflow. Mobile layout is not drawn.
- Main container max-width 1040px, side padding 24px.

## Screen: Connect.dc.html ("Povezivanje računa")

Source: design/canvas/Connect.dc.html. Preview artboard: 1440 x 1560. lang="bs". Title: "Povezivanje računa".

### 1. Layout

- Root, horizon layer, header: identical to MyListings.md (sections 1, 2 "Shared header", 4). Differences in the header status chip only (see below).
- Header status chip here: OpenRouter dot `#8E8E9A` + text "OpenRouter" + `span` " · nije povezan" (color `rgba(235,235,245,.56)`); OLX dot `#34C759`; SVEX dot `#8E8E9A` + " · nije povezan".
- Main: `position:relative; flex-grow:1; width:100%; max-width:1360px; margin:0 auto; padding:32px 24px 48px; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:32px 24px; align-items:start`.
- Six cells (one state each) in a 3-column grid, row gap 32px, column gap 24px. Cell 7 spans all columns: `grid-column:1 / -1; display:flex; flex-direction:column; align-items:center`.
- Each cell: caption + card. Caption: `font-size:12px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:rgba(235,235,245,.56); margin-bottom:10px`.
- Card widths: `.glass` cards 400px; dialogs `.solid` 420px with `max-width:100%`; panel 480px. Everything scrolls with the page.

### 2. Components

### Cell 1: "Kartica na praznom ekranu" (connect card, `section.glass`)
- `border-radius:24px; padding:20px; box-shadow:none; width:400px`.
- Head: flex, `align-items:center; gap:14px`. Mascot SVG 56x44 (viewBox 0 0 20 16, crispEdges), with a gray (`#B4BAD6`) sparkle/"z" path at top right; body `{{accent}}`; face `#0E1020`, `#C2407A`, `#C9672A`.
- Text block `flex-grow:1`. h2: `margin:0; font-size:17px; font-weight:600; letter-spacing:-0.02em`. p: `margin:0; font-size:14px; line-height:1.45; color:rgba(235,235,245,.68)`.
- Buttons column: `margin-top:16px; flex column; gap:8px`.
  - Primary: `height:48px; min-height:48px; padding:0 16px 0 13px; font-size:14px; font-weight:600; border-radius:999px; color:#0E1020; background:#F5F5F7; border:0; box-shadow:0 8px 24px rgba(0,0,0,.25); justify-content:center`. External-link icon 15px.
  - Ghost: `height:40px; padding:0 16px 0 13px; color:rgba(235,235,245,.68); background:transparent; border:0; justify-content:center`. Key icon 15px.
- Footnote: `margin:12px 0 0; font-size:12px; color:rgba(235,235,245,.56); text-align:center`.

### Cell 2: "Povratak s OpenRoutera" (loading, `section.glass` same card box)
- Body: `flex column; align-items:center; gap:12px; padding:18px 0; text-align:center`.
- Mascot 80x64, `role=img`, `aria-label="Maskota razmišlja"`. White (`#F5F5F7`) thought-bubble pixels top right; eyes `#0E1020`.
- Status line: flex, gap 8px, `font-size:17px; font-weight:600`. Spinner: `span.spin` (spin .9s linear infinite) holding refresh icon 16px.
- Text: `font-size:14px; line-height:1.45; color:rgba(235,235,245,.68)`.

### Cell 3: "Zalijepi ključ (rezerva)" (dialog, error state)
- `section[role=dialog][aria-label="Zalijepi OpenRouter ključ"].solid`; `width:420px; max-width:100%; border-radius:24px; padding:20px; flex column; gap:14px`.
- Head: `flex; justify-content:space-between; align-items:center`. h2 17px/600/-0.02em. Close button: `aria-label="Zatvori"`, 32x32 (`height/min-height:32px; width:32px; padding:0`), `color:rgba(235,235,245,.68); background:transparent; border:0`, x icon 13px.
- Field group: `flex column; gap:6px`. Label `.lbl` for `#k1`. Input `.field`, `type=password`, `value="sk-or-v1-xxxxxxxxxxxxxxxx"`, `font-family:ui-monospace, Menlo, monospace`.
- Info line: flex, `align-items:center; gap:6px; font-size:13px; color:rgba(235,235,245,.68)`. Lock icon 13px.
- Error line: `role=alert`, flex, `gap:8px; font-size:13px; color:#FF6B61`. Warning-triangle icon 14px.
- Footer: `flex; justify-content:flex-end; gap:8px`. "Odustani": `padding:0 16px; height:40px; color:rgba(235,235,245,.68); transparent; border:0`. "Spremi": `padding:0 16px; height:40px; font-weight:600; color:#0E1020; background:#F5F5F7; border:0; box-shadow:0 8px 24px rgba(0,0,0,.25)`.

### Cells 4 and 5: OLX and SVEX login dialogs (same structure as cell 3)
- Title "Prijava na OLX" / "Prijava na SVEX", `aria-label` same text.
- Fields: `#u-OLX`/`#u-SVEX` label "Korisničko ime ili email", `.field`, `value="filip.m"`, `autocomplete=username`; `#p-OLX`/`#p-SVEX` label "Lozinka", `type=password`, `value="••••••••••"`, `autocomplete=current-password`.
- Privacy note box: `flex; gap:8px; align-items:flex-start; font-size:13px; color:rgba(235,235,245,.68); background:rgba(255,255,255,.05); padding:10px 12px; border-radius:12px`. Shield icon 15px, `stroke:#34C759`.
- Footer buttons: "Odustani" (ghost), "Prijavi se" (primary light, as "Spremi").

### Cell 6: "Povezani računi" (`section.glass`, 400px, radius 24, padding 20)
- h2 17px/600. List `ul`: `list-style:none; margin:8px 0 0; padding:0`.
- Row `li`: `flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.07)`. (Last row also has the border.)
  - Dot 8x8 (`#34C759` connected, `#8E8E9A` not connected).
  - Text `flex-grow:1`: name `font-size:15px; font-weight:600`; detail `font-size:13px; color:rgba(235,235,245,.68)`.
  - Action button: `font-size:13px; padding:0 16px; height:36px; min-height:36px`.
    - "Odspoji" (destructive): `color:#FF8A80; background:rgba(255,69,58,.14); border:1px solid rgba(255,69,58,.28)`.
    - "Poveži" (primary): `color:#0E1020; background:#F5F5F7; border:0; box-shadow:0 8px 24px rgba(0,0,0,.25)`.
- Rows: OpenRouter "sk-or-…a91f · kredit $4.20" (Odspoji); OLX "filip.m · prijavljen 12. 11." (Odspoji); SVEX "Nije povezan" (Poveži).

### Cell 7: "Šta čuvamo?" panel (`section[aria-label="Šta čuvamo?"].glass`)
- `width:480px; border-radius:24px; padding:18px 22px 22px; box-shadow:none; background:rgba(18,20,40,.72)`.
- Close row: `flex; justify-content:flex-end; margin:-4px -8px 0 0`. Button `.chip`, `aria-label="Zatvori panel"`, 36x36, x icon 15px.
- h2: `margin:0; font-size:22px; font-weight:600; letter-spacing:-0.02em`. Lead p: 14px / 1.45 / `rgba(235,235,245,.68)`.
- List `ul`: `margin:10px 0 0; padding:0; list-style:none`. Item: `flex; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.07)`. Icon wrap: `color:rgba(235,235,245,.68); padding-top:2px` (the Proxy item uses `#34C759`), icon 18px. Item title `15px/600`; item text `14px; line-height:1.45; color:rgba(235,235,245,.68)`.
- Buttons row: `margin-top:16px; flex; gap:8px`.
  - "Izvorni kod": `class=glass`, `height:40px; padding:0 16px 0 13px; color:#F5F5F7; box-shadow:none`, external-link icon 15px.
  - "Obriši sve podatke": destructive style (`#FF8A80`, `rgba(255,69,58,.14)`, border `rgba(255,69,58,.28)`), trash icon 15px.

### Form field states
- `.field`: `outline:none` on the element; global `input:focus-visible {outline:2px solid #8FB4FF; outline-offset:3px}`. Error state of the key input: not drawn (only the alert line below it). Disabled/loading of buttons: not drawn. Loading drawn only as cell 2.
- Hover/active/focus for buttons: as in MyListings.md section 2 "Global states".

### 3. Interactions and script

- Same `renderVals` as MyListings (horizon only). Props: accent `#FF9646` (options `#FF9646 #F5C518 #7DD3A8 #8FB4FF`), dither 1-8 default 2, intensity 0-100 default 30, bend 0-100 default 0. `$preview` 1440x1560.
- No state, handlers or timers. Only animation in DOM: `.spin` on the refresh icon in cell 2 (rotate 360deg, .9s, linear, infinite; disabled under reduced motion).
- Implied flow: (1) card: "Poveži preko OpenRoutera" starts OAuth PKCE and leaves the page; "Imam ključ – zalijepi ga" opens dialog 3. (2) return from OpenRouter: loading card while the app checks the key (a few seconds). (3) dialog: "Spremi" validates the key; an invalid key shows the 401 alert (`role=alert`). "Odustani" and the x close the dialog. (4, 5) "Prijavi se" logs in; the password goes only to the site and is not stored. (6) "Odspoji" removes the connection; "Poveži" opens the matching dialog. (7) panel opens from Settings ("Šta čuvamo?"). "Obriši sve podatke" clears the local data. The header status chip follows the connection state.

### 4. Patterns, tokens, fonts, blobs

- Tokens, `.glass`, `.solid`, `.chip`, `.field`, `.lbl`, `.sr`, dither classes `d6 d12 d25 d50 d75 d100`, `.sun`, `.ring`, horizon math, keyframes, fonts: identical to MyListings.md section 4. Fonts: Inter 400/500/600/700 (Google Fonts) and `ui-monospace, Menlo, monospace` for the key input.
- Extra color: `#B4BAD6` (mascot sparkle, cell 1). `#F5F5F7` primary button fill (white pill), shadow `0 8px 24px rgba(0,0,0,.25)`.
- Mascot: pixel SVG, viewBox `0 0 20 16`, `shape-rendering=crispEdges`, sizes 30x24 (header), 56x44 (cell 1), 80x64 (cell 2).
- /_blob references: none in this file.

### 6. Responsive

- No width breakpoints. Grid is fixed at 3 columns (`minmax(0,1fr)`); cards have fixed widths 400/420/480px (dialogs `max-width:100%`). Below about 1300px the 400px cards can overflow their column. Only `prefers-reduced-motion` is handled. Mobile layout is not drawn.

## Screen: Settings.dc.html ("Postavke")

Source: design/canvas/Settings.dc.html. Preview artboard: 1440 x 900. lang="bs". Title: "Postavke".

### 1. Layout

- Root, horizon layer, header: see MyListings.md (sections 1, 2 "Shared header", 4). Header status chip: all three dots `#34C759`, no suffix text.
- Body below the header: `div` `position:relative; flex-grow:1; display:flex; min-height:0`. Two children:
  1. Chat column: `flex:1 1 0; min-width:0; display:flex; flex-direction:column`. Contains `main` and the composer.
  2. Settings panel: `aside`, `flex:0 0 440px`.
- Chat `main`: `position:relative; flex-grow:1; padding:28px 24px 24px; display:flex; flex-direction:column; gap:20px`.
- Composer wrapper: `position:sticky; bottom:0; z-index:4; padding:12px 24px 22px`. Form max-width 760px, centered.
- Panel: `position:sticky; top:65px; align-self:flex-start; height:calc(100vh - 65px); display:flex; flex-direction:column`. Header 65px tall is assumed. Inner list `flex-grow:1; overflow-y:auto; min-height:0` is the only inner scroll area. Page body scrolls; the panel stays sticky.
- Panel entry animation: class `fly` (flyIn .45s cubic-bezier(.2,.9,.3,1) both).

### 2. Components

### User message bubble
- Wrapper `.in` (springIn), `animation-delay:0ms; align-self:flex-end; max-width:520px; flex column; gap:6px; align-items:flex-end`.
- Bubble: `background:{{accent}}; color:#0E1020; padding:11px 16px; border-radius:20px 20px 6px 20px; font-size:16px; font-weight:500; line-height:1.45; letter-spacing:-0.01em`.

### Assistant message
- Wrapper `.in`, `animation-delay:0ms; flex; gap:12px; align-items:flex-start`.
- Avatar cell: `width:32px; flex-shrink:0; padding-top:2px`. SVG 28x22, viewBox `0 0 20 16`, crispEdges. Mascot with sparkle pixels `#FFD36E`, top `#FFE2A8`, body `{{accent}}`, cheeks `#C2407A`, mouth `#0E1020` (smiling variant), feet `#C9672A`.
- Content: `flex-grow:1; min-width:0; flex column; gap:14px`.
- Tool line: `flex; align-items:center; gap:10px; font-size:13px; font-weight:500; color:rgba(235,235,245,.68); flex-wrap:wrap`. Search icon 14px, text "Pretražio OLX · SVEX", two result chips.
- Result chip: `.chip`, `inline-flex; align-items:center; gap:6px; padding:3px 10px; border-radius:999px`. Check icon 12px, `stroke:#34C759; stroke-width:3`. Text: " OLX 12 oglasa", " SVEX 3 oglasa".

### Result grid
- `display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px`. Items rendered by `sc-for list=listings`.

### Result card (`a.glass.in`, href Detail.dc.html)
- Style: `animation-delay:{i*70}ms (0,70,140,210,280,350); position:relative; flex column; gap:10px; padding:8px 8px 14px; text-decoration:none; color:#F5F5F7; border-radius:22px; box-shadow:none; border-color:{border}`.
- Border: best offer `{{accent}}`; others `rgba(255,255,255,.10)`.
- Image box: `position:relative; border-radius:15px; overflow:hidden; aspect-ratio:4 / 3; background:#232745`.
  - `img`: `width:100%; height:100%; object-fit:cover; display:block|none; filter:none` (sold: `grayscale(1) brightness(.7)`). Alt = item title.
  - No-image block (`display:grid` only when no image): `position:absolute; inset:0; place-items:center; align-content:center; justify-items:center; gap:6px; color:rgba(235,235,245,.56); font-size:12px`. Image icon 22px + "Nema slike".
  - Provider badge: `position:absolute; top:8px; left:8px; font-size:11px; font-weight:600; padding:4px 9px; border-radius:999px; background:rgba(14,16,32,.72); backdrop-filter:blur(12px); color:#F5F5F7`.
  - Best-offer badge (only best): `position:absolute; top:8px; right:8px; font-size:11px; font-weight:600; padding:4px 9px; border-radius:999px; background:{{accent}}; color:#0E1020`. Text "Najbolja ponuda".
  - Sold overlay (only sold): `position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(14,16,32,.45)`. Pill "PRODANO": `font-size:13px; font-weight:700; letter-spacing:.04em; padding:6px 12px; border-radius:999px; background:#F5F5F7; color:#0E1020`.
- Text block: `flex column; gap:4px; padding:0 6px; opacity:1` (sold: `.6`).
  - Price: `font-size:20px; font-weight:700; letter-spacing:-0.02em; line-height:1.2; text-decoration:none` (sold: `line-through`).
  - Title: `font-size:13px; line-height:1.35; color:rgba(235,235,245,.68)`.
  - Meta: `flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:12px; color:rgba(235,235,245,.56)`. Pin icon 12px + city (gap 4px), condition, date.
- Data (6 items):
| # | Provider | Title | Price | City | Condition | Date | Image | Flags |
|---|---|---|---|---|---|---|---|---|
| 1 | OLX | Creality Ender-3 V3 KE 3D printer | 550 KM | Livno | Korišteno | Danas | 44d310d9... | best |
| 2 | SVEX | 3D Printer Creality Ender 3 Pro | 400 KM | Bihać | Korišteno | Jučer | df4e2008... | |
| 3 | SVEX | Creality 3D Printer Ender-3 V3 SE | 625 KM | Lukavac | Novo | 3 dana | f60fcfa9... | |
| 4 | OLX | Ender 3 V3 SE, malo korišten | 480 KM | Mostar | Kao novo | 5 dana | none | no image |
| 5 | OLX | Creality Ender-3 V3 SE + filament | 590 KM | Sarajevo | Korišteno | 1 sedm. | f60fcfa9... | sold |
| 6 | SVEX | Creality 3D Printer Ender-3 V3 SE | 671 KM | Živinice | Novo | 2 sedm. | df4e2008... | |

### Composer (`form.glass`)
- `width:100%; max-width:760px; margin:0 auto; border-radius:26px; flex column; padding:6px`.
- Label `.sr` "Poruka" for `#msg`.
- Textarea `#msg`: `rows=1; resize:none; field-sizing:content; max-height:200px; border:0; outline:none; background:transparent; color:#F5F5F7; font-family:inherit; font-size:16px; line-height:1.5; letter-spacing:-0.01em; padding:10px 14px 4px`. Placeholder "Pitaj dalje…".
- Bottom row: `flex; justify-content:space-between; align-items:center; gap:10px; padding:4px 4px 4px 8px`. Left group: `flex; gap:6px; align-items:center; font-size:13px; font-weight:500`.
  - Add-images: `button.chip[aria-label="Dodaj slike"]; width:32px; height:32px; border-radius:999px; display:grid; place-items:center`. Image icon 15px.
  - Source toggles "OLX.ba", "SVEX.ba": `button.chip[aria-pressed=true]; font:inherit; gap:6px; border-radius:999px; padding:0 12px 0 9px; height:32px`. Check icon 13px `stroke:{{accent}}; stroke-width:2.8`.
  - Model button: `font-size:13px; font-weight:500; color:rgba(235,235,245,.68); background:transparent; border:0; padding:0 10px; height:32px; gap:4px`; `aria-haspopup=listbox`; "Sonnet 5.5" + chevron-down 14px.
  - Send: `button[type=submit][aria-label="Pošalji"]; width:40px; height:40px; flex-shrink:0; border:0; border-radius:999px; background:{{accent}}; color:#0E1020; display:grid; place-items:center`. Arrow-up icon 18px (stroke 2.6).

### Settings panel (`aside[aria-label="Postavke"].glass.fly`)
- `flex:0 0 440px; border-width:0 0 0 1px; border-radius:0; box-shadow:none; background:rgba(18,20,40,.72)`.
- Header row: `flex; justify-content:space-between; align-items:center; gap:10px; padding:14px 14px 10px 20px`. h2 "Postavke": `17px/600; letter-spacing:-0.02em`. Close: `.chip`, `aria-label="Zatvori panel"`, 36x36, x icon 15px.
- Content: `padding:4px 20px 24px; flex column; gap:22px`.
- Section: `flex column; gap:6px`. Section h3: `margin:0 16px; font-size:12px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:rgba(235,235,245,.56)`.
- Group box: `border-radius:16px; overflow:hidden; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.08)`. Row separators: wrapper `border-bottom:1px solid rgba(255,255,255,.08)` (none on last).
- Section note: `margin:6px 16px 0; font-size:12px; color:rgba(235,235,245,.56)`.

#### Section "AI model" (radio list)
- Row: `label`, `flex; align-items:center; gap:12px; min-height:56px; padding:10px 16px; cursor:pointer`. Real radio `input[type=radio][name=model].sr`.
- Text block `flex-grow:1`: name `15px`; description `13px; color:rgba(235,235,245,.56)`.
- Trailing slot: `span aria-hidden; width:20px; display:grid; place-items:center`. Selected: check icon 18px, `stroke:{{accent}}; stroke-width:2.8`. Unselected: empty.
- Row 3 contains a text input: `aria-label="ID modela s OpenRoutera"`, `.field`, `margin-top:8px; height:36px; font-size:14px; font-family:ui-monospace, Menlo, monospace`, placeholder "npr. google/gemini-2.5-flash".
- Selected: row 1 (Claude Sonnet 5.5). 

#### Section "Izgled"
- Row "Jezik": `flex; justify-content:space-between; align-items:center; gap:14px; min-height:48px; padding:10px 16px`. Select button: `aria-haspopup=listbox; font-size:15px; height:32px; padding:0 8px 0 12px; border-radius:8px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.08); color:#F5F5F7; gap:6px`. Text "Bosanski" + up-down chevron icon 14px (`stroke:rgba(235,235,245,.68)`).
- Row "Tema": `div[role=radiogroup][aria-label="Tema"]; padding:14px 16px; flex column; gap:12px`. Label 15px. Thumbs row: `flex; gap:14px`.
  - Thumb item: `label; flex column; align-items:center; gap:6px; cursor:pointer`; hidden radio `input[name=theme].sr`.
  - Thumb: `width:84px; height:56px; border-radius:10px; border:1px solid rgba(255,255,255,.14); position:relative; overflow:hidden`. Inner two bars: `position:absolute; left:8px; height:6px; border-radius:3px`; bar 1 `top:8px; width:34px; background:rgba(128,128,140,.55)`; bar 2 `top:20px; width:50px; background:rgba(128,128,140,.35)`.
  - Backgrounds: "Kao sistem" `linear-gradient(90deg, #F5F5F7 50%, #1C1E36 50%)`; "Svijetla" `#F5F5F7`; "Tamna" `#1C1E36`.
  - Selected state: `box-shadow:0 0 0 3px {{accent}}` and label `color:#F5F5F7; font-weight:600`. Unselected: `box-shadow:0 0 0 0 {{accent}}`, label `color:rgba(235,235,245,.68); font-weight:400`. Label size 13px.
  - Selected: "Kao sistem".
- Note: "Hrvatski, srpski i engleski stižu uskoro."

#### Section "Računi"
- Link row: `a href=Connect.dc.html; flex; justify-content:space-between; align-items:center; gap:14px; min-height:48px; padding:10px 16px; text-decoration:none; color:#F5F5F7`. Left "OpenRouter, OLX i SVEX" 15px. Right: `color:rgba(235,235,245,.68); font-size:15px; gap:6px` "Povezano 2 od 3" + chevron-right 16px (`stroke:rgba(235,235,245,.56)`).

#### Section "Privatnost"
- Button row: `font:inherit; font-size:15px; width:100%; min-height:48px; padding:10px 16px; border:0; background:transparent; color:#FF6B61; text-align:left`. Text "Obriši sve podatke".
- Note: "Briše ključ, prijave, razgovore i nacrte iz ovog preglednika."

#### Section "O aplikaciji"
- Row "Otvoreni kod": link `href="#"`, right "GitHub" + external-link icon 14px.
- Row "Verzija": non-link, right `span` `font-family:ui-monospace, Menlo, monospace; font-size:14px` "v0.4.2 · a1b2c3d".
- Row "Šta čuvamo?": link to Connect.dc.html, chevron-right 16px.

### States
- Global hover (`filter:brightness(1.12)`), active (`scale(.97)`), focus-visible (`outline:2px solid #8FB4FF; outline-offset:3px`), transitions: as in MyListings.md. Link hover color `#FFFFFF`. Disabled/loading/error: not drawn. Menu rows have no own hover style.

### 3. Interactions and script

- `renderVals` as in MyListings (horizon) plus `listings`: `L.map` over the 6 items (table above), adding `delay=(i*70)+'ms'`, `border` (best ? accent : `rgba(255,255,255,.10)`), `badgeDisplay` (best ? block : none), `soldDisplay` (sold ? flex : none), `imgDisplay` (noimg ? none : block), `noImgDisplay` (noimg ? grid : none), `imgFilter` (sold ? `grayscale(1) brightness(.7)` : none), `opacity` (sold ? '.6' : '1'), `strike` (sold ? `line-through` : none).
- Props: accent `#FF9646`, dither 2 (1-8), intensity 30, bend 0. `$preview` 1440x900.
- No handlers or state. Animations in DOM: `.in` on the user bubble, assistant row and each card (staggered 70ms steps, springIn .55s cubic-bezier(.2,.9,.3,1.25) both); `.fly` on the aside (flyIn .45s cubic-bezier(.2,.9,.3,1) both). Reduced motion: all become `fade .3s ease both`.
- Implied: panel opens from the header gear (slides in from the right, translateX 48px); close button hides it; radios change model and theme; language select; "Obriši sve podatke" asks confirm and clears local data; card click opens Detail.dc.html; composer Enter/send submits; textarea grows with content up to 200px.

### 4. Patterns, tokens, fonts, blobs

- Tokens, `.glass`, `.solid`, `.chip`, `.field`, `.sr`, dither classes, horizon rings, keyframes: as in MyListings.md section 4. Fonts: Inter 400/500/600/700 and `ui-monospace, Menlo, monospace` (model ID input, version).
- Extra colors: `#232745` (image placeholder), `#1C1E36` (dark theme thumb), `rgba(14,16,32,.72)` (badge), `rgba(14,16,32,.45)` (sold overlay), `#FFD36E` (avatar sparkle), `rgba(18,20,40,.72)` (panel bg), `rgba(128,128,140,.55|.35)` (thumb bars).
- Pixelated image rendering: none. Scanlines: none.
- /_blob references (all in result cards, 4:3 box, `object-fit:cover; width:100%; height:100%`):
| Id | Used by |
|---|---|
| /_blob/44d310d932b0fe647b478ab95165dc21 | card 1 |
| /_blob/df4e2008cb50c49c6ac755a1a645c6be | cards 2 and 6 |
| /_blob/f60fcfa9ea5a0a5d2889a1e0c901f068 | cards 3 and 5 (5 greyed: sold) |

### 6. Responsive

- No width breakpoints. Only `prefers-reduced-motion`.
- Panel fixed 440px and result grid fixed 3 columns: on narrow screens the panel would squeeze the chat column (`min-width:0` on column, grid `minmax(0,1fr)`). Mobile layout (panel as full-screen sheet) is not drawn.

## Screen: States.dc.html spec fragment

Source: /home/omznc/dev/lagano-shop/design/canvas/States.dc.html (title "Stanja i povratne informacije", lang bs). Canvas preview size 1440x1500. All values below are literal from the file.

### 1. Artboard layout

- Root: `position:relative; min-height:100vh; overflow:hidden; background:#0E1020; color:#F5F5F7; display:flex; flex-direction:column; -webkit-font-smoothing:antialiased; --p:{{dither}}px`.
- Font stack: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Inter, system-ui, sans-serif`.
- Layer 1: horizon "sun" (see section 4). `position:absolute; inset:0; pointer-events:none; overflow:hidden; aria-hidden`.
- Header: sticky, `top:0; z-index:5`, class `glass` with `border-width:0 0 1px 0; border-radius:0; box-shadow:none`. `display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:10px 24px`.
- Banner stack: `position:relative; display:flex; flex-direction:column; gap:8px; padding:12px 24px 0; max-width:1360px; width:100%; margin:0 auto`.
- Main: `position:relative; flex-grow:1; width:100%; max-width:1360px; margin:0 auto; padding:24px 24px 48px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:32px 24px; align-items:start`.
- Grid cells (all `display:flex; flex-direction:column; gap:10px`):
  - Row 1: mascot, `grid-column:span 3`.
  - Row 2: 401 card, 402 card, network card (each `span 1`).
  - Row 3: empty/partial (`span 1`), card states (`span 2`).
  - Row 4: toasts, drop zone + thinking, buttons (each `span 1`).
- Section label above each cell: `font-size:12px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:rgba(235,235,245,.56); margin-bottom:10px`.
- Nothing is fixed except the sticky header. The page scrolls as a whole.

### 2. Components

### 2.1 Header (`header.glass`)
- Left group `flex; align-items:center; gap:10px`:
  - Logo link `href="Main.dc.html" aria-label="Početna"`: `display:grid; place-items:center; width:44px; height:44px`. Contains mascot svg 30x24 (viewBox 0 0 20 16, `shape-rendering:crispEdges`).
  - Button "Novi razgovor": link `href="Main.dc.html"`, classes `btn chip`, pill (see 2.2 `pill`), pencil icon 15px.
- Right group `flex; align-items:center; gap:8px; flex-wrap:wrap`:
  - Status chip (see 2.3).
  - Model select button: `aria-haspopup="listbox"`; `font-size:13px; font-weight:500; display:inline-flex; align-items:center; gap:4px; color:rgba(235,235,245,.68); background:transparent; border:0; border-radius:999px; padding:0 10px; height:40px; cursor:pointer`. Text "Sonnet 5.5" plus chevron-down 14px.
  - "Moji oglasi": link `href="MyListings.dc.html"`, class `btn`, ghost pill (`color:rgba(235,235,245,.68); background:transparent; border:0`), layers icon 15px.
  - Settings: link `href="Settings.dc.html"`, `btn chip`, `aria-label="Postavke"`, `width:40px; padding:0; justify-content:center`, gear icon.

### 2.2 Pill button base (inline on every button)
`font-family:inherit; font-size:14px (13px in cards); font-weight:500; letter-spacing:-0.01em; display:inline-flex; align-items:center; gap:7px; border-radius:999px; padding:0 16px 0 13px (0 16px if no icon); height:40px; min-height:40px (36px in cards, 32px in banners); cursor:pointer; text-decoration:none; white-space:nowrap`.
- Variants:
  - `chip`: color #F5F5F7, bg rgba(255,255,255,.07), border 1px rgba(255,255,255,.08).
  - `glass`: color #F5F5F7, `box-shadow:none`.
  - primary: `color:#0E1020; background:#F5F5F7; border:0; box-shadow:0 8px 24px rgba(0,0,0,.25)`.
  - ghost: `color:rgba(235,235,245,.68); background:transparent; border:0`.
  - icon-only: `width:40px; height:40px; padding:0; justify-content:center`.
- Global states: hover `filter:brightness(1.12)`; active `transform:scale(.97)`; focus-visible `outline:2px solid #8FB4FF; outline-offset:3px`; transition `transform .15s ease, filter .15s ease, background-color .15s ease`; `-webkit-tap-highlight-color:transparent`.
- Disabled state: not shown in this file.

### 2.3 Connection status chip
- `class="chip" role="status" aria-label="Status veza"`; `display:inline-flex; align-items:center; gap:14px; height:40px; padding:0 14px; border-radius:999px; font-size:13px; font-weight:500; color:#F5F5F7`.
- Three items, each `inline-flex; align-items:center; gap:6px`: dot 8x8 `border-radius:999px; flex-shrink:0` + name + optional note `color:rgba(235,235,245,.56)`.
- Dot colors: warn #FFB340, ok #34C759, error #FF6B61.
- Shown states:
  - OpenRouter, warn, note " · malo kredita".
  - OLX, ok.
  - SVEX, error, note " · ne radi".

### 2.4 Banner (`role="status"`)
- `display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:14px; font-size:14px`. Icon 16px stroke currentColor. Text span `flex-grow:1; color:#F5F5F7`. Optional action chip button 32px high with external-link icon 13px.
- Tones (bg = color+1F alpha, border = 1px color+40 alpha, icon color = tone):
  - Offline (neutral): tone #8E8E9A; bg #8E8E9A1F; border #8E8E9A40. Icon wifi-off. Text "Nisi na internetu. Poruke šaljem kad se veza vrati."
  - Error: tone #FF6B61; bg #FF6B611F; border #FF6B6140. Icon triangle-alert. Text "SVEX trenutno ne radi. Tražim samo na OLX-u." Action "Status".
  - Warning: tone #FFB340; bg #FFB3401F; border #FFB34040. Icon info circle. Text "OpenRouter: ostalo je $0.40 kredita." Action "Dopuni".
  - Partial result (in empty cell): warning tone, triangle-alert icon, text "SVEX nije odgovorio. Prikazujem samo OLX rezultate." Action "Pokušaj ponovo" (retry icon, 13px).

### 2.5 Mascot (8 states)
- Tile: `figure` (`margin:0; flex column; align-items:center; gap:8px`) with `div.glass` (`width:100%; aspect-ratio:1; border-radius:20px; display:grid; place-items:center; box-shadow:none`) containing svg 72x57, viewBox `0 0 20 16`, `shape-rendering:crispEdges`, `role="img"`. Caption `font-size:13px; color:rgba(235,235,245,.68)`.
- Grid: `repeat(8,minmax(0,1fr)); gap:12px`.
- Pixel units: 1x1 rects as path `M{x} {y}h1v1h-1z`.
- Base layers (bottom to top): hair/crest #FFE2A8; body {{accent}} (default #FF9646); eyes/mouth #0E1020; cheeks #C2407A at `M3 10 / M12 10`; feet #C9672A.
- States (aria-label = caption):
  1. "Mirno": base only.
  2. "Spava (nema ključa)": extra layer #B4BAD6 (zzz), eyes closed (#0E1020 at `M4 9 M5 9 M10 9 M11 9`), mouth `M7 11 M8 11`.
  3. "Razmišlja": thought layer #F5F5F7 first; #0E1020 before accent.
  4. "Traži": magnifier #F5F5F7 + handle/glint #8FB4FF.
  5. "Našao": spark #FFD36E; mouth #0E1020 at `M5..M10 11`.
  6. "Ništa nije našao": #8FB4FF tear at `M14 6 M14 7`.
  7. "Greška": #FF453A exclamation at `M15 4 M15 5 M15 6 M15 8`.
  8. "Slavi objavu": confetti #34C759 (`M15 0, M18 8`), #FFD36E (`M0 1, M16 5`), #C2407A (`M19 1, M0 6`), #8FB4FF (`M17 2, M1 3`).
- Other sizes: 44x35 in error cards; 72x57 in empty state; 32x25 in thinking row; 30x24 in header.
- Full path data: copy from the source file.

### 2.6 Error card (3 variants)
- `section.glass`, `border-radius:24px; padding:20px; box-shadow:none`.
- Inner: `display:flex; gap:14px; align-items:flex-start`. Left: mascot "Greška" 44x35 (aria-hidden). Right: `flex-grow:1; flex column; gap:6px`.
- Title row `flex; gap:8px; align-items:center`: `h2 margin:0; font-size:15px; font-weight:600; letter-spacing:-0.02em` + code badge `font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px; background:rgba(255,69,58,.16); color:#FF6B61`.
- Body `p`: `margin:0; font-size:14px; line-height:1.45; color:rgba(235,235,245,.68)`. Action wrapper `margin-top:6px`.
- Variants:
  - 401: title "Ključ ne radi", badge "401", body "OpenRouter ne prihvata ovaj ključ. Možda je obrisan.", primary link `href="Connect.dc.html"` 36px, key icon, "Zalijepi novi ključ".
  - 402: "Nema kredita", "402", "Na OpenRouter računu nema više kredita.", primary button external-link icon "Dopuni na OpenRouteru".
  - Network: "Nema veze", "MREŽA", "Poruka nije poslana. Pokušaću ponovo kad se veza vrati.", `chip` button retry icon "Pokušaj ponovo".

### 2.7 Empty result
- `section.glass` (24px radius, 20px pad). Inner `flex column; align-items:center; gap:10px; text-align:center; padding:8px 0`. Mascot "Maskota: ništa nije našao" 72x57. `h2 font-size:17px; font-weight:600; letter-spacing:-0.02em`: "Ništa nisam našao". Body 14px as above: "Nema oglasa za „Prusa MK4“ ispod 400 KM." Actions `flex; gap:8px; flex-wrap:wrap; justify-content:center`, two `chip` pills 36px, `padding:0 16px`: "Povećaj cijenu", "Javi mi kad se pojavi".
- A 10px spacer, then the partial-result banner (2.4).

### 2.8 Listing card states (grid `repeat(3,minmax(0,1fr)); gap:12px`)
Common: `div.glass; flex column; gap:10px; padding:8px 8px 14px; border-radius:22px; box-shadow:none`. Image box `aspect-ratio:4/3; border-radius:15px`. Text block `padding:0 6px`.
- Loading (`aria-hidden`): shimmer blocks (class `shim`): image 4/3; lines `height:18px;width:50%`, `height:12px;width:90%`, `height:12px;width:60%`, each `border-radius:6px`; text block `flex column; gap:8px`.
- No image: box `background:#232745; display:grid; place-items:center; align-content:center; gap:6px; color:rgba(235,235,245,.56); font-size:12px`; image icon 22px; text "Nema slike". Price "480 KM" `20px/700`; title "Ender 3 V3 SE" `13px; color:rgba(235,235,245,.68)`.
- Unavailable: image box `position:relative; overflow:hidden`; `img /_blob/f60fcfa9ea5a0a5d2889a1e0c901f068`, `width:100%; height:100%; object-fit:cover; filter:grayscale(1) brightness(.7)`; overlay `position:absolute; inset:0; grid; place-items:center` with badge `font-size:12px; font-weight:700; padding:5px 10px; border-radius:999px; background:#F5F5F7; color:#0E1020` "NEDOSTUPNO". Text block `opacity:.6`; price "590 KM" `20px/700; text-decoration:line-through`; "Oglas je uklonjen" 13px.

### 2.9 Toast
- Class `solid in`, `role="status"`; `flex; align-items:center; gap:10px; padding:10px 14px; border-radius:16px; font-size:14px; width:340px`. Stack `flex column; gap:8px`. Entry delays 0 ms, 90 ms, 180 ms. Text span `flex-grow:1`. Action link `color:#8FB4FF; font-weight:600; text-decoration:none`.
- Variants:
  - Success (check icon stroke #34C759): "Kopirano u međuspremnik".
  - Success + undo: "Oglas označen kao prodan", action "Poništi".
  - Warning (triangle stroke #FFB340): "OLX sesija je istekla", action "Prijavi se" (`href="Connect.dc.html"`).

### 2.10 Drop zone
- Frame `position:relative; height:180px; border-radius:20px; overflow:hidden; border:1px solid rgba(255,255,255,.1)`. Scrim `inset:0; background:rgba(14,16,32,.6)`. Target `position:absolute; inset:10px; border:2px dashed {{accent}}; border-radius:16px; grid; place-items:center; align-content:center; gap:8px; background:rgba(255,150,70,.08)`. Icon cloud-upload 28px stroke {{accent}}. Title `strong 16px` "Pusti slike bilo gdje"; sub 13px `rgba(235,235,245,.68)` "Dodaću ih u poruku". (The tint rgba(255,150,70,.08) is hard-coded to the default accent.)

### 2.11 Thinking indicator
- Row `flex; align-items:center; gap:10px`: mascot "thinking" 32x25 + bubble `glass` `inline-flex; gap:5px; padding:12px 14px; border-radius:18px; box-shadow:none; role="status" aria-label="Razmišljam"` with 3 dots `7x7; border-radius:9px; background:#F5F5F7`, classes dot1/dot2/dot3.

### 2.12 Buttons and states row
`flex; gap:12px; align-items:center; flex-wrap:wrap`.
- Send: 40x40 circle, `background:{{accent}}; color:#0E1020`, arrow-up icon 18px stroke-width 2.6; `aria-label="Pošalji"`.
- Stop: 40x40 circle, `background:#F5F5F7; color:#0E1020`, rounded square 14px (rect 5,5,14,14 rx 3); `aria-label="Zaustavi"`.
- Glass pills 40px: "Normalno"; "Hover" (inline `filter:brightness(1.12)`); "Pritisnuto" (inline `transform:scale(.97)`).
- Scroll-to-bottom: 40x40 `glass` circle, arrow-down icon 18px; `aria-label="Skroluj na dno"`.
- Legend row `flex; gap:16px; font-size:12px; color:rgba(235,235,245,.56); flex-wrap:wrap`.

### 3. Interactions and script
- Script props (data-props): accent color (default #FF9646; options #FF9646, #F5C518, #7DD3A8, #8FB4FF); dither range 1-8 px default 2; intensity 0-100 % default 30; bend 0-100 default 0.
- `renderVals()` computes ring array for the horizon only (no state, no handlers). `t=0`, `lx=0` are fixed, so flicker and sun X shift are static in canvas.
- Animations: toasts `springIn .55s cubic-bezier(.2,.9,.3,1.25) both` with delays 0/90/180 ms; shimmer `1.4s linear infinite`; dots `blink 1.2s ease-in-out infinite` with delay 0, .15s, .3s.
- Implied (not coded in the canvas):
  - Toast auto-dismiss timer, not shown.
  - Send button turns into Stop while the AI writes.
  - Banners stack in the order offline, error, warning.
  - Drop zone appears on dragover over the whole window.
  - Retry button re-sends the failed message.
  - "Povećaj cijenu" and "Javi mi kad se pojavi" start a new search or an alert.
  - Header links: `Main.dc.html`, `MyListings.dc.html`, `Settings.dc.html`, `Connect.dc.html`.
- Reduced motion: `.in,.dock,.fly` use `fade .3s ease both`; `.attn,.shim,.spin,.conf,.caret,.dot1-3` have `animation:none`.

### 4. Patterns, tokens, fonts, blobs

### Tokens (no :root custom properties; colors are literal)
- `--p`: dither pixel size = {{dither}}px (default 2px). `--r`: ring radius. `--c`: ring color.
- Colors:
  - bg #0E1020
  - text #F5F5F7; hover link #FFFFFF
  - text 2 rgba(235,235,245,.68); text 3 rgba(235,235,245,.56)
  - placeholder rgba(235,235,245,.45)
  - focus #8FB4FF
  - accent {{accent}} default #FF9646
  - ok #34C759; warn #FFB340; error #FF6B61; error strong #FF453A; neutral #8E8E9A
  - pale #FFE2A8; pink #C2407A; indigo #33298F; foot #C9672A; spark #FFD36E
  - skeleton/no-image bg #232745

### Utility classes
- `.glass`: `background:rgba(22,24,46,.58); backdrop-filter:blur(28px) saturate(170%); border:1px solid rgba(255,255,255,.10); box-shadow:inset 0 1px 0 rgba(255,255,255,.07), 0 24px 60px rgba(0,0,0,.35)`.
- `.solid`: `background:rgba(20,22,42,.94); backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,.10); box-shadow:0 30px 80px rgba(0,0,0,.5)`.
- `.chip`: `background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.08)`.
- `.field`: `background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); border-radius:12px; color:#F5F5F7; font:inherit; font-size:15px; padding:0 14px; height:44px; width:100%; outline:none`.
- `.lbl`: `font-size:12px; font-weight:600; letter-spacing:.02em; color:rgba(235,235,245,.68); text-transform:uppercase`.
- `.sr`: visually hidden (`position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap`).
- `html,body{margin:0;background:#0E1020}`; `*{box-sizing:border-box}`.

### Dither and checkerboard (class on `.ring`, `--p` px, `--c` color)
- `.d6`: `conic-gradient(at var(--p) var(--p), transparent 0 75%, var(--c) 0) 0 0/calc(var(--p)*4) calc(var(--p)*4)`.
- `.d12`: two layers of the `.d6` gradient: first at `0 0`, second offset `calc(var(--p)*2) calc(var(--p)*2)`, both size `calc(var(--p)*4)`.
- `.d25`: same conic gradient, size `calc(var(--p)*2)`.
- `.d50` (checkerboard): `repeating-conic-gradient(var(--c) 0 25%, transparent 0 50%) 0 0/calc(var(--p)*2) calc(var(--p)*2)`.
- `.d75`: `conic-gradient(at var(--p) var(--p), var(--c) 0 75%, transparent 0) 0 0/calc(var(--p)*2) calc(var(--p)*2)`.
- `.d100`: `background:var(--c)`.
- `.sun`: `position:absolute; left:50%; width:0; height:0; pointer-events:none`; inline `top:calc(100% + {{sunOffset}}px); transform:translateX({{sunX}}px)`.
- `.ring`: `position:absolute; border-radius:50%; left:calc(var(--r)*-1); top:calc(var(--r)*-1); width:calc(var(--r)*2); height:calc(var(--r)*2)`.
- Ring generation (with `p`=dither, `k=(0.4+intensity/100*1.6)`, `sag=30+bend*2.2`, `q=4p`, `snap(v)=max(q,round(v/q)*q)`):
  - `core=snap((720*720+sag*sag)/(2*sag))`.
  - Layers (class, color, step): d50 pale 8; d25 pale 8; accent d100 16, d75 10, d50 12, d25 12, d12 14, d6 16; pink d100 24, d75 18, d50 18, d25 20, d12 22, d6 24; indigo d100 40, d75 30, d50 32, d25 34, d12 38, d6 44.
  - Each ring radius = previous + `snap(step*k)`. First ring is d100 pale at `core`. Array is reversed (largest first).
  - `sunOffset=indigoStart+snap(24)` where `indigoStart` is the radius before the indigo d100 ring.
  - `sunX=round(lx*140/p)*p` (0 here).
  - Background-position flicker: d12 `0 0, calc(var(--p)*2) calc(var(--p)*2)` (alt `var(--p) 0, calc(var(--p)*3) calc(var(--p)*2)`); others `0 0` (alt `var(--p) 0`). Static at t=0.
- Pixel art: all SVG use `shape-rendering="crispEdges"`. No scanlines. No `image-rendering` rule.
- Skeleton shimmer `.shim`: `linear-gradient(90deg, rgba(255,255,255,.05) 0%, rgba(255,255,255,.12) 50%, rgba(255,255,255,.05) 100%) 0 0/200% 100%`.

### Keyframes
- `springIn`: from `opacity:0; translateY(14px) scale(.97)` to `opacity:1; none`.
- `dock`: from `opacity:.6; translateY(-40vh)` to none (class `.dock`: `.7s cubic-bezier(.2,.9,.3,1) both`).
- `attn` (class `.attn`: `2.6s ease-in-out .8s infinite`): box-shadow ring `0 0 0 0 rgba(255,150,70,0)` at 0/100 %; `0 0 0 8px rgba(255,150,70,.22)` at 30 %; `0 0 0 14px rgba(255,150,70,0)` at 60 %; all plus `0 30px 80px rgba(0,0,0,.45)`.
- `shim`: to `background-position:-200% 0`.
- `spin` (`.9s linear infinite`): to `rotate(360deg)`.
- `blink`: `opacity .25 / 1 / .25`.
- `caret` (`1s steps(1) infinite`): 50 % `opacity:0`.
- `fall` (`2.8s linear infinite`): `translateY(-30px)` to `translateY(520px)`.
- `flyIn` (`.45s cubic-bezier(.2,.9,.3,1) both`): `opacity:0; translateX(48px)` to none.
- `fade`: opacity 0 to 1.

### Fonts
Google Fonts: `Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700` with `display=swap`. Preconnect to fonts.googleapis.com and fonts.gstatic.com. Body stack starts with the SF system fonts, Inter is fallback.

### Blobs
- `/_blob/f60fcfa9ea5a0a5d2889a1e0c901f068`: unavailable listing card image, `width:100%; height:100%; object-fit:cover; filter:grayscale(1) brightness(.7)`, box 4/3, radius 15px, `alt=""`.

### 6. Responsive
States.dc.html has no media query except `prefers-reduced-motion`. The artboard is desktop (max-width 1360px, 3-column grid). Header wraps (`flex-wrap:wrap`) and banners use `flex:1` text. Phone rules: see Phones.md.

## Screen: Phones.dc.html spec fragment

Source: /home/omznc/dev/lagano-shop/design/canvas/Phones.dc.html (title "Telefon", lang bs). Preview size 1450x1000. The file has exactly 3 phone screens: chat with horizontal cards, listing detail as bottom sheet, input above keyboard. Sell flow, my listings, connect and settings have no phone screen in this file. Nothing to specify for them here. The file has no media query except `prefers-reduced-motion`.

### 1. Artboard layout
- Root: same as States (`min-height:100vh; background:#0E1020; overflow:hidden; flex column; font stack SF/Inter`, `--p:{{dither}}px`). Horizon "sun" layer behind `main` (aria-hidden).
- `main`: `position:relative; display:flex; gap:80px; justify-content:center; padding:48px 40px`. Three `figure` (`margin:0; flex column; align-items:center; gap:14px`).
- Caption `figcaption`: `font-size:14px; color:rgba(235,235,245,.68)`. Captions: "Chat · kartice u vodoravnom redu", "Detalji · donji sheet", "Unos iznad tastature".
- Device frame: `width:390px; height:844px; border-radius:54px; padding:10px; background:#000; box-shadow:0 0 0 1px rgba(255,255,255,.14), 0 40px 80px rgba(0,0,0,.5)`.
- Screen: `position:relative; width:100%; height:100%; border-radius:44px; overflow:hidden; background:#0E1020; display:flex; flex-direction:column`. Inside: own sun layer (`position:absolute; inset:0`), header, content, composer.
- Effective screen: 370x824 px (390-2*10 by 844-2*10).
- Safe areas: top inset is 50px of header top padding (status bar/notch zone). Bottom inset is 30px composer bottom padding (home indicator), or 8px when the keyboard is open. No `env(safe-area-inset-*)` used. Port to `env(safe-area-inset-top/bottom)` as an engineering note.
- Scroll: header fixed (flex item, not scrolling). Content area `flex-grow:1; overflow:hidden` (the canvas does not scroll it). Composer fixed at the bottom.

### 2. Components (phone variants)

### 2.1 Phone header (`header.glass`)
- `position:relative; z-index:3; padding:50px 14px 10px; display:flex; align-items:center; justify-content:space-between; border-width:0 0 1px; border-radius:0; box-shadow:none`.
- Logo link `aria-label="Početna"`: `grid; place-items:center; width:44px; height:44px`; mascot svg 28x22.
- Center chip `role="status" aria-label="Sve veze rade"`: `inline-flex; gap:6px; align-items:center; padding:0 12px; height:32px; border-radius:999px; font-size:12px`. Three 8x8 dots #34C759 (OpenRouter, OLX, SVEX collapsed to dots only) + "Sonnet 5.5" + chevron-down 12px. Differs from desktop: no names, 32px high.
- Right: `flex; gap:4px`, two ghost icon buttons `width:40px; height:40px; padding:0; border-radius:999px; color:rgba(235,235,245,.68); background:transparent; border:0; justify-content:center`, icons 15px:
  - "Novi razgovor" (`aria-label`): pencil.
  - "Postavke" (`aria-label`): gear.
- Desktop-only items hidden on phone: "Moji oglasi" text link, text label of "Novi razgovor", connection names.
- Touch targets: 44px logo, 40px icon buttons, 36px chips/buttons, 36px composer buttons, 50px primary sheet button, 42px keyboard keys. Minimum 30px for the sheet info chips (below the 44px guideline; flag).

### 2.2 Screen 1: chat with horizontal cards
- Content: `position:relative; flex-grow:1; overflow:hidden; padding:16px 14px; flex column; gap:14px`.
- User bubble: `align-self:flex-end; background:{{accent}}; color:#0E1020; padding:10px 14px; border-radius:18px 18px 6px 18px; font-size:15px; font-weight:500`. Text "Ender printer ispod 700 KM".
- Tool line: `flex; align-items:center; gap:6px; font-size:12px; color:rgba(235,235,245,.68)`; search icon 13px; text " Pretražio OLX · SVEX · 15 oglasa".
- Card carousel: `display:flex; gap:10px; overflow-x:auto; scroll-snap-type:x mandatory; margin:0 -14px; padding:0 14px 4px` (edge-to-edge bleed). No scrollbar styling.
- Card (`a.glass`): `flex:0 0 200px; scroll-snap-align:start; flex column; gap:8px; padding:6px 6px 12px; border-radius:20px; text-decoration:none; color:#F5F5F7; box-shadow:none; border-color:rgba(255,255,255,.1)`. Selected/best card: `border-color:{{accent}}`.
  - Image: `width:100%; aspect-ratio:4/3; object-fit:cover; border-radius:14px`.
  - Text block `padding:0 6px`: price `18px/700`; title `12px; color:rgba(235,235,245,.68); white-space:nowrap; overflow:hidden; text-overflow:ellipsis`; source `11px; color:rgba(235,235,245,.56)`.
  - Cards: "550 KM / Ender-3 V3 KE / OLX · Livno" (border accent); "400 KM / Ender 3 Pro / SVEX · Bihać"; "625 KM / Ender-3 V3 SE / SVEX · Lukavac".
- AI text: `p margin:0; font-size:16px; line-height:1.5`: "Najbolja ponuda je **KE za 550 KM** u Livnu. Prevuci za još oglasa."
- Quick actions: `flex; gap:6px; flex-wrap:wrap`; glass pills `font-size:13px; height:36px; padding:0 16px` ("Samo V3"), and with icon `padding:0 16px 0 13px` ("Sortiraj", sort icon 15px).
- Composer wrapper: `position:relative; z-index:3; padding:8px 10px 30px`. Form `class="glass"`: `flex; align-items:center; gap:6px; padding:5px; border-radius:26px`.
  - Attach button `chip`: 36x36 circle, image icon 16px, `aria-label="Dodaj slike"`.
  - `label.sr` "Poruka" + `textarea rows=1`: `flex-grow:1; resize:none; border:0; outline:none; background:transparent; color:#F5F5F7; font:inherit; font-size:16px; padding:7px 4px`. Placeholder "Pitaj dalje…" (color rgba(235,235,245,.45)). The 16px size prevents iOS zoom on focus.
  - Send: `submit` 36x36, `border:0; border-radius:999px; background:{{accent}}; color:#0E1020`, arrow-up 16px stroke 2.6, `aria-label="Pošalji"`.

### 2.3 Screen 2: listing detail as bottom sheet
- Header as 2.1 stays visible behind a scrim: `position:absolute; inset:0; z-index:4; background:rgba(5,6,15,.55)`.
- Sheet: `section role="dialog" aria-modal="true" aria-label="Detalji oglasa"`, classes `solid in`: `position:absolute; z-index:5; left:0; right:0; bottom:0; height:690px; border-radius:30px 30px 0 0; flex column; overflow:hidden`. Entry animation `springIn .55s cubic-bezier(.2,.9,.3,1.25) both`.
- Grabber block `padding:8px 0 4px`: bar `width:40px; height:5px; border-radius:5px; background:rgba(255,255,255,.3); margin:0 auto`; hint `text-align:center; font-size:11px; color:rgba(235,235,245,.56); margin-top:4px` "Prevuci dolje za zatvaranje".
- Scroll body: `padding:8px 16px; flex column; gap:12px; overflow-y:auto; flex-grow:1`.
  - Image `/_blob/44d310d932b0fe647b478ab95165dc21`: `width:100%; aspect-ratio:4/3; object-fit:cover; border-radius:18px`.
  - Price `28px/700; letter-spacing:-0.03em` "550 KM"; title `16px/600` "Creality Ender-3 V3 KE 3D printer".
  - Info chips `flex; gap:6px; flex-wrap:wrap`, class `chip`, `font-size:12px; height:30px; padding:0 16px 0 13px`, icon 13px: "Livno" (pin), "Korišteno" (box), "Danas" (calendar).
  - Description `p 15px/1.5; color:rgba(235,235,245,.86)`: "Korišten 6 mjeseci. Nova mlaznica, 3 rezervne i 2 kg PLA filamenta."
  - Seller card `chip`: `flex; align-items:center; gap:10px; padding:10px; border-radius:14px`. Avatar `36x36; border-radius:999px; background:#C2407A; font-weight:700; font-size:13px` initials "MK". Name `14px/600` "Marko K."; meta `12px; color:rgba(235,235,245,.56)` "Na OLX-u od 2019".
- Footer: `padding:10px 16px 30px; border-top:1px solid rgba(255,255,255,.08)`. Primary button full width: `height:50px; min-height:50px; width:100%; justify-content:center; font-weight:600; font-size:14px; background:#F5F5F7; color:#0E1020; box-shadow:0 8px 24px rgba(0,0,0,.25)`; external-link icon 15px; text "Otvori na OLX".
- Desktop differs: detail is a side panel; on phone it is a bottom sheet, 690px of 824px high (leaves 134px of header visible).

### 2.4 Screen 3: input above keyboard
- Content `flex-grow:1; overflow:hidden; padding:16px 14px; flex column; justify-content:flex-end; gap:12px` (messages sit at the bottom).
- AI message row `flex; gap:10px`: mascot 26x20 + `p 16px/1.5` "Koliko želiš potrošiti? Mogu tražiti i u drugim gradovima."
- Composer wrapper `padding:8px 10px 8px` (bottom 8px, not 30px, because the keyboard covers the home indicator). Same form as 2.2. Placeholder "Do 600 KM, Livno ili Tomislavgrad".
- Keyboard mock (`aria-hidden`): `position:relative; z-index:3; background:#2B2C31; padding:8px 4px 34px; flex column; gap:10px`. Rows `flex; gap:6px; justify-content:center`:
  - Row 1: q w e r t z u i o p, `padding:0 0px`.
  - Row 2: a s d f g h j k l, `padding:0 16px`.
  - Row 3: y x c v b n m, `padding:0 40px`.
  - Row 4: `padding:0 2px`; "123" (width 88px, bg #3A3B40), "razmak" (flex:1, bg #4A4B52), "pošalji" (width 88px, bg #3A3B40); font 15px, color #FFF.
  - Key: `flex:1; height:42px; border-radius:6px; background:#4A4B52; grid; place-items:center; font-size:18px; color:#FFFFFF`.
  - Layout is QWERTZ (Bosnian). Total keyboard height = 8+42*4+10*3+34 = 240px.
- The header stays; the message list shrinks (list height = 824 - header - composer - 240).

### 3. Interactions and script
- Script identical to States.dc.html (props accent/dither/intensity/bend; `renderVals` builds horizon rings; no handlers, no state). Props default and `$preview` width 1450, height 1000.
- Gestures implied: horizontal swipe on the cards (scroll-snap, `mandatory`, `start`); drag the sheet grabber down to close; tap on the scrim closes (implied); tap card opens sheet; tap Samo V3 filters; tap Sortiraj opens sort.
- Sheet entry: `springIn .55s cubic-bezier(.2,.9,.3,1.25) both`. Exit is not drawn.
- Reduced motion: `.in,.dock,.fly` become `fade .3s ease both`.
- Global button states as in States.md 2.2 (hover brightness 1.12, active scale .97, focus outline 2px #8FB4FF offset 3px). Transitions `.15s ease`. On touch, hover does not apply; keep active.

### 4. Patterns, tokens, fonts, blobs
- Same CSS block as States.dc.html (identical `<style>`): dither classes d6..d100, `.sun`, `.ring`, `.glass`, `.solid`, `.chip`, `.field`, `.lbl`, `.sr`, animations and keyframes. See States.md section 4 for exact values.
- Tokens: same as States. Extra in Phones: scrim rgba(5,6,15,.55); keyboard #2B2C31, key #4A4B52, special key #3A3B40; device frame #000; avatar #C2407A; sheet text 2 rgba(235,235,245,.86).
- Font: Inter `opsz,wght@14..32,400;500;600;700`.
- Blobs:
  - `/_blob/44d310d932b0fe647b478ab95165dc21` (Ender-3 V3 KE): chat card image 4/3 `object-fit:cover; border-radius:14px` (card width 200px); sheet hero 4/3 `object-fit:cover; border-radius:18px`.
  - `/_blob/df4e2008cb50c49c6ac755a1a645c6be` (Ender 3 Pro): chat card, 4/3, cover, radius 14px.
  - `/_blob/f60fcfa9ea5a0a5d2889a1e0c901f068` (Ender-3 V3 SE): chat card, 4/3, cover, radius 14px.

### 6. Mobile / responsive rules (all that this file defines)
- Frame 390x844 (iPhone 14/15 class), 10px bezel, screen radius 44px, outer radius 54px.
- Header: 50px top padding for the status bar; 14px side padding; 40px icon buttons; no text labels; connection status collapsed to 3 dots in a 32px chip.
- Chat: 14px side padding; 14px gaps; user bubble right aligned; result cards in a horizontal scroll-snap carousel, card width 200px, gap 10px, bleeding to the screen edges (negative margin -14px); AI text 16px/1.5; quick-action pills 36px.
- Detail: bottom sheet 690px high, radius 30px 30px 0 0, scrim rgba(5,6,15,.55), grabber 40x5, close by dragging down, scrolling body, sticky footer with a 50px full-width primary button and 30px bottom padding for the home indicator.
- Composer: glass pill radius 26px, 36px buttons, 16px input text, bottom padding 30px (8px with keyboard).
- Keyboard: 240px tall; the composer and the last messages stay above it; messages align to the bottom (`justify-content:flex-end`).
- Not defined in this file (no phone mock): sell flow, my listings, connect, settings, banners, toasts, error cards, mascot states. Reuse the States.md components; width of toast (340px) fits inside 370px.


## 5. Copy (Bosnian, exact)

One table per screen. Column "Key" is a suggestion for `apps/shop/src/lib/strings.ts` (camelCase, group by component). The same string in two screens is one key: pick the first key. Strings with "lagano" are in the Rename list (section 0). The Sell shared-shell strings (S9) repeat in each Sell part: they are the header and composer strings of Main and Chat.

Existing keys in `strings.ts` that match a canvas string: `placeholder` (canvas: "Npr. Ender 3 V3 printer ispod 600 KM"; the app text differs), `suggestions` (app: "ispod 500 KM"; canvas: "ispod 600 KM"), `connectTitle`, `pasteKey`, `connectOlx`, `connectSvex`, `publish`, `cancel`. Use the canvas text unless the owner says otherwise.


### Main

| Component | Key | Text |
|---|---|---|
| meta | pageTitle | Početna – prazan chat |
| header | logoLabel | Početna |
| header | newChat | Novi razgovor |
| header | statusLabel | Status veza |
| header | statusOpenRouter | OpenRouter |
| header | statusOlx | OLX |
| header | statusSvex | SVEX |
| header | statusNotConnected | · nije povezan |
| header | modelName | Sonnet 5.5 |
| header | myListings | Moji oglasi |
| header | settingsLabel | Postavke |
| hero | mascotSleepLabel | Maskota spava: OpenRouter nije povezan |
| hero | title | Šta tražimo? |
| connectBanner | title | Poveži OpenRouter da počnemo |
| connectBanner | subtitle | Prijavi se jednim klikom. Ključ ostaje samo u ovom pregledniku. |
| connectBanner | pasteKey | Zalijepi ključ |
| connectBanner | connect | Poveži |
| composer | label | Poruka |
| composer | placeholder | Npr. Ender 3 V3 printer ispod 600 KM |
| composer | attachLabel | Dodaj slike |
| composer | sourceOlx | OLX.ba |
| composer | sourceSvex | SVEX.ba |
| composer | model | Sonnet 5.5 |
| composer | sendLabel | Pošalji |
| suggestions | findPrinter | Nađi Ender 3 V3 ispod 600 KM |
| suggestions | valueIphone | Koliko vrijedi moj iPhone 13? |
| suggestions | postHeadphones | Objavi oglas za slušalice |
| footer | openSource | Otvoreni kod |
| footer | keyStaysLocal | Ključ ostaje u tvom pregledniku |
| footer | proxyStoresNothing | Proxy ništa ne čuva |
| footer | sourceCode | Izvorni kod |
| footer | version | v0.4.2 · a1b2c3d |


### Chat

| Component | Key | Text |
|---|---|---|
| meta | pageTitle | Chat s rezultatima |
| header | newChat | Novi razgovor |
| header | statusLabel | Status veza |
| header | myListings | Moji oglasi |
| header | settingsLabel | Postavke |
| userMsg | attachmentAlt1 | Priložena slika 1 |
| userMsg | attachmentAlt2 | Priložena slika 2 |
| userMsg | q1 | Nađi nešto ovakvo ispod 700 KM |
| userMsg | q2 | Koliko vrijedi moj iPhone 13? |
| userMsg | q3 | Ima li jeftinijih u Livnu? |
| searchStatus | done | Pretražio OLX · SVEX |
| searchStatus | olxCount | OLX 12 oglasa |
| searchStatus | svexCount | SVEX 3 oglasa |
| searchStatus | loading | Tražim na OLX · SVEX… |
| searchStatus | olxCountLoading | OLX 3 oglasa |
| searchStatus | svexName | SVEX |
| filters | maxPrice | Do 700 KM |
| filters | condition | Stanje: sve |
| filters | city | Grad |
| filters | filters | Filteri |
| filters | sortCheapest | Najjeftinije prvo |
| filters | viewLabel | Prikaz |
| filters | viewGrid | Mreža |
| filters | viewList | Lista |
| listingCard | noImage | Nema slike |
| listingCard | bestOffer | Najbolja ponuda |
| listingCard | sold | PRODANO |
| listingCard | providerOlx | OLX |
| listingCard | providerSvex | SVEX |
| listingCard | conditionUsed | Korišteno |
| listingCard | conditionNew | Novo |
| listingCard | conditionLikeNew | Kao novo |
| listingCard | dateToday | Danas |
| listingCard | dateYesterday | Jučer |
| listingCard | date3Days | 3 dana |
| listingCard | date5Days | 5 dana |
| listingCard | date1Week | 1 sedm. |
| listingCard | date2Weeks | 2 sedm. |
| results | showMore | Prikaži još |
| answer1 | intro | Našao sam **15 oglasa** ispod 700 KM. Izdvojio sam najbolje: |
| answer1 | bullet1 | **Ender-3 V3 KE, 550 KM** u Livnu – nova mlaznica i 3 rezervne. |
| answer1 | bullet2 | **Ender 3 Pro, 400 KM** – najjeftiniji, ali starija serija. |
| answer1 | bullet3 | Jedan oglas u Sarajevu je [već prodan]. |
| answerActions | copy | Kopiraj odgovor |
| answerActions | retry | Pokušaj ponovo |
| priceCard | title | Koliko vrijedi? · iPhone 13, 128 GB |
| priceCard | meta | 37 oglasa · zadnjih 30 dana |
| priceCard | median | Medijan |
| priceCard | medianValue | 780 KM |
| priceCard | range | Raspon |
| priceCard | rangeValue | 650 – 900 KM |
| priceCard | histogramLabel | Histogram cijena: najviše oglasa između 750 i 800 KM |
| priceCard | axisMin | 600 KM |
| priceCard | axisMid | 750 |
| priceCard | axisMax | 950 KM |
| answer2 | text | Ako je baterija iznad 85 %, realno je tražiti **oko 780 KM**. |
| answer3 | streaming | Gledam oglase u Livnu. Za sada izgleda da je KE za 550 KM i dalje najbolja ponuda |
| progress | svexPercent | 60% |
| scroll | label | Skroluj na dno |
| composer | label | Poruka |
| composer | placeholder | Pitaj dalje… |
| composer | attachLabel | Dodaj slike |
| composer | sourceOlx | OLX.ba |
| composer | sourceSvex | SVEX.ba |
| composer | model | Sonnet 5.5 |
| composer | stopLabel | Zaustavi |


### Detail

Shared copy with Chat (header, status line, listing card strings, composer) uses the same keys as Chat.md. Panel-specific copy:
| Component | Key | Text |
|---|---|---|
| meta | pageTitle | Detalji oglasa |
| userMsg | q1 | Nađi nešto ovakvo ispod 700 KM |
| searchStatus | done | Pretražio OLX · SVEX |
| searchStatus | olxCount | OLX 12 oglasa |
| searchStatus | svexCount | SVEX 3 oglasa |
| listingCard | noImage | Nema slike |
| listingCard | bestOffer | Najbolja ponuda |
| listingCard | sold | PRODANO |
| detailPanel | ariaLabel | Detalji oglasa |
| detailPanel | sourcePill | OLX · Objavljeno danas |
| detailPanel | closeLabel | Zatvori panel |
| detailPanel | mainImageAlt | Creality Ender-3 V3 KE, glavna slika |
| detailPanel | thumbAlt2 | Slika 2 |
| detailPanel | thumbAlt3 | Slika 3 |
| detailPanel | thumbAlt4 | Slika 4 |
| detailPanel | price | 550 KM |
| detailPanel | title | Creality Ender-3 V3 KE 3D printer |
| detailPanel | factCity | Livno |
| detailPanel | factCondition | Korišteno |
| detailPanel | factDate | Danas |
| detailPanel | factPickup | Lično preuzimanje |
| detailPanel | descriptionLabel | Opis |
| detailPanel | description | Printer je korišten oko 6 mjeseci. Nova mlaznica, 3 rezervne i 2 kg PLA filamenta. Radi bez problema, prodajem jer sam uzeo veći. |
| detailPanel | sellerInitials | MK |
| detailPanel | sellerName | Marko K. |
| detailPanel | sellerMeta | Na OLX-u od 2019 · 42 oglasa · Livno |
| detailPanel | openOnOlx | Otvori na OLX |
| detailPanel | askAbout | Pitaj o oglasu |
| composer | label | Poruka |
| composer | placeholder | Pitaj dalje… |
| composer | attachLabel | Dodaj slike |
| composer | sourceOlx | OLX.ba |
| composer | sourceSvex | SVEX.ba |
| composer | model | Sonnet 5.5 |
| composer | sendLabel | Pošalji |
| header | newChat | Novi razgovor |
| header | myListings | Moji oglasi |
| header | settingsLabel | Postavke |
| header | statusLabel | Status veza |


### SellPhotos

| Component | Text (exact) | Key |
|---|---|---|
| User bubble | Prodajem svoj Ender-3 V3 KE | `sell.photos.userMessage` |
| Intro | Super! Pošalji mi nekoliko slika, a ja ću napisati oglas. | `sell.photos.intro` |
| Card title | Slike oglasa | `sell.photos.title` |
| Steps aria | Koraci objave | `sell.steps.aria` |
| Dropzone | Prevuci slike ovdje ili | `sell.photos.dropPrefix` |
| Dropzone link | odaberi | `sell.photos.dropPick` |
| Dropzone hint | Do 10 slika · JPG, PNG, HEIC · prva je naslovna | `sell.photos.dropHint` |
| Grid aria | Slike, povuci za redoslijed | `sell.photos.gridAria` |
| Tile alt | Slika {n} | `sell.photos.tileAlt` |
| Cover badge | Naslovna | `sell.photos.cover` |
| Remove aria | Ukloni sliku {n} | `sell.photos.removeAria` |
| Grip aria | Povuci za promjenu redoslijeda | `sell.photos.gripAria` |
| Progress | 72% / 28% | `sell.photos.progress` ({percent}%) |
| Footer hint | Dodirni sliku za naslovnu · povuci [grip] za redoslijed | `sell.photos.footerHint` |
| Button | Napravi nacrt | `sell.photos.makeDraft` |


### SellDraft

| Component | Text (exact) | Key |
|---|---|---|
| Intro | Napisao sam nacrt na osnovu slika i sličnih oglasa. Promijeni šta god želiš. | `sell.draft.intro` |
| Card title | Nacrt oglasa | `sell.draft.title` |
| Cover alt | Naslovna slika | `sell.draft.coverAlt` |
| Caption | 5 slika · | `sell.draft.photoCount` ({count} slika) |
| Link | uredi | `sell.draft.editPhotos` |
| Label | Naslov | `sell.draft.field.title` |
| AI tag | AI | `sell.draft.aiTag` |
| Value (sample) | Creality Ender-3 V3 KE 3D printer + 3 mlaznice | `sell.draft.sample.title` |
| Label | Cijena | `sell.draft.field.price` |
| Suffix | KM | `sell.draft.currency` |
| Hint | Prijedlog: 520 – 600 KM · medijan 560 KM (18 oglasa) | `sell.draft.priceHint` |
| Label | Kategorija | `sell.draft.field.category` |
| Option | Kompjuteri › 3D printeri | `sell.draft.sample.category` |
| Label | Stanje | `sell.draft.field.condition` |
| Radio | Novo | `sell.draft.condition.new` |
| Radio | Kao novo | `sell.draft.condition.likeNew` |
| Radio | Korišteno | `sell.draft.condition.used` |
| Radio | Oštećeno | `sell.draft.condition.damaged` |
| Label | Grad | `sell.draft.field.city` |
| Value | Livno | `sell.draft.sample.city` |
| Label | Dostava | `sell.draft.field.delivery` |
| Toggle | Lično preuzimanje | `sell.draft.delivery.pickup` |
| Toggle | Besplatna dostava | `sell.draft.delivery.free` |
| Toggle sub | Samo SVEX | `sell.draft.delivery.freeNote` |
| Label | Opis | `sell.draft.field.description` |
| Value | Printer korišten oko 6 mjeseci. Nova mlaznica, 3 rezervne i 2 kg PLA filamenta. Radi bez problema. | `sell.draft.sample.description` |
| Label | Gdje objaviti | `sell.draft.target.label` |
| Radio | OLX / SVEX / Oba | `sell.draft.target.olx` / `.svex` / `.both` |
| Banner | Dostavu uključi u OLX aplikaciji. API ne može postaviti dostavu. | `sell.draft.olxDeliveryWarning` |
| Button | Odbaci | `sell.draft.discard` |
| Button | Pregledaj prije objave | `sell.draft.review` |


### SellApprove

| Component | Text (exact) | Key |
|---|---|---|
| Intro | Sve je spremno. Ovo je tačno ono što šaljem: | `sell.approve.intro` |
| Dialog title | Objaviti? | `sell.approve.title` |
| Dialog subtitle | Provjeri tačno šta ide na svaki sajt. Ništa se ne objavljuje bez tvog odobrenja. | `sell.approve.subtitle` |
| Thumb alt | Slika {n} | `sell.approve.thumbAlt` |
| Card head | ide ovo: | `sell.approve.cardHead` |
| Row | Naslov | `sell.approve.row.title` |
| Row | Cijena | `sell.approve.row.price` |
| Row | Stanje | `sell.approve.row.condition` |
| Row | Grad | `sell.approve.row.city` |
| Row | Slike | `sell.approve.row.photos` |
| Row | Kategorija | `sell.approve.row.category` |
| Row | Dostava | `sell.approve.row.delivery` |
| Value | 560 KM | `sell.approve.value.price` |
| Value | Korišteno | `sell.approve.value.condition` |
| Value | Livno | `sell.approve.value.city` |
| Value | 5 (naslovna: 1.) | `sell.approve.value.photos` |
| Value OLX | Kompjuteri › 3D printeri | `sell.approve.value.categoryOlx` |
| Value SVEX | Računari › Printeri | `sell.approve.value.categorySvex` |
| Value OLX | Nije postavljena | `sell.approve.value.deliveryOlx` |
| Value SVEX | Lično preuzimanje | `sell.approve.value.deliverySvex` |
| Value | Creality Ender-3 V3 KE 3D printer + 3 mlaznice | `sell.approve.value.title` |
| Note OLX | Dostavu uključi u OLX aplikaciji. API ne može postaviti dostavu. | `sell.approve.olxDeliveryWarning` |
| Button | Otkaži | `sell.approve.cancel` |
| Button | Uredi | `sell.approve.edit` |
| Button | Objavi na OLX i SVEX | `sell.approve.publish` |
| Annotation | Nakon klika na Objavi: | `sell.approve.afterClickLabel` (design note) |
| Progress title | Objavljujem… | `sell.publish.title` |
| Status | Objavljeno | `sell.publish.done` |
| Status | Šaljem slike 3 / 5 | `sell.publish.sending` ({sent} / {total}) |


### SellSuccess

| Component | Text (exact) | Key |
|---|---|---|
| Hero mascot aria | Maskota slavi | `sell.success.mascotAria` |
| Hero title | Oglas je objavljen! | `sell.success.title` |
| Hero subtitle | Creality Ender-3 V3 KE · 560 KM | `sell.success.subtitle` ({title} · {price}) |
| Button | Otvori na OLX | `sell.success.openOlx` |
| Button | Otvori na SVEX | `sell.success.openSvex` |
| Button | Kopiraj linkove | `sell.success.copyLinks` |
| Partial title | Djelimično objavljeno | `sell.partial.title` |
| Partial text | OLX je objavio oglas. SVEX je vratio grešku 503 (sajt ne radi). | `sell.partial.text` |
| Status | Objavljeno | `sell.partial.done` |
| Status | Nije uspjelo | `sell.partial.failed` |
| Button | Pokušaj ponovo na SVEX | `sell.partial.retrySvex` |
| Platform | OLX / SVEX | `sell.partial.olx` / `sell.partial.svex` |


### MyListings


| Key | Text |
|---|---|
| header.homeAria | Početna |
| header.newChat | Novi razgovor |
| header.statusAria | Status veza |
| header.openRouter | OpenRouter |
| header.olx | OLX |
| header.svex | SVEX |
| header.model | Sonnet 5.5 |
| header.myListings | Moji oglasi |
| header.settingsAria | Postavke |
| page.title | Moji oglasi |
| page.subtitle | OLX i SVEX na jednom mjestu |
| page.filterOlx | OLX |
| page.filterSvex | SVEX |
| page.newListing | Novi oglas |
| tabs.aria | Status |
| tabs.all | Svi |
| tabs.active | Aktivni |
| tabs.drafts | Skice |
| tabs.hidden | Skriveni |
| tabs.sold | Prodani |
| tabs.expired | Istekli |
| status.active | Aktivan |
| status.hidden | Skriven |
| status.expired | Istekao |
| status.draft | Skica |
| status.sold | Prodano |
| row.badgeFormat | {OLX\|SVEX} · {status} |
| row.views | {n} pregleda |
| row.viewsExpires | 214 pregleda · ističe za 24 d |
| row.expiredAgo | Istekao prije 2 d |
| row.notPublished | Nije objavljeno |
| row.soldOn | Prodano 3. 11. |
| row.priceUnit | KM |
| row.actionSold | Prodano |
| row.actionShowSvex | Prikaži na SVEX |
| row.actionRenew | Obnovi |
| row.actionContinue | Nastavi |
| row.moreAria | Više radnji |
| row.deleteAria | Obriši |
| menu.renew | Obnovi oglas |
| menu.hide | Sakrij |
| menu.markSold | Označi kao prodano |
| menu.changePrice | Promijeni cijenu |
| menu.delete | Obriši… |
| priceEdit.label | Nova cijena |
| priceEdit.save | Spremi |
| priceEdit.cancelAria | Odustani |
| deleteDialog.title | Obrisati „{title}“? (example: Obrisati „Monitor Dell 27"“?) |
| deleteDialog.body | Oglas se briše na OLX i SVEX. Ovo se ne može vratiti. |
| deleteDialog.cancel | Odustani |
| deleteDialog.confirm | Obriši s oba sajta |
| sample.titles | Creality Ender-3 V3 KE 3D printer + 3 mlaznice; Sony WH-1000XM4 slušalice; Ender 3 Pro, rezervni dijelovi; iPhone 13, 128 GB, plavi; Monitor Dell 27" |


### Connect


| Key | Text |
|---|---|
| header.* | same as MyListings (header.newChat "Novi razgovor", header.myListings "Moji oglasi", header.settingsAria "Postavke") |
| header.notConnected | " · nije povezan" |
| connect.cap1 | 1 · Kartica na praznom ekranu |
| connect.cap2 | 2 · Povratak s OpenRoutera |
| connect.cap3 | 3 · Zalijepi ključ (rezerva) |
| connect.cap4 | 4 · OLX prijava |
| connect.cap5 | 5 · SVEX prijava |
| connect.cap6 | 6 · Povezani računi |
| connect.cap7 | 7 · Šta čuvamo? (panel, otvara se kao Postavke) |
| card.title | Poveži OpenRouter |
| card.body | Treba nam za AI. Plaćaš direktno OpenRouteru, mi ne vidimo ništa. |
| card.connectButton | Poveži preko OpenRoutera |
| card.pasteKeyButton | Imam ključ – zalijepi ga |
| card.footnote | Sigurna prijava (PKCE). Vraćamo te ovdje nakon odobrenja. |
| callback.mascotAlt | Maskota razmišlja |
| callback.title | Povezujem… |
| callback.body | Provjeravam ključ s OpenRouterom. Ovo traje par sekundi. |
| keyDialog.title | Zalijepi OpenRouter ključ |
| keyDialog.closeAria | Zatvori |
| keyDialog.label | API ključ |
| keyDialog.sample | sk-or-v1-xxxxxxxxxxxxxxxx |
| keyDialog.localNote | Ključ ostaje samo u ovom pregledniku. |
| keyDialog.error401 | Ključ ne radi (401). Provjeri da li si ga kopirao cijelog. |
| keyDialog.cancel | Odustani |
| keyDialog.save | Spremi |
| login.title | Prijava na OLX / Prijava na SVEX |
| login.userLabel | Korisničko ime ili email |
| login.passLabel | Lozinka |
| login.noteOlx | Lozinka ide samo do OLX-a, ne čuvamo je. |
| login.noteSvex | Lozinka ide samo do SVEX-a, ne čuvamo je. |
| login.cancel | Odustani |
| login.submit | Prijavi se |
| accounts.title | Povezani računi |
| accounts.openRouterDetail | sk-or-…a91f · kredit $4.20 |
| accounts.olxDetail | filip.m · prijavljen 12. 11. |
| accounts.svexDetail | Nije povezan |
| accounts.disconnect | Odspoji |
| accounts.connect | Poveži |
| privacy.title | Šta čuvamo? |
| privacy.closeAria | Zatvori panel |
| privacy.lead | Kratko: skoro ništa. Sve što pamtimo stoji u tvom pregledniku. |
| privacy.keyTitle | OpenRouter ključ |
| privacy.keyBody | U ovom pregledniku (localStorage). Nikad ne ide na naš server. |
| privacy.loginTitle | OLX i SVEX prijava |
| privacy.loginBody | Čuvamo samo sesiju u pregledniku. Lozinku ne čuvamo nigdje. |
| privacy.chatsTitle | Razgovori i nacrti |
| privacy.chatsBody | U ovom pregledniku. Obriši ih u Postavkama. |
| privacy.proxyTitle | Proxy |
| privacy.proxyBody | Prosljeđuje zahtjeve do OLX-a i SVEX-a. Ne piše logove i ništa ne čuva. |
| privacy.openTitle | Otvoreni kod |
| privacy.openBody | Svaki red možeš provjeriti. Verzija na sajtu: commit a1b2c3d. |
| privacy.sourceButton | Izvorni kod |
| privacy.deleteAll | Obriši sve podatke |


### Settings


| Key | Text |
|---|---|
| header.* | same as MyListings |
| chat.userMessage | Nađi nešto ovakvo ispod 700 KM |
| chat.toolLine | Pretražio OLX · SVEX |
| chat.resultOlx | OLX 12 oglasa |
| chat.resultSvex | SVEX 3 oglasa |
| card.bestOffer | Najbolja ponuda |
| card.sold | PRODANO |
| card.noImage | Nema slike |
| card.conditionUsed | Korišteno |
| card.conditionNew | Novo |
| card.conditionLikeNew | Kao novo |
| card.dateToday | Danas |
| card.dateYesterday | Jučer |
| card.dateDays | 3 dana / 5 dana |
| card.dateWeeks | 1 sedm. / 2 sedm. |
| composer.label | Poruka |
| composer.placeholder | Pitaj dalje… |
| composer.addImagesAria | Dodaj slike |
| composer.sourceOlx | OLX.ba |
| composer.sourceSvex | SVEX.ba |
| composer.model | Sonnet 5.5 |
| composer.sendAria | Pošalji |
| settings.title | Postavke |
| settings.closeAria | Zatvori panel |
| settings.modelHeading | AI model |
| settings.modelSonnet | Claude Sonnet 5.5 |
| settings.modelSonnetDesc | Preporučeno · najbolji za pretragu i oglase |
| settings.modelDeepseek | DeepSeek |
| settings.modelDeepseekDesc | Najjeftiniji · dobar za jednostavna pitanja |
| settings.modelOther | Drugi model |
| settings.modelOtherDesc | Bilo koji model s OpenRoutera |
| settings.modelIdAria | ID modela s OpenRoutera |
| settings.modelIdPlaceholder | npr. google/gemini-2.5-flash |
| settings.appearanceHeading | Izgled |
| settings.language | Jezik |
| settings.languageValue | Bosanski |
| settings.languageNote | Hrvatski, srpski i engleski stižu uskoro. |
| settings.theme | Tema |
| settings.themeSystem | Kao sistem |
| settings.themeLight | Svijetla |
| settings.themeDark | Tamna |
| settings.accountsHeading | Računi |
| settings.accountsRow | OpenRouter, OLX i SVEX |
| settings.accountsValue | Povezano 2 od 3 |
| settings.privacyHeading | Privatnost |
| settings.deleteAll | Obriši sve podatke |
| settings.deleteAllNote | Briše ključ, prijave, razgovore i nacrte iz ovog preglednika. |
| settings.aboutHeading | O aplikaciji |
| settings.openSource | Otvoreni kod |
| settings.openSourceValue | GitHub |
| settings.version | Verzija |
| settings.versionValue | v0.4.2 · a1b2c3d |
| settings.whatWeStore | Šta čuvamo? |


### States


| key | text |
|---|---|
| header.home | Početna |
| header.newChat | Novi razgovor |
| header.myListings | Moji oglasi |
| header.settings | Postavke |
| header.model | Sonnet 5.5 |
| status.label | Status veza |
| status.openRouter | OpenRouter |
| status.openRouterNote | · malo kredita |
| status.olx | OLX |
| status.svex | SVEX |
| status.svexNote | · ne radi |
| banner.offline | Nisi na internetu. Poruke šaljem kad se veza vrati. |
| banner.svexDown | SVEX trenutno ne radi. Tražim samo na OLX-u. |
| banner.svexDownAction | Status |
| banner.lowCredit | OpenRouter: ostalo je $0.40 kredita. |
| banner.lowCreditAction | Dopuni |
| banner.svexPartial | SVEX nije odgovorio. Prikazujem samo OLX rezultate. |
| banner.retry | Pokušaj ponovo |
| mascot.calm | Mirno |
| mascot.sleeping | Spava (nema ključa) |
| mascot.thinking | Razmišlja |
| mascot.searching | Traži |
| mascot.found | Našao |
| mascot.notFound | Ništa nije našao |
| mascot.error | Greška |
| mascot.celebrate | Slavi objavu |
| mascot.notFoundAria | Maskota: ništa nije našao |
| error.401.title | Ključ ne radi |
| error.401.badge | 401 |
| error.401.body | OpenRouter ne prihvata ovaj ključ. Možda je obrisan. |
| error.401.action | Zalijepi novi ključ |
| error.402.title | Nema kredita |
| error.402.badge | 402 |
| error.402.body | Na OpenRouter računu nema više kredita. |
| error.402.action | Dopuni na OpenRouteru |
| error.network.title | Nema veze |
| error.network.badge | MREŽA |
| error.network.body | Poruka nije poslana. Pokušaću ponovo kad se veza vrati. |
| error.network.action | Pokušaj ponovo |
| empty.title | Ništa nisam našao |
| empty.body | Nema oglasa za „Prusa MK4“ ispod 400 KM. |
| empty.raisePrice | Povećaj cijenu |
| empty.notify | Javi mi kad se pojavi |
| card.noImage | Nema slike |
| card.unavailableBadge | NEDOSTUPNO |
| card.removed | Oglas je uklonjen |
| toast.copied | Kopirano u međuspremnik |
| toast.sold | Oglas označen kao prodan |
| toast.undo | Poništi |
| toast.olxExpired | OLX sesija je istekla |
| toast.signIn | Prijavi se |
| drop.title | Pusti slike bilo gdje |
| drop.sub | Dodaću ih u poruku |
| thinking.aria | Razmišljam |
| btn.send | Pošalji |
| btn.stop | Zaustavi |
| btn.scrollBottom | Skroluj na dno |
| section labels | Maskota · 8 stanja; Greška 401 · pogrešan ključ; Greška 402 · nema kredita; Mreža ne radi; Prazni i djelimični rezultati; Stanja kartice: učitavanje, bez slike, nedostupno; Toast poruke; Pusti slike bilo gdje · Razmišljam; Dugmad i stanja |
| legend (spec only) | Normalno; Hover; Pritisnuto; Pošalji → Zaustavi dok AI piše; Hover: svjetlije +12 %; Pritisak: 97 %; Skrol na dno |


### Phones


| key | text |
|---|---|
| phone.header.home | Početna |
| phone.header.statusAll | Sve veze rade |
| phone.header.model | Sonnet 5.5 |
| phone.header.newChat | Novi razgovor |
| phone.header.settings | Postavke |
| chat.userMsg | Ender printer ispod 700 KM |
| chat.toolLine | Pretražio OLX · SVEX · 15 oglasa |
| chat.answer | Najbolja ponuda je <strong>KE za 550 KM</strong> u Livnu. Prevuci za još oglasa. |
| chat.onlyV3 | Samo V3 |
| chat.sort | Sortiraj |
| card.price1 | 550 KM |
| card.title1 | Ender-3 V3 KE |
| card.source1 | OLX · Livno |
| card.price2 | 400 KM |
| card.title2 | Ender 3 Pro |
| card.source2 | SVEX · Bihać |
| card.price3 | 625 KM |
| card.title3 | Ender-3 V3 SE |
| card.source3 | SVEX · Lukavac |
| composer.label | Poruka |
| composer.placeholderFollowUp | Pitaj dalje… |
| composer.placeholderBudget | Do 600 KM, Livno ili Tomislavgrad |
| composer.attach | Dodaj slike |
| composer.send | Pošalji |
| ai.askBudget | Koliko želiš potrošiti? Mogu tražiti i u drugim gradovima. |
| sheet.aria | Detalji oglasa |
| sheet.dragHint | Prevuci dolje za zatvaranje |
| sheet.title | Creality Ender-3 V3 KE 3D printer |
| sheet.price | 550 KM |
| sheet.chipPlace | Livno |
| sheet.chipCondition | Korišteno |
| sheet.chipDate | Danas |
| sheet.desc | Korišten 6 mjeseci. Nova mlaznica, 3 rezervne i 2 kg PLA filamenta. |
| sheet.sellerName | Marko K. |
| sheet.sellerMeta | Na OLX-u od 2019 |
| sheet.openOlx | Otvori na OLX |
| keyboard.space | razmak |
| keyboard.send | pošalji |
| captions | Chat · kartice u vodoravnom redu; Detalji · donji sheet; Unos iznad tastature |


## 6. Gaps

Compared with `apps/shop/src` (routes: `index.tsx`, `__root.tsx` only; components: `Chat`, `ConnectControls`, `ListingApproval`, `ListingCards`, `PixelMascot`, `ui/*`, `ai-elements/*`; agent tools: `search_listings`, `create_listing`, `list_my_listings`).

### 6.1 The app needs this and the design does not show it

1. Light theme and `prefers-color-scheme`: the canvas is dark only (the approval card is a light card inside the dark page).
2. Model list: the picker shows only "Sonnet 5.5". The popup (listbox), its search, price per model and a "model not available" state are not drawn. The app has `ModelPicker` with a `Select`.
3. Real keyboard and focus order: no focus trap for dialogs, no Escape, no `aria-live` for the streaming answer, no skip link. Add them.
4. Streaming states of the assistant message: stop button, "regenerate", copy, error inside a message, tool-call error per provider ("Nije uspjelo na:" in `strings.ts`) are not drawn except in States (check States 2.6).
5. Disabled and busy states for the composer (not connected, sending, offline). Main defines no disabled style.
6. OpenRouter error texts (`errorBadKey`, `errorNoCredits`, `errorGeneric`, `sessionExpired`, `notConnected`, `loginFailed`, `accountFailed`): map each to a States error card variant and confirm the copy.
7. Photo limits and errors: file type, size, count, the `shrinkImage` step, a failed upload per photo. SellPhotos shows only the happy path and a dropzone.
8. Phone version of the sell flow, My listings, Connect and Settings: Phones has 3 screens only (chat, detail sheet, keyboard) and no media queries. Define the breakpoint (suggest 640px) and the phone layout for the other screens.
9. Header on phone: the canvas hides "Moji oglasi"; add a menu or a place for it.
10. Routing and URLs: the app has one route. Add routes for chat, listing detail (panel as route state or `?listing=`), `/prodaja` steps, `/moji-oglasi`, `/postavke`. Back button behaviour for the panel and the sheet is not drawn.
11. Empty states of My listings (no account, no listing), and the SVEX case: the tool `list_my_listings` says "SVEX is not supported".
12. Internationalisation of numbers and dates: "550 KM", "Danas", relative dates. Define the formatter (`Intl` with `bs`).
13. Version string "v0.4.2 · a1b2c3d" in the footer: define the build-time source (package version and git short hash).

### 6.2 The design shows this and the app has no data for it yet

1. Detail panel: seller name, avatar initials, "Na OLX-u od 2019", date "Danas", image gallery (more than one image), full description. `search_listings` results may not carry these fields: check the provider types.
2. Price-check card ("Koliko vrijedi ..."): needs a market-price source (median, range, count). The agent has no tool for it.
3. Filter bar, sort ("Sortiraj"), "Samo V3" quick actions and "Prikaži još" (pagination): the search tool has no filter, sort or page parameters in the app.
4. Per-provider loading progress ("SVEX 60%"): the tool has no progress events.
5. Result card states (best offer border, unavailable with grayscale): need a "best" flag and an availability flag.
6. Source toggles (OLX.ba / SVEX.ba) in the composer: the app has no per-message provider selection.
7. My listings: status tabs (active, hidden, sold, expired), views and favourites counts, row actions (edit price inline, hide, refresh, delete with confirm): the app has only `list_my_listings` (active, OLX only). Needs update, hide, refresh and delete calls (the OLX MCP shows that the API supports them).
8. Draft card with editable fields and category select: needs a category list and a category suggestion (OLX `suggest_category`), plus the "Gdje objaviti" (OLX, SVEX) and "Dostava" fields. The app approval card has title, price, condition, city, delivery, description and photos only.
9. Publish progress with per-provider steps and a partial-failure card (published on OLX, failed on SVEX, retry): `publishListing` is an async generator; confirm that it yields per-provider results, and add a retry for one provider.
10. Success card: link to the listing on each provider, "Dodaj još jedan" style actions: the data is available from the publish result; check the URL field.
11. Connected accounts card and "Šta čuvamo?" privacy panel: need the stored session facts per provider (name, expiry). `sessions.ts` has `getSession`; the name and the expiry date must be stored.
12. Settings panel content (see Settings part): which settings exist is not decided (model, language, clear data, disconnect). The app has no settings store.
13. Chat history ("Novi razgovor", past chats): the header has "Novi razgovor" but no list of old chats is drawn. The app has no persistence of chats.
14. Mascot states (8 in States): the app has `PixelMascot` (pixel art, `Silkscreen` era). Replace it with the SVG mascot from the canvas and map each state to an app event (sleeping = OpenRouter not connected, and so on).
15. Horizon background (animated dithered sun): new. It runs a 120 ms timer: use CSS or `requestAnimationFrame` with a pause when the tab is hidden, and keep the reduced-motion rule.

### 6.3 Top 10 gaps (priority)

1. Routes and pages for My listings, Settings, Sell steps and Detail do not exist (one route only).
2. Scroll model: the canvas scrolls the page; the user rules require a fixed shell with per-region scroll and a pinned composer. Settings board has two scrollbars (design error).
3. No phone layout for 4 of 7 screens, and no breakpoint (Phones has no media queries).
4. Fonts: the app uses Nunito and Silkscreen; the canvas uses Inter (SF stack). Needs `@fontsource-variable/inter` with `latin-ext`.
5. Listing detail data (seller, gallery, date, full description) is not in the search result.
6. Price check has no data source or tool.
7. My listings needs edit, hide, refresh, delete and status data; the app has only an active-list tool for OLX.
8. Publish flow: category select, "Gdje objaviti", partial failure and per-provider retry are not in the app.
9. Rename to trgo: strings, mascot name, package and repo names (see section 0).
10. Disabled, busy, offline, light-theme and `aria-live` states are not defined anywhere in the canvas.

## 7. Rendered PNGs

Not produced. Each `.dc.html` needs the canvas runtime (`artifact-type/dc-runtime.js`, not saved: out of scope), and the canvas page needs a claude.ai login. No screenshot was taken.

## 8. Notes on how the files were saved

- All 12 artboards and `canvas.json` match the artifact `sha256` values (checked with `sha256sum`).
- All 5 assets are missing (see `assets/MANIFEST.md`).
