/**
 * orderStorage.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Persistent order storage using THREE layers:
 *
 *  1. FILE  — orders.json on the user's disk via File System Access API
 *             (Chrome/Edge 86+). User picks the file once; handle is remembered
 *             for the session so subsequent saves go straight to disk.
 *
 *  2. CACHE — localStorage mirrors the data so the list page can read it
 *             instantly without re-opening the file on every page load.
 *
 *  3. DOWNLOAD fallback — if File System Access API is unavailable (Firefox,
 *             Safari) or the user declines, we download orders.json automatically
 *             so they always have the file regardless.
 *
 * API hook point:
 *   Replace the body of `saveOrderToAPI(order)` with your fetch() call when
 *   the backend is ready. The file/cache layers remain as offline backup.
 *
 * Usage:
 *   import { saveOrder, loadOrders, updateListRow, exportOrdersJSON } from './orderStorage';
 */

import { TAX_RATE } from './shared/constants.js';

// ─── Keys ─────────────────────────────────────────────────────────────────────
export const ORDERS_KEY = 'ceo_orders';
export const LIST_KEY   = 'ceo_event_list';

// ─── File System Access API handle (remembered for session) ──────────────────
let _fileHandle = null;

// ─── Helper: check if File System Access API is supported ────────────────────
function fsaSupported() {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

// ─── Load all orders from localStorage cache ──────────────────────────────────
export function loadOrders() {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); }
  catch { return []; }
}

// ─── Load event list rows from localStorage cache ─────────────────────────────
export function loadListRows() {
  try { return JSON.parse(localStorage.getItem(LIST_KEY) || '[]'); }
  catch { return []; }
}

// ─── Save a single order (create or update) ───────────────────────────────────
export async function saveOrder(order) {
  // 1. Update in-memory + localStorage cache immediately
  const orders = loadOrders();
  const idx    = orders.findIndex(o => o.orderNumber === order.orderNumber);
  if (idx >= 0) orders[idx] = { ...orders[idx], ...order, updatedAt: new Date().toISOString() };
  else          orders.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders, null, 2));

  // 2. Mirror to list rows cache
  _updateListCache(order);

  // 3. Persist to disk file
  await _persistToFile(orders);

  // 4. API hook point — uncomment and fill in when backend is ready:
  // await saveOrderToAPI(order);

  return order;
}

// ─── Update cancellation status on an existing order ─────────────────────────
export async function cancelOrder(orderNumber, reason, notes) {
  const orders = loadOrders();
  const idx    = orders.findIndex(o => o.orderNumber === orderNumber);
  if (idx < 0) return;

  orders[idx] = {
    ...orders[idx],
    status:       'cancelled',
    cancelledAt:  new Date().toISOString(),
    cancelReason: reason,
    cancelNotes:  notes,
    updatedAt:    new Date().toISOString(),
  };
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders, null, 2));

  // Mirror cancellation to list cache
  const list = loadListRows();
  const li   = list.findIndex(r => r.orderNumber === orderNumber);
  if (li >= 0) {
    list[li] = {
      ...list[li],
      status:       'cancelled',
      cancelledAt:  orders[idx].cancelledAt,
      cancelReason: reason,
      cancelNotes:  notes,
      _fullOrder:   orders[idx],
    };
    localStorage.setItem(LIST_KEY, JSON.stringify(list, null, 2));
  }

  await _persistToFile(orders);
  return orders[idx];
}

// ─── Export / download orders.json ────────────────────────────────────────────
export function exportOrdersJSON() {
  const orders  = loadOrders();
  const payload = buildExportPayload(orders);
  _downloadJSON(payload, 'orders.json');
}

// ─── Build the full export payload ───────────────────────────────────────────
export function buildExportPayload(orders) {
  return {
    exportedAt:  new Date().toISOString(),
    totalOrders: orders.length,
    orders:      orders.map(enrichOrder),
  };
}

