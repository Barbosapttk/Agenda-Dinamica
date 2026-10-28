import { createQuickTextCatalog } from './quick-texts-store.js';
import { mountServiceCalculator } from './service-calculator.js';
import { copyPlainText, normalizeToolText as normalize } from './tools-common.js';
import { mountSizeTable } from './size-table.js';
import { mountFreightQuote } from './freight-quote.js';
import { setupToolsNavigation } from './tools-navigation.js';
import { mountSalePrice } from './sale-price.js';
import { mountSizeSettings } from './size-settings.js';
import { mountQuickNotes } from './quick-notes.js';
import { mountReferenceTables } from './reference-tables.js';
import { toolPageHeader } from './tool-page-layout.js';
const catalog=createQuickTextCatalog();
const root = document.getElementById('quick-tools');
root.innerHTML = `<button type="button" class="btn btn-primary" id="open-quick-texts">📝 Textos Rápidos</button>
  <section id="quick-texts" hidden aria-labelledby="quick-texts-title">
    ${toolPageHeader('quick-texts')}
    <div class="qt-toolbar"><label>Buscar texto<input id="qt-search" type="search" placeholder="Buscar texto..."></label>
      <button type="button" class="btn btn-primary" id="qt-new">+ Novo texto</button></div>
    <p class="tool-local-note">Os textos são salvos neste navegador.</p>
    <p id="qt-feedback" role="status" aria-live="polite"></p>
    <div id="qt-new-panel" class="card sc-panel" hidden><h3>Novo texto</h3></div>
    <div id="qt-cards"></div>
  </section>`;
mountServiceCalculator(root);
mountSizeTable(root);
mountFreightQuote(root);
mountSalePrice(root);
mountSizeSettings(root.querySelector('#size-table'));
mountQuickNotes(root);
mountReferenceTables(root);
const search = root.querySelector('#qt-search');
const feedback = root.querySelector('#qt-feedback');
search.oninput = render;
setupToolsNavigation(root, render);
const newPanel=root.querySelector('#qt-new-panel');
const newButton=root.querySelector('#qt-new');
newButton.disabled=Boolean(catalog.error);
newButton.onclick=()=>{
  if(!newPanel.querySelector('form')) {
    const form=createEditor({title:'',body:'',recipients:[],category:'E-mails'},()=>{newPanel.hidden=true;form.remove();newButton.focus();},true);
    form.id='qt-editor';newPanel.append(form);
  }
  newPanel.hidden=false;newPanel.querySelector('input').focus();
};

function createEditor(model,close,isNew=false) {
  const form=document.createElement('form');
  function field(label,value,textarea=false) {
    const group=document.createElement('label');group.textContent=label;
    const input=document.createElement(textarea?'textarea':'input');input.value=value;
    group.append(input);form.append(group);return input;
  }
  const title=field('Título',model.title);title.required=true;
  title.placeholder='Ex.: título do texto';
  title.oninput=()=>title.setCustomValidity(title.value.trim()?'':'Informe um título.');
  const recipients=field('Destinatários (separados por ponto e vírgula ou linha)',model.recipients.join('; '),true);recipients.rows=2;
  recipients.placeholder='Ex.: email@exemplo.com';
  const body=field('Texto completo',model.body,true);body.rows=8;body.required=true;body.placeholder='Ex.: escreva seu modelo de mensagem.';
  const category=field('Categoria',model.category||'E-mails');category.placeholder='Ex.: e-mails';
  const actions=document.createElement('div');actions.className='tool-actions';
  const save=document.createElement('button');save.type='submit';save.className='btn btn-primary';save.textContent=isNew?'Salvar texto':'Salvar alterações';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='btn btn-ghost';cancel.textContent='Cancelar';cancel.onclick=close;
  actions.append(save,cancel);form.append(actions);
  form.onsubmit=event=>{
    event.preventDefault();
    try {
      catalog.save({id:isNew?undefined:model.id,title:title.value,body:body.value,category:category.value,recipients:recipients.value.split(/[;\n]+/).map(v=>v.trim()).filter(Boolean)});
      search.value='';close();render();feedback.textContent='Texto salvo neste navegador.';
    } catch(error) {feedback.textContent=error.message;}
  };
  return form;
}
function render() {
  const cards = root.querySelector('#qt-cards');cards.replaceChildren();
  const query=normalize(search.value);
  for(const model of catalog.list().filter(model=>normalize([model.title,model.body,model.category,...model.recipients].join(' ')).includes(query))) {
    const card=document.createElement('article');card.className='card qt-card';card.dataset.model=model.id;
    const title=document.createElement('h3');title.textContent=model.title;card.append(title);
    if(model.recipients.length) {
      const recipients=document.createElement('p');recipients.className='qt-recipients';recipients.textContent=`📧 ${model.recipients.length} destinatário${model.recipients.length===1?'':'s'}`;card.append(recipients);
    }
    const body=document.createElement('div');body.className='qt-body';body.textContent=model.body;
    const actions=document.createElement('div');actions.className='qt-actions';
    const value=model.recipients.length?model.recipients.join('; ')+'\n\n'+model.body:model.body;
    actions.append(copyButton(value,model.title));card.append(body,actions);
    const editor=document.createElement('details');
    const summary=document.createElement('summary');summary.textContent='EDITAR';summary.className='btn btn-ghost qt-edit';editor.append(summary);
    editor.addEventListener('toggle',()=>{
      if(!editor.open||editor.querySelector('form'))return;
      const form=createEditor(model,()=>{editor.open=false;form.remove();summary.focus();});editor.append(form);
    });
    const remove=document.createElement('button');remove.type='button';remove.className='btn btn-ghost qt-delete';remove.textContent='Excluir';remove.setAttribute('aria-label','Excluir: '+model.title);remove.disabled=Boolean(catalog.error);
    remove.onclick=()=>{
      if(!confirm('Tem certeza que deseja excluir este texto?\n'+model.title))return;
      try {catalog.remove(model.id);render();feedback.textContent='Texto excluído.';search.focus();}
      catch(error){feedback.textContent=error.message;}
    };
    const view=document.createElement('details');view.className='qt-view';
    const viewTitle=document.createElement('summary');viewTitle.textContent='Ver texto completo';
    const full=document.createElement('p');full.className='qt-full-body';full.textContent=value;view.append(viewTitle,full);
    card.append(editor,remove,view);cards.append(card);
  }
  if(!cards.children.length)cards.textContent='Nenhum texto encontrado.';
  if(catalog.error)feedback.textContent=catalog.error;
}
function copyButton(value,title) {
  const label='COPIAR TUDO';const button=document.createElement('button');button.type='button';button.className='btn btn-primary';button.textContent=label;button.setAttribute('aria-label',`${label}: ${title}`);
  button.onclick=async()=>{
    button.disabled=true;
    try {await copyPlainText(value);button.textContent='✓ Copiado';feedback.textContent=`Copiado: ${title}`;setTimeout(()=>button.textContent=label,1800);}
    catch {feedback.textContent='Não foi possível copiar. Selecione o conteúdo e copie manualmente.';}
    finally {button.disabled=false;}
  };
  return button;
}
