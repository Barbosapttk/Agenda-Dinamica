import { createToolStateStorage } from './tool-state-storage.js';
import { NOTES_STORAGE_KEY,validateNotes,saveNote,findNotes } from './quick-notes-data.js';
import { copyPlainText } from './tools-common.js';
import { toolPageHeader } from './tool-page-layout.js';
export function mountQuickNotes(root) {
  const storage=createToolStateStorage(NOTES_STORAGE_KEY,[],validateNotes);
  let notes=storage.read(),editingId=null;
  root.insertAdjacentHTML('beforeend',`<button type="button" id="open-quick-notes">📝 Anotações Rápidas</button>
    <section id="quick-notes" hidden aria-labelledby="notes-title">
      ${toolPageHeader('quick-notes')}
      <button type="button" class="btn btn-primary" id="notes-new">+ NOVA ANOTAÇÃO</button>
      <div class="qt-toolbar"><label>Buscar anotação<input type="search" id="notes-search" placeholder="🔎 Buscar anotação..."></label></div>
      <p id="notes-feedback" role="status" aria-live="polite"></p>
      <form id="notes-editor" class="card sc-panel" hidden><h3 id="notes-editor-title">Nova anotação</h3>
        <label>Título<input id="notes-edit-title" required></label><label>Conteúdo<textarea id="notes-edit-body" rows="6" required></textarea></label>
        <div class="tool-actions"><button type="submit" class="btn btn-primary">SALVAR</button><button type="button" class="btn btn-ghost" id="notes-cancel">CANCELAR</button></div>
      </form><div id="notes-cards"></div>
    </section>`);
  const field=key=>root.querySelector('#notes-'+key);
  function openEditor(note) {
    editingId=note?.id||null;field('editor-title').textContent=note?'Editar anotação':'Nova anotação';
    field('edit-title').value=note?.title||'';field('edit-body').value=note?.body||'';
    field('editor').hidden=false;field('feedback').textContent=storage.error;field('edit-title').focus();
  }
  function render() {
    const cards=field('cards');cards.replaceChildren();
    const found=findNotes(notes,field('search').value);
    if(!found.length){const empty=document.createElement('p');empty.textContent=notes.length?'Nenhuma anotação encontrada.':'Nenhuma anotação. Crie sua primeira referência.';cards.append(empty);}
    for(const note of found) {
      const card=document.createElement('article');card.className='card note-card';card.dataset.noteId=note.id;
      const title=document.createElement('h3');title.textContent=note.title;
      const body=document.createElement('p');body.className='note-body';body.textContent=note.body;
      const actions=document.createElement('div');actions.className='tool-actions';
      const copy=document.createElement('button');copy.type='button';copy.className='btn btn-primary';copy.textContent='COPIAR';copy.setAttribute('aria-label','COPIAR: '+note.title);
      copy.onclick=async()=>{
        copy.disabled=true;
        try {await copyPlainText(note.body);copy.textContent='✓ Copiado';field('feedback').textContent='Anotação copiada.';setTimeout(()=>copy.textContent='COPIAR',1800);}
        catch {field('feedback').textContent='Não foi possível copiar. Abra EDITAR para selecionar o conteúdo manualmente.';}
        finally {copy.disabled=false;}
      };
      const edit=document.createElement('button');edit.type='button';edit.className='btn btn-ghost';edit.textContent='EDITAR';edit.onclick=()=>openEditor(note);
      const remove=document.createElement('button');remove.type='button';remove.className='btn btn-ghost';remove.textContent='EXCLUIR';
      remove.onclick=()=>{
        if(!confirm('Tem certeza que deseja excluir esta anotação?'))return;
        try {
          const next=notes.filter(item=>item.id!==note.id);storage.save(next);notes=next;render();
          if(editingId===note.id){field('editor').hidden=true;editingId=null;}
          field('feedback').textContent='Anotação excluída.';field('new').focus();
        } catch(error){field('feedback').textContent=error.message;}
      };
      actions.append(copy,edit,remove);card.append(title,body,actions);cards.append(card);
    }
  }
  field('new').onclick=()=>openEditor();field('search').oninput=render;
  field('cancel').onclick=()=>{field('editor').hidden=true;editingId=null;field('new').focus();};
  field('editor').onsubmit=event=>{
    event.preventDefault();
    try {
      const next=saveNote(notes,{id:editingId,title:field('edit-title').value,body:field('edit-body').value});storage.save(next);notes=next;
      field('search').value='';render();field('editor').hidden=true;editingId=null;field('feedback').textContent='Anotação salva neste navegador.';field('new').focus();
    } catch(error){field('feedback').textContent=error.message;}
  };
  render();if(storage.error)field('feedback').textContent=storage.error;
}
