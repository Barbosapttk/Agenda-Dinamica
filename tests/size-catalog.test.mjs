import test from 'node:test';
import assert from 'node:assert/strict';
import {createSizeCatalog,SIZE_STORAGE_KEY} from '../public/size-catalog-store.js';
import {SIZES,formatarTamanhoParaCopia,findSizes} from '../public/size-table-data.js';
const memory=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};
const item={name:'Caixa teste',type:'Caixas',width:12.5,height:10,length:20,weight:3,weightUnit:'unidade'};
test('quatro sacos mantêm 25 KG por Saco na consulta e cópia',()=>{
  const sacks=SIZES.filter(item=>item.type==='Sacos');assert.equal(sacks.length,4);
  for(const item of sacks){assert.equal(item.weight,25);assert.equal(item.weightUnit,'Saco');assert.ok(formatarTamanhoParaCopia(item).endsWith('(25 KG por Saco)'));}
});
test('catálogo novo preserva 12 registros únicos e não altera os dados iniciais',()=>{
  const catalog=createSizeCatalog(memory());assert.equal(catalog.list().length,12);assert.equal(new Set(catalog.list().map(item=>item.id)).size,12);
  const copy=catalog.list();copy[0].name='Mutação externa';assert.equal(catalog.list()[0].name,'Saco de Sal');assert.equal(SIZES[0].name,'Saco de Sal');
});
test('criar, editar e excluir persistem após recriar catálogo e notificam a consulta',()=>{
  const storage=memory(),catalog=createSizeCatalog(storage);let notified=0;catalog.subscribe(()=>notified++);
  const created=catalog.save(item);assert.equal(catalog.list().length,13);
  assert.equal(createSizeCatalog(storage).list().at(-1).name,item.name);
  catalog.save({...created,name:'Caixa editada',width:15});assert.equal(catalog.list().length,13);
  const reloaded=createSizeCatalog(storage);
  assert.equal(findSizes('editada','Caixas',reloaded.list())[0].width,15);
  catalog.remove(created.id);assert.equal(createSizeCatalog(storage).list().length,12);assert.equal(notified,3);
});
test('não duplica nomes nem aceita dados inválidos',()=>{
  const catalog=createSizeCatalog(memory());
  for(const change of [{name:''},{type:'Outro'},{height:-1},{width:NaN},{weight:Infinity},{weightUnit:null}]) assert.throws(()=>catalog.save({...item,...change}));
  assert.throws(()=>catalog.save({...item,name:'SACO DE SAL'}),/Já existe/);
  assert.throws(()=>catalog.remove('inexistente'),/não encontrado/);
  assert.equal(catalog.list().length,12);
});
test('falha de escrita não altera o catálogo em memória',()=>{
  const catalog=createSizeCatalog({getItem:()=>null,setItem:()=>{throw new Error('Armazenamento indisponível');}});
  assert.throws(()=>catalog.save(item),/Armazenamento/);assert.equal(catalog.list().length,12);
});
test('catálogo corrompido não é sobrescrito silenciosamente',()=>{
  const storage=memory();storage.setItem(SIZE_STORAGE_KEY,'inválido');const catalog=createSizeCatalog(storage);
  assert.ok(catalog.error);assert.throws(()=>catalog.save(item),/Não foi possível carregar/);assert.equal(storage.getItem(SIZE_STORAGE_KEY),'inválido');
});
test('catálogo vazio continua vazio após reload',()=>{
  const storage=memory();const catalog=createSizeCatalog(storage);for(const item of catalog.list())catalog.remove(item.id);
  assert.equal(createSizeCatalog(storage).list().length,0);
});
