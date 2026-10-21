# Rifas Luxury RD: static demo

A fully working, static copy of the raffle storefront. It is built with the same
stack as the production site (Angular 19, TypeScript, Bootstrap CSS, Rubik, PWA)
and keeps all data behind one API layer, so a real backend can be connected later by
changing configuration only.

## Run it

```bash
npm install
npm start          # http://localhost:4200
npm run build      # static files in dist/rifas-luxury-demo/browser
npm test           # unit tests (needs Chrome; set CHROME_BIN if it is not on PATH)
```

## What works

Everything a customer can do on the live site, against realistic mock data:

- Home with a dense raffle grid (ticket-shaped cards), category tabs, prize-number
  boards, urgency strips, sold-percentage meters, winners and image viewers.
- "PARTICIPAR" checkout: packages or free quantity, bank selection, receipt upload with
  preview, Turnstile-style check, validation messages, success screen with QR and
  personal link.
- Ticket checker (`/verificar`) by phone or ticket number, with masked personal data.
- Personal order page (`/:customerSlug/:token`).
- Installable PWA, maintenance page (`/mantenimiento`).

## Visual identity

The demo uses the "race ticket" visual system: a light canvas with black ticket-shaped
cards, red as the action colour (fills behind white text only), gold for urgency and
winners, and Rubik throughout. There is a single theme (no light/dark toggle).

## Datos de ejemplo (demo data)

The 12 catalog raffles, their prices, ticket counts and sold percentages are
**example data** invented for the demo. Bank accounts are **fake**. Edit
`src/app/core/api/mock-data.ts` and `src/app/core/api/mock-raffles-extra.ts` to change
the catalog, winners or banks.

**Photo provenance.** The raffle photos come from a competitor website
(revcomps.com) and were captured for internal lab reference only. They live in
`public/demo/rev/` (converted webp, git-excluded) and `.lab/revcomps/` (originals and
listing data, also git-excluded). They carry that site's branding and must be
**replaced with the client's own photos before any public deployment**. The original
site's own assets in `public/demo/raffles/` are used here with the owner's
authorization.

## Demo behaviour

- Orders are stored in the browser (`localStorage`), so a purchase made in the checkout can be found
  afterwards in the ticket checker and through its personal link.
- An order shows **"Pendiente de validación"** and is **approved automatically after 20 seconds**,
  which assigns random ticket numbers. This stands in for the operator approving the payment.
- Reset the demo: `localStorage.removeItem('rifas-demo-orders')` in the browser console.
- Preview the maintenance page: `localStorage.setItem('rifas-demo-maintenance', '1')`
  (and `removeItem` to leave it).

## Project layout

```
src/app/
  core/api/        RifasApi (contract), MockRifasApi, HttpRifasApi, mock data, provider switch
  core/models/     TypeScript contracts shared by the UI and both APIs
  core/guards/     Maintenance guard
  core/utils/      Formatting and error helpers
  shell/           Promo ribbon, slim sticky bar, mobile drawer
  pages/home/      Category tabs, raffle grid (ticket cards), purchase modal, winners
  pages/verificar/ Ticket checker
  pages/order/     Personal order page
  pages/mantenimiento/
  shared/          Turnstile widget, pipes
src/styles/        tokens.css (design tokens), global.css, iti.css (phone input library)
src/environments/  environment.ts: the mock/backend switch
docs/              BACKEND-HANDOVER.md and the captured reference of the original site
```

## Connect a real backend

See [docs/BACKEND-HANDOVER.md](docs/BACKEND-HANDOVER.md): endpoints, payloads, business rules
and the three-step switch (`useMock: false`).

## Deploy

The build is a static folder. Host it anywhere that serves `index.html` for unknown paths
(single-page-app fallback). `public/_redirects` already does this for Netlify and Cloudflare Pages.
Replace the lab photos in `public/demo/rev/` before deploying publicly.

## Notes

- Styles follow a token-based design system (`src/styles/tokens.css`). Icons are inline SVG.
- The brand name and logo belong to Rifas Luxury RD and are used here with the owner's authorization.
- `docs/reference/` holds the captured states of the original site used as a visual reference.
