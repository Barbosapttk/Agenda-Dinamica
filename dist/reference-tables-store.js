export const REFERENCE_DB='agenda-tool-reference-tables-v1';
export const REFERENCE_IMAGE_TYPES=['image/png','image/jpeg','image/webp','image/gif'];
export const MAX_REFERENCE_BYTES=15*1024*1024;
export function validateReference(item) {
  if(!item||typeof item.id!=='string'||!item.id||typeof item.title!=='string'||!item.title.trim()||typeof item.description!=='string'||!Number.isFinite(item.updatedAt))throw new Error('Informe um título válido para a tabela.');
  if(!(item.image instanceof Blob)||!REFERENCE_IMAGE_TYPES.includes(item.image.type)||!item.image.size)throw new Error('Selecione uma imagem PNG, JPEG, WebP ou GIF válida.');
  if(item.image.size>MAX_REFERENCE_BYTES)throw new Error('A imagem deve ter no máximo 15 MB.');
}
// Biblioteca local de imagens; os demais dados comerciais não passam por este armazenamento.
export function createReferenceStore(factory=globalThis.indexedDB) {
  let connection;
  function open() {
    if(!connection)connection=new Promise((resolve,reject)=>{
      if(!factory){reject(new Error('O armazenamento de imagens não está disponível neste navegador.'));return;}
      const request=factory.open(REFERENCE_DB,1);
      request.onupgradeneeded=()=>request.result.createObjectStore('references',{keyPath:'id'});
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(new Error('Não foi possível abrir a biblioteca de imagens. Recarregue e tente novamente.'));
      request.onblocked=()=>reject(new Error('Feche outras abas da biblioteca e recarregue esta página.'));
    });
    return connection;
  }
  async function transaction(mode,action) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('references',mode);let result;
      const req=action(tx.objectStore('references'));req.onsuccess=()=>{result=req.result;};
      tx.oncomplete=()=>resolve(result);
      tx.onerror=tx.onabort=()=>reject(new Error('Não foi possível salvar ou ler a biblioteca neste navegador. Mantenha esta tela aberta e tente novamente.'));
    });
  }
  return {
    async list(){const items=await transaction('readonly',store=>store.getAll());items.forEach(validateReference);return items.sort((a,b)=>b.updatedAt-a.updatedAt);},
    async save(item){validateReference(item);await transaction('readwrite',store=>store.put(item));},
    async remove(id){await transaction('readwrite',store=>store.delete(id));},
  };
}
