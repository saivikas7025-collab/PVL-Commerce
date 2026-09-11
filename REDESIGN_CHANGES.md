# PVL Commerce — Change Summary (Real Checkout & Payments)

This document describes what changed in this iteration and what you must
configure before it works end-to-end. The customer-facing flow now:

- Places **real** orders via `POST /api/orders`.
- Charges via **real** Razorpay (test or live) with server-side signature
  verification and webhook processing.
- Falls back cleanly to Cash on Delivery.
- Provides a real address book, real order history, and Socket.IO-based
  live tracking.

Nothing about the payment success screen is faked. If Razorpay keys are
missing, the online-payment option is disabled and the user must pick COD.

---

## 1. Backend changes (Node/Express + PostgreSQL)

Location: `backend/`

### New / changed files

| File                                          | Purpose                                             |
| --------------------------------------------- | --------------------------------------------------- |
| `server.js`                                   | Registers the Razorpay webhook with `express.raw()` **before** `express.json()`; exposes `io` via `app.set('io', io)`; adds `/api/config/public` feature flag endpoint. |
| `routes/orders.js`                            | Rewritten. Auth-gated. Server calculates totals from `products.price × cart_items.quantity`. Cart is cleared for COD immediately, and for Razorpay only after successful verify. Prevents duplicate orders (unique `razorpay_order_id`). Uses a DB transaction with rollback. Adds `GET /api/orders`, `GET /api/orders/:id`, `PUT /api/orders/:id/status` (non-customer only). |
| `routes/payment.js`                           | Rewritten. Adds `POST /api/payment/razorpay/order`, `POST /api/payment/razorpay/verify`, `PUT /api/payment/order/:id/method` (COD fallback), keeps legacy `/submit` for compatibility. Handles verify/webhook race (`23505` unique-violation) by treating as success when the order is already paid. |
| `routes/razorpayWebhook.js` (new)             | Handles `payment.captured`, `payment.failed`, and refund events. Verifies HMAC-SHA256 with `crypto.timingSafeEqual`. De-duplicates on `X-Razorpay-Event-Id`. Uses `INSERT ... WHERE NOT EXISTS` (safe with partial unique indexes) instead of `ON CONFLICT` (which can't infer partial indexes). |
| `services/razorpayService.js` (new)           | Wraps the Razorpay SDK. Lazily loads keys from env. Exports `getClient`, `verifyCheckoutSignature`, `verifyWebhookSignature`, `isConfigured`. |
| `routes/cart.js`                              | Rewritten to use `authenticate` middleware. **All routes now identify the user from the JWT** — no more `user_id` in the URL. Prevents any customer from reading/writing another user's cart. |
| `db.js`                                       | Now prefers `DATABASE_URL` over discrete `DB_*` vars, but still works with the old shape. |
| `.env.example` (new)                          | Documents every env var (DB, JWT, Razorpay, feature flags). Copy to `.env` and fill values. |
| `migrations/003_razorpay.sql` (new)           | Adds `orders.razorpay_order_id`, extra columns on `payments` & `refunds`, partial unique indexes for idempotency. Idempotent (safe to re-run). |
| `scripts/migrate.js` (new)                    | Simple sequential migration runner. Reads `backend/migrations/*.sql` in order, records progress in `schema_migrations`. Usage: `node scripts/migrate.js`. |
| `package.json`                                | Added `helmet`, `razorpay`. `npm install` before starting. |

### Endpoints added (all under `/api`)

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| GET    | `/config/public`                     | none      | Returns `{cod_enabled, razorpay_enabled}` feature flags. |
| GET    | `/orders`                            | customer  | Current user's order history. |
| GET    | `/orders/:id`                        | customer  | Single order with items + status timeline + latest payment record. |
| POST   | `/orders`                            | customer  | Create a real order from server-side cart. |
| PUT    | `/orders/:id/status`                 | non-cust. | Status transitions (store / delivery / admin apps). |
| POST   | `/payment/razorpay/order`            | customer  | Creates or reuses a Razorpay order for the internal order. |
| POST   | `/payment/razorpay/verify`           | customer  | Verifies the checkout signature and marks the order paid. |
| POST   | `/payment/razorpay/webhook`          | signature | Razorpay webhook (raw body + HMAC). |
| PUT    | `/payment/order/:id/method`          | customer  | Switch to COD after failed online payment. |

### Data model additions (migration `003_razorpay.sql`)

- `orders.razorpay_order_id VARCHAR(60)` with partial unique index.
- `payments`: adds `razorpay_order_id`, `razorpay_payment_id`, `event_id`, `event_type`, `failure_code`, `failure_description`, `raw_event JSONB`; partial unique indexes on `event_id` and `razorpay_payment_id`.
- `refunds`: adds `razorpay_refund_id`, `razorpay_payment_id`, `event_id`, `event_type`, `raw_event JSONB`; partial unique indexes.

### Security & correctness properties

- **Server is the source of truth** for prices, subtotal, delivery fee, total, payment status. Client body is ignored for money-related fields.
- **Cart ownership is enforced** by `authenticate` (JWT → `req.userId`) on every cart route.
- **Address ownership is enforced** on order creation.
- **Idempotent**: same webhook `event_id` will not double-insert. Same `razorpay_payment_id` will not double-charge the order.
- **Race-safe**: If the Razorpay webhook and the in-app `/verify` land at the same time, the verify path recovers gracefully on unique-violation and still returns success to the customer.
- **Duplicate order guard**: a Razorpay order is reused for the same internal order via the `razorpay_order_id` unique index.
- **No secrets on the client**: only `RAZORPAY_KEY_ID` is sent (needed for the checkout SDK). `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` stay on the server.

---

## 2. Flutter customer app changes

Location: `customer_app/`

### New / changed files

| File                                                      | Purpose                                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `pubspec.yaml`                                            | Adds `razorpay_flutter: ^1.4.6` and `socket_io_client: ^2.0.3+1`.                                 |
| `lib/models/address.dart` (new)                           | Address model.                                                                                   |
| `lib/services/address_service.dart` (new)                 | REST client for `/api/addresses`.                                                                |
| `lib/services/payment_service.dart` (new)                 | REST client for `/api/payment/razorpay/*` and `/config/public`.                                  |
| `lib/services/order_service.dart`                         | Adds `getOrder(id)` and `createOrder(...)`.                                                      |
| `lib/providers/address_provider.dart` (new)               | Provider for the address book.                                                                   |
| `lib/screens/address_screens.dart` (new)                  | Address book + editor UI (Home/Work/Other, default flag, edit, delete).                          |
| `lib/screens/checkout_screen.dart` (new)                  | Address → payment method → place order → Razorpay checkout → confirmation. Handles COD fallback. |
| `lib/screens/order_confirmation_screen.dart` (new)        | Post-checkout confirmation showing what the server actually recorded.                            |
| `lib/screens/order_details_screen.dart` (new)             | Full order detail + Socket.IO live tracking (`order:status`, `location:update`).                 |
| `lib/screens/cart_screen.dart`                            | "Proceed to checkout" now opens the real checkout flow.                                          |
| `lib/screens/orders_screen.dart`                          | Tapping any order opens Order Details (with live tracking).                                      |
| `lib/screens/home_screen.dart`                            | "Saved addresses" now opens the address book. Logout also resets `AddressProvider`.              |
| `lib/main.dart`                                           | Registers `AddressProvider`.                                                                     |

### What the flow looks like in practice

1. Shopper opens the cart → **Proceed to checkout**.
2. Checkout screen asks for a delivery address (opens the address book if none) and payment method (Razorpay or COD; disabled options are grey).
3. **COD path**: Server creates the order and empties the cart. Confirmation shows the amount to keep ready.
4. **Razorpay path**: Server creates a Razorpay order → app opens Razorpay checkout → success callback verifies the signature server-side → order marked paid → cart emptied → confirmation.
5. If the Razorpay sheet is dismissed or fails, the shopper is offered "Pay Cash on Delivery" and keeps the same order (no duplicate, no lost cart).
6. On confirmation the shopper can tap **Track this order** → live timeline updates over Socket.IO as the store/delivery apps transition the order.

---

## 3. Not touched in this iteration (deliberate)

Per the instruction "do not rebuild working functionality" and the constraint that we don't have the Flutter SDK in this container:

- **Existing auth flow** (`routes/auth.js`, `services/auth_service.dart`) — untouched.
- **Existing categories / products routes** — untouched.
- **Existing store, delivery, admin dashboards** — the backend endpoints they call (`/store/*`, `/delivery/*`, `/admin/*`) are unchanged. They will receive the new `order:new` and `order:status` Socket.IO events from the customer flow with no changes.
- **`socket.io` cluster / cache** — kept the original in-memory `liveLocations` map.

---

## 4. Environment variables you MUST configure before deploying

Copy `backend/.env.example` to `backend/.env` and fill:

```dotenv
# Postgres
DATABASE_URL=postgres://user:pass@host:5432/pvl_commerce

# Auth
JWT_SECRET=<a-long-random-string>

# Razorpay
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=<from Razorpay Dashboard → Account & Settings → API Keys>
RAZORPAY_WEBHOOK_SECRET=<from Razorpay Dashboard → Account & Settings → Webhooks>

# Business rules
COD_ENABLED=true
DEFAULT_DELIVERY_FEE=2500   # in paise (₹25.00)
```

**Never** put `RAZORPAY_KEY_SECRET` in the Flutter app.

Razorpay Webhook URL to register (Razorpay Dashboard → Webhooks):

```
POST https://<your-backend-domain>/api/payment/razorpay/webhook
```

Events to enable: `payment.captured`, `payment.failed`, `refund.created`, `refund.processed`, `refund.failed`.

---

## 5. How to run

### Backend

```bash
cd backend
npm install
# configure .env (see above)
node scripts/migrate.js       # runs 001, 002, 003 in order (idempotent)
npm start                     # or: nodemon server.js
```

The server prints `PVL-Commerce backend running on port 5000` and
`PostgreSQL connected successfully: ...` on success.

### Flutter customer app

On your local machine (the container here has no Flutter SDK):

```bash
cd customer_app
flutter pub get
flutter analyze     # should print zero errors (warnings/infos OK)
flutter run         # or: flutter run -d chrome  (COD only on web)
```

Note: Razorpay checkout requires a real mobile device or emulator.
On Flutter Web the checkout screen automatically shows only COD.

---

## 6. What is NOT production-ready yet

- **Store / Delivery / Admin apps**: not touched in this iteration. They already exist in the upload but were left as-is per the "do not rebuild working functionality" rule. They will still work against the extended backend because the endpoints they call (`/api/store/*`, `/api/delivery/*`, `/api/admin/*`) are unchanged.
- **Razorpay refunds**: the webhook records refunds when Razorpay sends them, but there is **no admin refund-initiation endpoint yet**. When you're ready, we can add `POST /api/admin/orders/:id/refund` that calls `razorpay.payments.refund(paymentId, {amount, notes})` and the webhook will finish the accounting.
- **Rate limiting / brute force protection**: not added. `helmet` and `cors` are in place; add express-rate-limit and per-endpoint throttling before going live.
- **CORS**: currently `*`. Lock this down to your customer domain before production.
- **Test coverage**: no automated tests were shipped in this iteration. See the review report for the concurrency scenarios (webhook + verify) that need a live test.
- **Multi-store carts**: current logic assumes a single active store. If products from multiple stores end up in the cart, all items go to the first active store. When you add `products.store_id`, we can enforce single-store-per-cart at order creation.
- **Delivery fee logic**: uses `DEFAULT_DELIVERY_FEE` from env. Real per-store / per-distance rules can be layered in later.
- **CI / lint gates**: no CI is set up. Add ESLint + `flutter analyze` in CI before merging future changes.

---

## 7. Backup

Original upload preserved at `/app/pvl_source_upload/` (read-only reference).
The redesigned Flutter customer app from the previous iteration is at
`/app/pvl_mart_source/` (its `lib/` was merged into `customer_app/lib/`).
