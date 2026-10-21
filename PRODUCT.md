# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dominican shoppers on mobile, mostly one-handed and often on WhatsApp, who buy raffle tickets by bank transfer and upload the receipt. The secondary audience is the raffle operator, who validates payments. Inferred from the existing checkout flow, not from user research.

## Product Purpose

Static, backend-ready storefront demo of Rifas Luxury RD. A customer browses raffles, buys tickets with a payment receipt, checks their numbers and opens a personal order link. Success: the owner approves it as an MVP for a pitch and the same UI later connects to a real backend by changing configuration only.

## Positioning

A raffle storefront that shows the real state of each draw (tickets sold, draw date, urgency) on every card, in the visual language of fast, competitive prize draws.

## Operating Context

Orders are stored in the browser (localStorage) and approved by the mock after 20 seconds. Data and the API contract live behind one `RifasApi` class (see docs/BACKEND-HANDOVER.md).

## Capabilities and Constraints

- Routes: `/`, `/verificar`, `/mantenimiento`, `/:clientSlug/:token`.
- Angular 19, TypeScript, static build, installable PWA.
- UI copy is Spanish. Code, comments and docs are English.
- Single theme (no light/dark toggle) after the Rev restyle.
- Never use real bank accounts or personal data in the repo.

## Brand Commitments

- Name Rifas Luxury RD and its logo (public/Logo_rifa.png: blue outline, navy fill, gold "Luxury", red "RD" band).
- Gold is the client's urgency and winner colour. Red is the action colour.

## Evidence on Hand

- Reference captures of the original site in docs/reference/.
- Lab-only photos and listing data from a competitor site in `.lab/revcomps/` (git-excluded). These are not owned by the client and must be replaced before any public deployment. No testimonials, customer counts or benchmarks exist and none may be invented.

## Product Principles

- The raffles are the first thing on screen; nothing pushes them down.
- Show draw status honestly: sold percentage, draw date, and sold-out states.
- Red fills carry white text; red is never body text, and errors are never red-on-brand.
- Demo data is labelled as example data.
- Behavior stays identical to the original storefront; only the look changes.

## Accessibility & Inclusion

Text contrast at least 4.5:1, touch targets at least 44px, visible keyboard focus, reduced-motion respected.
