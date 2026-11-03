export const CARRIER_FIELDS = Object.freeze(['nome','telefone','atendente','email','cidades','observacoes']);
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
export function searchCarriers(items, query = '') {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return items.filter(item => terms.every(term => normalize([item.nome,item.atendente,item.cidades].join(' ')).includes(term)));
}
function fields(input) {
  const result = Object.fromEntries(CARRIER_FIELDS.map(key => {
    if (input?.[key] !== undefined && typeof input[key] !== 'string') throw new TypeError('Campo de transportadora inválido.');
    return [key,input?.[key] || ''];
  }));
  if (!Object.values(result).some(value=>value.trim())) throw new Error('Preencha os dados da transportadora antes de salvar.');
  return result;
}
export function createCarriersService({ repository, createId = () => crypto.randomUUID() }) {
  async function save(input, {id = createId(), editing = false} = {}) {
    let data;
    try {
      data = fields(input);
      if (typeof id !== 'string' || !id.trim()) throw new Error('Identificador de transportadora inválido.');
    } catch(error) { return {ok:false,error}; }
    return repository.commitCollection('transportadoras', items => {
      const index = items.findIndex(item=>item.id===id);
      if (editing && index<0) throw new Error('Transportadora não encontrada. Recarregue a lista antes de editar.');
      const item = {id,...data};
      if (index>=0) {
        if (JSON.stringify(items[index])===JSON.stringify(item)) return {changed:false,value:{item}};
        if (!editing) throw new Error('Identificador já utilizado por outra transportadora.');
        const next=[...items];next[index]=item;
        return {changed:true,next,value:{item}};
      }
      return {changed:true,next:[...items,item],value:{item}};
    });
  }
  function remove(id, {confirmed = false} = {}) {
    if (!confirmed) return Promise.resolve({ok:false,error:new Error('Confirmação explícita obrigatória para excluir.')});
    return repository.commitCollection('transportadoras', items => {
      const item=items.find(item=>item.id===id);
      return item ? {changed:true,next:items.filter(row=>row.id!==id),value:{item}} : {changed:false,value:{item:null}};
    });
  }
  return Object.freeze({save,remove});
}
