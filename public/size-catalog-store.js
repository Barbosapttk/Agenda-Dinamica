import { SIZES } from './size-table-data.js';
import { normalizeToolText } from './tools-common.js';
export const SIZE_STORAGE_KEY = 'agenda-tool-sizes-v1';
export function validateSize(item) {
  if (!item || typeof item.name !== 'string' || !item.name.trim() || !['Sacos','Caixas','Pallet'].includes(item.type)) throw new Error('Informe nome e categoria válidos.');
  for (const key of ['width','height','length','weight']) {
    if (item[key] !== null && (typeof item[key] !== 'number' || !Number.isFinite(item[key]) || item[key] < 0)) throw new Error('Medidas e peso devem ser números não negativos ou ficar em branco.');
  }
  if (typeof item.weightUnit !== 'string') throw new Error('Informe uma unidade de peso válida.');
}
export function createSizeCatalog(storage) {
  let items = SIZES.map((item,index) => ({ ...item, weightUnit:item.weightUnit || '', id:'size-'+(index+1) }));
  let error = '';
  const listeners = new Set();
  try {
    const saved = storage.getItem(SIZE_STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (parsed.version !== 1 || !Array.isArray(parsed.items)) throw new Error('Catálogo inválido.');
      const ids = new Set();
      for (const item of parsed.items) {
        validateSize(item);
        if (typeof item.id !== 'string' || !item.id || ids.has(item.id)) throw new Error('Identificador inválido.');
        ids.add(item.id);
      }
      items = parsed.items;
    }
  } catch { error = 'Não foi possível carregar os tamanhos salvos. Recarregue após verificar o armazenamento deste navegador. Nenhuma alteração será gravada nesta sessão.'; }
  const list = () => items.map(item=>({...item}));
  function commit(next) {
    if (error) throw new Error(error);
    storage.setItem(SIZE_STORAGE_KEY,JSON.stringify({version:1,items:next}));
    items = next;
    listeners.forEach(listener=>listener());
  }
  return {
    list, get error() { return error; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    save(item) {
      validateSize(item);
      const value = {...item,name:item.name.trim(),weightUnit:item.weightUnit.trim()};
      if (value.id && !items.some(existing=>existing.id===value.id)) throw new Error('Tamanho não encontrado.');
      if (items.some(existing=>existing.id!==value.id && normalizeToolText(existing.name.trim())===normalizeToolText(value.name))) throw new Error('Já existe um tamanho com esse nome.');
      value.id ||= 'size-'+globalThis.crypto.randomUUID();
      commit(value.id && items.some(existing=>existing.id===value.id) ? items.map(existing=>existing.id===value.id?value:existing) : [...items,value]);
      return {...value};
    },
    remove(id) {
      if (!items.some(item=>item.id===id)) throw new Error('Tamanho não encontrado.');
      commit(items.filter(item=>item.id!==id));
    },
  };
}
let catalog;
export function getSizeCatalog() {
  if (!catalog) {
    // Acesso ao storage também pode ser bloqueado pelo navegador.
    const storage = {getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
    catalog = createSizeCatalog(storage);
  }
  return catalog;
}
