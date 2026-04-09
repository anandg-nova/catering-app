# Catering Platform — Architecture, Touchpoints & Edge Cases

> **Prepared for:** Day 2 planning session (2026-04-10)
> **Stack:** Node/Express + PostgreSQL + Stripe + SendGrid
> **Apps:** Back Office (admin) | Customer Facing (ordering) | Backend API

---

## 1. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                               │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Catalog  │  │ Payment  │  │ Delivery │  │ Customer │  │ SendGrid │  │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │  │ (Email)  │  │
│  │(existing)│  │(Stripe)  │  │(existing)│  │(existing)│  │          │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │              │              │       │
└───────┼──────────────┼──────────────┼──────────────┼──────────────┼───────┘
        │              │              │              │              │
   ┌────┴──────────────┴──────────────┴──────────────┴──────────────┴────┐
   │                     CATERING BACKEND API                            │
   │                     (Node + Express + PostgreSQL)                    │
   │                                                                     │
   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
   │  │  Auth    │ │  Orders  │ │  Menu    │ │  Payment │ │ Notifi-  │ │
   │  │  Module  │ │  Module  │ │  Module  │ │  Module  │ │ cations  │ │
   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
   │  │ Invoice  │ │ Location │ │ Customer │ │ Delivery │             │
   │  │ Module   │ │ Module   │ │ Module   │ │ Module   │             │
   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
   └────────┬───────────────────────────┬──────────────────────────────┘
            │                           │
     ┌──────┴───────┐          ┌───────┴────────┐
     │  Back Office │          │ Customer Facing │
     │  (React/CRA) │          │ (React/Vite)    │
     │  Port 3001   │          │ Port 5173       │
     └──────────────┘          └────────────────┘
