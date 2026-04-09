import { useState, useEffect, useCallback, useMemo } from 'react';
import './Modifiers.css';
import { CloseIcon, PlusIcon, MinusIcon } from '../../shared/icons.jsx';

export default function ModifiersPanel({ item, onClose, onConfirm }) {
  const [selections, setSelections] = useState({});
  const [quantity,   setQuantity]   = useState(1);
  const [visible,    setVisible]    = useState(false);

  const groups = useMemo(() => item?.modifierGroups || [], [item?.modifierGroups]);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = useCallback(() => { setVisible(false); setTimeout(onClose, 280); }, [onClose]);

  const toggleOption = useCallback((groupKey, optId, maxSelect) => {
    setSelections(prev => {
      const current = prev[groupKey] || [];
      if (current.includes(optId)) return { ...prev, [groupKey]: current.filter(x => x !== optId) };
      if (maxSelect === 1) return { ...prev, [groupKey]: [optId] };
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupKey]: [...current, optId] };
    });
  }, []);

  const isSelected = useCallback((groupKey, optId) => (selections[groupKey] || []).includes(optId), [selections]);

  const requiredMet = useMemo(() =>
    groups.filter(g => g.required).every(g => (selections[g.key] || []).length > 0),
    [groups, selections]
  );

  const handleConfirm = useCallback(() => {
    onConfirm(item, selections, quantity);
    handleClose();
  }, [onConfirm, item, selections, quantity, handleClose]);

  return (
    <>
      <div className={`mod-backdrop${visible ? ' mod-backdrop-show' : ''}`} onClick={handleClose} />
      <div className={`mod-panel${visible ? ' mod-panel-show' : ''}`}>
        {/* Header */}
        <div className="mod-header">
          <button className="mod-close-btn" onClick={handleClose}><CloseIcon /></button>
          <h2 className="mod-title">Modifiers</h2>
        </div>

        {/* Item info */}
        <div className="mod-item-info">
          <img src={item.img} alt={item.name} className="mod-item-img" />
          <div className="mod-item-details">
            <div className="mod-item-name">{item.name}</div>
            <div className="mod-item-meta">
              {item.kcal && <span className="mod-kcal">🔥 {item.kcal} Kcal</span>}
              <span className="mod-item-desc">{item.desc}</span>
            </div>
          </div>
        </div>
        <div className="mod-divider" />

        {/* Modifier groups */}
        <div className="mod-body">
          {groups.length === 0 && <div className="mod-no-mods">No customizations available.</div>}
          {groups.map(group => {
            const selected = selections[group.key] || [];
            const atMax    = selected.length >= group.maxSelect;
            const isRadio  = group.maxSelect === 1;
            return (
              <div key={group.key} className="mod-group">
                <div className="mod-group-header">
                  <span className="mod-group-label">{group.label}</span>
                  <div className="mod-group-meta">
                    {group.required
                      ? <span className="mod-required">⚠ Required</span>
                      : <span className="mod-optional">Optional</span>
                    }
                    {!isRadio && <span className="mod-max-hint">· Select up to {group.maxSelect}</span>}
                  </div>
                </div>
                <div className="mod-options-grid">
                  {group.options.map(opt => {
                    const on       = isSelected(group.key, opt.id);
                    const disabled = !on && atMax && !isRadio;
                    return (
                      <button
                        key={opt.id}
                        disabled={disabled}
                        onClick={() => toggleOption(group.key, opt.id, group.maxSelect)}
                        className={`mod-option${on ? ' mod-option-on' : ''}${disabled ? ' mod-option-disabled' : ''}`}
                      >
                        <div className="mod-option-content">
                          <span className="mod-option-name">{opt.name}</span>
                          {opt.price > 0 && <span className="mod-option-price">+${opt.price.toFixed(2)}</span>}
                        </div>
                        {/* Radio dot on the right — matches Figma */}
                        <div className={`mod-radio-dot${on ? ' on' : ''}`}>
                          {on && <div className="mod-radio-inner" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {atMax && !isRadio && <div className="mod-max-msg">Max {group.maxSelect} reached</div>}
              </div>
            );
          })}
        </div>

        {/* Footer — quantity stepper + buttons */}
        <div className="mod-footer">
          <div className="mod-qty-stepper">
            <button
              className="mod-qty-btn"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
            ><MinusIcon /></button>
            <span className="mod-qty-value">{quantity}</span>
            <button
              className="mod-qty-btn"
              onClick={() => setQuantity(q => q + 1)}
            ><PlusIcon /></button>
          </div>
          <div className="mod-footer-actions">
            <button className="btn-secondary mod-cancel-btn" onClick={handleClose}>Cancel</button>
            <button
              className={`btn-primary mod-confirm-btn${(requiredMet || groups.length === 0) ? '' : ' disabled'}`}
              disabled={!requiredMet && groups.length > 0}
              onClick={handleConfirm}
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
