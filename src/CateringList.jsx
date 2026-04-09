import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
import "./CateringList.css";
import pastEventsData from "./pastEventsData.json";
import baseEventsData from "./sampleEventListdata.json";
import snsLocations   from "./snsLocations.json";
import { cancelOrder as persistCancelOrder, loadListRows, exportOrdersJSON } from "./orderStorage.js";
import { PAGE_SIZE as CONFIG_PAGE_SIZE, DEFAULT_DATE_RANGE_DAYS, ORG_NAME } from "./shared/constants.js";

// ─── Cookie Helpers ───────────────────────────────────────────────────────────
const COOKIE_KEY = "catering_columns";

function saveToCookie(value) {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${COOKIE_KEY}=${JSON.stringify(value)};expires=${expires.toUTCString()};path=/`;
}

function loadFromCookie() {
  const match = document.cookie.split("; ").find((r) => r.startsWith(`${COOKIE_KEY}=`));
  if (!match) return null;
  try {
    return JSON.parse(match.split("=").slice(1).join("="));
  } catch {
    return null;
  }
}

// ─── Column Definitions ───────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: "orderNumber", label: "Order", required: true, adjustable: false },
  { key: "customer", label: "Customer", required: true, adjustable: true },
  { key: "contact", label: "Contact", required: false, adjustable: true },
  { key: "event", label: "Event", required: true, adjustable: true },
  { key: "eventDate", label: "Event Date", required: true, adjustable: false },
  { key: "fulfillment", label: "Fulfillment", required: true, adjustable: false },
  { key: "store", label: "Store", required: false, adjustable: true },
  { key: "deliveryAddress", label: "Delivery Address", required: true, adjustable: true },
  { key: "billAmount", label: "Bill Amount", required: true, adjustable: false },
];

const DEFAULT_VISIBLE = ALL_COLUMNS.map((c) => c.key);

// ─── Icons ────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="5" stroke="#9CA3AF" strokeWidth="1.5" />
    <path d="M11 11l3 3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const DotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="3" r="1.2" fill="#9CA3AF" />
    <circle cx="8" cy="8" r="1.2" fill="#9CA3AF" />
    <circle cx="8" cy="13" r="1.2" fill="#9CA3AF" />
  </svg>
);

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M8 2v12M2 8h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const GearIcon = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="2.5" stroke="#9CA3AF" strokeWidth="1.5" />
    <path
      d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"
      stroke="#9CA3AF"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
    <path
      d="M2.5 7l3 3 6-6"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ─── Data ─────────────────────────────────────────────────────────────────────
const upcomingBase = baseEventsData.filter((e) => e.tab === "upcoming");

const upcomingEvents = Array.from({ length: 250 }, (_, i) => {
  const base = upcomingBase[i % upcomingBase.length];
  const loop = Math.floor(i / upcomingBase.length);
  const d = new Date(base.eventDate);
  d.setDate(d.getDate() + loop);
  return {
    ...base,
    id: i + 1,
    orderNumber: `90-${20000 + i + 1}`,
    customer: loop > 0 ? `${base.customer} ${loop + 1}` : base.customer,
    eventDate: d.toISOString().split("T")[0],
    eventDateDisplay: d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }),
    tab: "upcoming",
  };
});

// Load any orders saved locally from the Create/Edit flow
function buildAllEvents() {
  const localOrders = loadListRows();
  // Merge: local orders at top, then seed data (dedupe by orderNumber)
  const seedMap = new Map([...upcomingEvents, ...pastEventsData].map(e => [e.orderNumber, e]));
  localOrders.forEach(o => seedMap.set(o.orderNumber, o));
  return Array.from(seedMap.values());
}

// allEvents is rebuilt inside the component via useMemo so cancellations refresh the UI
const PaymentBadge = ({ status }) => {
  const cls =
    status === "Paid Fully"
      ? "badge-paid"
      : status === "Partially Paid"
      ? "badge-partial"
      : "badge-unpaid";

  const label =
    status === "Paid Fully"
      ? "PAID"
      : status === "Partially Paid"
      ? "PARTIALLY PAID"
      : "UNPAID";

  return <span className={`badge-payment ${cls}`}>{label}</span>;
};

// ─── Cancel Order Modal ───────────────────────────────────────────────────────
const CancelOrderModal = ({ order, onClose, onConfirm }) => {
  const [reason,  setReason]  = useState("");
  const [notes,   setNotes]   = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 200); };

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm({ order, reason, notes });
    handleClose();
  };

  const canConfirm = reason.trim() && notes.trim();

  return (
    <>
      <div className={`cancel-backdrop${visible ? " cancel-backdrop-show" : ""}`} onClick={handleClose} />
      <div className={`cancel-modal${visible ? " cancel-modal-show" : ""}`}>
        {/* Header */}
        <div className="cancel-modal-header">
          <span className="cancel-modal-title">Cancel Order</span>
          <button className="cancel-modal-close" onClick={handleClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="cancel-modal-body">
          {/* Reason */}
          <div className="cancel-field">
            <label className="cancel-label">Reason for cancellation *</label>
            <div className="cancel-input-wrap">
              <input
                type="text"
                className="cancel-input"
                placeholder="Type here"
                value={reason}
                onChange={e => setReason(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Notes — multiline */}
          <div className="cancel-field">
            <label className="cancel-label">Notes</label>
            <textarea
              className="cancel-input cancel-textarea"
              placeholder="Add notes..."
              value={notes}
              rows={4}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="cancel-modal-footer">
          <button className="cancel-modal-cancel" onClick={handleClose}>Cancel</button>
          <button
            className={`cancel-modal-confirm${canConfirm ? "" : " disabled"}`}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Action Menu (kabob — Cancel only) ───────────────────────────────────────
const ActionMenu = ({ rowId, row, openMenu, setOpenMenu, onCancel }) => {
  const isOpen = openMenu === rowId;

  return (
    <div className="action-menu-wrap">
      <button
        className="dots-btn"
        onClick={e => { e.stopPropagation(); setOpenMenu(isOpen ? null : rowId); }}
      >
        <DotsIcon />
      </button>
      {isOpen && (
        <div className="action-dropdown" onClick={e => e.stopPropagation()}>
          <button
            className="action-item action-item-danger"
            onClick={() => { setOpenMenu(null); onCancel(row); }}
          >
            Cancel Order
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Column Picker ────────────────────────────────────────────────────────────
const ColumnPicker = ({ visibleCols, onToggle, onReset, onClose }) => (
  <div className="col-picker-dropdown" onClick={(e) => e.stopPropagation()}>
    <div className="col-picker-header">
      <span className="col-picker-title">Show / Hide Columns</span>
      <button className="col-picker-reset" onClick={onReset}>
        Reset all
      </button>
    </div>

    <div className="col-picker-list">
      {ALL_COLUMNS.map((col) => {
        const isOn   = visibleCols.includes(col.key);
        const locked = col.required === true; // only truly required cols are locked

        return (
          <button
            key={col.key}
            className={`col-picker-item${locked ? " col-picker-required" : ""}`}
            onClick={() => !locked && onToggle(col.key)}
          >
            <span className={`col-checkbox${isOn ? " col-checkbox-on" : ""}`}>
              {isOn && <CheckIcon />}
            </span>
            <span className="col-picker-label">{col.label}</span>
            {locked && <span className="col-required-tag">Always on</span>}
            {!locked && !col.adjustable && <span className="col-required-tag">Static</span>}
          </button>
        );
      })}
    </div>

    <div className="col-picker-footer">
      <button className="col-picker-apply" onClick={onClose}>
        Done
      </button>
    </div>
  </div>
);

// ─── Cell Renderer ────────────────────────────────────────────────────────────
const renderCell = (key, row, onEdit) => {
  switch (key) {
    case "orderNumber":
      return (
        <div className="order-cell">
          <button className="order-link-btn" onClick={() => onEdit && onEdit(row)}>
            #{row.orderNumber}
          </button>
          {/* Order source badge */}
          {row.orderSource === "online"
            ? <span className="order-source-badge order-source-online">🌐 Online Order</span>
            : <span className="order-source-badge order-source-backoffice">🖥 Back Office</span>
          }
          {row.status === "cancelled" && (
            <span className="order-cancelled-badge">CANCELLED</span>
          )}
        </div>
      );

    case "customer":
      return (
        <>
          <div className="cell-customer">{row.customer}</div>
          <div className="cell-org">{row.companyName}</div>
        </>
      );

    case "contact":
      return (
        <>
          <div className="contact-email">{row.contact}</div>
          <div className="contact-phone">{row.contactPhone}</div>
        </>
      );

    case "event":
      return (
        <>
          <div className="event-name">{row.event}</div>
          <div className="event-sub">{row.eventGuests}</div>
        </>
      );

    case "eventDate":
      return (
        <>
          <div className="cell-date">{row.eventDateDisplay}</div>
          <div className="cell-time">{row.eventTime}</div>
        </>
      );

    case "fulfillment":
      return (
        <span
          className={`badge-fulfillment ${
            row.fulfillment === "Delivery" ? "badge-delivery" : "badge-pickup"
          }`}
        >
          {row.fulfillment}
        </span>
      );

    case "store":
      return (
        <>
          <div className="cell-manager">{row.storeManager || "—"}</div>
          <div className="cell-org">{row.storeCity}</div>
        </>
      );

    case "deliveryAddress":
      return <span className="cell-location">{row.deliveryAddress || "—"}</span>;

    case "billAmount":
      return (
        <>
          <div className="cell-amount">{row.totalAmount}</div>
          <PaymentBadge status={row.paymentStatus} />
        </>
      );

    default:
      return null;
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PAGE_SIZE = CONFIG_PAGE_SIZE;

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - DEFAULT_DATE_RANGE_DAYS);

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

// ─── Store locations from snsLocations.json for filter suggestions ─────────────
const ALL_STORE_LOCATIONS = snsLocations.map(l => ({
  id:      l.id,
  label:   `${l.address}, ${l.city}, ${l.state} ${l.zip}`,
  city:    l.city,
  state:   l.state,
  address: l.address,
  zip:     l.zip,
}));

// ─── Past Events Filter Panel (slide-in from right) ──────────────────────────
const FilterPanel = ({ filter, onApply, onClose }) => {
  const def = getDefaultDateRange();
  const [from,        setFrom]        = useState(filter?.from         || def.from);
  const [to,          setTo]          = useState(filter?.to           || def.to);
  const [store,       setStore]       = useState(filter?.storeLabel   || "");
  const [storeObj,    setStoreObj]    = useState(filter?.storeObj     || null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSug,     setShowSug]     = useState(false);
  const [visible,     setVisible]     = useState(false);
  const storeRef = useRef(null);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  useEffect(() => {
    const handler = e => {
      if (storeRef.current && !storeRef.current.contains(e.target)) setShowSug(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleStoreInput = val => {
    setStore(val);
    setStoreObj(null);
    if (val.trim().length < 1) { setSuggestions([]); setShowSug(false); return; }
    const q = val.toLowerCase();
    const filtered = ALL_STORE_LOCATIONS.filter(l =>
      l.address.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q)    ||
      l.state.toLowerCase().includes(q)   ||
      l.zip.includes(q)
    ).slice(0, 8);
    setSuggestions(filtered);
    setShowSug(filtered.length > 0);
  };

  const handleSelectStore = loc => {
    setStore(loc.label);
    setStoreObj(loc);
    setSuggestions([]);
    setShowSug(false);
  };

  const handleClear = () => {
    setStore(""); setStoreObj(null);
    setSuggestions([]); setShowSug(false);
  };

  const handleClose = () => { setVisible(false); setTimeout(onClose, 260); };

  const handleSave = () => {
    onApply({
      from,
      to,
      storeLabel: store.trim(),
      storeObj,
      // Keep backward-compat city field for filtered logic
      city: storeObj ? storeObj.city : store.trim(),
    });
    handleClose();
  };

  const canSave = from && to;

  // Quick pills — show a selection of locations when input is empty
  const PILL_LOCATIONS = ALL_STORE_LOCATIONS.slice(0, 8);

  return (
    <>
      <div className={`fp-backdrop${visible ? " fp-backdrop-show" : ""}`} onClick={handleClose} />
      <div className={`fp-panel${visible ? " fp-panel-show" : ""}`}>
        {/* Header */}
        <div className="fp-header">
          <span className="fp-title">Filter</span>
          <button className="fp-close" onClick={handleClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="fp-body">
          {/* From date */}
          <div className="fp-field">
            <label className="fp-label">From date <span className="required-star">*</span></label>
            <div className="fp-input-wrap">
              <input type="date" className="fp-input" value={from} max={to}
                onChange={e => setFrom(e.target.value)} />
              <span className="fp-input-icon">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3" width="14" height="11" rx="2" stroke="#9CA3AF" strokeWidth="1.3"/>
                  <path d="M1 7h14M5 1v3M11 1v3" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </span>
            </div>
          </div>

          {/* To date */}
          <div className="fp-field">
            <label className="fp-label">To date <span className="required-star">*</span></label>
            <div className="fp-input-wrap">
              <input type="date" className="fp-input" value={to} min={from}
                onChange={e => setTo(e.target.value)} />
              <span className="fp-input-icon">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3" width="14" height="11" rx="2" stroke="#9CA3AF" strokeWidth="1.3"/>
                  <path d="M1 7h14M5 1v3M11 1v3" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </span>
            </div>
          </div>

          {/* Store location auto-suggest */}
          <div className="fp-field" ref={storeRef}>
            <label className="fp-label">Store Location</label>
            <div className="fp-city-wrap">
              <div className="fp-input-wrap">
                <input
                  type="text"
                  className="fp-input"
                  placeholder="Search by address, city or zip..."
                  value={store}
                  onChange={e => handleStoreInput(e.target.value)}
                  onFocus={() => store.length >= 1 && setShowSug(suggestions.length > 0)}
                  autoComplete="off"
                />
                {store && (
                  <button className="fp-city-clear" onClick={handleClear}>✕</button>
                )}
              </div>

              {/* Selected store card */}
              {storeObj && (
                <div className="fp-store-selected">
                  <div className="fp-store-selected-addr">{storeObj.address}</div>
                  <div className="fp-store-selected-city">{storeObj.city}, {storeObj.state} {storeObj.zip}</div>
                </div>
              )}

              {/* Dropdown suggestions */}
              {showSug && (
                <div className="fp-city-suggestions">
                  {suggestions.map(loc => (
                    <button key={loc.id} className="fp-city-option fp-store-option"
                      onClick={() => handleSelectStore(loc)}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
                        <path d="M8 2C5.79 2 4 3.79 4 6c0 3.5 4 8 4 8s4-4.5 4-8c0-2.21-1.79-4-4-4z"
                          stroke="#9CA3AF" strokeWidth="1.3" fill="none"/>
                        <circle cx="8" cy="6" r="1.5" stroke="#9CA3AF" strokeWidth="1.3"/>
                      </svg>
                      <div>
                        <div className="fp-store-name">{loc.address}</div>
                        <div className="fp-store-sub">{loc.city}, {loc.state} {loc.zip}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Quick location pills — shown when input is empty */}
              {!store && (
                <div className="fp-city-pills">
                  <span className="fp-city-pills-label">Quick select:</span>
                  {PILL_LOCATIONS.map(loc => (
                    <button key={loc.id} className="fp-city-pill"
                      onClick={() => handleSelectStore(loc)}>
                      {loc.city}, {loc.state}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="fp-footer">
          <button className="fp-cancel" onClick={handleClose}>Cancel</button>
          <button
            className={`fp-save${canSave ? "" : " fp-save-disabled"}`}
            disabled={!canSave}
            onClick={handleSave}
          >
            Save Filter
          </button>
        </div>
      </div>
    </>
  );
};

export default function CateringList({ onNewOrder, onEditOrder }) {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const [showColPicker, setShowColPicker] = useState(false);
  const [colPickerPos, setColPickerPos]   = useState({ top: 0, right: 0 });
  const [pastFilter, setPastFilter]       = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [quickDays, setQuickDays]         = useState("7");
  const [sortOrder, setSortOrder]         = useState("asc");
  const [createdDays, setCreatedDays]     = useState("all");
  const [orderSource, setOrderSource]     = useState("all"); // "all" | "online" | "backoffice"
  const [colWidths, setColWidths]         = useState({});
  const [cancelOrder, setCancelOrder]     = useState(null);
  const [refreshKey,  setRefreshKey]      = useState(0);

  // Rebuild event list whenever refreshKey changes (e.g. after cancellation)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allEvents = useMemo(() => buildAllEvents(), [refreshKey]);

  const [visibleCols, setVisibleCols] = useState(() => {
    const saved = loadFromCookie();
    if (saved && Array.isArray(saved) && saved.length > 0) {
      const requiredKeys    = ALL_COLUMNS.filter((c) => c.required).map((c) => c.key);
      const toggleableKeys  = ALL_COLUMNS.filter((c) => !c.required).map((c) => c.key);
      const savedToggleable = saved.filter((key) => toggleableKeys.includes(key));
      return [...requiredKeys, ...savedToggleable];
    }
    return DEFAULT_VISIBLE;
  });

  const loaderRef   = useRef(null);
  const colPickerRef = useRef(null);
  const gearBtnRef  = useRef(null);

  useEffect(() => {
    // Save only non-required (toggleable) column selections to cookie
    const toggleableVisible = visibleCols.filter(
      (key) => !ALL_COLUMNS.find((col) => col.key === key)?.required
    );
    saveToCookie(toggleableVisible);
  }, [visibleCols]);

  useEffect(() => {
    const handler = (e) => {
      if (
        colPickerRef.current && !colPickerRef.current.contains(e.target) &&
        gearBtnRef.current  && !gearBtnRef.current.contains(e.target)
      ) {
        setShowColPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleColumn = (key) => {
    const column = ALL_COLUMNS.find((col) => col.key === key);
    if (column?.required) return; // only block truly required cols

    setVisibleCols((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const resetColumns = () => {
    setVisibleCols(DEFAULT_VISIBLE);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "past") setPastFilter(null);
    setSearch("");
    setSortOrder("asc");
    setCreatedDays("all");
    setOrderSource("all");
  };

  // Compute effective past filter — manual filter takes priority, otherwise quickDays
  const effectivePastFilter = (() => {
    if (pastFilter) return pastFilter;
    const to   = new Date();
    const from = new Date();
    from.setDate(from.getDate() - parseInt(quickDays));
    return {
      from: from.toISOString().split("T")[0],
      to:   to.toISOString().split("T")[0],
      city: "",
    };
  })();

  // createdDays cutoff for upcoming tab
  const createdCutoff = (() => {
    if (activeTab !== "upcoming" || createdDays === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - parseInt(createdDays));
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const filtered = allEvents.filter((e) => {
    if (e.tab !== activeTab) return false;

    // Past tab: date range + city filter
    if (activeTab === "past") {
      if (e.eventDate < effectivePastFilter.from || e.eventDate > effectivePastFilter.to) return false;
      if (
        effectivePastFilter.city &&
        !String(e.storeCity || "").toLowerCase().includes(effectivePastFilter.city.toLowerCase())
      ) return false;
    }

    // Upcoming tab: created/added within N days filter
    if (activeTab === "upcoming" && createdCutoff) {
      const created = e.createdAt ? new Date(e.createdAt) : null;
      if (!created || created < createdCutoff) return false;
    }

    // Order source filter — both tabs
    if (orderSource !== "all" && (e.orderSource || "backoffice") !== orderSource) return false;

    return (
      String(e.orderNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      String(e.customer || "").toLowerCase().includes(search.toLowerCase()) ||
      String(e.event || "").toLowerCase().includes(search.toLowerCase()) ||
      String(e.contact || "").toLowerCase().includes(search.toLowerCase()) ||
      String(e.paymentStatus || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const sorted =
    activeTab === "upcoming"
      ? [...filtered].sort((a, b) => {
          const da = new Date(a.eventDate);
          const db = new Date(b.eventDate);
          return sortOrder === "asc" ? da - db : db - da;
        })
      : filtered;

  const visibleRows = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, search, sortOrder, pastFilter, createdDays, orderSource]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    setTimeout(() => {
      setVisibleCount((p) => p + PAGE_SIZE);
      setIsLoading(false);
    }, 400);
  }, [isLoading, hasMore]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const handleResizeStart = (e, colKey) => {
    const column = ALL_COLUMNS.find((col) => col.key === colKey);
    if (!column?.adjustable) return;

    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] || 150;

    const onMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(60, startWidth + delta);
      setColWidths((prev) => ({ ...prev, [colKey]: newWidth }));
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const activeCols = ALL_COLUMNS.filter((c) => visibleCols.includes(c.key));

  return (
    <div className="app" onClick={() => setOpenMenu(null)}>
      <div className="topbar">
        <span className="topbar-title">Catering &amp; Events</span>
        <div className="topbar-right">
          <div className="topbar-org">
            <div className="topbar-org-name">{ORG_NAME} ↓</div>
            <div className="topbar-org-sub">Enterprise</div>
          </div>
          <div className="avatar">VR</div>
        </div>
      </div>

      <div className="list-content">
        <div className="list-toolbar">
          <div className="tab-toggle">
            <button
              className={`tab-toggle-btn${activeTab === "upcoming" ? " tab-toggle-active" : ""}`}
              onClick={() => handleTabChange("upcoming")}
            >
              Upcoming Events
            </button>
            <button
              className={`tab-toggle-btn${activeTab === "past" ? " tab-toggle-active" : ""}`}
              onClick={() => handleTabChange("past")}
            >
              Past Events
            </button>
          </div>

          <div className="list-toolbar-right">
            {/* Upcoming tab controls */}
            {activeTab === "upcoming" && (
              <>
                {/* Event Date sort dropdown */}
                <div className="quick-days-wrap">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
                    <path d="M4 3v10M4 13l-2-2M4 13l2-2" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 13V3M12 3l-2 2M12 3l2 2" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <select
                    className="quick-days-select"
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value)}
                    title="Sort by Event Date"
                  >
                    <option value="asc">Event Date ↑ Earliest</option>
                    <option value="desc">Event Date ↓ Latest</option>
                  </select>
                  <svg className="quick-days-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6l4 4 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Created / Added days dropdown */}
                <div className="quick-days-wrap">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
                    <rect x="1" y="3" width="14" height="11" rx="2" stroke="#6B7280" strokeWidth="1.3"/>
                    <path d="M1 7h14M5 1v3M11 1v3" stroke="#6B7280" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  <select
                    className="quick-days-select"
                    value={createdDays}
                    onChange={e => setCreatedDays(e.target.value)}
                    title="Filter by date added"
                  >
                    <option value="all">All Orders</option>
                    <option value="1">Created Today</option>
                    <option value="2">Last 2 days</option>
                    <option value="3">Last 3 days</option>
                    <option value="4">Last 4 days</option>
                    <option value="5">Last 5 days</option>
                    <option value="6">Last 6 days</option>
                    <option value="7">Last 7 days</option>
                  </select>
                  <svg className="quick-days-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6l4 4 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </>
            )}

            {/* Past tab controls */}
            {activeTab === "past" && (
              <>
                {/* Filter icon */}
                <button
                  className={`filter-icon-btn${pastFilter ? " filter-icon-btn-active" : ""}`}
                  onClick={() => setShowFilterPanel(true)}
                  title="Filter past events"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path d="M3 5h14M6 10h8M9 15h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                  {pastFilter && <span className="filter-active-dot" />}
                </button>

                {/* Quick days dropdown */}
                <div className="quick-days-wrap">
                  <select
                    className="quick-days-select"
                    value={quickDays}
                    onChange={e => { setQuickDays(e.target.value); setPastFilter(null); }}
                  >
                    <option value="7">Last 7 days</option>
                    <option value="15">Last 15 days</option>
                    <option value="30">Last 30 days</option>
                  </select>
                  <svg className="quick-days-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6l4 4 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </>
            )}

            {/* Order Source filter — both tabs */}
            <div className="quick-days-wrap">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
                <circle cx="8" cy="8" r="6" stroke="#6B7280" strokeWidth="1.3"/>
                <path d="M8 2c0 0-3 2-3 6s3 6 3 6M8 2c0 0 3 2 3 6s-3 6-3 6M2 8h12" stroke="#6B7280" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <select
                className="quick-days-select"
                value={orderSource}
                onChange={e => setOrderSource(e.target.value)}
                title="Filter by order source"
              >
                <option value="all">All Sources</option>
                <option value="online">🌐 Online Orders</option>
                <option value="backoffice">🖥 Back Office</option>
              </select>
              <svg className="quick-days-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div className="list-search-wrap">
              <span className="list-search-icon"><SearchIcon /></span>
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="list-search-input"
              />
            </div>

            <button className="export-json-btn" onClick={exportOrdersJSON} title="Download all orders as orders.json">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              Export JSON
            </button>
            <button className="new-order-btn" onClick={onNewOrder}>
              <PlusIcon /> New Order
            </button>
          </div>
        </div>

        {/* Active filter chips for past events */}
        {activeTab === "past" && pastFilter && (
          <div className="active-filters">
            <span className="active-filter-chip">📅 {pastFilter.from} → {pastFilter.to}</span>
            {pastFilter.storeLabel && <span className="active-filter-chip">📍 {pastFilter.storeLabel}</span>}
            <button className="active-filter-clear" onClick={() => setPastFilter(null)}>
              Clear Filter
            </button>
          </div>
        )}

            <div className="table-wrap">
              <table className="data-table" style={{ tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    {activeCols.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          width: col.adjustable && colWidths[col.key]
                            ? `${colWidths[col.key]}px`
                            : undefined,
                          position: "relative",
                        }}
                      >
                        <span className="th-label">{col.label}</span>

                        {col.adjustable && (
                          <span
                            className="col-resize-handle"
                            onMouseDown={(e) => handleResizeStart(e, col.key)}
                            title="Drag to resize"
                          />
                        )}
                      </th>
                    ))}

                    <th className="th-gear" style={{ width: 48, position: "relative" }}>
                      <button
                        ref={gearBtnRef}
                        className={`gear-btn${showColPicker ? " gear-btn-active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setColPickerPos({
                            top:   rect.bottom + window.scrollY + 6,
                            right: window.innerWidth - rect.right,
                          });
                          setShowColPicker((p) => !p);
                        }}
                        title="Show / hide columns"
                      >
                        <GearIcon />
                        {visibleCols.filter(
                          (key) => ALL_COLUMNS.find((col) => col.key === key && !col.required)
                        ).length <
                          ALL_COLUMNS.filter((col) => !col.required).length && (
                          <span className="col-badge">
                            {visibleCols.filter(
                              (key) => ALL_COLUMNS.find((col) => col.key === key && !col.required)
                            ).length}
                            /{ALL_COLUMNS.filter((col) => !col.required).length}
                          </span>
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>

                {/* Column Picker rendered via portal — escapes table overflow clipping */}
                {showColPicker && ReactDOM.createPortal(
                  <div
                    ref={colPickerRef}
                    style={{
                      position: "absolute",
                      top:   colPickerPos.top,
                      right: colPickerPos.right,
                      zIndex: 9999,
                    }}
                  >
                    <ColumnPicker
                      visibleCols={visibleCols}
                      onToggle={toggleColumn}
                      onReset={resetColumns}
                      onClose={() => setShowColPicker(false)}
                    />
                  </div>,
                  document.body
                )}

                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={activeCols.length + 1} className="table-empty">
                        No events found
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row) => (
                      <tr key={row.id} className={`table-row${row.status === "cancelled" ? " row-cancelled" : ""}`}>
                        {activeCols.map((col) => (
                          <td
                            key={col.key}
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 0,
                            }}
                          >
                            {renderCell(col.key, row, onEditOrder)}
                          </td>
                        ))}

                        <td onClick={(e) => e.stopPropagation()}>
                          <ActionMenu
                            rowId={row.id}
                            row={row}
                            openMenu={openMenu}
                            setOpenMenu={setOpenMenu}
                            onCancel={row => setCancelOrder(row)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div ref={loaderRef} className="lazy-sentinel">
                {isLoading && (
                  <div className="lazy-loader">
                    <span className="lazy-spinner" />
                    <span className="lazy-loader-text">Loading more...</span>
                  </div>
                )}

                {!hasMore && filtered.length > 0 && (
                  <div className="lazy-end">All {filtered.length} records loaded</div>
                )}
              </div>
            </div>

            <div className="list-footer">
              Showing {visibleRows.length} of {sorted.length} events &nbsp;·&nbsp;
              <span className="col-count">
                {activeCols.length} of {ALL_COLUMNS.length} columns visible
              </span>
            </div>
      </div>

      {/* Filter Panel slide-in */}
      {showFilterPanel && (
        <FilterPanel
          filter={pastFilter}
          onApply={f => { setPastFilter(f); setVisibleCount(PAGE_SIZE); }}
          onClose={() => setShowFilterPanel(false)}
        />
      )}

      {/* Cancel Order Modal */}
      {cancelOrder && (
        <CancelOrderModal
          order={cancelOrder}
          onClose={() => setCancelOrder(null)}
          onConfirm={async ({ order, reason, notes }) => {
            try {
              await persistCancelOrder(order.orderNumber, reason, notes);
            } catch(e) {
              console.error('Cancel persist failed', e);
              // Fallback: update localStorage directly
              const cancelledAt = new Date().toISOString();
              try {
                const orders = JSON.parse(localStorage.getItem('ceo_orders') || '[]');
                const oi = orders.findIndex(o => o.orderNumber === order.orderNumber);
                if (oi >= 0) { orders[oi] = { ...orders[oi], status:'cancelled', cancelledAt, cancelReason:reason, cancelNotes:notes }; localStorage.setItem('ceo_orders', JSON.stringify(orders)); }
                const list = JSON.parse(localStorage.getItem('ceo_event_list') || '[]');
                const li = list.findIndex(r => r.orderNumber === order.orderNumber);
                if (li >= 0) { list[li] = { ...list[li], status:'cancelled', cancelledAt, cancelReason:reason, cancelNotes:notes }; localStorage.setItem('ceo_event_list', JSON.stringify(list)); }
              } catch(e2) { console.error(e2); }
            }
            setCancelOrder(null);
            setRefreshKey(k => k + 1);
          }}
        />
      )}
    </div>
  );
}