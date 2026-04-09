# Catering & Events — Design & Implementation Document

> **Figma Reference:** [Catering Design](https://www.figma.com/design/HDWUCbrZkw7tJ4WheKqfde/Catering?node-id=159-9398&t=BTjQkjpoMgtE6dQa-1)
> **Repository:** [anandg-nova/catering-app](https://github.com/anandg-nova/catering-app)
> **Last Updated:** 2026-04-09

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Design System](#4-design-system)
5. [Screen-by-Screen Implementation](#5-screen-by-screen-implementation)
6. [Component Reference](#6-component-reference)
7. [Data Flow](#7-data-flow)
8. [State Management](#8-state-management)
9. [Data Models](#9-data-models)
10. [Persistence Layer](#10-persistence-layer)
11. [Security](#11-security)
12. [Performance Optimizations](#12-performance-optimizations)
13. [Configuration & Constants](#13-configuration--constants)
14. [Backend Integration Points](#14-backend-integration-points)
15. [Build & Run](#15-build--run)

---

## 1. Overview

A micro-frontend React application for managing catering and event orders. The app provides a full order lifecycle — from customer intake through menu selection, payment, and invoice generation.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Event List** | Paginated, sortable, filterable table of upcoming & past events |
| **Order Wizard** | 3-step form: Customer/Event Details → Menu/Location → Payment |
| **Menu Management** | 4-column item grid with modifiers, search, and open items |
| **Payment Processing** | Card, check, payment link, house account with partial payment support |
| **Invoice Preview** | Banquet Event Order format with print and email/SMS send |
| **Order Persistence** | localStorage + File System Access API + JSON download fallback |
| **Security Hardening** | CSP, devtools blocking, clipboard redaction, session timeout |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19.2 (Create React App 5.0.1) |
| Styling | Vanilla CSS with CSS custom properties (design tokens) |
| State | React useState/useRef (component-local, lifted to orchestrator) |
| Persistence | localStorage + File System Access API |
| Icons | Inline SVG components (shared library) |
| Build | react-scripts (Webpack 5) |

---

## 2. Architecture

### Micro-Frontend Module Layout

```
App.js (Router + Security + Session)
├── CateringList.jsx ─────────── List Page (Upcoming + Past tabs)
│   ├── PaymentBadge
│   ├── CancelOrderModal
│   ├── ActionMenu
│   ├── ColumnPicker (portal)
│   └── FilterPanel (slide-in)
│
└── CreateEventOrder.jsx ─────── 3-Step Wizard Orchestrator
    ├── Stepper ──────────────── Progress indicator
    ├── CustomerEventInfo ────── Tab 1: Customer + Event form
    │   └── FloatInput (shared)
    ├── MenuPage ─────────────── Tab 2: Location + Menu grid
    │   ├── ModifiersPanel ──── Slide-in customization panel
    │   └── OpenItemModal ───── Custom item creation
    ├── PaymentTab ───────────── Tab 3: Discounts + Payment + Transactions
    │   ├── CardPaymentModal ── Card details form
    │   ├── TransactionRow ──── Transaction history line
    │   └── OrderSummary ────── Sticky sidebar with totals
    └── InvoicePreview ───────── Banquet Event Order modal
        └── SendModal ────────── Email/SMS dispatch
```

### Layer Dependencies

```
                  ┌─────────────┐
                  │   App.js    │  Router, session timeout
                  └──────┬──────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
   ┌────────────────┐      ┌──────────────────────┐
   │  CateringList  │      │  CreateEventOrder    │  Wizard orchestrator
   └────────┬───────┘      └──────────┬───────────┘
            │                         │
            │              ┌──────────┼──────────────┐
            ▼              ▼          ▼              ▼
   ┌──────────────┐ ┌───────────┐ ┌────────┐ ┌──────────┐
   │ orderStorage │ │ EventInfo │ │ Menu   │ │ Payment  │
   │    .js       │ │ (Tab 1)  │ │(Tab 2) │ │ (Tab 3)  │
   └──────────────┘ └───────────┘ └────────┘ └──────────┘
            │                         │
            ▼                         ▼
   ┌──────────────┐         ┌──────────────────┐
   │ localStorage │         │ shared/          │
   │ File System  │         │  constants.js    │
   │ API          │         │  icons.jsx       │
   └──────────────┘         │  FloatInput.jsx  │
                            │  tokens.css      │
                            └──────────────────┘
```

---

## 3. Project Structure

```
my-app/
├── public/
│   ├── index.html              ← Shell HTML (title: "Nova Platform Inc.")
│   ├── favicon.ico
│   ├── manifest.json           ← PWA manifest
│   └── robots.txt
│
├── src/
│   ├── App.js                  ← Root: page routing + session timeout
│   ├── App.css                 ← Global styles (924 lines)
│   ├── index.js                ← Entry point + security init
│   ├── index.css               ← CSS reset
│   ├── security.js             ← CSP injection + runtime protections
│   │
│   ├── CateringList.jsx        ← Event list page (1188 lines)
│   ├── CateringList.css        ← List styles (1128 lines)
│   │
│   ├── CreateEventOrder.jsx    ← 3-step wizard orchestrator (273 lines)
│   ├── CreateEventOrder.css    ← Wizard layout styles
│   │
│   ├── orderStorage.js         ← Persistence layer (332 lines)
│   │
│   ├── shared/
│   │   ├── constants.js        ← Centralized config values
│   │   ├── tokens.css          ← CSS design tokens (colors, radius, shadows)
│   │   ├── icons.jsx           ← 20+ SVG icon components
│   │   ├── FloatInput.jsx      ← Memoized floating-label input
│   │   └── FloatInput.css
│   │
│   ├── features/
│   │   ├── Stepper/            ← 3-step progress bar
│   │   ├── CustomerEventInfo/  ← Tab 1: Customer + Event details form
│   │   ├── MenuPage/           ← Tab 2: Location dropdown + menu grid
│   │   ├── Modifiers/          ← Slide-in modifier panel
│   │   ├── OpenItem/           ← Custom item modal
│   │   ├── Payment/            ← Tab 3: Discounts, methods, transactions
│   │   └── Invoice/            ← Banquet Event Order preview + send
│   │
│   └── [data files]
│       ├── snsLocations.json       ← 80 Steak 'n Shake locations
│       ├── sampleEventListdata.json← 7 seed upcoming events
│       ├── pastEventsData.json     ← 50+ past events
│       └── orders.json             ← 6 saved order records
│
├── package.json
└── package-lock.json
```

### File Statistics

| Category | Files | Lines of Code |
|----------|-------|---------------|
| Components (JSX) | 11 | ~3,250 |
| Stylesheets (CSS) | 13 | ~3,040 |
| Data (JSON) | 4 | ~1,800 |
| Utilities (JS) | 3 | ~385 |
| **Total** | **31** | **~8,475** |

---

## 4. Design System

### Design Tokens (`shared/tokens.css`)

#### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#2563eb` | Buttons, links, active states |
| `--color-primary-dark` | `#1d4ed8` | Hover states |
| `--color-primary-bg` | `#eff6ff` | Selected backgrounds |
| `--color-primary-border` | `#bfdbfe` | Active borders |
| `--color-success` | `#22c55e` | Completed steps, paid badges |
| `--color-warning` | `#f59e0b` | Partial payment badges |
| `--color-danger` | `#ef4444` | Cancel, errors, required marks |
| `--color-text` | `#111827` | Primary text |
| `--color-text-secondary` | `#6b7280` | Subtitles, labels |
| `--color-text-muted` | `#9ca3af` | Hints, placeholders |
| `--color-border` | `#e5e7eb` | Card borders |
| `--color-bg` | `#f9fafb` | Page background |

#### Spacing & Radius

| Token | Value |
|-------|-------|
| `--radius-sm` | `8px` |
| `--radius-md` | `10px` |
| `--radius-lg` | `14px` |
| `--radius-xl` | `16px` |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.06)` |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` |
| `--shadow-lg` | `0 12px 40px rgba(0,0,0,0.12)` |

### Shared Components

| Component | File | Usage |
|-----------|------|-------|
| `FloatInput` | `shared/FloatInput.jsx` | Floating-label text input — memoized with `React.memo` |
| `icons.jsx` | `shared/icons.jsx` | 20+ SVG icon components (Check, Close, Search, Upload, Card, Email, SMS, Print, etc.) |
| `.btn-primary` | `tokens.css` | Blue filled button |
| `.btn-secondary` | `tokens.css` | White outlined button |
| `.card` | `tokens.css` | White rounded container with shadow |
| `.badge-*` | `tokens.css` | Payment status pills (paid/partial/unpaid) |

---

## 5. Screen-by-Screen Implementation

### Screen 1-3 → `CustomerEventInfo.jsx` (Figma Tab 1)

**Figma Reference:** Event & Customer Details screens

| Section | Fields | Implementation |
|---------|--------|----------------|
| **Customer Details** | Name*, Company, Address, Phone, Email | `FloatInput` components in 2-column grid |
| **Event Details** | Event Name*, Party Size | `FloatInput` components |
| **Fulfillment** | Pickup / Delivery radio | Custom radio dots with conditional delivery address fields |
| **Date & Time** | Date picker, Time picker, AM/PM toggle | Native `<input type="date/time">` + custom AM/PM buttons |
| **Schedule** | One-time / Repeats toggle cards | Icon toggle cards with OneTimeIcon/RepeatIcon |
| **Repeat Options** | Every Day/Week/Month, day picker, end mode | Conditional sections: week = day buttons (S-S), month = date picker |

### Screen 4 → `MenuPage.jsx` (Figma Tab 2)

**Figma Reference:** Restaurant Location & Menu screen

| Section | Implementation |
|---------|----------------|
| **Location Dropdown** | `<select>` populated from `snsLocations.json` (top 20) |
| **Category Tabs** | All / Mains / Sides / Dessert / Drink filter buttons |
| **Search** | Text input with `SearchIcon`, memoized filtering via `useMemo` |
| **Menu Grid** | 4-column responsive grid of item cards with image, name, description, price |
| **Item Badges** | "Added" / "Customized" / "x{qty}" overlay on selected items |
| **Open Item Button** | Opens `OpenItemModal` for custom items |
| **Order Summary Sidebar** | Sticky right panel showing cart items, modifier details, running total |

**Menu Items (12 predefined):**

| Category | Items |
|----------|-------|
| Mains | Original Double Steakburger, Frisco Melt, Garlic Double Steakburger, Grilled Chicken Sandwich |
| Sides | Chili Cheese Fries, Thin 'n Crispy Fries, Onion Rings, Calamari Rings, Mac & Cheese |
| Dessert | Chocolate Milkshake, Strawberry Milkshake |
| Drink | Soft Drink |

### Screen 5 → `Modifiers.jsx`

**Figma Reference:** Modifier slide-in panel

| Feature | Implementation |
|---------|----------------|
| **Slide Animation** | CSS transform + `requestAnimationFrame` for smooth entrance |
| **Item Info** | Image, name, kcal badge, description at top |
| **Modifier Groups** | Required (with warning) / Optional groups, radio (maxSelect=1) or checkbox selection |
| **Max Selection** | Visual "Max N reached" message, disabled buttons when limit hit |
| **Quantity Stepper** | -/N/+ buttons in footer with MinusIcon/PlusIcon |
| **Validation** | Confirm button disabled until all required groups have selections |

### Screen 6 → `OpenItem.jsx`

**Figma Reference:** Open Item center modal

| Field | Type | Validation |
|-------|------|------------|
| Name | Text input | Required, trimmed |
| Quantity | Number input | Required, > 0 |
| Price | Number input with $ symbol | Required |

### Screens 7-10 → `Payment.jsx` (Figma Tab 3)

**Figma Reference:** Payment screens

| Section | Implementation |
|---------|----------------|
| **Discount** | Text input + `$/%` toggle buttons |
| **Tax Exemption** | Toggle switch, conditional file upload area |
| **File Upload** | Hidden `<input type="file">` with drop zone UI, accepts PDF/JPG/PNG |
| **Payment Methods** | 4 icon cards: Card, Check, Payment Link, House |
| **Card Modal (Screen 7)** | Holder, Number (auto-dash formatting), Expiry, CVV, pay type radios, billing address |
| **Partial Payment** | Amount field shown when "Partial Payment" radio selected |
| **Billing Address** | Input + "Same as delivery" checkbox |
| **Transaction History** | Table rows: Card, Transaction ID, Date, Amount, Refund/Cancel links |
| **Add Card** | Button to open card modal again |
| **Order Summary** | Sticky sidebar: kitchen notes toggle, cart items, subtotal/tax/total/paid/balance |

### Screen 11 → `Invoice.jsx`

**Figma Reference:** Invoice preview modal

| Section | Implementation |
|---------|----------------|
| **Header** | Organization box (configurable via `ORG_NAME`), event date, order #, partial badge |
| **Banquet Event Order** | Account, Contact, Email, Phone, Sales Manager, Order Type |
| **Event Summary Table** | Name/Party, Date, Time, Type, Party Size, Order Type |
| **Food Items Table** | Qty, Description (with modifiers), Price/ea, Total, F&B subtotal |
| **Setup Section** | Event time, delivery/pickup info |
| **Billing Table** | Subtotal, Tax (8.25%), Grand Total |
| **Print** | `window.print()` with `@media print` hiding chrome |
| **Send Modal** | Email tab (PDF attachment) / SMS tab (URL link), simulated 1.2s send delay |

---

## 6. Component Reference

### Props Matrix

| Component | Props | Type |
|-----------|-------|------|
| `App` | — | — |
| `CateringList` | `onNewOrder`, `onEditOrder` | `() => void`, `(row) => void` |
| `CreateEventOrder` | `onCancel`, `editData?` | `() => void`, `object` |
| `Stepper` | `current`, `onStepClick` | `number`, `(i) => void` |
| `CustomerEventInfo` | `data`, `onChange` | `EventData`, `(data) => void` |
| `MenuPage` | `data`, `onChange`, `deliveryAddress` | `MenuData`, `(data) => void`, `string` |
| `ModifiersPanel` | `item`, `onClose`, `onConfirm` | `MenuItem`, `() => void`, `(item, selections, qty) => void` |
| `OpenItemModal` | `onClose`, `onAddToCart` | `() => void`, `({name, qty, price}) => void` |
| `PaymentTab` | `data`, `onChange`, `cart`, `kitchenNote`, `setKitchenNote`, `deliveryAddress`, `onPreview` | mixed |
| `InvoicePreview` | `onClose`, `eventData`, `cart`, `orderNumber` | mixed |
| `FloatInput` | `label`, `value`, `onChange`, `type?`, `placeholder?`, `readOnly?`, `required?` | mixed |

### Icon Library (`shared/icons.jsx`)

20 SVG icon components, all functional components returning inline SVG:

`CheckIcon` `CheckCircleIcon` `DeliveryIcon` `PickupIcon` `RepeatIcon` `OneTimeIcon` `SearchIcon` `UploadIcon` `ChevronDown` `CloseIcon` `CalendarIcon` `CardPaymentIcon` `CheckPaymentIcon` `QRCodeIcon` `HousePaymentIcon` `PlusIcon` `MinusIcon` `EmailIcon` `SMSIcon` `PrintIcon`

---

## 7. Data Flow

### Order Creation Flow

```
CateringList (row click or "New Order")
    │
    ▼
App.js ─── setPage("create" | "edit") + setEditRow(row)
    │
    ▼
CreateEventOrder ─── receives editData prop
    │
    ├── mapRowToEventData(editData) → Tab 1 state (eventData)
    ├── mapRowToMenuData(editData)  → Tab 2 state (menuData)
    └── mapRowToPaymentData(editData) → Tab 3 state (paymentData)
    │
    ▼  [User fills 3 tabs]
    │
    ├── Tab 1: CustomerEventInfo ── writes → eventData
    ├── Tab 2: MenuPage ──────────── writes → menuData (cart + location)
    └── Tab 3: PaymentTab ─────────── writes → paymentData (transactions synced)
    │
    ▼  [Confirm Order]
    │
    handleConfirm() ── builds order object
    │
    ▼
    saveOrder(order)  ── orderStorage.js
    │
    ├── 1. localStorage (ORDERS_KEY) ── immediate
    ├── 2. List cache (LIST_KEY) ────── for CateringList reads
    ├── 3. File System Access API ───── orders.json on disk
    └── 4. Download fallback ────────── if FSA unavailable
```

### Cart Data Flow

```
MenuPage (item click)
    │
    ├── No modifiers → addToCart(item, {}, 1) directly
    │
    └── Has modifiers → opens ModifiersPanel
                            │
                            ▼
                        onConfirm(item, selections, qty)
                            │
                            ▼
                        addToCart() → merges into menuData.cart
    │
    ▼
menuData.cart ── passed to PaymentTab → OrderSummary sidebar
                                    └── InvoicePreview modal
```

---

## 8. State Management

### State Architecture

All state is managed via React `useState` hooks, lifted to the nearest common ancestor. No external state library is used.

| State Scope | Owner | Consumers |
|-------------|-------|-----------|
| Page routing (`page`, `editRow`) | `App.js` | CateringList, CreateEventOrder |
| Session expiry | `App.js` | SessionExpired modal |
| Event data | `CreateEventOrder` | CustomerEventInfo |
| Menu data (cart + location) | `CreateEventOrder` | MenuPage, PaymentTab, InvoicePreview |
| Payment data (transactions synced) | `CreateEventOrder` | PaymentTab |
| Kitchen notes | `CreateEventOrder` | PaymentTab → OrderSummary |
| Wizard step | `CreateEventOrder` | Stepper |
| List filters/sort/pagination | `CateringList` | Internal sub-components |
| Column visibility | `CateringList` | ColumnPicker, persisted to cookie |

### State Initialization on Edit

When editing an existing order, three mapper functions hydrate the wizard state:

```javascript
mapRowToEventData(editData)   → eventData    // Customer + event fields
mapRowToMenuData(editData)    → menuData     // Cart + selected location
mapRowToPaymentData(editData) → paymentData  // Payment method + transactions
```

If the row carries `_fullOrder` (stashed by orderStorage), perfect round-trip fidelity is achieved by using the full order object directly.

---

## 9. Data Models

### EventData

```typescript
{
  customerName: string       // Required
  companyName: string
  address: string
  phone: string
  email: string
  eventName: string          // Required
  partySize: string
  fulfillment: 'pickup' | 'delivery'
  deliveryAddress: string
  deliveryInstructions: string
  date: string               // Required (ISO format)
  time: string               // e.g. '10:30'
  meridiem: 'AM' | 'PM'
  scheduleMode: 'one-time' | 'repeats'
  repeatUnit: 'Day' | 'Week' | 'Month'
  repeatDays: boolean[7]     // Sun-Sat
  repeatDate: string
  endsMode: 'Until turned off' | 'Ends After'
  endsDate: string
}
```

### MenuData

```typescript
{
  cart: CartItem[]
  selectedLocation: Location | null
}

CartItem = {
  id: number | string        // numeric for menu items, "open-{timestamp}" for custom
  name: string
  mods: string[]             // Modifier display names
  price: number              // Unit price including modifier upcharges
  qty: number
}

Location = {
  id: number
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  lat: number
  lng: number
}
```

### PaymentData

```typescript
{
  discount: string
  discountType: '$' | '%'
  discountAmount: number
  taxExemption: boolean
  uploadedFile: string       // filename
  paymentMethod: 'card' | 'check' | 'link' | 'house' | ''
  transactions: Transaction[]
}

Transaction = {
  card: string               // Masked card number e.g. '*******4356'
  txId: string
  date: string
  amount: number
}
```

### Enriched Order (Export Format)

The `enrichOrder()` function in `orderStorage.js` produces a flattened, API-ready object:

```typescript
{
  orderNumber: string
  orderSource: 'online' | 'backoffice'
  status: 'confirmed' | 'cancelled'
  createdAt: string
  updatedAt: string
  cancelledAt: string | null
  cancelReason: string | null
  cancelNotes: string | null
  kitchenNote: string
  customer: { name, company, address, phone, email }
  event: { name, partySize, fulfillment, deliveryAddress, ... }
  storeLocation: { id, address, city, state, zip, phone } | null
  cart: [{ id, name, qty, unitPrice, lineTotal, modifiers }]
  financials: { subTotal, discount, discountType, discountAmount, taxExemption, taxAmount, total, paid, balance }
  payment: { method, transactions: [...], uploadedDocument }
}
```

---

## 10. Persistence Layer

### `orderStorage.js` — Three-Tier Storage

```
┌─────────────────────────────────────────────────┐
│                  saveOrder(order)                 │
└──────────────────────┬──────────────────────────┘
                       │
    ┌──────────────────┼──────────────────┐
    ▼                  ▼                  ▼
┌────────┐     ┌─────────────┐    ┌────────────┐
│ Cache  │     │  File Save  │    │  Download  │
│ (L/S)  │     │  (FSA API)  │    │  Fallback  │
└────────┘     └─────────────┘    └────────────┘
  Always         Chrome/Edge       Firefox/Safari
  instant        86+ only          or user decline
```

### Exported API

| Function | Description |
|----------|-------------|
| `saveOrder(order)` | Create or update an order across all three tiers |
| `cancelOrder(orderNumber, reason, notes)` | Mark order cancelled, update both caches |
| `loadOrders()` | Read all orders from localStorage |
| `loadListRows()` | Read event list rows from localStorage (optimized for table) |
| `exportOrdersJSON()` | Download `orders.json` with enriched payload |
| `buildExportPayload(orders)` | Build export-ready JSON structure |

### Storage Keys

| Key | Content |
|-----|---------|
| `ceo_orders` | Full order objects |
| `ceo_event_list` | Flattened list rows for table display |
| `catering_columns` | Column visibility preferences (cookie) |

---

## 11. Security

### Initialization

Security is initialized once at boot in `index.js` (outside the React lifecycle) via `security.js`:

```javascript
// index.js
import { injectSecurityHeaders, applyRuntimeSecurity } from './security';
injectSecurityHeaders();
applyRuntimeSecurity();
```

### Content Security Policy

```
default-src 'self';
script-src  'self' 'unsafe-inline';
style-src   'self' 'unsafe-inline';
img-src     'self' data: https://images.unsplash.com https://picsum.photos;
connect-src 'self' https://api.anthropic.com;
frame-ancestors 'none';
form-action 'self';
```

### Runtime Protections

| Protection | Method |
|------------|--------|
| DevTools blocked | F12, Ctrl+Shift+I/J/C/U, Cmd+Option+I/J intercepted |
| Right-click disabled | `contextmenu` event prevented |
| Drag-and-drop disabled | `dragstart` event prevented |
| Card number redaction | Clipboard `copy` event — regex `\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}` replaced with `[REDACTED]` |
| Session timeout | 15-minute idle timer (configurable via `SESSION_TIMEOUT_MINUTES`) with lock screen overlay |
| Clickjacking prevention | `frame-ancestors 'none'` in CSP |

---

## 12. Performance Optimizations

### Memoization

| Optimization | File | Impact |
|-------------|------|--------|
| `React.memo` on FloatInput | `shared/FloatInput.jsx` | Prevents re-render of ~15 input fields per keystroke |
| `useMemo` for menu filtering | `MenuPage.jsx` | Avoids re-filtering 12 items on unrelated state changes |
| `useMemo` for cart derivation | `MenuPage.jsx` | Stable reference for `useCallback` dependencies |
| `useMemo` for modifier groups | `Modifiers.jsx` | Stable reference for validation computation |
| `useMemo` for `requiredMet` | `Modifiers.jsx` | Memoized validation across re-renders |
| `useMemo` for `allEvents` | `CateringList.jsx` | Rebuilds only when `refreshKey` changes |
| `useMemo` for location options | `MenuPage.jsx` | Computed once, never recomputed |

### useCallback

| Handler | File | Purpose |
|---------|------|---------|
| `addToCart`, `handleCardClick`, `handleOpenItemAdd`, `removeFromCart` | `MenuPage.jsx` | Stable function references |
| `set`, `toggleDay` | `CustomerEventInfo.jsx` | Works with memoized FloatInput |
| `handleClose`, `toggleOption`, `isSelected`, `handleConfirm` | `Modifiers.jsx` | Prevents child re-renders |
| `set`, `setTransactions` | `Payment.jsx` | Functional updates avoid stale closures |
| `showToast` | `CreateEventOrder.jsx` | Timer-safe with ref cleanup |
| `handleTimeout` | `App.js` | Stable reference for session timeout |

### Other Optimizations

| Optimization | Description |
|-------------|-------------|
| Security at boot | `injectSecurityHeaders()` and `applyRuntimeSecurity()` run once in `index.js`, not in App useEffect |
| CSS keyframes in stylesheet | Moved from inline `<style>` tag to `CreateEventOrder.css` |
| Ref-based session timeout | Uses `useRef` for callback to avoid re-registering window events |
| Toast timer cleanup | `clearTimeout` on unmount prevents memory leaks |
| Stable cart keys | `key={item.id-mods-index}` instead of index-only for correct reconciliation |
| Intersection Observer pagination | Lazy-loads table rows as user scrolls (CateringList) |

---

## 13. Configuration & Constants

All configurable values are centralized in `shared/constants.js`:

```javascript
export const TAX_RATE = 0.0825;                    // 8.25% sales tax
export const SESSION_TIMEOUT_MINUTES = 15;          // Idle timeout
export const MAX_LOCATION_OPTIONS = 20;             // Location dropdown limit
export const PAGE_SIZE = 10;                        // Table pagination
export const DEFAULT_DATE_RANGE_DAYS = 7;           // Past events default filter
export const TOAST_DURATION_MS = 3000;              // Notification display time
export const ORG_NAME = '7 Leaves';                 // Organization name
export const ORG_TYPE = 'Restaurant';               // Organization type

export const PAYMENT_TYPES = [                      // Card payment modal options
  { key: 'pay-now',      label: 'Pay now' },
  { key: 'pay-delivery', label: 'Pay at delivery' },
  { key: 'partial',      label: 'Partial Payment' },
];

export const MENU_CATEGORIES = ['All', 'Mains', 'Sides', 'Dessert', 'Drink'];
```

**Consumers:** `App.js`, `CateringList.jsx`, `CreateEventOrder.jsx`, `MenuPage.jsx`, `Payment.jsx`, `Invoice.jsx`, `orderStorage.js`

---

## 14. Backend Integration Points

The frontend is designed with explicit API hook points for backend migration. The primary integration surface is `orderStorage.js`.

### API Endpoints Required

| Method | Endpoint | Frontend Consumer | Purpose |
|--------|----------|-------------------|---------|
| `POST` | `/api/orders` | `saveOrder()` | Create new order |
| `PUT` | `/api/orders/:id` | `saveOrder()` | Update existing order |
| `GET` | `/api/orders` | `loadOrders()` | List all orders |
| `GET` | `/api/orders/:id` | `loadListRows()` | Get single order |
| `POST` | `/api/orders/:id/cancel` | `cancelOrder()` | Cancel with reason/notes |
| `GET` | `/api/menu-items` | `MENU_ITEMS` constant | Replace hardcoded menu |
| `GET` | `/api/locations` | `snsLocations.json` | Replace static location data |
| `POST` | `/api/payments/charge` | `CardPaymentModal.onSave` | Process card payment |
| `POST` | `/api/payments/refund` | `TransactionRow.onRefund` | Process refund |
| `POST` | `/api/invoices/send` | `SendModal.handleSend` | Email/SMS invoice |
| `POST` | `/api/uploads` | Tax exemption file | Upload document |
| `GET` | `/api/customers/search` | CustomerEventInfo | Customer lookup |

### Migration Strategy

1. **Phase 1:** Replace `saveOrder()` / `loadOrders()` with `fetch()` calls. Keep localStorage as offline cache.
2. **Phase 2:** Replace `MENU_ITEMS` constant and `snsLocations.json` with API-driven data.
3. **Phase 3:** Integrate payment gateway (Stripe/Square) for real card processing.
4. **Phase 4:** Implement real invoice PDF generation and email/SMS dispatch.

### Commented API Hook (in `orderStorage.js`)

```javascript
// async function saveOrderToAPI(order) {
//   const response = await fetch('/api/orders', {
//     method:  order.createdAt === order.updatedAt ? 'POST' : 'PUT',
//     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
//     body:    JSON.stringify(enrichOrder(order)),
//   });
//   if (!response.ok) throw new Error(`API error: ${response.status}`);
//   return response.json();
// }
```

---

## 15. Build & Run

### Prerequisites

- Node.js 18+ (tested on v25.2.1)
- npm 9+

### Commands

```bash
# Install dependencies
npm install

# Development server (default port 3000)
npm start

# Development server on custom port
PORT=3001 npm start

# Production build
npm run build

# Run tests
npm test
```

### Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Dev server port |
| `BROWSER` | (system default) | Browser to open on start |
| `GENERATE_SOURCEMAP` | `true` | Source maps in production build |

### Build Output

```
build/
├── static/
│   ├── js/main.[hash].js       ← ~93 KB gzipped
│   ├── css/main.[hash].css     ← ~11 KB gzipped
│   └── js/453.[hash].chunk.js  ← ~1.8 KB gzipped
├── index.html
└── [static assets]
```

---

## Appendix: Figma Screen Mapping

| Figma Screen | Component | File |
|-------------|-----------|------|
| Screen 1 — Customer Details | CustomerEventInfo | `features/CustomerEventInfo/CustomerEventInfo.jsx` |
| Screen 2 — Event Details | CustomerEventInfo | `features/CustomerEventInfo/CustomerEventInfo.jsx` |
| Screen 3 — Repeat Scheduling | CustomerEventInfo | `features/CustomerEventInfo/CustomerEventInfo.jsx` |
| Screen 4 — Menu & Location | MenuPage | `features/MenuPage/MenuPage.jsx` |
| Screen 5 — Modifiers Panel | ModifiersPanel | `features/Modifiers/Modifiers.jsx` |
| Screen 6 — Open Item Modal | OpenItemModal | `features/OpenItem/OpenItem.jsx` |
| Screen 7 — Card Payment Modal | CardPaymentModal | `features/Payment/Payment.jsx` |
| Screen 8 — Payment Tab | PaymentTab | `features/Payment/Payment.jsx` |
| Screen 9 — Transaction History | PaymentTab | `features/Payment/Payment.jsx` |
| Screen 10 — Order Summary | OrderSummary | `features/Payment/Payment.jsx` |
| Screen 11 — Invoice Preview | InvoicePreview | `features/Invoice/Invoice.jsx` |
| List — Upcoming Events | CateringList | `CateringList.jsx` |
| List — Past Events | CateringList | `CateringList.jsx` |
| Modal — Cancel Order | CancelOrderModal | `CateringList.jsx` |
| Modal — Session Expired | SessionExpired | `App.js` |
