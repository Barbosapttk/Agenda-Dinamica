import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuickTextCatalog, TEXT_STORAGE_KEY } from '../public/quick-texts-store.js';
import { validateReference, createReferenceStore, MAX_REFERENCE_BYTES } from '../public/reference-tables-store.js';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
const defaults=[{id:'base',title:'Modelo original',body:'Corpo original',category:'E-mails',recipients:['email@exemplo.com']}];
test('textos reutilizam overrides legados e preservam conteúdo, destinatários e categoria',()=>{
 const storage=memory();storage.setItem(TEXT_STORAGE_KEY,JSON.stringify({base:{title:'Modelo editado',body:'  Linha 1\n\nLinha 2  ',recipients:['destino@exemplo.com']}}));
 const catalog=createQuickTextCatalog(storage,defaults);assert.equal(catalog.error,'');assert.deepEqual(catalog.list()[0],{...defaults[0],title:'Modelo editado',body:'  Linha 1\n\nLinha 2  ',recipients:['destino@exemplo.com']});
});
test('override legado sem título ou com título vazio mantém o título do modelo',()=>{
 for(const edit of [{body:'Editado',recipients:[]},{title:' ',body:'Editado',recipients:[]}]){
 const storage=memory();storage.setItem(TEXT_STORAGE_KEY,JSON.stringify({base:edit}));const catalog=createQuickTextCatalog(storage,defaults);assert.equal(catalog.list()[0].title,'Modelo original');assert.equal(catalog.list()[0].body,'Editado');
 }
});
test('textos criados, editados e excluídos persistem na mesma chave após reabrir',()=>{
 const storage=memory();let catalog=createQuickTextCatalog(storage,defaults);
 const id=catalog.save({title:' Novo texto ',body:' Corpo\n\ncom parágrafos ',category:'Comercial',recipients:[]});
 catalog=createQuickTextCatalog(storage,defaults);assert.equal(catalog.list().length,2);assert.equal(catalog.list()[1].body,' Corpo\n\ncom parágrafos ');
 catalog.save({id,title:'Editado',body:'Outra mensagem',category:'Suporte',recipients:['email@exemplo.com']});catalog=createQuickTextCatalog(storage,defaults);
 assert.equal(catalog.list()[1].category,'Suporte');assert.equal(catalog.list()[1].id,id);catalog.remove(id);assert.equal(createQuickTextCatalog(storage,defaults).list().length,1);
});
test('excluir modelo padrão não o ressuscita após reload nem modifica os defaults',()=>{
 const storage=memory();createQuickTextCatalog(storage,defaults).remove('base');assert.deepEqual(createQuickTextCatalog(storage,defaults).list(),[]);assert.equal(defaults[0].title,'Modelo original');
});
test('textos rejeitam campos vazios, IDs desconhecidos e destinatários inválidos',()=>{
 const catalog=createQuickTextCatalog(memory(),defaults);assert.throws(()=>catalog.save({title:' ',body:'texto'}));assert.throws(()=>catalog.save({title:'Título',body:' '}));assert.throws(()=>catalog.save({id:'missing',title:'Título',body:'Texto'}));assert.throws(()=>catalog.save({title:'Título',body:'Texto',recipients:[5]}));assert.throws(()=>catalog.remove('missing'));assert.equal(catalog.list().length,1);
});
test('falha de escrita não confirma criação, edição ou exclusão',()=>{
 const catalog=createQuickTextCatalog({getItem:()=>null,setItem:()=>{throw Error('Quota');}},defaults);
 assert.throws(()=>catalog.save({title:'Novo',body:'Texto'}),/Não foi possível salvar/);assert.throws(()=>catalog.save({id:'base',title:'Editado',body:'Texto'}));assert.throws(()=>catalog.remove('base'));assert.deepEqual(catalog.list(),defaults);
});
test('override corrompido bloqueia gravação sem substituir o armazenamento',()=>{
 for(const value of ['inválido','[]','null','{"base":{"body":5}}']){
 const storage=memory();storage.setItem(TEXT_STORAGE_KEY,value);const catalog=createQuickTextCatalog(storage,defaults);assert.ok(catalog.error);assert.throws(()=>catalog.save({title:'Novo',body:'Corpo'}));assert.throws(()=>catalog.remove('base'));assert.equal(storage.getItem(TEXT_STORAGE_KEY),value);
 }
});
test('referências exigem título e imagem raster; não aceitam SVG, vazio ou excesso de tamanho',()=>{
 const item={id:'imagem',title:'Tabela',description:'',updatedAt:1,image:new Blob(['png'],{type:'image/png'})};assert.doesNotThrow(()=>validateReference(item));
 for(const change of [{title:' '},{image:null},{image:new Blob(['<svg/>'],{type:'image/svg+xml'})},{image:new Blob([],{type:'image/png'})},{image:new Blob([new Uint8Array(MAX_REFERENCE_BYTES+1)],{type:'image/png'})}])assert.throws(()=>validateReference({...item,...change}));
});
test('referências informam indisponibilidade de armazenamento sem confirmar gravação',async()=>{
 const store=createReferenceStore(null);await assert.rejects(store.list(),/não está disponível/);await assert.rejects(store.save({id:'img',title:'Tabela',description:'',updatedAt:1,image:new Blob(['png'],{type:'image/png'})}),/não está disponível/);
});
