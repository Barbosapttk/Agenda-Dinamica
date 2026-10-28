import { createReferenceStore, validateReference } from './reference-tables-store.js';
import { toolPageHeader } from './tool-page-layout.js';
import { normalizeToolText } from './tools-common.js';
export function mountReferenceTables(root) {
  const store=createReferenceStore();let items=[],editingId=null,ready=false,busy=false;
  const thumbnailUrls=[];
  root.insertAdjacentHTML('beforeend',`<button type="button" id="open-reference-tables">🖼️ Tabelas de Referência</button>
    <section id="reference-tables" hidden aria-labelledby="references-title">
      ${toolPageHeader('reference-tables')}
      <div class="qt-toolbar"><label>Buscar tabela<input id="references-search" type="search" placeholder="Buscar tabela..."></label><button type="button" class="btn btn-primary" id="references-new" disabled>+ Nova tabela</button></div>
      <p class="tool-local-note">As imagens são salvas somente neste navegador. Use a biblioteca para consultar alíquotas, estados de atendimento e outras tabelas; os cálculos do sistema não são alterados.</p>
      <p id="references-feedback" role="status" aria-live="polite">Carregando tabelas...</p>
      <form id="references-editor" class="card sc-panel" hidden>
        <h3 id="references-editor-title">Nova tabela</h3>
        <label>Título<input id="references-edit-title" required placeholder="Ex.: título da tabela"></label>
        <label>Descrição (opcional)<textarea id="references-edit-description" rows="2" placeholder="Ex.: informações para consultar durante o trabalho."></textarea></label>
        <label>Imagem<input id="references-edit-image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required aria-describedby="references-image-help"></label>
        <small id="references-image-help">PNG, JPEG, WebP ou GIF, com até 15 MB. Ao editar, selecione um arquivo apenas para substituir a imagem.</small>
        <div class="tool-actions"><button type="submit" class="btn btn-primary">Salvar tabela</button><button type="button" class="btn btn-ghost" id="references-cancel">Cancelar</button></div>
      </form>
      <div id="references-cards" class="reference-cards"></div>
      <dialog id="references-viewer" aria-labelledby="references-viewer-title">
        <header><h3 id="references-viewer-title"></h3><button type="button" class="modal-close" id="references-viewer-close" aria-label="Fechar visualização">×</button></header>
        <div class="reference-zoom"><button type="button" id="references-zoom-out" aria-label="Reduzir imagem">−</button><output id="references-zoom-level" aria-live="polite"></output><button type="button" id="references-zoom-in" aria-label="Ampliar imagem">+</button><button type="button" id="references-fit">Ajustar à tela</button><button type="button" id="references-actual">Tamanho original</button></div>
        <p id="references-viewer-description"></p><div class="reference-image-viewport"><img id="references-viewer-image" alt=""></div>
      </dialog>
    </section>`);
  const el=key=>root.querySelector('#references-'+key);
  const viewer=el('viewer'),image=el('viewer-image');let viewerUrl=null,zoom=1;
  function setZoom(value) {
    zoom=Math.min(4,Math.max(.05,value));image.style.width=Math.round(image.naturalWidth*zoom)+'px';el('zoom-level').value=Math.round(zoom*100)+'%';
  }
  function fit(){setZoom(Math.min(1,(root.querySelector('.reference-image-viewport').clientWidth-24)/image.naturalWidth));}
  function show(item) {
    el('viewer-title').textContent=item.title;el('viewer-description').textContent=item.description;image.alt=item.title;
    if(viewerUrl)URL.revokeObjectURL(viewerUrl);viewerUrl=URL.createObjectURL(item.image);
    image.onload=fit;image.src=viewerUrl;viewer.showModal();
  }
  el('viewer-close').onclick=()=>viewer.close();
  viewer.addEventListener('click',event=>{if(event.target===viewer){const r=viewer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)viewer.close();}});
  viewer.addEventListener('close',()=>{if(viewerUrl)URL.revokeObjectURL(viewerUrl);viewerUrl=null;image.removeAttribute('src');});
  el('zoom-in').onclick=()=>setZoom(zoom*1.25);el('zoom-out').onclick=()=>setZoom(zoom/1.25);el('fit').onclick=fit;el('actual').onclick=()=>setZoom(1);
  function openEditor(item) {
    editingId=item?.id||null;el('editor').reset();el('edit-title').value=item?.title||'';el('edit-description').value=item?.description||'';el('edit-image').required=!item;
    el('editor-title').textContent=item?'Editar tabela':'Nova tabela';el('editor').hidden=false;el('edit-title').focus();
  }
  function closeEditor(){el('editor').hidden=true;editingId=null;el('editor').reset();el('new').focus();}
  function render() {
    thumbnailUrls.splice(0).forEach(url=>URL.revokeObjectURL(url));const cards=el('cards');cards.replaceChildren();
    const query=normalizeToolText(el('search').value);
    const found=items.filter(item=>normalizeToolText(item.title+' '+item.description).includes(query));
    if(!found.length){const p=document.createElement('p');p.textContent=items.length?'Nenhuma tabela encontrada.':'Nenhuma tabela cadastrada. Adicione uma imagem para começar.';cards.append(p);}
    for(const item of found) {
      const card=document.createElement('article');card.className='card reference-card';card.dataset.referenceId=item.id;
      const img=document.createElement('img');const url=URL.createObjectURL(item.image);thumbnailUrls.push(url);img.src=url;img.alt=item.title;img.loading='lazy';
      const title=document.createElement('h3');title.textContent=item.title;const description=document.createElement('p');description.textContent=item.description;
      const actions=document.createElement('div');actions.className='tool-actions';
      function button(label,action,primary=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.className='btn '+(primary?'btn-primary':'btn-ghost');b.onclick=action;actions.append(b);return b;}
      button('Visualizar tabela',()=>show(item),true);
      button('Editar',()=>openEditor(item)).disabled=busy||!ready;
      button('Excluir',async()=>{
        if(busy||!confirm('Tem certeza que deseja excluir esta tabela?\n'+item.title))return;
        busy=true;render();
        try{await store.remove(item.id);items=items.filter(value=>value.id!==item.id);if(editingId===item.id)closeEditor();el('feedback').textContent='Tabela excluída.';}
        catch(error){el('feedback').textContent=error.message;}
        finally{busy=false;render();}
      }).disabled=busy||!ready;
      card.append(img,title,description,actions);cards.append(card);
    }
  }
  el('new').onclick=()=>openEditor();el('cancel').onclick=closeEditor;el('search').oninput=render;
  el('editor').onsubmit=async event=>{
    event.preventDefault();if(busy||!ready)return;busy=true;
    const submit=el('editor').querySelector('[type=submit]');submit.disabled=true;el('cancel').disabled=true;el('new').disabled=true;
    try {
      const old=items.find(item=>item.id===editingId);
      const item={id:editingId||crypto.randomUUID(),title:el('edit-title').value.trim(),description:el('edit-description').value.trim(),image:el('edit-image').files[0]||old?.image,updatedAt:Date.now()};
      validateReference(item);
      await new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(item.image);img.onload=()=>{URL.revokeObjectURL(url);img.naturalWidth*img.naturalHeight<=40000000?resolve():reject(new Error('A imagem é grande demais. Use uma versão com até 40 milhões de pixels.'));};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Não foi possível ler esta imagem. Selecione um arquivo de imagem válido.'));};img.src=url;});
      await store.save(item);items=[item,...items.filter(value=>value.id!==item.id)];el('search').value='';closeEditor();el('feedback').textContent='Tabela salva neste navegador.';
    } catch(error){el('feedback').textContent=error.message;}
    finally{busy=false;submit.disabled=false;el('cancel').disabled=false;el('new').disabled=!ready;render();}
  };
  store.list().then(saved=>{items=saved;ready=true;el('new').disabled=false;el('feedback').textContent='';render();}).catch(error=>{el('feedback').textContent=error.message;});
}