// ─── Enrich order with computed fields for export ────────────────────────────
function enrichOrder(order) {
  const ed   = order.eventData   || {};
  const md   = order.menuData    || {};
  const pd   = order.paymentData || {};
  const cart = md.cart           || [];

  const subTotal      = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt   = pd.discountAmount || 0;
  const afterDiscount = subTotal - discountAmt;
  const taxAmt        = pd.taxExemption ? 0 : afterDiscount * TAX_RATE;
  const total         = afterDiscount + taxAmt;
  const totalPaid     = (pd.transactions || []).reduce((s, t) => s + (t.amount || 0), 0);

  return {
    // ── Identity ──────────────────────────────────────────────────────────────
    orderNumber:    order.orderNumber,
    orderSource:    order.orderSource    || 'backoffice',
    status:         order.status         || 'confirmed',
    createdAt:      order.createdAt    || '',
    updatedAt:      order.updatedAt    || '',
    cancelledAt:    order.cancelledAt  || null,
    cancelReason:   order.cancelReason || null,
    cancelNotes:    order.cancelNotes  || null,
    kitchenNote:    order.kitchenNote  || '',

    // ── Customer ──────────────────────────────────────────────────────────────
    customer: {
      name:    ed.customerName || '',
      company: ed.companyName  || '',
      address: ed.address      || '',
      phone:   ed.phone        || '',
      email:   ed.email        || '',
    },

    // ── Event ─────────────────────────────────────────────────────────────────
    event: {
      name:                 ed.eventName            || '',
      partySize:            ed.partySize             || '',
      fulfillment:          ed.fulfillment           || 'pickup',
      deliveryAddress:      ed.deliveryAddress       || '',
      deliveryInstructions: ed.deliveryInstructions  || '',
      date:                 ed.date                  || '',
      time:                 `${ed.time || ''} ${ed.meridiem || ''}`.trim(),
      scheduleMode:         ed.scheduleMode          || 'one-time',
      repeatUnit:           ed.repeatUnit            || '',
      repeatDays:           ed.repeatDays            || [],
      repeatDate:           ed.repeatDate            || '',
      endsMode:             ed.endsMode              || '',
      endsDate:             ed.endsDate              || '',
    },

    // ── Restaurant location ───────────────────────────────────────────────────
    storeLocation: md.selectedLocation
      ? {
          id:      md.selectedLocation.id,
          address: md.selectedLocation.address,
          city:    md.selectedLocation.city,
          state:   md.selectedLocation.state,
          zip:     md.selectedLocation.zip,
          phone:   md.selectedLocation.phone,
        }
      : null,

    // ── Menu / Cart ───────────────────────────────────────────────────────────
    cart: cart.map(item => ({
      id:          item.id,
      name:        item.name,
      qty:         item.qty,
      unitPrice:   item.price,
      lineTotal:   parseFloat((item.price * item.qty).toFixed(2)),
      modifiers:   item.mods || [],
    })),

    // ── Financial summary ─────────────────────────────────────────────────────
    financials: {
      subTotal:       parseFloat(subTotal.toFixed(2)),
      discount:       pd.discount        || '',
      discountType:   pd.discountType    || '$',
      discountAmount: parseFloat(discountAmt.toFixed(2)),
      taxExemption:   pd.taxExemption    || false,
      taxAmount:      parseFloat(taxAmt.toFixed(2)),
      total:          parseFloat(total.toFixed(2)),
      paid:           parseFloat(totalPaid.toFixed(2)),
      balance:        parseFloat(Math.max(0, total - totalPaid).toFixed(2)),
    },

    // ── Payment ───────────────────────────────────────────────────────────────
    payment: {
      method:       pd.paymentMethod || '',
      transactions: (pd.transactions || []).map(t => ({
        card:   t.card   || '',
        txId:   t.txId   || '',
        date:   t.date   || '',
        amount: t.amount || 0,
      })),
      uploadedDocument: pd.uploadedFile || null,
    },
  };
}

// ─── Private: mirror order to list cache ─────────────────────────────────────
function _updateListCache(order) {
  const ed    = order.eventData   || {};
  const md    = order.menuData    || {};
  const pd    = order.paymentData || {};
  const cart  = md.cart           || [];
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const row = {
    id:              order.orderNumber,
    orderNumber:     order.orderNumber,
    orderSource:     order.orderSource    || 'backoffice',
    status:          order.status         || 'confirmed',
    customer:        ed.customerName       || '',
    companyName:     ed.companyName        || '',
    contact:         ed.email              || '',
    contactPhone:    ed.phone              || '',
    event:           ed.eventName          || '',
    eventGuests:     `Guest: ${ed.partySize || 0}`,
    eventDate:       ed.date               || '',
    eventDateDisplay: ed.date
      ? new Date(ed.date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
      : '',
    eventTime: `${ed.date
      ? new Date(ed.date).toLocaleDateString('en-US', { weekday:'short' })
      : 'Mon'} · ${ed.time || ''}`,
    fulfillment:     ed.fulfillment === 'delivery' ? 'Delivery' : 'Pickup',
    storeManager:    md.selectedLocation?.name || '',
    storeCity:       md.selectedLocation
      ? `${md.selectedLocation.city}, ${md.selectedLocation.state}`
      : '',
    deliveryAddress: ed.deliveryAddress    || '',
    totalAmount:     `$${total.toFixed(2)}`,
    paymentStatus:   pd.paymentMethod ? 'Partially Paid' : 'Unpaid',
    tab:             'upcoming',
    createdAt:       order.createdAt       || new Date().toISOString(),
    _fullOrder:      order,
  };

  const list = loadListRows();
  const idx  = list.findIndex(r => r.orderNumber === row.orderNumber);
  if (idx >= 0) list[idx] = row;
  else          list.unshift(row);
  localStorage.setItem(LIST_KEY, JSON.stringify(list, null, 2));
}

// ─── Private: persist to disk using File System Access API ───────────────────
async function _persistToFile(orders) {
  const payload  = buildExportPayload(orders);
  const json     = JSON.stringify(payload, null, 2);
  const blob     = new Blob([json], { type: 'application/json' });

  if (!fsaSupported()) {
    // Fallback: auto-download on every save
    _downloadBlob(blob, 'orders.json');
    return;
  }

  try {
    // Try to reuse existing handle from this session
    if (!_fileHandle) {
      _fileHandle = await window.showSaveFilePicker({
        suggestedName: 'orders.json',
        types: [{
          description: 'JSON File',
          accept: { 'application/json': ['.json'] },
        }],
      });
    }
    const writable = await _fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (err) {
    if (err.name === 'AbortError') {
      // User cancelled picker — fall back to download
      _fileHandle = null;
      _downloadBlob(blob, 'orders.json');
    } else {
      // Handle lost (e.g. file moved/deleted) — reset and retry next save
      _fileHandle = null;
      console.warn('File write failed, falling back to download:', err);
      _downloadBlob(blob, 'orders.json');
    }
  }
}

// ─── Private: trigger browser download ───────────────────────────────────────
function _downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function _downloadJSON(data, filename) {
  _downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
}

// ─── API hook (swap for real backend call) ────────────────────────────────────
// async function saveOrderToAPI(order) {
//   const response = await fetch('/api/orders', {
//     method:  order.createdAt === order.updatedAt ? 'POST' : 'PUT',
//     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
//     body:    JSON.stringify(enrichOrder(order)),
//   });
//   if (!response.ok) throw new Error(`API error: ${response.status}`);
//   return response.json();
// }