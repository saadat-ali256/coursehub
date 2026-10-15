# CourseHub

## Structure

- `frontend/` — Next.js pages and UI
- `server/` — all backend API routes, MongoDB models, auth, services/helpers and uploads

## Start backend

```bash
cd server
npm install
npm run dev
```

## Start frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend API calls to `/api/*` are proxied to `http://localhost:5000` by default.

## Clerk authentication

Create a Clerk application with email address, password, and email verification
code enabled. Put the Clerk publishable key in `frontend/.env.local` and the
secret key in `server/.env.local` (see the two `.env.example` files):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_AUTHORIZED_PARTIES=http://localhost:3000
```

Keep the Clerk secret key server-side and out of Git. In the Clerk Dashboard,
enable email address and password sign-in, and require email verification for
sign-up. Restart both frontend and backend after changing environment variables.

To preserve existing CourseHub accounts and bcrypt passwords, create/verify
your seeded admin first (if you use one), configure the Clerk instance, back
up MongoDB, and then run from `server/`:

```powershell
npm run migrate:clerk
```

The migration links existing users to Clerk, imports supported bcrypt hashes,
and leaves CourseHub roles and permissions in MongoDB. It skips pending
unverified registration records. Run it again after creating a new admin with
`npm run seed:admin`. Review the migration summary and resolve any
failed/skipped accounts before changing users over. Then register at
`http://localhost:3000/register`, verify the email code sent by Clerk, and log
in through the CourseHub pages. Resend sender/domain settings are no longer
used for authentication emails after this migration.

## Stripe recurring PaymentIntents

Subscription checkout uses Stripe Elements and the PaymentIntent for the
subscription's first invoice. Stripe Billing renews monthly and yearly plans
automatically using the card saved to that subscription. Configure these
server-side values in `server/.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

The publishable key is safe to return to the browser; keep the secret and
webhook signing keys only on the server. For local webhook tests, run:

```powershell
stripe listen --forward-to localhost:5000/api/payments/stripe/webhook
```

Copy the listener's `whsec_...` signing secret to `STRIPE_WEBHOOK_SECRET` and
restart the backend. In production, register
`https://your-domain/api/payments/stripe/webhook` in Stripe and enable
`invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, and
`customer.subscription.deleted`.

Restart both servers after configuring Stripe. Start a subscription from
`/subscriptions`; access is granted only after Stripe confirms payment.
Existing recurring Price IDs are reused when their billing interval matches the
CourseHub plan.
