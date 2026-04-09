// Security hardening — called once at boot from index.js
export function injectSecurityHeaders() {
  const csp = document.createElement("meta");
  csp.httpEquiv = "Content-Security-Policy";
  csp.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://images.unsplash.com https://picsum.photos",
    "connect-src 'self' https://api.anthropic.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");
  document.head.appendChild(csp);
}

export function applyRuntimeSecurity() {
  document.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("keydown", e => {
    const blocked = e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && ["I","J","C","U"].includes(e.key)) ||
      (e.metaKey && e.altKey  && ["I","J"].includes(e.key)) ||
      (e.ctrlKey && e.key === "U");
    if (blocked) e.preventDefault();
  });
  document.addEventListener("dragstart", e => e.preventDefault());
  document.addEventListener("copy", e => {
    const sel = window.getSelection()?.toString() || "";
    if (sel.match(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/)) {
      e.clipboardData.setData("text/plain", "[REDACTED]");
      e.preventDefault();
    }
  });
}
