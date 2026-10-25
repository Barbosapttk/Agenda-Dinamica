export const normalizeToolText = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const toolMoney = value => typeof window.moedaBR === 'function' ? window.moedaBR(value) : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export async function copyPlainText(value) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return; }
  } catch { /* Usa a cópia tradicional quando a API estiver bloqueada. */ }
  const active = document.activeElement;
  const area = document.createElement('textarea');
  area.value = value;
  area.className = 'qt-clipboard';
  document.body.append(area);
  try {
    area.select();
    if (!document.execCommand('copy')) throw new Error('Clipboard indisponível');
  } finally { area.remove(); active?.focus(); }
}
