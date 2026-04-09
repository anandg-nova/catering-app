import { useState } from 'react';
import './Invoice.css';
import { CloseIcon, EmailIcon, SMSIcon, PrintIcon } from '../../shared/icons.jsx';
import { TAX_RATE, ORG_NAME, ORG_TYPE } from '../../shared/constants.js';

// ─── Send Invoice Modal ───────────────────────────────────────────────────────
function SendModal({ onClose, onSend, customerEmail, customerPhone }) {
  const [method, setMethod] = useState('email');
  const [email,  setEmail]  = useState(customerEmail || '');
  const [phone,  setPhone]  = useState(customerPhone || '');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSend = async () => {
    setSending(true);
    // Simulate sending
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
    setTimeout(() => { setSent(false); onSend({ method, email, phone }); onClose(); }, 1500);
  };

  const canSend = method === 'email' ? email.includes('@') : phone.length >= 10;

  return (
    <>
      <div className="inv-send-backdrop" onClick={onClose}/>
      <div className="inv-send-modal">
        <div className="inv-send-header">
          <span className="inv-send-title">Send Invoice</span>
          <button className="inv-send-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="inv-send-body">
          {/* Method tabs */}
          <div className="inv-send-tabs">
            <button
              className={`inv-send-tab${method === 'email' ? ' active' : ''}`}
              onClick={() => setMethod('email')}
            >
              <EmailIcon/> Email PDF
            </button>
            <button
              className={`inv-send-tab${method === 'sms' ? ' active' : ''}`}
              onClick={() => setMethod('sms')}
            >
              <SMSIcon/> Text Link
            </button>
          </div>

          {method === 'email' && (
            <div className="inv-send-field">
              <label className="inv-send-label">Email address</label>
              <input
                className="inv-send-input"
                type="email"
                placeholder="customer@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <div className="inv-send-hint">A PDF attachment of the invoice will be sent to this email.</div>
            </div>
          )}

          {method === 'sms' && (
            <div className="inv-send-field">
              <label className="inv-send-label">Phone number</label>
              <input
                className="inv-send-input"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              <div className="inv-send-hint">A link to view/download the invoice PDF will be texted.</div>
            </div>
          )}

          {sent && <div className="inv-send-success">✅ Invoice sent successfully!</div>}
        </div>
        <div className="inv-send-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className={`btn-primary${canSend && !sending ? '' : ' disabled'}`}
            disabled={!canSend || sending}
            onClick={handleSend}
          >
            {sending ? 'Sending...' : method === 'email' ? 'Send Email' : 'Send Text'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Invoice Preview Modal (screen 11) ───────────────────────────────────────
export default function InvoicePreview({ onClose, eventData, cart, orderNumber }) {
  const [showSend, setShowSend] = useState(false);

  const subTotal = (cart || []).reduce((s, i) => s + i.price * i.qty, 0);
  const tax      = subTotal * TAX_RATE;
  const total    = subTotal + tax;

  const today    = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' });

  const handlePrint = () => window.print();

  return (
    <>
      <div className="inv-backdrop" onClick={onClose}/>
      <div className="inv-modal">
        {/* Header */}
        <div className="inv-modal-header">
          <span className="inv-modal-title">Order Summary Preview</span>
          <button className="inv-modal-close" onClick={onClose}><CloseIcon/></button>
        </div>

        {/* Invoice content */}
        <div className="inv-body" id="invoice-print-area">
          {/* Restaurant + order info */}
          <div className="inv-top-row">
            <div className="inv-restaurant-box">
              <div className="inv-restaurant-name">{ORG_NAME}</div>
              <div className="inv-restaurant-sub">{ORG_TYPE}</div>
            </div>
            <div className="inv-order-meta">
              <div className="inv-meta-row">
                <span className="inv-meta-label">Event Date:</span>
                <span className="inv-meta-val">{eventData?.date || today}</span>
              </div>
              <div className="inv-meta-row">
                <span className="inv-meta-label">Order #:</span>
                <span className="inv-meta-val">{orderNumber || 'ORD-2026-001'}</span>
              </div>
              {eventData?.scheduleMode === 'partial' && (
                <span className="inv-partial-badge">Partial</span>
              )}
            </div>
          </div>

          {/* Banquet event order section */}
          <div className="inv-section-header">BANQUET EVENT ORDER</div>
          <div className="inv-info-grid">
            <div>
              <div className="inv-info-row"><span className="inv-info-label">Account:</span><span className="inv-info-val">{eventData?.eventName || 'Birthday Party'}</span></div>
              <div className="inv-info-row"><span className="inv-info-label">Contact:</span><span className="inv-info-val">{eventData?.customerName || 'John Doe'}</span></div>
              <div className="inv-info-row"><span className="inv-info-label">Email:</span><span className="inv-info-val">{eventData?.email || 'john@corp.com'}</span></div>
              <div className="inv-info-row"><span className="inv-info-label">Phone:</span><span className="inv-info-val">{eventData?.phone || '+1-555-0456'}</span></div>
            </div>
            <div>
              <div className="inv-info-row"><span className="inv-info-label">Sales Manager:</span><span className="inv-info-val">Priya Nair</span></div>
              <div className="inv-info-row"><span className="inv-info-label">Order Type:</span><span className="inv-info-val">{eventData?.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}</span></div>
            </div>
          </div>

          {/* Event Summary */}
          <div className="inv-section-header">EVENT SUMMARY</div>
          <table className="inv-table">
            <thead>
              <tr>
                <th>Name/Party</th><th>Date</th><th>Time</th><th>Type</th><th>Party Size</th><th>Order Type</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{eventData?.eventName || 'Birthday Party'}</td>
                <td>{eventData?.date || today}</td>
                <td>{eventData?.time || '19:00'}</td>
                <td>Catering</td>
                <td>{eventData?.partySize || '20'}</td>
                <td>{eventData?.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}</td>
              </tr>
            </tbody>
          </table>

          {/* Food items + Setup */}
          <div className="inv-two-col">
            <div>
              <div className="inv-section-header">FOOD ITEMS</div>
              <table className="inv-table">
                <thead>
                  <tr><th>Qty</th><th>Description</th><th>Price</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {(cart || []).map((item, i) => (
                    <tr key={i}>
                      <td>{item.qty}</td>
                      <td>{item.name}{item.mods?.length > 0 && <span className="inv-mods">{item.mods.join(', ')}</span>}</td>
                      <td>${item.price.toFixed(2)}/ea</td>
                      <td>${(item.price * item.qty).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="inv-subtotal-row">
                    <td colSpan={3}>Total F&amp;B</td>
                    <td>${subTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <div className="inv-section-header">SETUP</div>
              <div className="inv-setup-info">
                <div>Event: {eventData?.time || '19:00'}</div>
                <div>{eventData?.fulfillment === 'delivery' ? `Delivery to ${eventData?.deliveryAddress || '—'}` : 'Pickup at restaurant'}</div>
              </div>
            </div>
          </div>

          {/* Billing */}
          <div className="inv-section-header">BILLING</div>
          <table className="inv-billing-table">
            <tbody>
              <tr><td>Subtotal</td><td>${subTotal.toFixed(2)}</td></tr>
              <tr><td>Tax (8.25%)</td><td>${tax.toFixed(2)}</td></tr>
              <tr className="inv-grand-total"><td>Grand Total</td><td>${total.toFixed(2)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div className="inv-modal-footer">
          <button className="inv-action-btn" onClick={handlePrint}>
            <PrintIcon/> Print
          </button>
          <div className="inv-footer-right">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={() => setShowSend(true)}>
              <EmailIcon/> Send
            </button>
          </div>
        </div>
      </div>

      {showSend && (
        <SendModal
          customerEmail={eventData?.email}
          customerPhone={eventData?.phone}
          onClose={() => setShowSend(false)}
          onSend={d => console.log('Invoice sent:', d)}
        />
      )}
    </>
  );
}
