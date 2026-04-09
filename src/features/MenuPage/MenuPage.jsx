import { useState, useMemo, useCallback } from 'react';
import './MenuPage.css';
import { SearchIcon } from '../../shared/icons.jsx';
import ModifiersPanel from '../Modifiers/Modifiers.jsx';
import OpenItemModal  from '../OpenItem/OpenItem.jsx';
import snsLocations   from '../../snsLocations.json';
import { MAX_LOCATION_OPTIONS, MENU_CATEGORIES } from '../../shared/constants.js';

// ─── Real SNS Menu Items ──────────────────────────────────────────────────────
const MENU_ITEMS = [
  { id:1,  name:"Original Double Steakburger", desc:"Two steakburger patties with American cheese, lettuce, tomato and pickles", price:6.49,  category:"Mains",   kcal:610, img:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=280&fit=crop",
    modifierGroups:[
      { key:"toppings", label:"Choose toppings", required:true,  maxSelect:4, options:[{id:"lettuce",name:"Lettuce",price:0},{id:"tomato",name:"Tomato",price:0},{id:"pickle",name:"Pickle",price:0},{id:"onion",name:"Onion",price:0},{id:"bacon",name:"Add Bacon",price:1.50},{id:"xcheese",name:"Extra Cheese",price:1.00}] },
      { key:"sauce",    label:"Choose sauce",    required:false, maxSelect:2, options:[{id:"ketchup",name:"Ketchup",price:0},{id:"mustard",name:"Mustard",price:0},{id:"mayo",name:"Mayo",price:0},{id:"thousand",name:"Thousand Island",price:0.50}] },
    ]},
  { id:2,  name:"Frisco Melt", desc:"Steakburger with Swiss & American cheese on toasted sourdough", price:7.29, category:"Mains", kcal:680, img:"https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=280&fit=crop",
    modifierGroups:[
      { key:"extras", label:"Add extras", required:false, maxSelect:3, options:[{id:"xpatty",name:"Extra Patty",price:3.00},{id:"bacon",name:"Add Bacon",price:1.50},{id:"jalapeno",name:"Jalapeños",price:0.50}] },
    ]},
  { id:3,  name:"Garlic Double Steakburger", desc:"Double steakburger with rich garlic butter sauce", price:7.49, category:"Mains", kcal:650, img:"https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=280&fit=crop",
    modifierGroups:[
      { key:"extras", label:"Add extras", required:false, maxSelect:3, options:[{id:"xgarlic",name:"Extra Garlic",price:0.50},{id:"cheese",name:"Add Cheese",price:1.00},{id:"bacon",name:"Add Bacon",price:1.50}] },
    ]},
  { id:4,  name:"Grilled Chicken Sandwich", desc:"Grilled chicken breast with crisp lettuce and tomato", price:6.99, category:"Mains", kcal:480, img:"https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=280&fit=crop",
    modifierGroups:[
      { key:"toppings", label:"Choose toppings", required:true, maxSelect:3, options:[{id:"lettuce",name:"Lettuce",price:0},{id:"tomato",name:"Tomato",price:0},{id:"cheese",name:"Add Cheese",price:1.00},{id:"bacon",name:"Add Bacon",price:1.50}] },
    ]},
  { id:5,  name:"Chili Cheese Fries", desc:"Crispy shoestring fries with chili and melted cheese", price:4.99, category:"Sides", kcal:540, img:"https://images.unsplash.com/photo-1630431341973-02e1b662ec35?w=400&h=280&fit=crop",
    modifierGroups:[
      { key:"extras", label:"Add extras", required:false, maxSelect:2, options:[{id:"xchili",name:"Extra Chili",price:1.00},{id:"xcheese",name:"Extra Cheese",price:1.00}] },
    ]},
  { id:6,  name:"Thin 'n Crispy Fries", desc:"Classic golden shoestring fries, lightly salted", price:2.99, category:"Sides", kcal:310, img:"https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&h=280&fit=crop",
    modifierGroups:[]},
  { id:7,  name:"Onion Rings", desc:"Thick-cut onion rings in a crispy golden batter", price:3.49, category:"Sides", kcal:380, img:"https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=280&fit=crop",
    modifierGroups:[]},
  { id:8,  name:"Calamari Rings", desc:"Golden fried calamari with marinara dipping sauce", price:5.99, category:"Sides", kcal:420, img:"https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=280&fit=crop",
    modifierGroups:[]},
  { id:9,  name:"Mac & Cheese", desc:"Creamy mac and cheese with crispy breadcrumb topping", price:3.99, category:"Sides", kcal:450, img:"https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=400&h=280&fit=crop",
    modifierGroups:[]},
  { id:10, name:"Chocolate Milkshake", desc:"Hand-dipped classic chocolate shake with whipped cream", price:4.29, category:"Dessert", kcal:720, img:"https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=280&fit=crop",
    modifierGroups:[
      { key:"size", label:"Choose size", required:true, maxSelect:1, options:[{id:"regular",name:"Regular",price:0},{id:"large",name:"Large",price:1.00}] },
    ]},
  { id:11, name:"Strawberry Milkshake", desc:"Strawberry shake made with real strawberries", price:4.29, category:"Dessert", kcal:700, img:"https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400&h=280&fit=crop",
    modifierGroups:[
      { key:"size", label:"Choose size", required:true, maxSelect:1, options:[{id:"regular",name:"Regular",price:0},{id:"large",name:"Large",price:1.00}] },
    ]},
  { id:12, name:"Soft Drink", desc:"Ice-cold fountain drink — choose your favorite flavor", price:1.99, category:"Drink", kcal:180, img:"https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400&h=280&fit=crop",
    modifierGroups:[
      { key:"size", label:"Choose size", required:true, maxSelect:1, options:[{id:"sm",name:"Small",price:0},{id:"md",name:"Medium",price:0.50},{id:"lg",name:"Large",price:1.00}] },
    ]},
];

