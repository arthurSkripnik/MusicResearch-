// Per-browser UI preferences (never shared, never required).
export function loadPref<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(`music-explorer/ui/${k}`); return v ? JSON.parse(v) : d; } catch { return d; }
}
export function savePref(k: string, v: unknown) {
  try { localStorage.setItem(`music-explorer/ui/${k}`, JSON.stringify(v)); } catch { /* ignore */ }
}
