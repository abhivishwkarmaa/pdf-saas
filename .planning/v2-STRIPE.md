# v2: Stripe Freemium (Deferred)

Tracked per user decision — v1 is free-only.

## Planned requirements

- PAY-01: Stripe Checkout for subscription plans
- PAY-02: Webhook handling for subscription lifecycle
- PAY-03: Premium rate limits and feature flags per plan
- PAY-04: Usage metering for async jobs

## Suggested approach

- Stripe Customer Portal + Price IDs for monthly/yearly
- Store `stripeCustomerId` and `plan` on User model
- Middleware checks plan before enqueue/process

---
*Deferred from v1 roadmap — 2026-05-19*
