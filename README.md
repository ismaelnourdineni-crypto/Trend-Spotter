# Trend-Spotter

Trend-Spotter is a lightweight trend discovery dashboard. It tracks emerging topics, compares market momentum, and turns signals into business opportunities.

## What is included

- Interactive dashboard with live-style trend cards and ranking
- Search, category, priority, and source filters
- Multilingual interface with English as the reference language
- Trend detail panel with source breakdown, momentum curve, why-now context, and business ideas
- Premium positioning with pricing cards and report CTAs
- Local email capture endpoint
- Optional Stripe Checkout endpoint for premium subscriptions and reports
- Checkout success/cancel pages and local purchase recording

## Run locally

```bash
npm start
```

Then visit:

```text
http://127.0.0.1:4199
```

The app server enables the API routes used by email capture and checkout.

## Monetization setup

Copy `.env.example` to `.env`, then set:

```bash
PORT=4199
PUBLIC_URL=http://127.0.0.1:4199
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PRICE_ID_PREMIUM=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
EMAIL_FROM=Trend-Spotter <hello@trendspotter.com>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_only_secret_key
```

Without Stripe variables, checkout buttons fall back to email capture. Without Supabase variables or tables, leads are stored locally in `data/leads.json`; completed checkouts are stored locally in `data/purchases.json`.

Without `RESEND_API_KEY`, purchases are still recorded but no confirmation email is sent. Set `EMAIL_FROM` to a verified Resend sender before going live.

Stripe success and cancellation redirects use:

```text
http://127.0.0.1:4199/success.html?session_id={CHECKOUT_SESSION_ID}
http://127.0.0.1:4199/cancelled.html
```

The local webhook endpoint is:

```text
POST /api/webhooks/stripe
```

Set `STRIPE_WEBHOOK_SECRET` from the Stripe webhook endpoint settings before using webhooks in production. When this secret is present, Trend-Spotter verifies Stripe's webhook signature before recording purchases or sending confirmation emails.

## Supabase setup

Run the SQL in `supabase-schema.sql` inside the Supabase SQL Editor. The app writes early-access leads to `leads` and paid checkouts to `purchases`.

Keep `SUPABASE_SERVICE_ROLE_KEY` private. It belongs only in `.env` on the server and must never be exposed in browser code or committed to GitHub.

## Production checklist

Before going live, update `.env` for the deployed domain:

```bash
PUBLIC_URL=https://trendspotter.com
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PRICE_ID_PREMIUM=price_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
EMAIL_FROM=Trend-Spotter <hello@trendspotter.com>
```

In Stripe Dashboard, create a webhook endpoint:

```text
https://trendspotter.com/api/webhooks/stripe
```

Subscribe it to:

```text
checkout.session.completed
```

Copy the endpoint signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

In Resend, verify your sending domain, then replace `EMAIL_FROM` with an address on that verified domain. Keep `onboarding@resend.dev` only for local testing.

## Project structure

```text
.
├── assets
│   └── trendspotter-logo.png
├── index.html
├── server.js
├── src
│   ├── app.js
│   └── styles.css
├── package.json
└── README.md
```

## Next steps

- Replace demo live scoring with real data sources
- Connect a newsletter provider for lead capture
- Add Stripe webhooks for paid access
- Persist watchlists and user accounts
- Add exports for reports, PDF, and CSV
