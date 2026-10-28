import { getSizeCatalog } from './size-catalog-store.js';
import { formatarTamanhoParaCopia } from './size-table-data.js';
import { parseServiceNumber } from './service-calculator-math.js';
import { attachSmartNumberInput } from './smart-number-input.js';

export function mountSizeSettings(host) {
  if (!host || document.getElementById('size-settings')) return;
  const catalog=getSizeCatalog();
  const section=document.createElement('details');
  section.id='size-settings'; section.className='card size-settings-card';
  section.open=false;
  section.innerHTML=`<summary class="card-header"><span class="card-title">Gerenciar tamanhos</span></summary>
    <div class="settings-card-body"><p>Cadastre os volumes da consulta rápida. As alterações ficam salvas neste navegador.</p>
      <div class="settings-actions"><button type="button" class="btn btn-primary" id="size-new">+ NOVO TAMANHO</button><button type="button" class="btn btn-ghost" id="size-manage-close">Voltar à consulta</button></div>
      <p id="size-settings-status" role="status" aria-live="polite"></p>
      <form id="size-editor" hidden>
        <h3 id="size-editor-title">Novo tamanho</h3><div class="size-editor-grid">
          <label>Nome<input id="size-edit-name" required></label>
          <label>Categoria<select id="size-edit-type"><option>Sacos</option><option>Caixas</option><option>Pallet</option></select></label>
          <label>Largura (cm)<input id="size-edit-width" inputmode="decimal"></label>
          <label>Altura (cm)<input id="size-edit-height" inputmode="decimal"></label>
          <label>Comprimento (cm)<input id="size-edit-length" inputmode="decimal"></label>
          <label>Peso (KG)<input id="size-edit-weight" inputmode="decimal"></label>
          <label>Unidade do peso<input id="size-edit-weightUnit" placeholder="Ex.: saco ou unidade"></label>
        </div><p>Deixe em branco as medidas e o peso não informados.</p>
        <div class="settings-actions"><button class="btn btn-primary" type="submit">SALVAR</button><button class="btn btn-ghost" type="button" id="size-edit-cancel">CANCELAR</button></div>
      </form><div id="size-settings-list"></div>
    </div>`;
  host.querySelector('#size-rows').before(section);
  const manageButton=host.querySelector('#size-manage-open');
  const syncExpanded=()=>manageButton.setAttribute('aria-expanded',String(section.open));
  manageButton.onclick=()=>{
    section.open=!section.open;
    syncExpanded();
    if(section.open)section.scrollIntoView({block:'nearest'});
  };
  section.addEventListener('toggle',syncExpanded);
  section.querySelector('#size-manage-close').onclick=()=>{
    section.open=false;
    syncExpanded();
    manageButton.focus();
  };
  const form=section.querySelector('form');
  const status=section.querySelector('#size-settings-status');
  const input=key=>section.querySelector('#size-edit-'+key);
  for(const key of ['width','height','length','weight'])attachSmartNumberInput(input(key));
  let editingId=null;
  function openEditor(item) {
    editingId=item?.id || null;
    form.reset();
    for (const key of ['name','type','width','height','length','weight','weightUnit']) {
      if (item) input(key).value=item[key]===null?'':typeof item[key]==='number'?String(item[key]).replace('.',','):item[key];
    }
    section.querySelector('#size-editor-title').textContent=item?'Editar tamanho':'Novo tamanho';
    form.hidden=false; status.textContent=''; input('name').focus();
  }
  function render() {
    const list=section.querySelector('#size-settings-list'); list.replaceChildren();
    for (const item of catalog.list()) {
      const row=document.createElement('div'); row.className='size-admin-row';
      const text=document.createElement('p'); text.textContent=item.type+' · '+formatarTamanhoParaCopia(item);
      const actions=document.createElement('div'); actions.className='settings-actions';
      const edit=document.createElement('button'); edit.type='button'; edit.className='btn btn-ghost'; edit.textContent='EDITAR';
      edit.setAttribute('aria-label','EDITAR: '+item.name); edit.onclick=()=>openEditor(item);
      const remove=document.createElement('button'); remove.type='button'; remove.className='btn btn-danger'; remove.textContent='EXCLUIR';
      remove.setAttribute('aria-label','EXCLUIR: '+item.name);
      remove.onclick=()=>{
        if (!window.confirm('Tem certeza que deseja excluir este tamanho?\n'+item.name)) return;
        try {
          catalog.remove(item.id);
          if (editingId===item.id) {form.hidden=true;editingId=null;}
          status.textContent='Tamanho excluído.'; section.querySelector('#size-new').focus();
        } catch(error) {status.textContent=error.message;}
      };
      actions.append(edit,remove);row.append(text,actions);list.append(row);
    }
    if (catalog.error) status.textContent=catalog.error;
    section.querySelector('#size-new').disabled=Boolean(catalog.error);
    list.querySelectorAll('button').forEach(button=>button.disabled=Boolean(catalog.error));
  }
  section.querySelector('#size-new').onclick=()=>openEditor();
  section.querySelector('#size-edit-cancel').onclick=()=>{form.hidden=true;editingId=null;section.querySelector('#size-new').focus();};
  form.onsubmit=event=>{
    event.preventDefault();
    const item={id:editingId,name:input('name').value,type:input('type').value,weightUnit:input('weightUnit').value};
    for (const key of ['width','height','length','weight']) item[key]=input(key).value.trim()?parseServiceNumber(input(key).value):null;
    try {catalog.save(item);form.hidden=true;editingId=null;status.textContent='Tamanho salvo neste navegador.';section.querySelector('#size-new').focus();}
    catch(error){status.textContent=error.message;}
  };
  catalog.subscribe(render);render();
}
