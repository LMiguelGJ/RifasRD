# Backend handover

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
| `GET /api/raffles?per_page=50&category_id=1` | `Paginated<Raffle>` (`current_page`, `data`, `last_page`, `per_page`, `total`) |
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

The UI masks phone and email (last 4 characters visible). Still return only what
the matched customer should see, and rate-limit this endpoint.

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

- Quantity inside `min_tickets_per_user` and `max_tickets_per_user`; a package price comes from `ticket_combos`, never from the client.
- Raffles with no stock, or whose `draw_at` has passed, cannot be sold.
- Ticket numbers are assigned **after** payment validation, at random, never reusing prize numbers or numbers already sold.
- `draw_at` stays `null` until 80% of tickets are sold; the UI then shows "La fecha se coloca con el 80% vendido".
- Receipt type and size, honeypot and Turnstile verification.

## What the demo simulates

| Real system | Demo behaviour |
|---|---|
| Operator approves payment | `MockRifasApi` approves an order **20 s** after creation (`MOCK_VALIDATION_DELAY_MS`) and assigns random numbers |
| Database | Orders persist in `localStorage` under `rifas-demo-orders` |
| Cloudflare Turnstile | Look-alike widget that "verifies" on click |
| Maintenance switch | `localStorage.setItem('rifas-demo-maintenance', '1')` |
| Bank accounts | Fake numbers in `core/api/mock-data.ts`; never ship real ones in the repo |
