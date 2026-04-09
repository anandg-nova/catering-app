# Catering & Events — Micro-Frontend Architecture

## Project Structure

```
my-app/src/
│
├── App.js                          ← Root navigator + security hardening
├── App.css                         ← Global app shell styles
│
├── CateringList.jsx                ← List page (Upcoming + Past Events)
├── CateringList.css
│
├── baseEventsData.json             ← 8 upcoming seed records (generates 250)
├── pastEventsData.json             ← 100 past event records
│
└── src/                            ← Micro-frontend feature modules
    │
    ├── CreateEventOrder.jsx        ← 3-step wizard orchestrator
    ├── CreateEventOrder.css
    │
    ├── snsLocations.json           ← 80 Steak 'n Shake locations
    │
    ├── shared/                     ← Reusable design system primitives
    │   ├── tokens.css              ← CSS variables, colors, typography
    │   ├── icons.jsx               ← All shared SVG icon components
    │   ├── FloatInput.jsx          ← Floating label input field
    │   └── FloatInput.css
    │
    └── features/                   ← Isolated micro-frontend features
        │
        ├── Stepper/
        │   ├── Stepper.jsx         ← 3-step progress indicator
        │   └── Stepper.css
        │
        ├── EventDetails/           ← Tab 1 — Figma screens 1, 2, 3
        │   ├── CustomerEventInfo.jsx    ← Customer + Event form, repeat scheduling
        │   └── CustomerEventInfo.css
        │
        ├── MenuPage/               ← Tab 2 — Figma screen 4
        │   ├── MenuPage.jsx        ← 4-col grid, location dropdown, cart sidebar
        │   └── MenuPage.css
        │
        ├── Modifiers/              ← Figma screen 5
        │   ├── Modifiers.jsx       ← Right slide-in panel, qty stepper
        │   └── Modifiers.css
        │
        ├── OpenItem/               ← Figma screen 6
        │   ├── OpenItem.jsx        ← Center modal, Name/Qty/Price → cart
        │   └── OpenItem.css
        │
        ├── Payment/                ← Tab 3 — Figma screens 7, 8, 9, 10
        │   ├── Payment.jsx         ← Discount, tax, payment methods, transactions
        │   └── Payment.css         ← Includes card modal (screen 7) + order summary
        │
        └── Invoice/                ← Figma screen 11
            ├── Invoice.jsx         ← PDF preview modal + Send (Email/SMS)
            └── Invoice.css
```

## File Copy Instructions

Copy these files into `my-app/src/` exactly as shown:

| File | Destination |
|------|-------------|
| `App.js` | `src/App.js` |
| `App.css` | `src/App.css` |
| `CateringList.jsx` | `src/CateringList.jsx` |
| `CateringList.css` | `src/CateringList.css` |
| `baseEventsData.json` | `src/baseEventsData.json` |
| `pastEventsData.json` | `src/pastEventsData.json` |
| `src/CreateEventOrder.jsx` | `src/src/CreateEventOrder.jsx` |
| `src/CreateEventOrder.css` | `src/src/CreateEventOrder.css` |
| `src/snsLocations.json` | `src/src/snsLocations.json` |
| `src/shared/tokens.css` | `src/src/shared/tokens.css` |
| `src/shared/icons.jsx` | `src/src/shared/icons.jsx` |
| `src/shared/FloatInput.jsx` | `src/src/shared/FloatInput.jsx` |
| `src/shared/FloatInput.css` | `src/src/shared/FloatInput.css` |
| `src/features/Stepper/*` | `src/src/features/Stepper/` |
| `src/features/CustomerEventInfo/*` | `src/src/features/CustomerEventInfo/` |
| `src/features/MenuPage/*` | `src/src/features/MenuPage/` |
| `src/features/Modifiers/*` | `src/src/features/Modifiers/` |
| `src/features/OpenItem/*` | `src/src/features/OpenItem/` |
| `src/features/Payment/*` | `src/src/features/Payment/` |
| `src/features/Invoice/*` | `src/src/features/Invoice/` |

## Feature Responsibilities

### CateringList
- Upcoming Events tab (250 generated, sort asc/desc by date)
- Past Events tab (quick days dropdown + slide-in filter panel)
- Column picker via portal, column resizing
- Cancel Order modal, Order number → edit navigation
- Security: right-click disabled, devtools blocked, clipboard protection

### CreateEventOrder (orchestrator)
- Receives `editData` from list row → pre-populates all fields
- Manages 3-step state: `eventData`, `menuData`, `paymentData`
- Passes cart to both Payment and Invoice
- `mapRowToEventData()` — maps list fields to Tab 1 state
- `mapRowToPaymentData()` — maps list fields to Tab 3 state

### EventDetails (Tab 1)
- Customer Details section (name, company, address, phone, email)
- Event Details section (name, party size, pickup/delivery, date/time)
- AM/PM toggle
- One-time vs Repeats (Week = day picker, Month = date picker)
- Ends: Until turned off / Ends After (date picker)

### MenuPage (Tab 2)
- Location dropdown from `snsLocations.json`
- 4-column menu grid, category filter tabs, search
- Click → if no modifiers: add to cart instantly
- Click → if has modifiers: opens Modifiers slide panel
- Open Item modal for custom items
- Sticky order summary sidebar

### Modifiers Panel
- Slides in from right with backdrop
- Per-item modifier groups (required/optional, radio/checkbox)
- Quantity stepper (−/N/+) in footer
- Confirm disabled until required groups filled

### Payment (Tab 3)
- Discount input ($/%toggle) + Tax Exemption toggle + file upload
- 4 payment method tiles (Card, Check, Payment Link, House)
- Card Payment → opens CardPaymentModal (screen 7)
- Card: holder, number (auto-formats), expiry, CVV
- Pay now / Pay at delivery / Partial Payment radio
- Billing address + "same as delivery" checkbox
- Transaction history rows with Refund / Cancel Order links
- Add Card button
- Sticky Order Summary sidebar with kitchen notes toggle

### Invoice Preview (screen 11)
- Modal with Banquet Event Order format
- Restaurant box, event date, order #, Partial badge
- Sections: Event summary table, Food items + Setup, Billing
- Print button (window.print, @media print hides chrome)
- Send button → opens SendModal
  - Email tab: sends PDF attachment (simulated 1.2s delay)
  - SMS tab: sends URL link (simulated)
  - Success confirmation before close

## Data Flow

```
CateringList (row click)
    → App.js setEditRow(row) + setPage("edit")
        → CreateEventOrder receives editData prop
            → mapRowToEventData(editData) → EventDetails state
            → mapRowToPaymentData(editData) → Payment state
                → Tab 2 MenuPage manages cart state
                    → cart passed to Payment sidebar
                        → cart passed to InvoicePreview
```

## Security Features (App.js)
- Content Security Policy meta tag injection
- X-Frame-Options: DENY (clickjacking prevention)
- Right-click context menu disabled
- F12, Ctrl+Shift+I/J/C/U, Cmd+Option+I blocked
- Drag-and-drop disabled (data extraction prevention)
- Clipboard protection (card numbers auto-redacted on copy)
- 15-minute session timeout with lock screen + resume
