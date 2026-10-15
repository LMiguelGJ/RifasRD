# Rifas Luxury RD: static demo

A fully working, static copy of the raffle storefront. It is built with the same
stack as the production site (Angular 19, TypeScript, Bootstrap CSS, Poppins, PWA)
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

- Home with catalog, category filters, prize-number boards, countdowns, winners and image viewers.
- "JUGAR" checkout: packages or free quantity, bank selection, receipt upload with preview,
  Turnstile-style check, validation messages, success screen with QR and personal link.
- Ticket checker (`/verificar`) by phone or ticket number, with masked personal data.
- Personal order page (`/:customerSlug/:token`).
- Light and dark theme, responsive layout, installable PWA, maintenance page (`/mantenimiento`).

## Demo behaviour

- Orders are stored in the browser (`localStorage`), so a purchase made in the checkout can be found
  afterwards in the ticket checker and through its personal link.
- An order shows **"Pendiente de validación"** and is **approved automatically after 20 seconds**,
  which assigns random ticket numbers. This stands in for the operator approving the payment.
- Reset the demo: `localStorage.removeItem('rifas-demo-orders')` in the browser console.
- Preview the maintenance page: `localStorage.setItem('rifas-demo-maintenance', '1')`
  (and `removeItem` to leave it).
- Bank accounts are **fake**. Edit `src/app/core/api/mock-data.ts` to change catalog, winners or banks.

## Project layout

```
src/app/
  core/api/        RifasApi (contract), MockRifasApi, HttpRifasApi, mock data, provider switch
  core/models/     TypeScript contracts shared by the UI and both APIs
  core/guards/     Maintenance guard
  core/utils/      Formatting and error helpers
  shell/           Header, mobile drawer, theme toggle
  pages/home/      Catalog, winners, purchase modal (PurchaseFlow holds the checkout rules)
  pages/verificar/ Ticket checker
  pages/order/     Personal order page
  pages/mantenimiento/
  shared/          Turnstile widget, pipes
src/environments/  environment.ts: the mock/backend switch
docs/              BACKEND-HANDOVER.md and the captured reference of the original site
```

## Connect a real backend

See [docs/BACKEND-HANDOVER.md](docs/BACKEND-HANDOVER.md): endpoints, payloads, business rules
and the three-step switch (`useMock: false`).

## Deploy

The build is a static folder. Host it anywhere that serves `index.html` for unknown paths
(single-page-app fallback). `public/_redirects` already does this for Netlify and Cloudflare Pages.

## Notes

- Styles were ported from the compiled stylesheets of the original site, so the visual result matches it.
  Icons are inline SVG.
- The brand name, logo, copy and images belong to Rifas Luxury RD and are used here with the owner's authorization.
- `docs/reference/` holds the captured states of the original site used as a visual reference.