```

---

## 2. Application Touchpoints

### 2.1 Main Page — Catering Menu (Separate from Regular Menu)

The catering menu is **NOT the regular restaurant menu**. It's a curated subset with:
- **Platters** (serves 10-50), not individual meals
- **Bulk pricing** tiers (per-person, per-platter)
- **Setup fees**, delivery charges, minimum order amounts
- **Lead time requirements** (e.g., 48-hour advance ordering)

```
┌────────────────────────────────────────────────────────┐
│                   MAIN CATERING PAGE                    │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Steakburger │  │ Melt &      │  │ Shake       │    │
│  │ Platters    │  │ Sandwich    │  │ Packages    │    │
│  │             │  │ Trays       │  │             │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│  ┌─────────────┐  ┌─────────────┐                      │
│  │ Fries &     │  │ Beverage    │                      │
│  │ Sides       │  │ Packages    │                      │
│  └─────────────┘  └─────────────┘                      │
│                                                         │
│  [Each card shows: name, description, serves X,         │
│   price, image, "Add to Cart" / "Customize"]            │
└────────────────────────────────────────────────────────┘
```

**Decision point for tomorrow:**
- Should the catering menu be a **filtered view** of the catalog service or a **separate catering-specific catalog**?
- Does the catalog service support `menu_type: 'catering' | 'regular' | 'both'`?
- Can items belong to both catering and regular menus with different pricing?

---

### 2.2 Catalog Service Integration

```
┌─────────────────────────────────────────────────────┐
│              CATALOG SERVICE CONNECTOR                │
│                                                       │
│  Option A: Direct integration                         │
│  ┌──────────────┐     ┌─────────────────┐            │
│  │ Catalog API  │────>│ Catering Backend │            │
│  │ GET /items   │     │ (proxy + filter) │            │
│  └──────────────┘     └─────────────────┘            │
│                                                       │
│  Option B: Sync + local copy                          │
│  ┌──────────────┐     ┌─────────────────┐            │
│  │ Catalog API  │────>│ menu_items table │            │
│  │ (webhook/    │     │ (local copy,     │            │
│  │  polling)    │     │  enriched with   │            │
│  └──────────────┘     │  catering fields)│            │
│                       └─────────────────┘            │
│                                                       │
│  Option C: Separate catering catalog                  │
│  ┌─────────────────────────────────────┐             │
│  │ menu_items table (catering-only)    │             │
│  │ Managed independently from regular  │             │
│  │ menu via Back Office admin panel    │             │
│  └─────────────────────────────────────┘             │
└─────────────────────────────────────────────────────┘
```

**Touchpoints:**

| Touchpoint | Flow | Notes |
|------------|------|-------|
| **Menu sync** | Catalog Service → Catering Backend | How often? Real-time webhook or nightly sync? |
| **Price override** | Catering may have different bulk pricing than regular menu | Need `catering_price` field or separate price table? |
| **Availability** | If catalog marks item out-of-stock, catering must reflect | Real-time or batched? |
| **Modifiers** | Catalog modifiers may differ for catering (e.g., "serves 20" size) | Shared modifier_groups or separate? |
| **Images** | Use catalog images or catering-specific images? | CDN URL reuse vs separate uploads |
| **New items** | When catalog adds an item, does it auto-appear in catering? | Opt-in vs auto-include |

**Edge cases:**
- Catalog item deleted while it's in an active catering order's cart
- Catalog price changed between when customer added to cart and when they checkout
- Catalog modifier option removed but already selected in a pending order
- Catalog item marked seasonal/unavailable after catering order is confirmed for future date

---

### 2.3 Payment Service Integration (Stripe)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT FLOW                                  │
│                                                                   │
│  Customer App                  Backend                Stripe      │
│  ┌───────────┐                ┌─────────┐          ┌──────────┐ │
│  │ Checkout  │───(1) cart───>│ Create  │──(2)────>│ Payment  │ │
│  │ Page      │               │ Payment │          │ Intent   │ │
│  │           │<──(3) secret──│ Intent  │<─(secret)│          │ │
│  │           │               └─────────┘          └──────────┘ │
│  │           │                                                   │
│  │ Stripe    │──(4) card details ──────────────────>│ Confirm  │ │
│  │ Elements  │<─(5) result ─────────────────────────│          │ │
│  │           │               ┌─────────┐          └──────────┘ │
│  │           │               │ Webhook │<──(6) event ──────────│ │
│  │           │               │ Handler │                        │ │
│  └───────────┘               └─────────┘                        │
│                                                                   │
│  Back Office                                                      │
│  ┌───────────┐               ┌─────────┐          ┌──────────┐ │
│  │ Card      │──(1) card───>│ Create  │──(2)────>│ Payment  │ │
│  │ Payment   │               │ Charge  │          │ Intent   │ │
│  │ Modal     │<──(3) result──│         │<─(webhook)│          │ │
│  └───────────┘               └─────────┘          └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Touchpoints:**

| Touchpoint | Flow | Notes |
|------------|------|-------|
| **Payment Intent creation** | Backend → Stripe | Created when user initiates payment, amount locked |
| **Card tokenization** | Customer/Admin browser → Stripe directly | PCI compliant — card never touches our server |
| **Webhook confirmation** | Stripe → Backend `/api/webhooks/stripe` | Source of truth for payment status |
| **Refund** | Backend → Stripe Refund API | Admin-initiated from Back Office |
| **Partial payment** | Backend tracks `paid` vs `balance` | Multiple payment intents per order |
| **Pay later** | No Stripe call at checkout | Payment collected on delivery or via follow-up link |
| **Pay deposit** | Stripe charges deposit amount | Balance tracked, "Pay Now" on order summary charges remainder |

**Edge cases:**
- Customer closes browser after Stripe confirms but before our webhook fires → **must reconcile via webhook, not client callback**
- Partial payment of $100 on a $500 order, then order total changes (item removed) → recalculate balance, handle overpayment
- Refund requested after 60 days (Stripe refund window) → need manual process
- Card declined after order confirmed → order status = "payment_failed", admin notified
- Duplicate webhook delivery → idempotency key on `payment_intent.id`
- Customer pays deposit, then cancels → refund the deposit automatically or require admin approval?
- Stripe outage during checkout → graceful fallback, retry, or allow "pay later" as escape hatch
- Currency mismatch if org operates in multiple currencies
- Card saved for "Pay at delivery" but card expires before delivery date

---

### 2.4 Delivery Service Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    DELIVERY FLOW                                 │
│                                                                   │
│  Order Confirmed                                                  │
│       │                                                           │
│       ▼                                                           │
│  ┌─────────────────┐                                             │
│  │ Fulfillment =   │──── Pickup ───> No delivery service call    │
│  │ Pickup/Delivery?│                  Customer picks up at store  │
│  └────────┬────────┘                                             │
│           │ Delivery                                              │
│           ▼                                                       │
│  ┌─────────────────┐     ┌──────────────────┐                   │
│  │ Create Delivery │────>│ Delivery Service  │                   │
│  │ Request         │     │ API               │                   │
│  │                 │     │                    │                   │
│  │ - pickup addr   │     │ - Assign driver    │                   │
│  │ - drop addr     │     │ - ETA calculation  │                   │
│  │ - time window   │     │ - Route planning   │                   │
│  │ - order size    │     │ - Status updates   │                   │
│  └─────────────────┘     └──────────────────┘                   │
│                                  │                                │
│                           Status webhooks                         │
│                           ┌──────┴──────┐                        │
│                           │ assigned    │                        │
│                           │ picked_up   │                        │
│                           │ en_route    │                        │
│                           │ delivered   │                        │
│                           │ failed      │                        │
│                           └─────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

**Touchpoints:**

| Touchpoint | Flow | Notes |
|------------|------|-------|
| **Delivery creation** | Backend → Delivery Service | After order confirmed + payment secured |
| **Status updates** | Delivery Service → Backend webhook | Updates order status, notifies customer |
| **ETA** | Delivery Service → Backend → Customer App | Shown on Order Summary page |
| **Driver assignment** | Delivery Service → Backend | Driver name/phone for customer tracking |
| **Delivery fee calculation** | Delivery Service → Backend | Based on distance, order size, time |
| **Address validation** | Delivery Service or Google Maps API | Before order placement |
| **Scheduling** | Backend → Delivery Service | Catering has scheduled delivery (not ASAP) |
| **Setup instructions** | Order → Delivery Service | "Set up in conference room B", "Use back entrance" |

**Edge cases:**
- Delivery address outside service area → reject at checkout, not after payment
- Catering delivery is **scheduled** (e.g., Friday 11am), not on-demand → delivery service must support future scheduling
- Order modified after delivery scheduled → update or cancel+recreate delivery?
- Delivery driver can't find location → need customer contact info on delivery ticket
- Large catering order needs **multiple trips or special vehicle** → order size/weight passed to delivery service
- Delivery cancelled but driver already en route → cancellation fee? Who pays?
- Customer not present at delivery time → leave at door? Return? Hold fee?
- Weather delay on event day → customer needs notification + ETA update
- Delivery service reports "delivered" but customer disputes → need proof of delivery
- Recurring orders → auto-create delivery for each occurrence or manual each time?

---

### 2.5 Customer Service Integration

```
┌─────────────────────────────────────────────────────────────────┐
│               CUSTOMER SERVICE TOUCHPOINTS                       │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Customer Service DB                      │  │
│  │                                                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │  │
│  │  │ Customer   │  │ Contact    │  │ Interaction        │  │  │
│  │  │ Profile    │  │ History    │  │ History            │  │  │
│  │  │            │  │            │  │                    │  │  │
│  │  │ - name     │  │ - emails   │  │ - support tickets  │  │  │
│  │  │ - company  │  │ - calls    │  │ - complaints       │  │  │
│  │  │ - addresses│  │ - chats    │  │ - feedback          │  │  │
│  │  │ - loyalty  │  │            │  │ - order issues      │  │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                    ┌─────────┴──────────┐                        │
│                    │                    │                         │
│              ┌─────┴──────┐    ┌───────┴────────┐               │
│              │ Back Office │    │ Customer App   │               │
│              │             │    │                │               │
│              │ Admin looks │    │ Auto-fill from │               │
│              │ up customer │    │ profile on     │               │
│              │ when creating│   │ checkout       │               │
│              │ order        │   │                │               │
│              └──────────────┘   └────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

