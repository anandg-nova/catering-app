import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import CateringList    from './CateringList';
import CreateEventOrder from './CreateEventOrder.jsx';
import { SESSION_TIMEOUT_MINUTES } from './shared/constants.js';

function useSessionTimeout(onTimeout, minutes = SESSION_TIMEOUT_MINUTES) {
  const callbackRef = React.useRef(onTimeout);
  callbackRef.current = onTimeout;

  useEffect(() => {
    let timer;
    const reset = () => { clearTimeout(timer); timer = setTimeout(() => callbackRef.current(), minutes * 60 * 1000); };
    const events = ["mousemove","keydown","click","scroll","touchstart"];
    events.forEach(e => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [minutes]);
}

function SessionExpired({ onResume }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"40px 48px", textAlign:"center", maxWidth:380 }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
        <h2 style={{ fontSize:18, fontWeight:700, color:"#111827", marginBottom:8 }}>Session Timed Out</h2>
        <p style={{ fontSize:13, color:"#6b7280", marginBottom:24, lineHeight:1.6 }}>
          You've been inactive for {SESSION_TIMEOUT_MINUTES} minutes. Click below to resume.
        </p>
        <button onClick={onResume}
          style={{ background:"#2563eb", color:"#fff", border:"none", borderRadius:10, padding:"10px 28px", fontSize:14, fontWeight:600, cursor:"pointer" }}>
          Resume Session
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [page,       setPage]       = useState("list");
  const [editRow,    setEditRow]    = useState(null);
  const [sessionExp, setSessionExp] = useState(false);

  const handleTimeout = useCallback(() => setSessionExp(true), []);
  useSessionTimeout(handleTimeout);

  if (sessionExp) return <SessionExpired onResume={() => setSessionExp(false)} />;
  if (page === "create") return <CreateEventOrder onCancel={() => setPage("list")} />;
  if (page === "edit")   return <CreateEventOrder editData={editRow} onCancel={() => { setEditRow(null); setPage("list"); }} />;

  return (
    <CateringList
      onNewOrder={() => setPage("create")}
      onEditOrder={row => { setEditRow(row); setPage("edit"); }}
    />
  );
}
