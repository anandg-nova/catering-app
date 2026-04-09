import { useState, useRef, useCallback } from 'react';
import './Payment.css';
import { UploadIcon, CloseIcon, CardPaymentIcon, CheckPaymentIcon, QRCodeIcon, HousePaymentIcon, PlusIcon } from '../../shared/icons.jsx';
import { TAX_RATE, PAYMENT_TYPES } from '../../shared/constants.js';

// ─── Card Payment Modal (screen 7) ───────────────────────────────────────────
function CardPaymentModal({ onClose, onSave, deliveryAddress }) {
  const [cardHolder,   setCardHolder]   = useState('');
  const [cardNumber,   setCardNumber]   = useState('');
  const [expiry,       setExpiry]       = useState('');
  const [cvv,          setCvv]          = useState('');
  const [paymentType,  setPaymentType]  = useState('pay-now');
  const [amount,       setAmount]       = useState('');
  const [address,      setAddress]      = useState(deliveryAddress || '');
  const [sameAsDelivery, setSameAsDelivery] = useState(true);

  // Format card number with dashes
  const formatCard = val => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1-').replace(/-$/, '');
  };

  const canSave = cardHolder && cardNumber.replace(/-/g,'').length === 16 && expiry && cvv;

  return (
    <>
      <div className="pm-backdrop" onClick={onClose} />
      <div className="pm-modal">
        <div className="pm-modal-header">
          <span className="pm-modal-title">Payment Details</span>
          <button className="pm-modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="pm-modal-body">
          <div className="pm-section-label">CARD DETAILS</div>

          <div className="pm-field">
            <label className="pm-float-label">Card Holder Name *</label>
            <input className="pm-input" value={cardHolder} onChange={e => setCardHolder(e.target.value)} placeholder="John Marston"/>
          </div>
          <div className="pm-field">
            <label className="pm-float-label">Card Number *</label>
            <input className="pm-input" value={cardNumber}
              onChange={e => setCardNumber(formatCard(e.target.value))}
              placeholder="7822-8188-0000-9090" maxLength={19}/>
          </div>
          <div className="pm-row">
            <div className="pm-field">
              <label className="pm-float-label">Expiry Date *</label>
              <input className="pm-input" value={expiry} onChange={e => setExpiry(e.target.value)} placeholder="06/2027"/>
            </div>
            <div className="pm-field">
              <label className="pm-float-label">CVV *</label>
              <input className="pm-input" type="password" value={cvv}
                onChange={e => setCvv(e.target.value.slice(0,4))} placeholder="***" maxLength={4}/>
            </div>
          </div>

          <div className="pm-divider" />

          {/* Payment type */}
          <div className="pm-payment-types">
            {PAYMENT_TYPES.map(pt => (
              <label key={pt.key} className="pm-radio-label">
                <div className={`pm-radio-dot${paymentType === pt.key ? ' on' : ''}`}
                  onClick={() => setPaymentType(pt.key)}>
                  {paymentType === pt.key && <div className="pm-radio-inner"/>}
                </div>
                <span onClick={() => setPaymentType(pt.key)}>{pt.label}</span>
              </label>
            ))}
          </div>

          {paymentType === 'partial' && (
            <div className="pm-field pm-amount-field">
              <label className="pm-float-label">Amount</label>
              <div className="pm-amount-wrap">
                <input className="pm-input pm-amount-input" type="number" value={amount}
                  onChange={e => setAmount(e.target.value)} placeholder="20"/>
                <span className="pm-amount-sym">$</span>
              </div>
            </div>
          )}

          <div className="pm-divider" />
          <div className="pm-section-label">BILLING ADDRESS</div>
          <div className="pm-field">
            <label className="pm-float-label">Address</label>
            <input className="pm-input" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="901 Cherry Ave, San Bruno, CA 97638" readOnly={sameAsDelivery}/>
          </div>
          <label className="pm-checkbox-label">
            <input type="checkbox" checked={sameAsDelivery}
              onChange={e => {
                setSameAsDelivery(e.target.checked);
                if (e.target.checked) setAddress(deliveryAddress || '');
              }}/>
            <span>Same as delivery address</span>
          </label>
        </div>
        <div className="pm-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className={`btn-primary${canSave ? '' : ' disabled'}`} disabled={!canSave}
            onClick={() => { onSave({ cardHolder, cardNumber, expiry, cvv, paymentType, amount, address }); onClose(); }}>
            Save card
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TransactionRow({ tx, onRefund, onCancel }) {
  return (
    <div className="pm-tx-row">
      <div className="pm-tx-cell">
        <div className="pm-tx-label">Card</div>
        <div className="pm-tx-val">{tx.card}</div>
      </div>
      <div className="pm-tx-cell">
        <div className="pm-tx-label">Transaction ID</div>
        <div className="pm-tx-val">{tx.txId}</div>
      </div>
      <div className="pm-tx-cell">
        <div className="pm-tx-label">Date</div>
        <div className="pm-tx-val">{tx.date}</div>
      </div>
      <div className="pm-tx-cell">
        <div className="pm-tx-label">Amount Paid</div>
        <div className="pm-tx-val">${tx.amount.toFixed(2)}</div>
      </div>
      <div className="pm-tx-actions">
        {onRefund && <button className="pm-tx-link" onClick={onRefund}>Refund</button>}
        {onCancel && <button className="pm-tx-link pm-tx-cancel" onClick={onCancel}>Cancel Order</button>}
      </div>
    </div>
  );
}

// ─── Order Summary Sidebar ────────────────────────────────────────────────────
function OrderSummary({ cart, transactions, kitchenNote, setKitchenNote, onPreview }) {
  const [showNote, setShowNote] = useState(!!kitchenNote);

  const subTotal = (cart || []).reduce((s, i) => s + i.price * i.qty, 0);
  const paid     = (transactions || []).reduce((s, t) => s + t.amount, 0);
  const tax      = subTotal * TAX_RATE;
  const total    = subTotal + tax;
  const balance  = total - paid;

  return (
    <div className="pm-summary">
      <div className="pm-summary-header">
        <span className="pm-summary-title">Order summary</span>
        <button className="pm-preview-link" onClick={onPreview}>Preview</button>
      </div>

      {/* Kitchen notes */}
      {!showNote ? (
        <button className="pm-kitchen-btn" onClick={() => setShowNote(true)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="#2563eb" strokeWidth="1.3"/>
            <path d="M5 8h6M8 5v6" stroke="#2563eb" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Add kitchen notes
        </button>
      ) : (
        <textarea
          className="pm-kitchen-textarea"
          placeholder="Enter kitchen notes..."
          value={kitchenNote}
          onChange={e => setKitchenNote(e.target.value)}
          rows={3}
        />
      )}

      {/* Cart items */}
      <div className="pm-cart-items">
        {(cart || []).map((item, i) => (
          <div key={i} className="pm-cart-item">
            <div className="pm-cart-item-header">
              <span className="pm-cart-item-name">{item.qty}x {item.name}</span>
              <span className="pm-cart-item-price">${(item.price * item.qty).toFixed(2)}</span>
            </div>
            {item.mods && item.mods.length > 0 && (
              <div className="pm-cart-item-mods">
                {item.mods.map((m, j) => (
                  <span key={j} className="pm-cart-mod">{m}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="pm-totals">
        <div className="pm-total-row"><span>Sub-Total</span><span>${subTotal.toFixed(2)}</span></div>
        <div className="pm-total-row"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
        <div className="pm-total-row pm-total-bold"><span>Total</span><span>${total.toFixed(2)}</span></div>
        {paid > 0 && <>
          <div className="pm-total-row pm-total-paid"><span>Paid</span><span>-${paid.toFixed(2)}</span></div>
          <div className="pm-total-row pm-total-balance">
            <span>Balance</span>
            <div className="pm-balance-right">
              <span className="badge-tobepaid">TO BE PAID</span>
              <span>${balance.toFixed(2)}</span>
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}

// ─── Payment Tab (screen 8-10) ────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { key: 'card',    label: 'Card Payment',  Icon: CardPaymentIcon  },
  { key: 'check',   label: 'Check Payment', Icon: CheckPaymentIcon },
  { key: 'link',    label: 'Payment Link',  Icon: QRCodeIcon       },
  { key: 'house',   label: 'House Payment', Icon: HousePaymentIcon },
];

export default function PaymentTab({ data, onChange, cart, kitchenNote, setKitchenNote, deliveryAddress, onPreview }) {
  const [showCardModal, setShowCardModal] = useState(false);
  const transactions = data.transactions || [];
  const fileRef = useRef();

  const set = useCallback((field) => (val) => onChange(prev => ({ ...prev, [field]: val })), [onChange]);
  const setTransactions = useCallback((updater) => {
    onChange(prev => ({ ...prev, transactions: typeof updater === 'function' ? updater(prev.transactions || []) : updater }));
  }, [onChange]);

  return (
    <div className="pm-layout">
      <div className="pm-main card">
        <div className="pm-main-title">Payment</div>
        <div className="pm-main-sub">Fill in the details of the event and the customer</div>

        {/* Discount & Tax */}
        <div className="pm-block">
          <div className="section-label">DISCOUNT &amp; TAX EXEMPTION</div>
          <div className="pm-discount-wrap">
            <input className="pm-discount-input" type="text"
              placeholder="Enter Discount" value={data.discount || ''}
              onChange={e => set('discount')(e.target.value)}/>
            {['$', '%'].map(sym => (
              <button key={sym}
                className={`pm-discount-sym${data.discountType === sym ? ' active' : ''}`}
                onClick={() => set('discountType')(sym)}>{sym}</button>
            ))}
          </div>

          <div className="pm-tax-row">
            <span className="pm-tax-label">Tax Exemption</span>
            <button className={`pm-toggle${data.taxExemption ? ' on' : ''}`}
              onClick={() => set('taxExemption')(!data.taxExemption)}>
              <span className="pm-toggle-knob"/>
            </button>
          </div>

          {data.taxExemption && (
            <div className="pm-upload-section">
              <div className="pm-upload-label">UPLOAD DOCUMENT</div>
              <div className="pm-upload-box" onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.png" style={{display:'none'}}
                  onChange={e => set('uploadedFile')(e.target.files[0]?.name)}/>
                <UploadIcon/>
                <div>
                  <span>Drop or </span>
                  <span className="pm-browse-link">browse files</span>
                  <div className="pm-upload-hint">Recommended file size is 5MB</div>
                </div>
              </div>
              {data.uploadedFile && <div className="pm-uploaded-name">📎 {data.uploadedFile}</div>}
            </div>
          )}
        </div>

        <div className="pm-section-divider"/>

        {/* Collect Payment By */}
        <div className="pm-block">
          <div className="section-label">COLLECT PAYMENT BY</div>
          <div className="pm-methods-grid">
            {PAYMENT_METHODS.map(({ key, label, Icon }) => (
              <button
                key={key}
                className={`pm-method-card${data.paymentMethod === key ? ' selected' : ''}`}
                onClick={() => {
                  set('paymentMethod')(key);
                  if (key === 'card') setShowCardModal(true);
                }}
              >
                <Icon/>
                <span className="pm-method-label">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Transaction history */}
        {transactions.length > 0 && (
          <div className="pm-transactions">
            {transactions.map((tx, i) => (
              <TransactionRow
                key={i}
                tx={tx}
                onRefund={i === 0 ? () => {} : undefined}
                onCancel={i === 1 ? () => {} : undefined}
              />
            ))}
            <button className="pm-add-card" onClick={() => setShowCardModal(true)}>
              <span className="pm-add-card-circle"><PlusIcon/></span>
              Add Card
            </button>
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <OrderSummary
        cart={cart}
        transactions={transactions}
        kitchenNote={kitchenNote}
        setKitchenNote={setKitchenNote}
        onPreview={onPreview}
      />

      {showCardModal && (
        <CardPaymentModal
          deliveryAddress={deliveryAddress}
          onClose={() => setShowCardModal(false)}
          onSave={cardData => {
            setTransactions(prev => [...prev, {
              card:   `*******${cardData.cardNumber.slice(-4)}`,
              txId:   Date.now().toString(),
              date:   new Date().toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}),
              amount: cardData.paymentType === 'partial' ? Number(cardData.amount) : 0,
            }]);
          }}
        />
      )}
    </div>
  );
}