**Touchpoints:**

| Touchpoint | Flow | Notes |
|------------|------|-------|
| **Customer lookup** | Back Office → Customer Service API | Admin types name/phone, autocomplete from customer DB |
| **Profile auto-fill** | Customer App → Customer Service API | Logged-in customer's address, phone, email pre-filled |
| **Order history enrichment** | Customer Service ← Catering Backend | Catering orders appear in customer's unified order history |
| **New customer creation** | Catering Backend → Customer Service | When guest places first order |
| **Customer merge** | Customer Service | Same person ordered as guest then registered → merge records |
| **Loyalty/rewards** | Customer Service → Catering Backend | Apply loyalty points/discounts at checkout |
| **Support context** | Customer Service ← Catering Backend | When customer calls support, agent sees catering orders |
| **Communication preferences** | Customer Service → Catering Backend | Email opt-in, SMS opt-in, preferred contact method |

**Edge cases:**
- Customer exists in Customer Service but not in Catering DB → create local reference on first order
- Customer changes phone/email in Customer Service → does Catering auto-update?
- Same email used for personal and company orders → separate customer records or one with multiple "roles"?
- Customer has outstanding balance on regular orders → should catering checkout block?
- Guest checkout creates anonymous customer → later registers with same email → merge carts and order history
- Customer Service marks account as "fraud" or "blocked" → catering should deny orders
- GDPR/data deletion request in Customer Service → cascade to catering order data?
- Customer has different delivery addresses for personal vs corporate events → address book integration

