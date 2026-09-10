import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = fs.readFileSync('public/original-index.html', 'utf8');
let scripts = 0;
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (!/\bsrc=/.test(match[1])) { new vm.Script(match[2]); scripts++; }
}
console.log(`Sintaxe: ${scripts} scripts válidos`);
const target = (await (await fetch('http://127.0.0.1:9222/json')).json()).find(t => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once:true }));
let seq = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', async ({data}) => {
  const m = JSON.parse(data);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Fetch.requestPaused') {
    const {requestId, request} = m.params;
    if (request.url.includes('supabase-js')) await call('Fetch.fulfillRequest', {requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/javascript'}],body:Buffer.from(mock).toString('base64')});
    else if (request.url.includes('.supabase.co')) await call('Fetch.failRequest', {requestId,errorReason:'BlockedByClient'});
    else await call('Fetch.continueRequest', {requestId});
  }
});
function call(method, params={}) { return new Promise((resolve,reject) => { const id=++seq; pending.set(id,{resolve,reject}); ws.send(JSON.stringify({id,method,params})); }); }
async function evaluate(expression) {
  const r = await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
const mock = `window.supabase={createClient(){return {
 auth:{async getSession(){return {data:{session:null},error:null}},onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
 from(){return {async select(){return {data:JSON.parse(sessionStorage.getItem('test-rows')||'[]'),error:null}},async upsert(rows){sessionStorage.setItem('test-rows',JSON.stringify(rows));return {error:null}}}},
 channel(){return {on(){return this},subscribe(){return this}}}
}}};`;
await call('Runtime.enable');
await call('Fetch.enable',{patterns:[{urlPattern:'*supabase*'}]});
await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
async function load() {
  await call('Page.navigate',{url:'http://127.0.0.1:3000/original-index.html'});
  for(let i=0;i<100;i++){ await new Promise(r=>setTimeout(r,100)); if(await evaluate("document.readyState==='complete' && typeof renderCotacoesComprasPainel==='function'")) break; }
  await evaluate("carregarDadosSupabase().then(()=>{appLoaded=true; liberarSistema({email:'teste@example.com'}); renderizarDadosSincronizados();})");
}
try {
 await load();
 await evaluate(`sessionStorage.removeItem('test-rows'); clientes=[{id:1,nome:'Cliente Teste',empresa:'Razão Social Teste',telefone:'11999999999',email:'teste@example.com',produto:'Peças',status:'ativo'}]; solicitacoesOrcamento=[{id:11,clienteId:1,solicitante:'Maria Teste',produto:'Rolamento',descricao:'Peça para manutenção',dataSolicitacao:today(),prazo:today(),etapa:'nova',prioridade:'normal'}]; cotacoesCompras=[]; contatos=[]; concluidos=[]; controleVendas=[]; agendamentos=[]; orcamentos=[]; renderizarDadosSincronizados();`);
 await evaluate(`abrirModalCotacaoCompras(); document.getElementById('cotacao-compras-descricao').value='Compra teste'; salvarCotacaoCompras();`);
 assert.equal(await evaluate("document.querySelectorAll('.cotacao-compras-card').length"),1);
 await evaluate(`window.testQuote=getCotacoesCompras()[0].id; alterarStatusCotacaoCompras(testQuote,'sem_retorno');`);
 assert.equal(await evaluate("document.querySelectorAll('.cotacoes-compras-coluna')[1].querySelectorAll('.cotacao-compras-card').length"),1);
 await evaluate("alterarStatusCotacaoCompras(testQuote,'enviado'); editarCotacaoCompras(testQuote); document.getElementById('cotacao-compras-descricao').value='Compra editada'; salvarCotacaoCompras(); persistirDadosSupabase()");
 await load();
 assert.equal(await evaluate("getCotacoesCompras()[0].descricao"),'Compra editada');
 await evaluate("concluirCotacaoCompras(getCotacoesCompras()[0].id)");
 assert.equal(await evaluate("getCotacoesComprasAtivas().length"),0);
 await evaluate("window.confirm=()=>true; excluirCotacaoCompras(getCotacoesCompras()[0].id)");
 assert.equal(await evaluate("getCotacoesCompras().length"),0);
 console.log('Compras: criar, editar, recarregar, mover, concluir e excluir OK');
 await evaluate(`abrirConcluirSolicitacao(11)`);
 await new Promise(r=>setTimeout(r,200));
 await evaluate(`document.getElementById('concluir-status-proposta').value='recusada'; document.getElementById('concluir-obs').value='Envio inicial'; document.querySelector('.cv-line-numero').value='TESTE-001'; document.querySelector('.cv-line-valor').value='150,00'; confirmarConclusao();`);
 assert.equal(await evaluate('solicitacoesOrcamento.length'),0);
 assert.equal(await evaluate('controleVendas.length'),1);
 assert.equal(await evaluate('controleVendas[0].statusPedido'),'reprovado');
 await evaluate(`abrirAtualizarStatusProposta('cc-'+concluidos[0].id); document.getElementById('status-proposta-obs').value='Observação após concluir'; salvarStatusPropostaAcompanhamento(); persistirDadosSupabase();`);
 await load();
 assert.equal(await evaluate('concluidos[0].observacaoAtualizacao'),'Observação após concluir');
 assert.equal(await evaluate('controleVendas[0].observacao'),'Observação após concluir');
 await evaluate("showView('solicitacoes')");
 assert.equal(await evaluate("document.getElementById('propostas-acompanhamento-kanban').textContent.includes('Observação após concluir')"),true);
 await evaluate("aplicarStatusProposta('cc-'+concluidos[0].id,'aprovada','Aprovou'); atualizarStatusPedidoControle(controleVendas[0].id,'faturado'); aplicarStatusProposta('cc-'+concluidos[0].id,'aprovada','Nota após faturamento');");
 assert.equal(await evaluate('controleVendas[0].statusPedido'),'faturado');
 assert.equal(await evaluate('controleVendas.length'),1);
 console.log('Solicitação → proposta → vendas: status, observação, recarga e ausência de duplicação OK');
 const statuses = [['ag_aprovacao','AGUARDANDO APROVAÇÃO'],['aprovado','APROVADO'],['ag_faturamento','AGUARDANDO FATURAMENTO'],['faturado','FATURADO'],['reprovado','REPROVADO'],['aprov_mes_seguinte','APROVADO MÊS SEGUINTE']];
 await evaluate("window.testWorkbook=null; XLSX.writeFile=(wb)=>{window.testWorkbook=wb}; showView('controle-vendas');");
 for(const [status,label] of statuses) {
  await evaluate(`atualizarStatusPedidoControle(controleVendas[0].id,'${status}'); exportarControleVendasXlsx();`);
  assert.equal(await evaluate("XLSX.utils.sheet_to_json(testWorkbook.Sheets[testWorkbook.SheetNames[0]])[0].STATUS"),label);
 }
 console.log('Controle de Vendas: seis status e conteúdo XLSX OK');
 await evaluate(`openModal('modalCliente'); document.getElementById('c-nome').value='Novo Cliente Teste'; document.getElementById('c-email').value='novo@example.com'; salvarCliente();`);
 assert.equal(await evaluate('clientes.length'),2);
 await evaluate(`editarCliente(clientes[1].id); document.getElementById('c-empresa').value='Empresa Editada'; salvarCliente();`);
 assert.equal(await evaluate('clientes[1].empresa'),'Empresa Editada');
 await evaluate(`abrirDetalhe(clientes[1].id); closePanel(); openModal('modalSolicitacao'); document.getElementById('sol-cliente').value='1'; document.getElementById('sol-nome').value='Cliente Teste'; document.getElementById('sol-solicitante').value='Maria Teste'; document.getElementById('sol-produto').value='Rolamento'; document.getElementById('sol-descricao').value='Solicitação para teste de movimentação'; salvarSolicitacaoOrcamento();`);
 assert.equal(await evaluate('solicitacoesOrcamento.length'),1);
 for (const stage of ['aguardando_info','aguardando_cotacao','em_elaboracao','nova']) {
  await evaluate(`dropSolicitacaoKanban({preventDefault(){},currentTarget:{classList:{remove(){}}},dataTransfer:{getData(){return String(solicitacoesOrcamento[0].id)}}},'${stage}')`);
  assert.equal(await evaluate('solicitacoesOrcamento[0].etapa'),stage);
 }
 await evaluate(`solicitacoesOrcamento.push({id:22,nome:'Cliente Teste',email:'teste@example.com',prazo:today(),dataSolicitacao:today(),descricao:'Vincular sem duplicar'}); criarClienteFromSolicitacao(22);`);
 assert.equal(await evaluate('clientes.length'),2);
 assert.equal(await evaluate('solicitacoesOrcamento.find(s=>s.id===22).clienteId'),1);
 await evaluate(`agendamentos=[]; openModal('modalAgendamento'); document.getElementById('ag-cliente').value='1'; document.getElementById('ag-data').value=today(); document.getElementById('ag-motivo').value='Retorno de teste'; salvarAgendamento();`);
 assert.equal(await evaluate('agendamentos.length'),1);
 await evaluate(`marcarFeito(agendamentos[0].id); confirmarConclusao();`);
 assert.equal(await evaluate('agendamentos.length'),0);
 await evaluate(`agendamentos.push({id:33,clienteId:1,data:today(),horario:'09:00',prioridade:'normal',motivo:'Atividade para verificar botões'}); renderDashboard();`);
 for(const view of ['dashboard','clientes','agenda','orcamentos','controle-vendas','historico','solicitacoes']) await evaluate(`showView('${view}')`);
 console.log('Clientes: criar, editar, ficha e vínculo sem duplicação OK. Solicitações: criar e mover OK. Agenda: criar e concluir OK. Navegação e Histórico OK.');
 await evaluate("window.checkAlarms=()=>{}; window.checkAlarmsComerciais=()=>{}; document.getElementById('alarmOverlay')?.remove(); document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open')); closePanel();");
 for(const width of [1440,900,600]) {
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
  for(const theme of ['dark','light']) {
   await evaluate(`applyTheme('${theme}',false); document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open')); showView('solicitacoes'); document.getElementById('solicitacoes-kanban').scrollIntoView();`);
   await new Promise(r=>setTimeout(r,100));
   const shot = await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   fs.mkdirSync('test-results',{recursive:true});
   fs.writeFileSync(`test-results/solicitacoes-${width}-${theme}.png`,Buffer.from(shot.data,'base64'));
   await evaluate("document.querySelector('.proposta-kanban-card').scrollIntoView()");
   const proposalShot = await call('Page.captureScreenshot',{format:'png'});
   fs.writeFileSync(`test-results/propostas-${width}-${theme}.png`,Buffer.from(proposalShot.data,'base64'));
   await evaluate("showView('dashboard');renderDashboard()");
   const overflow = await evaluate("[...document.querySelectorAll('#view-dashboard .kanban-card .btn')].filter(b=>{const c=b.closest('.kanban-card').getBoundingClientRect(),r=b.getBoundingClientRect();return c.width && (r.right>c.right+1 || r.left<c.left-1)}).length");
   assert.equal(overflow,0,`Botões fora do card em ${width}px / ${theme}`);
   const dashShot = await call('Page.captureScreenshot',{format:'png'});
   fs.writeFileSync(`test-results/painel-${width}-${theme}.png`,Buffer.from(dashShot.data,'base64'));
  }
 }
 assert.deepEqual(errors,[]);
 console.log('Console: sem exceções JavaScript. Capturas em 1440, 900 e 600px, ambos os temas.');
} finally { ws.close(); }
