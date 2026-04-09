import './Stepper.css';
import { CheckCircleIcon } from '../../shared/icons.jsx';

const STEPS = [
  "Event & Customer details",
  "Restaurant location & Menu",
  "Payment",
];

export default function Stepper({ current, onStepClick }) {
  return (
    <div className="stepper-bar">
      {STEPS.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={i} className="stepper-item">
            <button
              className="stepper-btn"
              onClick={() => onStepClick(i)}
              title={`Go to ${label}`}
            >
              <div className={`stepper-circle${done ? " done" : active ? " active" : ""}`}>
                {done ? <CheckCircleIcon /> : <span>{i + 1}</span>}
              </div>
              <span className={`stepper-text${done ? " done" : active ? " active" : ""}`}>
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`stepper-line${done ? " done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
