# Catering Platform — Developer Execution Plan

> **Goal:** Ship both modules (Back Office + Customer Facing) with a shared backend.
> **Date:** 2026-04-09

---

## Repositories

| App | Repo | Stack | Status |
|-----|------|-------|--------|
| **Back Office** (Admin) | [anandg-nova/catering-app](https://github.com/anandg-nova/catering-app) | React 19 + CRA | UI complete, localStorage persistence |
| **Customer Facing** | [anandg-nova/customer-facing-app](https://github.com/anandg-nova/customer-facing-app) | React 19 + Vite + Tailwind | UI complete, localStorage persistence |
| **Backend API** | TBD | TBD (Node/Express or Python/FastAPI recommended) | Not started |

---

## Current State — What's Done

### Back Office App (catering-app)
- [x] Event list page — sortable, filterable, paginated (250 events)
- [x] 3-step order wizard (Customer/Event → Menu/Location → Payment)
- [x] 12 menu items with modifier groups (required/optional)
- [x] Open item creation for custom menu entries
- [x] Card payment modal with formatting and validation
- [x] Discount ($/ %) and tax exemption with document upload
- [x] Transaction history with refund/cancel actions
- [x] Invoice preview (Banquet Event Order format) with print + email/SMS send
- [x] Cancel order modal with reason/notes
- [x] Session timeout with lock screen
- [x] Security hardening (CSP, devtools blocking, clipboard redaction)
- [x] Order persistence (localStorage + File System Access API)
- [x] Column visibility saved to cookie
- [x] Performance optimized (React.memo, useMemo, useCallback)

### Customer Facing App (customer-facing-app)
- [x] Menu browsing with 35 items across 5 categories
- [x] Platter customization modal (size, cheese, toppings, sauces)
- [x] Cart management (add/remove/quantity adjust)
- [x] Checkout flow (event details, delivery/pickup, date/time)
- [x] Payment options UI (pay later, deposit, full payment)
- [x] Order history page with tab filtering
- [x] Order summary with modify/cancel/pay-now actions
- [x] Dark/light theme toggle with persistence
- [x] Responsive mobile + desktop design
- [x] Touch carousel for promotional offers

---

## What's Missing — The Backend

Both apps currently use **localStorage only**. No real persistence, no auth, no payment processing, no cross-device sync.

---

## Execution Plan

### Phase 1: Backend Foundation (Week 1-2)

**Owner:** Backend Developer(s)

#### 1.1 Project Setup
- [ ] Initialize backend repo (Node/Express + TypeScript recommended for team alignment)
- [ ] Set up PostgreSQL database with migrations (Knex or Prisma)
- [ ] Configure environment management (.env, secrets)
- [ ] Set up CI/CD pipeline (GitHub Actions → deploy)
- [ ] Add request logging, error handling middleware, CORS

#### 1.2 Database Schema

```
organizations     — id, name, type, settings (JSON)
users             — id, org_id, email, password_hash, role (admin/customer)
customers         — id, org_id, name, company, address, phone, email
locations         — id, org_id, name, address, city, state, zip, phone, lat, lng
menu_categories   — id, org_id, name, sort_order
menu_items        — id, category_id, name, description, price, image_url, serves, unit, kcal, active
modifier_groups   — id, item_id, label, required, max_select, sort_order
modifier_options  — id, group_id, name, price, active
events            — id, org_id, customer_id, name, party_size, fulfillment, delivery_address,
                     delivery_instructions, date, time, schedule_mode, repeat_config (JSON),
                     special_requirements
orders            — id, org_id, event_id, order_number, source (online/backoffice), status,
                     kitchen_note, discount, discount_type, discount_amount, tax_exempt,
                     tax_exempt_doc_url, payment_method, created_at, updated_at,
                     cancelled_at, cancel_reason, cancel_notes
order_items       — id, order_id, menu_item_id, name, qty, unit_price, line_total, modifiers (JSON)
transactions      — id, order_id, payment_provider_id, card_last4, amount, type (charge/refund),
                     status, created_at
invoices          — id, order_id, sent_via (email/sms), sent_to, sent_at, pdf_url
```

~14 tables. All queries scoped by `org_id`.

#### 1.3 Auth & Tenancy
- [ ] JWT-based auth (access + refresh tokens)
- [ ] Admin login (back office users)
- [ ] Customer login/guest checkout (customer app)
- [ ] Org-scoped middleware — every query must filter by `org_id`
- [ ] Role-based access (admin vs customer endpoints)

#### 1.4 Core CRUD APIs

| Priority | Endpoint | Method | Used By |
|----------|----------|--------|---------|
| P0 | `/api/auth/login` | POST | Both |
| P0 | `/api/auth/register` | POST | Customer |
| P0 | `/api/menu/categories` | GET | Both |
| P0 | `/api/menu/items` | GET | Both |
| P0 | `/api/menu/items/:id/modifiers` | GET | Both |
| P0 | `/api/locations` | GET | Both |
| P0 | `/api/orders` | POST | Both |
| P0 | `/api/orders` | GET | Both (list) |
| P0 | `/api/orders/:id` | GET | Both (detail) |
| P0 | `/api/orders/:id` | PUT | Back Office |
| P0 | `/api/orders/:id/cancel` | POST | Both |
| P1 | `/api/customers` | GET/POST | Back Office |
| P1 | `/api/customers/search` | GET | Back Office |

---

### Phase 2: Frontend Integration — Back Office (Week 2-3)

**Owner:** Frontend Developer (Back Office)

#### 2.1 Replace localStorage with API calls
- [ ] Create `src/api/client.js` — axios/fetch wrapper with auth headers, error handling
- [ ] Replace `orderStorage.js` → `saveOrder()` calls with `POST/PUT /api/orders`
- [ ] Replace `loadOrders()` / `loadListRows()` with `GET /api/orders` (paginated)
- [ ] Replace `cancelOrder()` with `POST /api/orders/:id/cancel`
- [ ] Replace `exportOrdersJSON()` with `GET /api/orders/export`
- [ ] Add loading states and error handling to all API calls

#### 2.2 Replace hardcoded data
- [ ] Replace `MENU_ITEMS` constant in MenuPage.jsx with `GET /api/menu/items`
- [ ] Replace `snsLocations.json` with `GET /api/locations`
- [ ] Replace `sampleEventListdata.json` / `pastEventsData.json` with `GET /api/orders`

#### 2.3 Auth integration
- [ ] Add login page
- [ ] Store JWT in memory (not localStorage for security)
- [ ] Add auth guard to routes
- [ ] Pass `Authorization: Bearer <token>` in all API calls

#### 2.4 Payment integration
- [ ] Integrate Stripe Elements or Square Web Payments SDK in `CardPaymentModal`
- [ ] Replace local transaction creation with `POST /api/payments/charge`
- [ ] Implement refund flow via `POST /api/payments/refund`
- [ ] Show real transaction status from backend

#### 2.5 Invoice integration
- [ ] Replace simulated send in `SendModal` with `POST /api/invoices/send`
- [ ] Generate real PDF server-side (use puppeteer or pdfkit on backend)
- [ ] Show sent history from `GET /api/orders/:id/invoices`

---

### Phase 3: Frontend Integration — Customer App (Week 2-3, parallel)

**Owner:** Frontend Developer (Customer Facing)

#### 3.1 Replace localStorage with API calls
- [ ] Create `src/api/client.js` — fetch wrapper with auth headers
- [ ] Replace `menuData.js` static import with `GET /api/menu/items` (fetch on mount)
- [ ] Replace localStorage order save in `OrderDetails.jsx:placeOrder()` with `POST /api/orders`
- [ ] Replace localStorage order reads in `MyOrders.jsx` with `GET /api/orders?source=online`
- [ ] Replace localStorage order lookup in `OrderSummary.jsx` with `GET /api/orders/:id`
- [ ] Replace localStorage cancel/payNow with API calls

#### 3.2 Replace hardcoded values
- [ ] Tax rate (10%) and service fee (6%) → from `GET /api/config` or order response
- [ ] Popular items badges → from `menu_items.popular` flag in API
- [ ] Restaurant contact details → from `GET /api/locations/:id`

#### 3.3 Auth integration
- [ ] Add login/register page
- [ ] Guest checkout option (create anonymous session)
- [ ] Protect My Orders page behind auth

#### 3.4 Payment integration
- [ ] Integrate Stripe Elements for card payment in checkout
- [ ] Handle deposit vs full payment amounts
- [ ] Show payment confirmation on order summary

#### 3.5 Real-time order updates
- [ ] Implement SSE or WebSocket for order status changes
- [ ] The `shared/hooks/useSSEOrderListener.ts` has reference implementation — port to JSX
- [ ] Show live status on Order Summary page (Confirmed → Preparing → Ready → Delivered)

---

### Phase 4: Shared Infrastructure (Week 3-4)

**Owner:** Backend + DevOps

#### 4.1 File uploads
- [ ] S3/GCS bucket for tax exemption docs + invoice PDFs
- [ ] Signed URL generation for secure upload/download
- [ ] Wire up back office tax exemption upload

#### 4.2 Email/SMS service
- [ ] Integrate SendGrid or AWS SES for invoice emails
- [ ] Integrate Twilio for SMS invoice links
- [ ] Email confirmations on order placement (customer app)

#### 4.3 Deployment
- [ ] Backend: Deploy to Railway/Render/AWS ECS
- [ ] Back Office: Deploy to Vercel/Netlify (already has `netlify.toml`)
- [ ] Customer App: Deploy to Vercel/Netlify
- [ ] Database: Managed PostgreSQL (Supabase/RDS/Neon)
- [ ] Environment: staging + production

#### 4.4 Monitoring
- [ ] Structured logging with correlation IDs
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring
- [ ] Database query performance monitoring

---

## Risk Areas & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Payment idempotency** | Double charges | Use idempotency keys on charge endpoints; deduplicate by order_id + amount |
| **Concurrent order edits** | Data loss | Optimistic locking with `updated_at` version check |
| **Multi-tenant data leak** | Security breach | Every query scoped by `org_id`; middleware enforced, integration tested |
| **Cart/order sync** | Stale data | Cart lives client-side until checkout; order creation is atomic server-side |
| **Recurring events** | Complex scheduling | Start with one-time only; add repeat logic in Phase 4 |
| **Large menu loads** | Slow page | Paginate menu items; cache with SWR/React Query on frontend |

---

## Team Allocation Suggestion

| Role | Scope | Weeks |
|------|-------|-------|
| **Backend Dev 1** | DB schema, Auth, Orders CRUD, Menu/Location APIs | Week 1-3 |
| **Backend Dev 2** | Payment gateway, Invoice PDF, Email/SMS, File uploads | Week 2-4 |
| **Frontend Dev 1** | Back Office API integration (replace localStorage, auth, payment) | Week 2-3 |
| **Frontend Dev 2** | Customer App API integration (replace localStorage, auth, real-time) | Week 2-3 |
| **DevOps** | CI/CD, deployment, monitoring, staging env | Week 3-4 |

**Critical path:** Backend API (Phase 1) blocks both frontend integrations (Phase 2-3).
Start backend immediately. Frontend devs can begin auth + API client scaffolding in parallel.

---

## Definition of Done

### MVP (Week 4)
- [ ] Admin can create/edit/cancel orders via back office → saved to database
- [ ] Customer can browse menu, build cart, place order → saved to database
- [ ] Admin can see customer orders in the event list
- [ ] Card payment processes through Stripe/Square (test mode)
- [ ] Invoice can be emailed as PDF
- [ ] Both apps deployed to staging

### Production Ready (Week 6)
- [ ] Auth working on both apps
- [ ] Real payment processing with PCI compliance
- [ ] Order status updates flow from admin to customer in real-time
- [ ] Email/SMS notifications on order placement and status changes
- [ ] Recurring event scheduling
- [ ] Production deployment with monitoring and alerting
