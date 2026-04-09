import { memo } from 'react';
import './FloatInput.css';

const FloatInput = memo(({ label, value, onChange, type = "text", placeholder = " ", readOnly = false, required = false }) => (
  <div className="fi-wrap">
    <input
      type={type}
      value={value}
      onChange={e => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`fi-input${readOnly ? " fi-readonly" : ""}`}
    />
    <label className="fi-label">{label}{required && <span className="fi-required"> *</span>}</label>
  </div>
));

FloatInput.displayName = 'FloatInput';
export { FloatInput };
export default FloatInput;
