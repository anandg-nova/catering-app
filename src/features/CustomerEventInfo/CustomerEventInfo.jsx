import { useCallback } from 'react';
import './CustomerEventInfo.css';
import FloatInput from '../../shared/FloatInput.jsx';
import { RepeatIcon, OneTimeIcon } from '../../shared/icons.jsx';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CustomerEventInfo({ data, onChange }) {
  const set = useCallback((field) => (val) => onChange(prev => ({ ...prev, [field]: val })), [onChange]);

  const toggleDay = useCallback((i) => {
    onChange(prev => {
      const days = [...prev.repeatDays];
      days[i] = !days[i];
      return { ...prev, repeatDays: days };
    });
  }, [onChange]);

  return (
    <div className="ed-wrapper">
      {/* ── Customer Details ─────────────────────────────────── */}
      <div className="ed-section-row">
        <div className="ed-section-info">
          <div className="ed-section-icon">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="7" r="4" stroke="#6B7280" strokeWidth="1.5"/>
              <path d="M3 18c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="ed-section-title">Customer details</div>
            <div className="ed-section-sub">Time needed to prepare an order before it is ready for pickup or delivery</div>
          </div>
        </div>
        <div className="ed-fields">
          <div className="grid-2">
            <FloatInput label="Customer name" value={data.customerName} onChange={set('customerName')} required />
            <FloatInput label="Company name"  value={data.companyName}  onChange={set('companyName')} />
          </div>
          <FloatInput label="Address" value={data.address} onChange={set('address')} />
          <div className="grid-2">
            <FloatInput label="Phone number" value={data.phone} onChange={set('phone')} />
            <FloatInput label="Email ID"     value={data.email} onChange={set('email')} type="email" />
          </div>
        </div>
      </div>

      <div className="ed-divider" />

      {/* ── Event Details ────────────────────────────────────── */}
      <div className="ed-section-row">
        <div className="ed-section-info">
          <div className="ed-section-icon">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="4" width="16" height="14" rx="2" stroke="#6B7280" strokeWidth="1.5"/>
              <path d="M6 2v4M14 2v4M2 9h16" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="ed-section-title">Event details</div>
            <div className="ed-section-sub">Time needed to prepare an order before it is ready for pickup or delivery</div>
          </div>
        </div>
        <div className="ed-fields">
          <div className="grid-2">
            <FloatInput label="Event name" value={data.eventName}  onChange={set('eventName')} required />
            <FloatInput label="Party size" value={data.partySize}  onChange={set('partySize')} />
          </div>

          {/* Pick-up / Delivery */}
          <div className="ed-radio-row">
            {[
              { key: 'pickup',   label: 'Pick-up',  icon: null },
              { key: 'delivery', label: 'Delivery', icon: null },
            ].map(opt => (
              <label key={opt.key} className="ed-radio-label">
                <div
                  className={`ed-radio-dot${data.fulfillment === opt.key ? ' active' : ''}`}
                  onClick={() => onChange({ ...data, fulfillment: opt.key })}
                />
                <span className="ed-radio-text" onClick={() => onChange({ ...data, fulfillment: opt.key })}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>

          {/* Delivery fields */}
          {data.fulfillment === 'delivery' && (
            <div className="ed-delivery-fields">
              <FloatInput label="Delivery Address"      value={data.deliveryAddress}      onChange={set('deliveryAddress')} />
              <FloatInput label="Delivery Instructions" value={data.deliveryInstructions} onChange={set('deliveryInstructions')} />
            </div>
          )}

          {/* Date / Time */}
          <div className="grid-2">
            <div className="ed-date-field">
              <label className="ed-float-label">Date</label>
              <input
                type="date"
                className="ed-input"
                value={data.date}
                onChange={e => onChange({ ...data, date: e.target.value })}
              />
            </div>
            <div className="ed-time-field">
              <label className="ed-float-label">Time</label>
              <input
                type="time"
                className="ed-input ed-time-input"
                value={data.time}
                onChange={e => onChange({ ...data, time: e.target.value })}
              />
              <div className="ed-ampm">
                {['AM', 'PM'].map(m => (
                  <button
                    key={m}
                    className={`ed-ampm-btn${data.meridiem === m ? ' active' : ''}`}
                    onClick={() => onChange({ ...data, meridiem: m })}
                  >{m}</button>
                ))}
              </div>
            </div>
          </div>

          {/* One-time / Repeats */}
          <div className="grid-2">
            <button
              className={`toggle-card${data.scheduleMode === 'one-time' ? ' selected' : ''}`}
              onClick={() => onChange({ ...data, scheduleMode: 'one-time' })}
            >
              <span className="toggle-card-icon"><OneTimeIcon /></span>
              <div>
                <div className="toggle-card-label">One-time</div>
                <div className="toggle-card-sub">Send once at a specific time</div>
              </div>
            </button>
            <button
              className={`toggle-card${data.scheduleMode === 'repeats' ? ' selected' : ''}`}
              onClick={() => onChange({ ...data, scheduleMode: 'repeats' })}
            >
              <span className="toggle-card-icon"><RepeatIcon /></span>
              <div>
                <div className="toggle-card-label">Repeats</div>
                <div className="toggle-card-sub">Send across multiple occurences</div>
              </div>
            </button>
          </div>

          {/* Repeat options */}
          {data.scheduleMode === 'repeats' && (
            <div className="ed-repeat-section">
              <div className="ed-repeat-row">
                <span className="ed-repeat-label">Repeat every</span>
                <select
                  className="ed-repeat-select"
                  value={data.repeatUnit}
                  onChange={e => onChange({ ...data, repeatUnit: e.target.value })}
                >
                  {['Day', 'Week', 'Month'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>

              {/* Day selector for Week, date picker for Month */}
              {data.repeatUnit === 'Week' && (
                <div className="ed-repeat-on">
                  <div className="ed-repeat-on-label">Repeat on</div>
                  <div className="ed-days-row">
                    {DAYS.map((d, i) => (
                      <button
                        key={i}
                        className={`ed-day-btn${data.repeatDays[i] ? ' active' : ''}`}
                        onClick={() => toggleDay(i)}
                      >{d}</button>
                    ))}
                  </div>
                </div>
              )}

              {data.repeatUnit === 'Month' && (
                <div className="ed-repeat-on">
                  <div className="ed-repeat-on-label">Repeat on</div>
                  <div className="ed-date-field" style={{ maxWidth: 240 }}>
                    <label className="ed-float-label">Select date</label>
                    <input
                      type="date"
                      className="ed-input"
                      value={data.repeatDate || ''}
                      onChange={e => onChange({ ...data, repeatDate: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Ends */}
              <div className="ed-ends-section">
                <div className="ed-ends-title">Ends</div>
                {['Until turned off', 'Ends After'].map(opt => (
                  <label key={opt} className="ed-radio-label" style={{ marginBottom: 8 }}>
                    <div
                      className={`ed-radio-dot${data.endsMode === opt ? ' active' : ''}`}
                      onClick={() => onChange({ ...data, endsMode: opt })}
                    />
                    <span className="ed-radio-text" onClick={() => onChange({ ...data, endsMode: opt })}>
                      {opt}
                    </span>
                  </label>
                ))}
                {data.endsMode === 'Ends After' && (
                  <div className="ed-date-field" style={{ maxWidth: 240, marginTop: 8 }}>
                    <label className="ed-float-label">Select date</label>
                    <input
                      type="date"
                      className="ed-input"
                      value={data.endsDate || ''}
                      onChange={e => onChange({ ...data, endsDate: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const defaultEventData = () => ({
  customerName: '', companyName: '', address: '', phone: '', email: '',
  eventName: '', partySize: '',
  fulfillment: 'pickup',
  deliveryAddress: '', deliveryInstructions: '',
  date: '', time: '10:30', meridiem: 'PM',
  scheduleMode: 'one-time',
  repeatUnit: 'Week',
  repeatDays: [false, false, false, false, false, false, false],
  repeatDate: '',
  endsMode: 'Until turned off',
  endsDate: '',
});
