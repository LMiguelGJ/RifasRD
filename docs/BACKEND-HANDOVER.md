# Backend handover

> **Status: implemented.** The contract below is served by the Laravel app in
> `backend/` (same container as the SPA, same origin). The admin panel is `/admin`
> (Filament): dashboard, orders with approve/reject, raffles, tickets, participants,
> bank accounts, winners, maintenance switch and users. This document remains the
> API reference; response shapes of `checkout`, `checkout/lookup` and `public/orders`
> are the ones to confirm first against real traffic.

The storefront never talks to a server directly. Every component asks the
`RifasApi` class (`src/app/core/api/rifas-api.ts`) for data, and two classes
implement it:

| Class | Used when | Where |
|---|---|---|
| `MockRifasApi` | `environment.useMock === true` (the demo) | `core/api/mock-rifas-api.ts` |
| `HttpRifasApi` | `environment.useMock === false` | `core/api/http-rifas-api.ts` |

## Connect a real backend in 3 steps

1. Implement the endpoints below.
2. In `src/environments/environment.ts` set `useMock: false`, `apiUrl: 'https://your-api.example.com'`
   and your Cloudflare `turnstileSiteKey`.
3. `npm run build`. No component changes are needed.

`HttpRifasApi` already sends every request described here. If a response shape
differs, adapt it **inside that one file**, not in the pages.

> **Provenance.** This contract was reconstructed from the production
> storefront's client code and its public `GET` responses. Response shapes of
> `checkout`, `checkout/lookup` and `public/orders` were inferred from how the
> client reads them; no real purchase was placed. Treat those three as the
> items to confirm first.

## Conventions

- Base path `/api`. JSON in and out (`Accept: application/json`), except checkout, which is `multipart/form-data`.
- Errors: HTTP 4xx/5xx with `{ "message": "text", "errors": { "field": ["text"] } }`.
  The UI shows `message`, or the first message in `errors`.
- Money is a decimal **string** (`"150.00"`). Dates are ISO-8601 UTC. The UI renders them in `America/Santo_Domingo`.
- Image URLs may be absolute (`https://…`) or same-origin paths (`/demo/raffles/a.webp`).
- Enable CORS for the storefront origin.

## Endpoints

### Catalog (public, read-only)

| Method and path | Response |
|---|---|
| `GET /api/categories` | `Category[]` |
| `GET /api/raffles?per_page=50&category_id=1&page=1` | `Paginated<Raffle>` (`current_page`, `data`, `last_page`, `per_page`, `total`); the catalog and checker follow subsequent pages with the same category filter |
| `GET /api/raffles/{id}` | `Raffle` (includes `ticket_combos`) |
| `GET /api/raffles/{id}/prize-numbers` | `PrizeNumber[]` (`status`: `available` or `claimed`) |
| `GET /api/winners/recent?limit=50&kind=main` | `Winner[]` (`kind=main` excludes instant-prize winners) |
| `GET /api/bank-accounts` | `BankAccount[]` |
| `GET /api/security/order-block` | `{ "blocked": false, "message": null }` |

When `blocked` is `true` every storefront page (home, `/verificar` and personal links)
redirects to `/mantenimiento`, which shows `message`. If this endpoint fails, the site stays open.

### Checkout

1. `POST /api/participants` with JSON `{ name, cedula, phone, email|null }` returns `{ "participant": { "id": 42 } }`.
2. `POST /api/raffles/{id}/checkout` as `multipart/form-data`:

| Field | Notes |
|---|---|
| `ticket_combo_id` **or** `quantity` | Package, or free quantity between `min_tickets_per_user` and `max_tickets_per_user` |
| `customer_name`, `phone`, `cedula`, `email` | `phone` is E.164 digits without `+` (e.g. `18095551234`). `cedula` is sent empty. `email` is optional |
| `participant_id` | From step 1 |
| `bank_account_id` | Chosen bank |
| `voucher` | File: `image/jpeg`, `image/png` or `application/pdf`, **max 10 MB** |
| `turnstile_token` | Cloudflare Turnstile token. Verify it server-side |
| `captcha_id`, `captcha_answer` | Legacy fallback, see below |
| `website` | **Honeypot.** Always empty from the UI. Reject non-empty values |

Response: the order (or `{ "order": {...} }` or `{ "data": {...} }`; all three are accepted):

```json
{
  "id": 1001,
  "status": "pending_validation",
  "total_amount": "150.00",
  "customer_name": "María Pérez",
  "tickets": [],
  "raffle_ticket_combo": { "quantity": 2 },
  "customer_slug": "maria-perez",
  "public_view_token": "24ff2e1236e45607a42ba6c0"
}
```