---

## 3. Notification Touchpoints (SendGrid + SMS)

```
┌─────────────────────────────────────────────────────┐
│              NOTIFICATION TRIGGERS                    │
│                                                       │
│  Event                    │ Channel   │ Recipient     │
│  ─────────────────────────┼───────────┼──────────     │
│  Order placed             │ Email+SMS │ Customer      │
│  Order confirmed (admin)  │ Email     │ Customer      │
│  Payment received         │ Email     │ Customer      │
│  Payment failed           │ Email+SMS │ Customer+Admin│
│  Order cancelled          │ Email+SMS │ Customer+Admin│
│  Refund processed         │ Email     │ Customer      │
│  Invoice sent             │ Email/SMS │ Customer      │
│  Delivery dispatched      │ SMS       │ Customer      │
│  Delivery arriving (ETA)  │ SMS       │ Customer      │
│  Delivery completed       │ Email     │ Customer      │
│  Order modified (admin)   │ Email     │ Customer      │
│  Upcoming event reminder  │ Email+SMS │ Customer      │
│  ─────────────────────────┼───────────┼──────────     │
│  New online order         │ Email     │ Admin         │
│  Low stock alert          │ Email     │ Admin         │
│  Daily order summary      │ Email     │ Admin         │
└─────────────────────────────────────────────────────┘
```

**Edge cases:**
- Customer unsubscribed from marketing but must still get transactional emails (order confirmation)
- Email bounces → flag customer record, attempt SMS fallback
- SMS to landline → silent failure, no error from Twilio/SendGrid
- Send invoice to a different email than the customer's profile email (e.g., company accounts payable)
- Recurring event → send reminder before each occurrence, not just the first

---

## 4. Order Lifecycle — All State Transitions

```
                    ┌─────────┐
                    │  DRAFT  │ ← Customer building cart
                    └────┬────┘
                         │ Place order
                         ▼
                    ┌─────────┐
             ┌──────│ PENDING │ ← Awaiting admin confirmation
             │      └────┬────┘
             │           │ Admin confirms / Auto-confirm
             │           ▼
             │      ┌───────────┐
             │      │ CONFIRMED │ ← Payment secured or pay-later accepted
             │      └─────┬─────┘
             │            │
             │     ┌──────┼──────────┐
             │     │      │          │
             │     ▼      ▼          ▼
             │  ┌──────┐ ┌────────┐ ┌──────────┐
             │  │PREPAR│ │READY   │ │DISPATCHED│ (delivery only)
             │  │-ING  │→│FOR     │→│          │
             │  │      │ │PICKUP  │ │          │
             │  └──────┘ └───┬────┘ └────┬─────┘
             │               │           │
             │               ▼           ▼
             │          ┌──────────┐ ┌──────────┐
             │          │PICKED UP │ │DELIVERED │
             │          └────┬─────┘ └────┬─────┘
             │               │           │
             │               └─────┬─────┘
             │                     ▼
             │               ┌───────────┐
             │               │ COMPLETED │
             │               └───────────┘
             │
             │  (from any state except COMPLETED)
             │           ▼
             │      ┌───────────┐
             └─────>│ CANCELLED │
                    └───────────┘
```

