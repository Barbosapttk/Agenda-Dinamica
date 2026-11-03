import { mountFreightQuote } from './freight-quote.js';
import { CARRIER_FIELDS, searchCarriers } from './application/services/carriers-service.js';
import { toolPageHeader } from './tool-page-layout.js';
import { mapSolicitacaoParaFrete } from './freight-quote-data.js';

export function mountFretes(container) {
const launcher=document.createElement('button');launcher.type='button';launcher.id='open-fretes';launcher.textContent='🚚 Fretes';
const root=document.createElement('section');root.id='fretes';root.hidden=true;root.setAttribute('aria-labelledby','fretes-title');
root.innerHTML=`${toolPageHeader('fretes')}
  <div class="fretes-tabs" role="tablist" aria-label="Seções de Fretes">
    <button type="button" class="btn btn-primary" id="fretes-tab-cotacao" role="tab" aria-controls="fretes-cotacao" aria-selected="true">Cotação de Frete</button>
    <button type="button" class="btn btn-ghost" id="fretes-tab-transportadoras" role="tab" aria-controls="fretes-transportadoras" aria-selected="false" tabindex="-1">Transportadoras</button>
    <button type="button" class="btn btn-ghost" id="fretes-tab-correios" role="tab" aria-controls="fretes-correios" aria-selected="false" tabindex="-1">Correios</button>
  </div>
  <section id="fretes-cotacao" role="tabpanel" aria-labelledby="fretes-tab-cotacao"></section>
  <section id="fretes-transportadoras" role="tabpanel" aria-labelledby="fretes-tab-transportadoras" hidden>
    <div class="card sc-panel"><div class="card-header"><h3>Transportadoras</h3><button type="button" class="btn btn-primary" id="carrier-new">Nova Transportadora</button></div>
      <label class="carrier-search">Pesquisar transportadoras<input type="search" id="carrier-search" placeholder="Nome, atendente ou cidade/região"></label>
      <p id="carrier-feedback" role="status" aria-live="polite"></p>
      <form id="carrier-form" hidden><h3 id="carrier-form-title">Nova Transportadora</h3><div class="carrier-fields">
        <label>Nome da transportadora<input id="carrier-nome" autocomplete="organization"></label>
        <label>Número/telefone<input id="carrier-telefone" type="tel" autocomplete="tel"></label>
        <label>Nome do atendente<input id="carrier-atendente" autocomplete="name"></label>
        <label>E-mail<input id="carrier-email" type="email" autocomplete="email"></label>
        <label class="carrier-cities">Cidades onde atua<textarea id="carrier-cidades" rows="2" placeholder="Cidades ou regiões atendidas"></textarea></label>
        <label class="carrier-cities">Observações<textarea id="carrier-observacoes" rows="2" placeholder="Informações adicionais para consulta"></textarea></label>
      </div><div class="settings-actions"><button type="submit" class="btn btn-primary" id="carrier-save">Salvar</button><button type="button" class="btn btn-ghost" id="carrier-cancel">Cancelar</button></div></form>
      <div id="carrier-list" class="carrier-list"></div>
    </div>
  </section>
  <section id="fretes-correios" role="tabpanel" aria-labelledby="fretes-tab-correios" hidden><div class="card sc-panel"><h3>Correios</h3>
    <p>Consulte rapidamente os serviços oficiais dos Correios.</p><div class="settings-actions">
      <a class="btn btn-primary" id="correios-calcular" href="https://www2.correios.com.br/sistemas/precosPrazos/" target="_blank" rel="noopener noreferrer">Calcular frete</a>
      <a class="btn btn-ghost" id="correios-rastrear" href="https://rastreamento.correios.com.br/app/index.php" target="_blank" rel="noopener noreferrer">Rastrear objeto</a>
    </div></div></section>`;
container.append(launcher,root);
const quote=mountFreightQuote(root.querySelector('#fretes-cotacao'));
const origin=document.createElement('div');origin.id='fretes-origem';origin.className='settings-actions';origin.hidden=true;
const originText=document.createElement('span'),back=document.createElement('button');back.type='button';back.className='btn btn-ghost';back.textContent='← Voltar para Solicitação';
origin.append(originText,back);root.querySelector('#fretes-cotacao').prepend(origin);
let solicitacaoOrigemId=null;
back.onclick=()=>window.voltarParaSolicitacao(solicitacaoOrigemId);
window.abrirFreteComSolicitacao=(sol,cliente)=>{
  if(quote.hasDraft()&&!confirm('Substituir os dados em edição da cotação pelos dados desta solicitação?'))return false;
  quote.prefill(mapSolicitacaoParaFrete(sol,cliente));solicitacaoOrigemId=sol.id;
  originText.textContent=`Solicitação #${sol.id}`;origin.hidden=false;
  document.querySelector('.tools-central-link').click();launcher.click();root.querySelector('#fretes-tab-cotacao').click();
  return true;
};
const tabs=[...root.querySelectorAll('[role=tab]')];
function selectTab(tab, focus = false) {
  tabs.forEach(item=>{
    const selected=item===tab;
    item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;
    item.classList.toggle('btn-primary',selected);item.classList.toggle('btn-ghost',!selected);
    document.getElementById(item.getAttribute('aria-controls')).hidden=!selected;
  });
  if(focus)tab.focus();
  if(tab.id==='fretes-tab-transportadoras')render();
}
tabs.forEach((tab,index)=>{
  tab.onclick=()=>selectTab(tab);
  tab.onkeydown=event=>{
    const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;
    if(next!==null){event.preventDefault();selectTab(tabs[next],true);}
  };
});
const field=key=>root.querySelector('#carrier-'+key);
const form=field('form'), feedback=field('feedback');
const labels={nome:'Transportadora',telefone:'Telefone',atendente:'Atendente',email:'E-mail',cidades:'Cidades/regiões atendidas',observacoes:'Observações'};
let editId=null, pending=false, creationId=null;
const list=()=>window.AgendaApplication?.state.getCollection('transportadoras') || [];
function openEditor(item=null) {
  if(pending)return;
  feedback.textContent='';
  editId=item?.id || null;creationId=crypto.randomUUID();
  for(const key of CARRIER_FIELDS)field(key).value=item?.[key] || '';
  field('form-title').textContent=item?'Editar Transportadora':'Nova Transportadora';form.hidden=false;field('nome').focus();
}
field('new').onclick=()=>openEditor();
field('cancel').onclick=()=>{if(pending)return;form.hidden=true;editId=null;field('new').focus();};
field('search').oninput=render;
async function command(action) {
  if(pending)return;
  pending=true;
  const buttons=[...root.querySelectorAll('#fretes-transportadoras button')];buttons.forEach(button=>button.disabled=true);
  const inputs=[...form.querySelectorAll('input,textarea')];inputs.forEach(input=>input.disabled=true);
  try {
    if(!window.AgendaApplication)throw new Error('Aguarde a carga da Agenda.');
    const result=await action(AgendaApplication.services.transportadoras);
    if(!result.ok)throw result.error || new Error('Não foi possível confirmar a gravação.');
    return result;
  } catch(error) { feedback.textContent=`Não foi possível salvar: ${error.message}`;return null; }
  finally {pending=false;buttons.forEach(button=>button.disabled=false);inputs.forEach(input=>input.disabled=false);}
}
form.onsubmit=async event=>{
  event.preventDefault();if(pending)return;
  const data=Object.fromEntries(CARRIER_FIELDS.map(key=>[key,field(key).value]));
  if(!editId && data.nome.trim() && list().some(item=>(item.nome || '').trim().toLocaleLowerCase('pt-BR')===data.nome.trim().toLocaleLowerCase('pt-BR')) && !confirm('Já existe uma transportadora com esse nome. Salvar como outro cadastro, com um identificador próprio?'))return;
  const result=await command(service=>service.save(data,{id:editId || creationId,editing:Boolean(editId)}));
  if(result){form.hidden=true;editId=null;field('search').value='';feedback.textContent='Transportadora salva.';render();field('new').focus();}
};
function render() {
  const host=field('list');host.replaceChildren();
  const records=searchCarriers(list(),field('search').value);
  if(!records.length){const empty=document.createElement('p');empty.textContent=list().length?'Nenhuma transportadora encontrada.':'Nenhuma transportadora cadastrada.';host.append(empty);return;}
  for(const item of records) {
    const card=document.createElement('article');card.className='card carrier-card';card.dataset.carrierId=item.id;
    const heading=document.createElement('h4');heading.textContent=item.nome || 'Transportadora sem nome';card.append(heading);
    const details=document.createElement('dl');
    for(const key of CARRIER_FIELDS.filter(key=>key!=='nome')) {
      const label=document.createElement('dt');label.textContent=labels[key];
      const value=document.createElement('dd');value.textContent=item[key] || '—';details.append(label,value);
    }
    const actions=document.createElement('div');actions.className='settings-actions';
    const edit=document.createElement('button');edit.type='button';edit.className='btn btn-ghost';edit.textContent='Editar';edit.onclick=()=>openEditor(item);
    const remove=document.createElement('button');remove.type='button';remove.className='btn btn-danger';remove.textContent='Excluir';
    remove.onclick=async()=>{
      if(pending || !confirm(`Excluir somente a transportadora “${item.nome || 'sem nome'}”?`))return;
      const result=await command(service=>service.remove(item.id,{confirmed:true}));
      if(result){if(editId===item.id){form.hidden=true;editId=null;}feedback.textContent='Transportadora excluída.';render();field('new').focus();}
    };
    actions.append(edit,remove);card.append(details,actions);host.append(card);
  }
}
window.renderTransportadoras=render;
render();
window.AgendaApplication?.ready.then(render);
return root;
}
