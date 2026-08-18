# SLO Market

Local marketplace for San Luis Obispo County. Buy local. Sell local. Keep it in SLO.

## Stack

- Next.js 15 (App Router) + TypeScript
- PostgreSQL + Prisma
- NextAuth credentials auth
- Stripe Connect (12% platform fee via `application_fee_amount`)
- Render-ready (`render.yaml`)

## Local setup

1. Copy `.env.example` to `.env` and add Stripe keys.
2. Start Postgres: `docker compose up -d`
3. `npm install`
4. `npx prisma db push`
5. `npm run db:seed`
6. `npm run dev`

Admin login uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.

## Stripe

Create a Stripe account, enable Connect (Express), and set:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET` pointing at `/api/stripe/webhook`

Commission is 12% of item price by default. Stripe processing-fee treatment is configurable in Admin (do not hard-code Stripe fees). Enhanced Description ($1) is a separate platform Checkout payment.

## Render

This app deploys from GitHub. Render creates a Node web service and a PostgreSQL database from `render.yaml`.

### 1. Push the latest code

In GitHub Desktop:

1. You should see the latest files (including `render.yaml`)
2. Write a summary like `Prepare Render deploy`
3. **Commit to main**
4. **Push origin**

### 2. Create the services on Render

1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign in with GitHub
2. **New + → Blueprint**
3. Select your `slo-market` repository
4. Apply the Blueprint
5. Render will create:
   - **slo-market** web service
   - **slo-market-db** Postgres database

### 3. Fill in environment variables

In the web service **Environment** tab, set:

| Variable | Value |
| --- | --- |
| `NEXTAUTH_URL` | Your Render URL, like `https://slo-market.onrender.com` |
| `APP_URL` | Same as `NEXTAUTH_URL` |
| `ADMIN_EMAIL` | The email you will use to sign in as admin |
| `ADMIN_PASSWORD` | A strong password (change from the default) |
| `STRIPE_SECRET_KEY` | Leave empty until we wire Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Leave empty until we wire Stripe |
| `STRIPE_WEBHOOK_SECRET` | Leave empty until we wire Stripe |

`DATABASE_URL` and `NEXTAUTH_SECRET` are created automatically.

### 4. Open the site

After the first deploy finishes, open the Render URL. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Listings, accounts, and messaging will work. Checkout waits until Stripe is added.

Starter web + Postgres on Render is a paid plan. Keep the handyman app on its own GitHub repo and Render service so the two sites stay separate.

