import { QUICK_TEXTS } from './quick-texts-data.js';
export const TEXT_STORAGE_KEY = 'agenda-tool-text-overrides-v1';
export function loadTextEdits() {
  try { return JSON.parse(localStorage.getItem(TEXT_STORAGE_KEY) || '{}') || {}; } catch { return {}; }
}
export function saveTextEdits(edits) { localStorage.setItem(TEXT_STORAGE_KEY, JSON.stringify(edits)); }

// Mantém a chave e o formato dos overrides existentes. Modelos excluídos usam tombstones.
export function createQuickTextCatalog(storage = {
  getItem:key=>localStorage.getItem(key), setItem:(key,value)=>localStorage.setItem(key,value),
}, defaults = QUICK_TEXTS) {
  let edits={},error='';
  function validate(value) {
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Textos inválidos.');
    for(const [id,edit] of Object.entries(value)) {
      if(!id||!edit||typeof edit!=='object')throw new Error('Texto inválido.');
      if(edit.deleted===true)continue;
      if(typeof edit.body!=='string'||!Array.isArray(edit.recipients)||!edit.recipients.every(v=>typeof v==='string'))throw new Error('Texto inválido.');
      if(edit.title!==undefined&&typeof edit.title!=='string')throw new Error('Título inválido.');
      if(edit.category!==undefined&&typeof edit.category!=='string')throw new Error('Categoria inválida.');
      if(!defaults.some(item=>item.id===id)&&(!edit.custom||!edit.title?.trim()))throw new Error('Modelo desconhecido.');
    }
  }
  try {const saved=storage.getItem(TEXT_STORAGE_KEY);if(saved!==null){const value=JSON.parse(saved);validate(value);edits=value;}}
  catch {error='Não foi possível carregar os textos salvos. Recarregue após verificar o armazenamento deste navegador. Os dados existentes não serão sobrescritos.';}
  function list() {
    const base=defaults.filter(item=>!edits[item.id]?.deleted).map(item=>({...item,...edits[item.id],id:item.id,title:edits[item.id]?.title?.trim()?edits[item.id].title:item.title}));
    const custom=Object.entries(edits).filter(([id,item])=>item.custom&&!item.deleted&&!defaults.some(base=>base.id===id)).map(([id,item])=>({...item,id}));
    return structuredClone([...base,...custom]);
  }
  function commit(next) {
    if(error)throw new Error(error);validate(next);
    try {storage.setItem(TEXT_STORAGE_KEY,JSON.stringify(next));}
    catch {throw new Error('Não foi possível salvar neste navegador. Suas alterações continuam abertas.');}
    edits=next;
  }
  return {
    list,get error(){return error;},
    save({id,title,body,recipients=[],category='E-mails'}) {
      if(typeof title!=='string'||!title.trim()||typeof body!=='string'||!body.trim())throw new Error('Preencha o título e o texto.');
      if(id&&!list().some(item=>item.id===id))throw new Error('Texto não encontrado.');
      const key=id||'custom-'+crypto.randomUUID();
      commit({...edits,[key]:{title:title.trim(),body,recipients,category:category.trim()||'E-mails',...(!defaults.some(item=>item.id===key)?{custom:true}:{})}});
      return key;
    },
    remove(id) {
      if(!list().some(item=>item.id===id))throw new Error('Texto não encontrado.');
      const next={...edits};if(defaults.some(item=>item.id===id))next[id]={deleted:true};else delete next[id];commit(next);
    },
  };
}
