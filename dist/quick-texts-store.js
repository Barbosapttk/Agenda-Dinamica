const key = 'agenda-tool-text-overrides-v1';
export function loadTextEdits() {
  try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; }
}
export function saveTextEdits(edits) { localStorage.setItem(key, JSON.stringify(edits)); }
