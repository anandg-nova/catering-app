import { useState, useRef, useEffect, useCallback } from 'react';
import './CreateEventOrder.css';
import { ORG_NAME } from './shared/constants.js';
import Stepper        from './features/Stepper/Stepper.jsx';
import CustomerEventInfo, { defaultEventData } from './features/CustomerEventInfo/CustomerEventInfo.jsx';
import MenuPage       from './features/MenuPage/MenuPage.jsx';
import PaymentTab     from './features/Payment/Payment.jsx';
import InvoicePreview from './features/Invoice/Invoice.jsx';
import { saveOrder, exportOrdersJSON } from './orderStorage.js';

// ─── Map list-row → EventDetails state ───────────────────────────────────────
function mapRowToEventData(row) {
  if (!row) return defaultEventData();
  // If we have a stashed full order, use it for perfect round-trip
  if (row._fullOrder?.eventData) return row._fullOrder.eventData;
  return {
    customerName:         row.customer         || '',
    companyName:          row.companyName       || '',
    address:              row.deliveryAddress   || '',
    phone:                row.contactPhone      || '',
    email:                row.contact           || '',
    eventName:            row.event             || '',
    partySize:            (row.eventGuests || '').replace('Guest: ', ''),
    fulfillment:          (row.fulfillment || 'Pickup').toLowerCase(),
    deliveryAddress:      row.deliveryAddress   || '',
    deliveryInstructions: '',
    date:                 row.eventDate         || '',
    time:                 (row.eventTime || '').split(' · ')[1] || '10:30',
    meridiem:             'PM',
    scheduleMode:         'one-time',
    repeatUnit:           'Week',
    repeatDays:           [false,false,false,false,false,false,false],
    repeatDate:           '',
    endsMode:             'Until turned off',
    endsDate:             '',
  };
}

function mapRowToMenuData(row) {
  if (row?._fullOrder?.menuData) return row._fullOrder.menuData;
  return { cart: [], selectedLocation: null };
}

function mapRowToPaymentData(row) {
  if (row?._fullOrder?.paymentData) return row._fullOrder.paymentData;
  return {
    discount:       '',
    discountType:   '$',
    discountAmount: 0,
    taxExemption:   false,
    uploadedFile:   '',
    paymentMethod:  '',
    transactions:   [],
  };
}

// ─── Generate order number ────────────────────────────────────────────────────
function genOrderNumber() {
  return `90-${Math.floor(20000 + Math.random() * 9999)}`;
}

// ─── Toast notification ───────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  const bg = type === 'error' ? '#dc2626' : '#16a34a';
  return (
    <div style={{
      position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)',
      background:bg, color:'#fff', borderRadius:10, padding:'10px 22px',
      fontWeight:600, fontSize:14, zIndex:9999, boxShadow:'0 4px 16px rgba(0,0,0,0.18)',
      animation:'fadeInUp 0.25s ease'
    }}>
      {msg}
    </div>
  );
}