**Edge cases per transition:**
- **PENDING → CONFIRMED:** What if payment fails during auto-confirm? → stay PENDING, notify admin
- **CONFIRMED → PREPARING:** Who triggers this? Admin manual or time-based (1 hour before event)?
- **PREPARING → CANCELLED:** Kitchen already started cooking → partial refund? Cancellation fee?
- **DISPATCHED → CANCELLED:** Driver en route → delivery service cancellation + refund logic
- **COMPLETED → refund requested:** Post-delivery complaint → manual refund from Back Office
- **Any state → MODIFIED:** Can customer modify after CONFIRMED? Only admin? Cut-off time?

---

## 5. Cross-Cutting Edge Cases for Discussion

### 5.1 Pricing & Money

| Edge Case | Question |
|-----------|----------|
| Tax calculation differs by delivery state | Tax by restaurant location or delivery address? |
| Discount code applied but order total changes | Recalculate discount? Fixed $ amount or % of new total? |
| Tax-exempt customer | Require document upload before every order or once per account? |
| Minimum order amount for catering | Enforce at cart level or checkout? What's the minimum? |
| Service fee | Flat fee or % of subtotal? Different for delivery vs pickup? |
| Tip/gratuity | Include tipping option for delivery? |
| Price changes between cart add and checkout | Lock price at add-to-cart or use latest at checkout? |
| Multi-location pricing | Same item, different price at different store locations? |

### 5.2 Scheduling & Time

| Edge Case | Question |
|-----------|----------|
| Order for today in 2 hours | Minimum lead time? 24h? 48h? Configurable per item? |
| Recurring weekly order | Auto-charge weekly or require confirmation each time? |
| Holiday/closed day falls on recurring schedule | Skip automatically? Notify customer? |
| Time zone mismatch | Customer in EST orders for event in PST restaurant? |
| Event date changes after payment | Allow reschedule? Cut-off window? |
| Same-day cancellation | Full refund? Partial? No refund? Configurable policy? |
| Order placed for 6 months from now | Menu/prices may change — lock at order time or float? |

### 5.3 Multi-Tenancy & Org

| Edge Case | Question |
|-----------|----------|
| Customer orders from two different org locations | Separate orders or combined? |
| Admin transfers order to different location | Recalculate delivery, tax, availability? |
| Org has 50+ locations | Location dropdown performance, default to nearest? |
| Location-specific menu | Some items available only at certain locations? |
| Org-level vs location-level admin | Who can see/edit what? |

### 5.4 Cart & Checkout

| Edge Case | Question |
|-----------|----------|
| Cart has items from location A, user switches to location B | Clear cart? Warn? Check availability at new location? |
| Item goes out-of-stock while in cart | Show warning at checkout? Auto-remove? |
| Very large order (500 guests) | Performance of cart operations? Maximum qty limits? |
| Custom/open item mixed with menu items | Open items have no catalog validation — allow freely? |
| Customer adds same platter with different customizations | Currently handled via `cartKey` — but display gets confusing with 5+ variants |

### 5.5 Security & Access

| Edge Case | Question |
|-----------|----------|
| Admin creates order "on behalf" of customer | Order source = backoffice, but customer should see it in their app |
| Customer sees all org orders or only their own? | Filter by customer_id, not just org_id |
| API rate limiting | How many orders/minute? Menu fetches? |
| PCI compliance | Card data never touches our server (Stripe Elements) — confirmed? |
| Session hijacking | Refresh token rotation? Device binding? |
| Admin role: view-only vs edit | Some admins can only view, not modify orders? |

---

## 6. Service Integration Decision Matrix

For each external service, we need to decide the integration pattern:

