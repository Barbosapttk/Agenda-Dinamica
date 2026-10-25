import { normalizeToolText } from './tools-common.js';
export const NOTES_STORAGE_KEY='agenda-tool-notes-v1';
export function validateNotes(notes) {
  if(!Array.isArray(notes))throw new Error('Anotações inválidas.');
  const ids=new Set();
  for(const note of notes) {
    if(!note || !['id','title','body'].every(key=>typeof note[key]==='string') || !note.id || ids.has(note.id) || !note.title.trim() || !note.body.trim() || !Number.isFinite(note.updatedAt))throw new Error('Anotação inválida.');
    ids.add(note.id);
  }
}
export function saveNote(notes,{id,title,body},now=Date.now()) {
  if(!title.trim()||!body.trim())throw new Error('Preencha título e conteúdo.');
  if(id&&!notes.some(note=>note.id===id))throw new Error('Anotação não encontrada.');
  const next=[{id:id||crypto.randomUUID(),title:title.trim(),body,updatedAt:now},...notes.filter(note=>note.id!==id)];
  validateNotes(next);return next;
}
export function findNotes(notes,query='') {
  const term=normalizeToolText(query.trim());
  return notes.filter(note=>normalizeToolText(note.title+' '+note.body).includes(term));
}