export default function CreateEventOrder({ onCancel, editData }) {
  const isEdit      = !!editData;
  const orderNumber = useRef(editData?.orderNumber || genOrderNumber()).current;

  const [step,        setStep]        = useState(0);
  const [kitchenNote, setKitchenNote] = useState(editData?._fullOrder?.kitchenNote || '');
  const [showInvoice, setShowInvoice] = useState(false);
  const [toast,       setToast]       = useState({ msg:'', type:'success' });
  const [saving,      setSaving]      = useState(false);

  const [eventData,   setEventData]   = useState(() => mapRowToEventData(editData));
  const [menuData,    setMenuData]    = useState(() => mapRowToMenuData(editData));
  const [paymentData, setPaymentData] = useState(() => mapRowToPaymentData(editData));

  const toastTimer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast({ msg:'', type }), 3000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ── Validate before advancing steps ────────────────────────────────────────
  const validateStep = (currentStep) => {
    if (currentStep === 0) {
      if (!eventData.customerName.trim()) { showToast('Customer name is required', 'error'); return false; }
      if (!eventData.eventName.trim())    { showToast('Event name is required',    'error'); return false; }
      if (!eventData.date)                { showToast('Event date is required',     'error'); return false; }
    }
    if (currentStep === 1) {
      if (!menuData.cart || menuData.cart.length === 0) {
        showToast('Please add at least one menu item', 'error'); return false;
      }
    }
    return true;
  };

  // ── Save order to file + cache ─────────────────────────────────────────────
  const handleConfirm = async () => {
    setSaving(true);
    const order = {
      orderNumber,
      orderSource: editData?.orderSource || 'backoffice', // admin-created = backoffice
      createdAt:  isEdit ? (editData?._fullOrder?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
      status:     'confirmed',
      kitchenNote,
      eventData,
      menuData,
      paymentData,
      // ── API hook point ────────────────────────────────────────────────────
      // Replace saveOrder() below with your fetch() call when backend is ready.
      // The orderStorage module exports enrichOrder() to get the full flat payload.
    };
    try {
      await saveOrder(order);
      showToast(`Order ${orderNumber} ${isEdit ? 'updated' : 'saved'} — JSON file updated!`);
      setTimeout(() => onCancel(), 1800);
    } catch (e) {
      console.error(e);
      showToast('Failed to save order. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep(s => s + 1);
  };

  return (
    <div className="ceo-app">
      {/* ── Topbar ── */}
      <div className="ceo-topbar">
        <div className="ceo-topbar-left">
          <span className="ceo-topbar-title">
            {isEdit ? `Edit event order — #${orderNumber}` : 'Create event order'}
          </span>
          {/* Order source pill — no title label, just the badge */}
          {isEdit && (
            editData?.orderSource === 'online'
              ? <span className="ceo-source-pill ceo-source-online">🌐 Online Order</span>
              : <span className="ceo-source-pill ceo-source-backoffice">🖥 Back Office</span>
          )}
          {!isEdit && (
            <span className="ceo-source-pill ceo-source-backoffice">🖥 Back Office</span>
          )}
          {/* Sticky note — shown when order is cancelled */}
          {editData?.status === 'cancelled' && (
            <div className="ceo-sticky-note">
              <div className="ceo-sticky-note-header">
                <span className="ceo-sticky-note-icon">📌</span>
                <span className="ceo-sticky-note-label">CANCELLED</span>
                <span className="ceo-sticky-note-date">
                  {editData.cancelledAt
                    ? new Date(editData.cancelledAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
                    : ''}
                </span>
              </div>
              {editData.cancelReason && (
                <div className="ceo-sticky-note-reason">
                  <strong>Reason:</strong> {editData.cancelReason}
                </div>
              )}
              {editData.cancelNotes && (
                <div className="ceo-sticky-note-notes">{editData.cancelNotes}</div>
              )}
            </div>
          )}
        </div>
        <div className="ceo-topbar-right">
          <button className="ceo-export-btn" onClick={exportOrdersJSON} title="Download all orders as orders.json">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            Export JSON
          </button>
          <div className="ceo-org">
            <div className="ceo-org-name">{ORG_NAME} ↓</div>
            <div className="ceo-org-sub">Enterprise</div>
          </div>
          <div className="ceo-avatar">VR</div>
        </div>
      </div>

      {/* ── Stepper ── */}
      <Stepper current={step} onStepClick={i => setStep(i)} />

      {/* ── Content ── */}
      <div className="ceo-content">
        {step === 0 && (
          <div className="card ceo-tab-card">
            <div className="ceo-tab-header">
              <h2 className="ceo-tab-title">Customer &amp; Event details</h2>
              <p className="ceo-tab-sub">Fill in the details of the event and the customer</p>
            </div>
            <CustomerEventInfo data={eventData} onChange={setEventData} />
          </div>
        )}

        {step === 1 && (
          <MenuPage
            data={menuData}
            onChange={setMenuData}
            deliveryAddress={eventData.deliveryAddress}
          />
        )}

        {step === 2 && (
          <PaymentTab
            data={paymentData}
            onChange={setPaymentData}
            cart={menuData.cart}
            kitchenNote={kitchenNote}
            setKitchenNote={setKitchenNote}
            deliveryAddress={eventData.deliveryAddress}
            onPreview={() => setShowInvoice(true)}
          />
        )}
      </div>

      {/* ── Footer ── */}
      <div className="ceo-footer">
        <button className="ceo-cancel-link" onClick={onCancel}>Cancel</button>
        <div className="ceo-footer-right">
          {step > 0 && (
            <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>
              Previous
            </button>
          )}
          {step < 2 ? (
            <button className="btn-primary" onClick={handleNext}>Next</button>
          ) : (
            <button className="btn-primary" disabled={saving} onClick={handleConfirm}>
              {saving ? 'Saving...' : 'Confirm Order'}
            </button>
          )}
        </div>
      </div>

      {/* ── Invoice Preview ── */}
      {showInvoice && (
        <InvoicePreview
          onClose={() => setShowInvoice(false)}
          eventData={eventData}
          cart={menuData.cart}
          orderNumber={orderNumber}
        />
      )}

      {/* ── Toast ── */}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}