`customer_slug` + `public_view_token` build the customer's personal link
`/{customer_slug}/{public_view_token}`. Optionally return `public_view_url`.

**Captcha fallback.** If Turnstile cannot be used, answer `422` with
`errors.captcha_id` or `errors.captcha_answer`. The UI then loads
`GET /api/captcha` (`{ captcha_id, captcha_svg }`) and resubmits with the answer.

### Ticket checker

`POST /api/raffles/{id}/checkout/lookup` with `{ "phone": "8095551234" }` **or** `{ "ticket_number": "29041" }`:

```json
{
  "raffle": { "id": 20, "title": "…", "status": "active" },
  "orders": [
    { "id": 1001, "customer_name": "…", "email": "…", "phone": "…", "status": "validated",
      "created_at": "2026-10-15T20:23:07Z",
      "tickets": [ { "number": "29041", "status": "validated" } ] }
  ],
  "message": "optional text shown when orders is empty"
}
```

Phone lookup requires at least 10 normalized digits; short suffix searches return
`422` instead of searching customer records. Ticket-number searches return order
status, amount, timestamps and ticket numbers **without** customer name, email or
phone. Full-phone searches retain their customer fields; the UI masks contacts.
Personal order links remain token-based and separate from this public lookup.

### Personal order page

`GET /api/public/orders/{customer_slug}/{public_view_token}`:

```json
{
  "order_id": 1001, "customer_name": "María Pérez", "status": "validated",
  "validated_at": "2026-10-15T20:30:00Z", "total_amount": "150.00", "ticket_count": 2,
  "raffle": { "id": 20, "title": "…", "banner_image": "https://…" },
  "tickets": [ { "number": "29041" }, { "number": "59284" } ]
}
```

`ticket_numbers: string[]` is accepted instead of `tickets`. `404` shows "Enlace no válido".

## Order status values

`pending_validation` (payment under review), `confirmed`, `validated`, `paid`,
`sold`, `cancelled`, `expired`, `pending`. Unknown values are shown as-is.

## Business rules the server must enforce

The UI checks these for usability, but only the server can enforce them:

- Quantity inside `min_tickets_per_user` and `max_tickets_per_user`; a package price comes from `ticket_combos`, never from the client. Packages require a positive integer quantity and positive price; checkout also rejects invalid legacy packages.
- Only active, non-retired bank accounts can receive new checkout orders.
- Approval rechecks remaining sellable capacity while holding the raffle lock. An over-capacity approval must leave the pending order, ticket count, sold count and notification queue unchanged.
- A ticket linked to an order must belong to that order's raffle; admin edits cannot move it independently.
- Raffles with no stock, or whose `draw_at` has passed, cannot be sold.
- Ticket numbers are assigned **after** payment validation, at random, never reusing prize numbers or numbers already sold.
- `draw_at` stays `null` until 80% of tickets are sold; the UI then shows "La fecha se coloca con el 80% vendido".
- Receipt type and size, honeypot and Turnstile verification.

## Admin catalog lifecycle

In **Rifas → Crear/Editar → Paquetes**, choose **Agregar paquete**, set its
quantity and total package price, and use **Público** to control its availability.
Save the raffle to persist additions, edits and ordering. The raffle and all its
packages are saved in one transaction: invalid nested input cannot leave a partial
raffle or retire existing packages. Package quantities are validated against the
new purchase limits when both are edited together. **Quitar paquete** retires the
package rather than deleting order history; it is excluded from new purchases.

**Retirar rifa** removes a raffle from the public catalog and new checkout.
**Retirar** on a bank account removes it from new payments. Retirement preserves
existing orders, assigned tickets, winners and historical personal-order links.
The additive migration introduces `deleted_at` on raffles, packages and banks;
its rollback intentionally retains these history-preserving columns, and applying
the migration again safely skips columns that already exist.

When opening purchase, the storefront refetches the raffle's current price,
availability, status, limits and packages. If that fetch fails, purchase is disabled
rather than using stale card data. Root-relative personal links are resolved to an
absolute HTTP(S) URL before sharing or QR generation.

## What the demo simulates

| Real system | Demo behaviour |
|---|---|
| Operator approves payment | `MockRifasApi` approves an order **20 s** after creation (`MOCK_VALIDATION_DELAY_MS`) and assigns random numbers |
| Database | Orders persist in `localStorage` under `rifas-demo-orders` |
| Cloudflare Turnstile | Look-alike widget that "verifies" on click |
| Maintenance switch | `localStorage.setItem('rifas-demo-maintenance', '1')` |
| Bank accounts | Fake numbers in `core/api/mock-data.ts`; never ship real ones in the repo |
