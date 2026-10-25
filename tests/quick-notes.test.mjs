import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNotes,saveNote,findNotes } from '../public/quick-notes-data.js';
import { createToolStateStorage } from '../public/tool-state-storage.js';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
test('anotações criadas e editadas vão ao topo sem perder conteúdo ou IDs',()=>{
  let notes=saveNote([],{title:'Primeira',body:'  Caixa\n25 KG  '},1);const id=notes[0].id;
  notes=saveNote(notes,{title:'Segunda',body:'Outro conteúdo'},2);assert.equal(notes[0].title,'Segunda');
  notes=saveNote(notes,{id,title:'Primeira editada',body:'  Linha 1\n\nLinha 2  '},3);
  assert.equal(notes[0].id,id);assert.equal(notes[0].body,'  Linha 1\n\nLinha 2  ');assert.equal(notes.length,2);assert.equal(notes[0].updatedAt,3);
});
test('busca de anotações ignora acentos e consulta título e conteúdo',()=>{
  const notes=saveNote(saveNote([],{title:'Medidas',body:'Caixa 70 x 50'},1),{title:'Condições',body:'Prazo de entrega'},2);
  assert.equal(findNotes(notes,'CAIXA')[0].title,'Medidas');assert.equal(findNotes(notes,'condicoes')[0].title,'Condições');assert.equal(findNotes(notes,'inexistente').length,0);
});
test('anotações exigem título e conteúdo, IDs únicos e timestamps válidos',()=>{
  assert.throws(()=>saveNote([],{title:' ',body:'texto'}));assert.throws(()=>saveNote([],{title:'Título',body:' '}));
  const notes=saveNote([],{title:'Teste',body:'Corpo'},1);assert.throws(()=>validateNotes([...notes,...notes]));assert.throws(()=>saveNote(notes,{id:'inexistente',title:'Título',body:'Corpo'}));
});
test('falha de gravação não confirma estado nem sobrescreve dados',()=>{
  const store=createToolStateStorage('notes',[],validateNotes,{getItem:()=>null,setItem:()=>{throw new Error('Quota');}});
  assert.throws(()=>store.save(saveNote([],{title:'Teste',body:'Conteúdo'})),/Não foi possível salvar/);assert.deepEqual(store.read(),[]);
});

test('anotações persistem após recriar armazenamento',()=>{
 const storage=memory(),notes=createToolStateStorage('notes',[],validateNotes,storage);
 notes.save(saveNote([],{title:'Teste',body:'Conteúdo'},1));
 assert.equal(createToolStateStorage('notes',[],validateNotes,storage).read()[0].body,'Conteúdo');
});
test('dados inválidos não são sobrescritos silenciosamente',()=>{
 const storage=memory();storage.setItem('notes','inválido');
 const notes=createToolStateStorage('notes',[],validateNotes,storage);
 assert.ok(notes.error);assert.throws(()=>notes.save([]));assert.equal(storage.getItem('notes'),'inválido');
});
