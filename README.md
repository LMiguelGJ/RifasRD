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
(revcomps.com). The ten converted WebP files in `public/demo/rev/` ship with
this demo so the catalog works in Docker deployments. Originals and research in
`.lab/revcomps/` remain excluded. These reference photos carry that site's branding;
**replace them with the client's own or licensed photos before commercial use**. The original
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

The Laravel backend lives in `backend/` and is served by the same container as this
frontend (see [docs/BACKEND-HANDOVER.md](docs/BACKEND-HANDOVER.md) for the API contract).
`src/environments/environment.ts` points at the same-origin API (`useMock: false`,
`apiUrl: ''`). Set `useMock: true` to run the static demo without any backend.

## Deploy

One container ships everything: Angular SPA + Laravel API + Filament panel + Postgres.
Build with the root `Dockerfile` (`docker build -t rifasrd .`), run with
```sh
docker run -p 8080:8080 \
  -v rifasrd-data:/var/lib/postgresql \
  -v rifasrd-vouchers:/var/www/html/storage/app/private \
  -v rifasrd-uploads:/var/www/html/storage/app/public \
  rifasrd
```

Mount all three named volumes in Dokploy as well. The private volume holds vouchers;
the public volume holds photos uploaded through the panel. Without those mounts,
replacing a container loses uploaded files. Preserve existing database volumes and
use stop-first updates: two containers must never share the database volume concurrently.

- Site: `/` · API: `/api` · Admin panel: `/admin` · Health: `/healthz`
- Runtime env (optional): `ADMIN_EMAIL`, `ADMIN_PASSWORD` (panel login), `MAIL_*`
  (SMTP; defaults to log), `TURNSTILE_SECRET_KEY` (else the math captcha is used),
  `APP_KEY` and `DB_PASSWORD` (auto-generated and persisted if omitted).
- Boot runs migrations. The demo catalog (12 raffles, 7 fake banks) is seeded once,
  tracked by `demo_catalog_seeded`; later deployments preserve operator edits.
- In **Rifas → Editar**, **Foto actual** previews the saved image; **Cambiar foto**
  replaces it when saved. The preview refreshes immediately after saving.
- On phones, secondary table columns are hidden and summaries remain under the
  main label. Row actions use touch-sized icons; tapping an order row opens it.

Demo catalog photos in `public/demo/rev/` are included in Git and Docker builds.

## Notes

- Styles follow a token-based design system (`src/styles/tokens.css`). Icons are inline SVG.
- The brand name and logo belong to Rifas Luxury RD and are used here with the owner's authorization.
- `docs/reference/` holds the captured states of the original site used as a visual reference.
