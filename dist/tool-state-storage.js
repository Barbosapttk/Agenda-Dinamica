// Mesmo padrão local das ferramentas existentes, sem conexão ao banco comercial.
export function createToolStateStorage(key, initial, validate, storage = {
  getItem:key=>localStorage.getItem(key), setItem:(key,value)=>localStorage.setItem(key,value),
}) {
  let state=structuredClone(initial), error='';
  try {
    const saved=storage.getItem(key);
    if(saved!==null) {
      const parsed=JSON.parse(saved);
      if(parsed.version!==1)throw new Error('Versão inválida.');
      validate(parsed.data);state=parsed.data;
    }
  } catch {error='Não foi possível carregar os dados salvos. Verifique o armazenamento deste navegador e recarregue. Os dados existentes não serão sobrescritos.';}
  return {
    get error(){return error;},
    read:()=>structuredClone(state),
    save(next) {
      if(error)throw new Error(error);
      validate(next);
      try {storage.setItem(key,JSON.stringify({version:1,data:next}));}
      catch {throw new Error('Não foi possível salvar neste navegador. Mantenha esta tela aberta e tente novamente.');}
      state=structuredClone(next);
    },
  };
}
