import { useState, useEffect } from 'react';
import './OpenItem.css';
import { CloseIcon } from '../../shared/icons.jsx';

export default function OpenItemModal({ onClose, onAddToCart }) {
  const [name,     setName]     = useState('');
  const [quantity, setQuantity] = useState('');
  const [price,    setPrice]    = useState('');
  const [visible,  setVisible]  = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 220); };

  const canAdd = name.trim() && quantity && Number(quantity) > 0 && price !== '';

  const handleAdd = () => {
    if (!canAdd) return;
    onAddToCart({ name: name.trim(), qty: Number(quantity), price: Number(price) });
    handleClose();
  };

  return (
    <>
      <div className={`oi-backdrop${visible ? ' oi-backdrop-show' : ''}`} onClick={handleClose} />
      <div className={`oi-modal${visible ? ' oi-modal-show' : ''}`}>
        {/* Header */}
        <div className="oi-header">
          <span className="oi-title">Open Item</span>
          <button className="oi-close" onClick={handleClose}><CloseIcon /></button>
        </div>

        <div className="oi-body">
          {/* Name */}
          <div className="oi-field">
            <label className="oi-label">Name</label>
            <input
              type="text"
              className="oi-input"
              placeholder="Vegan Salad"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Quantity + Price */}
          <div className="oi-row">
            <div className="oi-field">
              <label className="oi-label">Quantity</label>
              <input
                type="number"
                className="oi-input"
                placeholder="20"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
            <div className="oi-field">
              <label className="oi-label">Price</label>
              <div className="oi-price-wrap">
                <input
                  type="number"
                  className="oi-input oi-price-input"
                  placeholder="20"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                />
                <span className="oi-price-sym">$</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="oi-footer">
          <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button
            className={`btn-primary${canAdd ? '' : ' disabled'}`}
            disabled={!canAdd}
            onClick={handleAdd}
          >
            Add to cart
          </button>
        </div>
      </div>
    </>
  );
}