| Service | Pattern Options | Recommendation | Decision Needed |
|---------|----------------|----------------|-----------------|
| **Catalog** | A) Direct API proxy B) Sync + local copy C) Separate catalog | **B) Sync + local** — lets us add catering-specific fields (serves, setup fee) while staying in sync | How does current catalog API look? Auth? Rate limits? |
| **Payment (Stripe)** | A) Direct integration B) Via existing payment service | **A) Direct** — Stripe Elements + webhooks is standard, no middleman needed | Do you have an existing payment service we should use instead? |
| **Delivery** | A) Direct API B) Via existing delivery service C) Manual (phone/email) | **Depends on existing service** — if it supports scheduled deliveries, use it; otherwise manual for MVP | Does delivery service support future-dated deliveries? |
| **Customer** | A) Direct API B) Sync + local copy C) Independent | **A) Direct** — lookup on demand, create on first order, don't duplicate the full customer DB | What's the customer service API? REST? GraphQL? Auth? |
| **SendGrid** | Direct integration | **Direct** — simple REST API, no middleware needed | SendGrid account + API key ready? |

---

## 7. API Surface Summary (For Backend Build)

### Public APIs (Customer Facing App)

```
POST   /api/auth/register          — Create customer account
POST   /api/auth/login             — Customer login
POST   /api/auth/guest             — Guest session token
GET    /api/menu                   — Catering menu (categories + items + modifiers)
GET    /api/locations              — Available pickup locations
POST   /api/orders                 — Place order
GET    /api/orders/mine            — Customer's order history
GET    /api/orders/:id             — Order detail
POST   /api/orders/:id/cancel      — Cancel order
POST   /api/payments/intent        — Create Stripe payment intent
POST   /api/payments/:orderId/pay  — Pay balance on existing order
GET    /api/config                 — Tax rate, service fee, min order, lead time
```

### Admin APIs (Back Office App)

```
POST   /api/admin/auth/login       — Admin login
GET    /api/admin/orders            — All orders (paginated, filtered)
POST   /api/admin/orders            — Create order (on behalf of customer)
PUT    /api/admin/orders/:id        — Update order
POST   /api/admin/orders/:id/cancel — Cancel with reason/notes
POST   /api/admin/orders/:id/confirm— Confirm pending order
PUT    /api/admin/orders/:id/status — Update order status
GET    /api/admin/customers/search  — Customer lookup (autocomplete)
POST   /api/admin/payments/charge   — Charge card (admin-initiated)
POST   /api/admin/payments/refund   — Process refund
POST   /api/admin/invoices/send     — Send invoice via email/SMS
GET    /api/admin/invoices/:id/pdf  — Download invoice PDF
POST   /api/admin/menu/items        — Add catering menu item
PUT    /api/admin/menu/items/:id    — Update menu item
GET    /api/admin/dashboard         — Order counts, revenue, upcoming events
```

### Webhook Endpoints

```
POST   /api/webhooks/stripe         — Payment confirmations, refund updates
POST   /api/webhooks/delivery       — Delivery status updates
POST   /api/webhooks/catalog        — Menu item changes from catalog service
```

---

## 8. Questions for Tomorrow's Session

### Must-Decide (blocks Day 1 work)

1. **Catalog service:** Do we have an existing API? What's the auth? Or do we build catering menu independently?
2. **Customer service:** Do we have an existing API? Or do we manage customers locally in Postgres?
3. **Delivery service:** Existing API with scheduled delivery support? Or manual coordination for MVP?
4. **Stripe account:** Test mode API keys available? Or do we need to create an account?
5. **SendGrid account:** API key available? Verified sender domain?
6. **Deployment target:** Where does the backend go? (Railway/Render/AWS/self-hosted)
7. **Domain:** API subdomain? (e.g., `api.catering.novaplatform.com`)

### Should-Decide (impacts scope)

8. **Auto-confirm vs manual confirm:** Do online orders need admin approval or auto-confirm on payment?
9. **Minimum lead time:** How many hours/days before event? Configurable per location?
10. **Cancellation policy:** Time window? Cancellation fees?
11. **Tax calculation:** By restaurant location or delivery address? Single rate or tax service?
12. **Guest checkout:** Allow or require registration?
13. **Admin roles:** Single admin role or view-only + editor + super-admin?

### Can-Decide-Later (Phase 2)

14. Recurring event scheduling logic
15. Loyalty/rewards integration
16. Multi-currency support
17. Reporting/analytics dashboard
18. Inventory/stock management sync