export default function MenuPage({ data, onChange, deliveryAddress }) {
  const [category,      setCategory]      = useState("All");
  const [search,        setSearch]        = useState("");
  const [modifierItem,  setModifierItem]  = useState(null);
  const [showOpenItem,  setShowOpenItem]  = useState(false);

  const cart = useMemo(() => data.cart || [], [data.cart]);

  const searchLower = search.toLowerCase();
  const filtered = useMemo(() =>
    MENU_ITEMS.filter(item =>
      (category === "All" || item.category === category) &&
      item.name.toLowerCase().includes(searchLower)
    ), [category, searchLower]
  );

  const addToCart = useCallback((item, selections, qty) => {
    let extraPrice = 0;
    const modLabels = [];
    if (item.modifierGroups) {
      item.modifierGroups.forEach(group => {
        (selections[group.key] || []).forEach(optId => {
          const opt = group.options.find(o => o.id === optId);
          if (opt) { extraPrice += opt.price; modLabels.push(opt.name); }
        });
      });
    }
    const cartItem = { id: item.id, name: item.name, mods: modLabels, price: item.price + extraPrice, qty };
    const existing = cart.findIndex(c => c.id === cartItem.id && JSON.stringify(c.mods) === JSON.stringify(cartItem.mods));
    let newCart;
    if (existing >= 0) {
      newCart = cart.map((c,i) => i === existing ? { ...c, qty: c.qty + qty } : c);
    } else {
      newCart = [...cart, cartItem];
    }
    onChange({ ...data, cart: newCart });
  }, [cart, data, onChange]);

  const handleCardClick = useCallback((item) => {
    if (!item.modifierGroups || item.modifierGroups.length === 0) {
      addToCart(item, {}, 1);
    } else {
      setModifierItem(item);
    }
  }, [addToCart]);

  const handleOpenItemAdd = useCallback(({ name, qty, price }) => {
    const newCart = [...cart, { id: `open-${Date.now()}`, name, mods: [], price, qty }];
    onChange({ ...data, cart: newCart });
  }, [cart, data, onChange]);

  const removeFromCart = useCallback((idx) => {
    onChange({ ...data, cart: cart.filter((_, i) => i !== idx) });
  }, [cart, data, onChange]);

  const locationOptions = useMemo(() => snsLocations.slice(0, MAX_LOCATION_OPTIONS), []);

  return (
    <div className="mp-layout">
      <div className="mp-main card">
        <div className="mp-header">
          <h2 className="mp-title">Restaurant location &amp; Menu</h2>
          <p className="mp-sub">Fill in the details of the event and the customer</p>
        </div>

        {/* Restaurant location */}
        <div className="mp-section">
          <div className="section-label">RESTAURANT LOCATION</div>
          <div className="mp-location-wrap">
            <select
              className="mp-location-select"
              value={data.selectedLocation?.id || ''}
              onChange={e => {
                const loc = locationOptions.find(l => String(l.id) === e.target.value);
                onChange({ ...data, selectedLocation: loc });
              }}
            >
              <option value="">Select location...</option>
              {locationOptions.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.address}, {loc.city}, {loc.state}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Menu items */}
        <div className="mp-section">
          <div className="section-label">MENU ITEMS</div>
          <div className="mp-filter-row">
            <div className="mp-cats">
              {MENU_CATEGORIES.map(c => (
                <button
                  key={c}
                  className={`mp-cat-btn${category === c ? ' active' : ''}`}
                  onClick={() => setCategory(c)}
                >{c}</button>
              ))}
            </div>
            <div className="mp-filter-right">
              <div className="mp-search-wrap">
                <SearchIcon/>
                <input
                  type="text" className="mp-search-input"
                  placeholder="Search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button className="mp-open-item-btn" onClick={() => setShowOpenItem(true)}>
                + Open Item
              </button>
            </div>
          </div>

          {/* 4-column grid — matching Figma screen 4 */}
          <div className="mp-grid">
            {filtered.map(item => {
              const cartEntry  = cart.find(c => c.id === item.id);
              const isSelected = !!cartEntry;
              const hasGroups  = item.modifierGroups?.length > 0;
              return (
                <div
                  key={item.id}
                  className={`mp-card${isSelected ? ' selected' : ''}`}
                  onClick={() => handleCardClick(item)}
                >
                  <div className="mp-card-img-wrap">
                    <img src={item.img} alt={item.name} className="mp-card-img"/>
                    {isSelected && (
                      <div className="mp-card-badge">
                        {cartEntry.qty > 1 ? `×${cartEntry.qty}` : hasGroups ? 'Customized' : 'Added'}
                      </div>
                    )}
                  </div>
                  <div className="mp-card-body">
                    <div className="mp-card-name">{item.name}</div>
                    <div className="mp-card-desc">{item.desc}</div>
                    <div className="mp-card-price">${item.price.toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order summary sidebar */}
      <div className="mp-sidebar">
        <div className="mp-sidebar-title">Order summary</div>
        {cart.length === 0 ? (
          <div className="mp-cart-empty">No items added yet</div>
        ) : (
          <>
            <div className="mp-cart-list">
              {cart.map((item, i) => (
                <div key={`${item.id}-${item.mods?.join(',') || ''}-${i}`} className="mp-cart-row">
                  <div className="mp-cart-info">
                    <div className="mp-cart-name">{item.qty}× {item.name}</div>
                    {item.mods?.length > 0 && (
                      <div className="mp-cart-mods">{item.mods.join(' · ')}</div>
                    )}
                  </div>
                  <div className="mp-cart-right">
                    <span className="mp-cart-price">${(item.price * item.qty).toFixed(2)}</span>
                    <button className="mp-cart-remove" onClick={() => removeFromCart(i)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mp-cart-total">
              <span>Total</span>
              <span>${cart.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {modifierItem && (
        <ModifiersPanel
          item={modifierItem}
          onClose={() => setModifierItem(null)}
          onConfirm={(item, selections, qty) => { addToCart(item, selections, qty); setModifierItem(null); }}
        />
      )}

      {showOpenItem && (
        <OpenItemModal
          onClose={() => setShowOpenItem(false)}
          onAddToCart={handleOpenItemAdd}
        />
      )}
    </div>
  );
}
