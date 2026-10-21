# Design

Visual system of the Rev-style restyle. Written from the built world after T7
(commits af46e2d..5dccd50 on `feat/rev-restyle`). Product truth: PRODUCT.md.

## World

"Race ticket": a light canvas where black ticket-shaped cards float like printed
tickets. The energy comes from the products (the photos) and two loud accents,
not from decoration. Reference language: revcomps.com (structure only, no assets).

## Color

| Token | Value | Role |
|---|---|---|
| `--canvas` | `#f1f1ef` | Page ground |
| `--ink` | `#0a0a0b` | Cards, bars, modal sheets |
| `--ink-2` / `--ink-3` | `#141417` / `#1e1e22` | Nested ink surfaces, meters |
| `--red` | `#c8260c` | **Action only**: fills behind white text |
| `--red-hover` | `#e02d10` | Action hover |
| `--gold` | `#facc3b` | Urgency and winners, on ink |
| `--on-ink` / `--on-ink-muted` | `#f6f6f7` / `#b7b7bf` | Text on ink |
| `--on-canvas` / `--on-canvas-muted` | `#101012` / `#55555c` | Text on canvas |

Rules: red is a fill, never text; gold is text/fill on ink only (black text when
gold is the fill); errors use tinted backgrounds (`--err-*`), never bare red, so
an error is never confused with the brand. One theme only: no light/dark toggle.

## Type

Rubik (`@fontsource/rubik`, self-hosted): 700/800 uppercase for titles, prices,
labels and buttons; 400/500 sentence case for prose and help text. Numbers use
tabular figures (`font-variant-numeric: tabular-nums`) in prices, countdowns and
ticket numbers. Letter-spacing: 0.03–0.12em on uppercase labels only.

## Shape and depth

Cards and sheets: 14–18px radius (`--r-card` 14px, sheets 18px). Controls: 10px
(`--r-ctl`), pills 999px. Depth is one soft drop (`--shadow-card`, `--shadow-sheet`),
never a hard offset. No gradients as decoration, no glow, no glass.

## The ticket card (home)

1. Photo, square, with two pills on top: `MÍN. n BOLETOS` (left-bottom, ink pill)
   and `RD$ n c/u` (right-top, red fill). Closed raffles get a `FINALIZADO`/
   `AGOTADO` stamp rotated -8deg over a grayscale photo.
2. **Perforation**: a dashed rule with a half-circle bite of canvas on each edge
   (`card__perf`). This is the signature of the system.
3. Urgency strip: gold fill + clock countdown when the draw is <24h
   (`strip--today`), gold text when <72h (`strip--soon`), muted ink otherwise;
   sold/finalized strips stay muted.
4. Meter: 28px bar, red fill at the sold percentage, label `n% VENDIDO` centered
   on top (white on red, muted on ink).
5. Body: 2-line clamped uppercase title, optional prize-number chips (gold when
   claimed: struck through + `YA SALIÓ`), `Ver detalles` text button, and one
   full-width `PARTICIPAR` button (44px, red fill). Sold-out/finalized disable it.

Grid: 2 / 4 / 6 columns at <860 / ≥860 / ≥1280, gap 0.75–1rem, container
`--container` 1360px so six columns stay ≥180px.

## Header (three layers)

1. Promo ribbon: red fill, white uppercase link ("Sorteos en vivo por Instagram").
   Scrolls away.
2. Slim bar (the only sticky layer, 68px): logo left, uppercase nav right, red
   outline pill for "Verificar boleto". Underline-on-hover via red inset shadow.
3. Category tabs on ink-2: active tab white with 3px red underline.

## Forms and modals

Ink sheets, centered, 18px radius. Fields are ink-3 boxes with strong hairline
borders; invalid fields switch to the error tint. Primary buttons are red fills
(`btn-confirm`, `btn`); secondary are ink-3 outlines. The package picker rows are
ticket-shaped (quantity big left, price right, radio ring red when selected).
Success screen: green check, gold "PENDIENTE DE VALIDACIÓN" pill, white QR plate.

## Browser surfaces

Focus ring: 2px white outline + 4px ink halo. `::selection` red on white.
Scrollbar: red thumb on ink track. intl-tel-input dropdown themed from
`--iti-*` variables on ink.

## Motion

One system: 0.18s ease-out color/background transitions, 0.22–0.28s
cubic-bezier(.22,1,.36,1) for card lift and drawer slide, 0.5s for meter fill,
linear spinners. Nothing decorative moves on its own. `prefers-reduced-motion`
kills all animation durations (global.css).

## Anti-reference (what the old world had, deliberately removed)

Gradient text, glow orbs, falling icons, glass bars, rotating conic borders,
emoji as icons, theme toggle, `data-theme` branches, Poppins.
