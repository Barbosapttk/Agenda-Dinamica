import { normalizeToolText } from './tools-common.js';

// Dimensões em centímetros; peso ausente não significa zero.
export const SIZES = [
  { type: 'Sacos', name: 'Saco de Sal', height: 20, width: 50, length: 45, weight: 25, weightUnit: 'Saco' },
  { type: 'Sacos', name: 'Saco de Carvão', height: 50, width: 45, length: 20, weight: 25, weightUnit: 'Saco' },
  { type: 'Sacos', name: 'Saco de Resina', height: 60, width: 40, length: 10, weight: 25, weightUnit: 'Saco' },
  { type: 'Sacos', name: 'Saco de Zeólita', height: 60, width: 40, length: 10, weight: 25, weightUnit: 'Saco' },
  { type: 'Caixas', name: 'Conj. Galão reprocessadora', height: 37, width: 40, length: 50, weight: 3, weightUnit: 'unidade' },
  { type: 'Caixas', name: 'Caixa Nº 7', height: 20, width: 15, length: 15, weight: null },
  { type: 'Caixas', name: 'Caixa Nº 17', height: 25, width: 25, length: 14, weight: null },
  { type: 'Caixas', name: 'Caixa Nº 22', height: 35, width: 25, length: 25, weight: null },
  { type: 'Caixas', name: 'Caixa Nº 5', height: 50, width: 30, length: 25, weight: null },
  { type: 'Caixas', name: 'Caixa Nº 29', height: 50, width: 40, length: 35, weight: null },
  { type: 'Caixas', name: 'Caixa Nº 32', height: 70, width: 50, length: 40, weight: null },
  { type: 'Pallet', name: 'Pallet', height: null, width: 100, length: 120, weight: null },
];

export function findSizes(query = '', type = '', items = SIZES) {
  const searchable = value => normalizeToolText(value).replace(/\bn[º°o]\b|\bn[º°]/g, ' numero ').replace(/[^a-z0-9]+/g, ' ').trim();
  const words = searchable(query).split(' ').filter(Boolean);
  return items.filter(item => {
    const text = searchable(item.type + ' ' + item.name);
    return (!type || item.type === type) && words.every(word => /^\d+$/.test(word) ? text.split(' ').includes(word) : text.includes(word));
  });
}

export function formatSizeDimensions(item) {
  const value = number => number == null ? '—' : String(number).replace('.', ',');
  return `L ${value(item.width)} x A ${value(item.height)} x C ${value(item.length)}`;
}

export function formatSizeWeight(item) {
  if (item.weight == null || item.weight <= 0) return '';
  return `${String(item.weight).replace('.', ',')} KG${item.weightUnit ? ' por ' + item.weightUnit : ''}`;
}

export function formatarTamanhoParaCopia(item) {
  const weight = formatSizeWeight(item);
  return `${item.name}: ${formatSizeDimensions(item)}${weight ? ' (' + weight + ')' : ''}`;
}
