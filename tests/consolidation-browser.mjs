import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const baseUrl = process.env.AGENDA_TEST_BASE_URL || 'http://127.0.0.1:3000';

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
const consoleErrors = [];
let expectedConsoleError = false;
ws.addEventListener('message', async ({data}) => {
  const m = JSON.parse(data);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error' && !expectedConsoleError) {
    consoleErrors.push(m.params.args.map(arg => arg.value || arg.description || '').join(' '));
  }
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
const mock = `window.__supabaseTest={clients:0,reads:0,writes:0,channels:0,sessions:0,failLoad:false,failSave:false,batches:[],pauseNextWrite:false,releaseWrite:null};
window.supabase={createClient(){window.__supabaseTest.clients++;return {
 auth:{async getSession(){window.__supabaseTest.sessions++;await new Promise(resolve=>setTimeout(resolve,1200));return {data:{session:null},error:null}},onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
 from(){return {async select(){window.__supabaseTest.reads++;if(window.__supabaseTest.failLoad)return {data:null,error:{message:'Falha de carga simulada'}};return {data:JSON.parse(sessionStorage.getItem('test-rows')||'[]'),error:null}},async upsert(rows){const copy=JSON.parse(JSON.stringify(rows));window.__supabaseTest.writes++;window.__supabaseTest.batches.push(copy);if(window.__supabaseTest.pauseNextWrite){window.__supabaseTest.pauseNextWrite=false;await new Promise(resolve=>{window.__supabaseTest.releaseWrite=resolve})}if(window.__supabaseTest.failSave)return {error:{message:'Falha de escrita simulada'}};const merged=new Map(JSON.parse(sessionStorage.getItem('test-rows')||'[]').map(row=>[row.key,row]));copy.forEach(row=>merged.set(row.key,row));sessionStorage.setItem('test-rows',JSON.stringify([...merged.values()]));return {error:null}}}},
 channel(){return {on(){return this},subscribe(){window.__supabaseTest.channels++;return this}}}
}}};`;
await call('Page.navigate', {url:'about:blank'});
for(let i=0;i<100;i++){ if(await evaluate("location.href === 'about:blank'")) break; await new Promise(r=>setTimeout(r,50)); }
await call('Runtime.enable');
await call('Fetch.enable',{patterns:[{urlPattern:'*supabase*'}]});
await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
async function load() {
  await call('Page.navigate',{url:`${baseUrl}/original-index.html`});
  for(let i=0;i<100;i++){ await new Promise(r=>setTimeout(r,100)); if(await evaluate("document.readyState==='complete' && typeof renderCotacoesComprasPainel==='function'")) break; }
  for(let i=0;i<100;i++){ if(await evaluate("appLoaded && document.body.classList.contains('auth-ok')")) break; await new Promise(r=>setTimeout(r,100)); }
  assert.equal(await evaluate("document.body.classList.contains('auth-ok') && !document.body.classList.contains('auth-locked')"), true, 'Acesso automático sem login');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.btn-logout')).display"), 'none');
}
let zoomControl;
let zoomPage;
async function setBrowserZoom(scale) {
 if (!zoomControl) {
  zoomPage=await(await fetch('http://127.0.0.1:9222/json/new?chrome://settings/appearance',{method:'PUT'})).json();
  zoomControl=new WebSocket(zoomPage.webSocketDebuggerUrl);
  await new Promise(r=>zoomControl.addEventListener('open',r,{once:true}));
  let sequence=0;const waiting=new Map();
  zoomControl.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){waiting.get(m.id)?.(m);waiting.delete(m.id)}});
  zoomControl.call=expression=>new Promise(resolve=>{const id=++sequence;waiting.set(id,resolve);zoomControl.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}))});
  for(let i=0;i<50;i++){const r=await zoomControl.call('typeof chrome.settingsPrivate?.setDefaultZoom');if(r.result?.result?.value==='function')break;await new Promise(r=>setTimeout(r,100))}
 }
 const result=await zoomControl.call('chrome.settingsPrivate.setDefaultZoom('+scale+')');
 if(result.result?.exceptionDetails)throw Error('Não foi possível alterar o zoom real do Chrome');
 await new Promise(r=>setTimeout(r,100));
}
try {
 await call('Page.enable');
 await call('Page.addScriptToEvaluateOnNewDocument',{source:"window.__loginFlash=false;function sampleLogin(){const screen=document.getElementById('authScreen');if(screen&&getComputedStyle(screen).display!=='none')window.__loginFlash=true;if(typeof appLoaded==='undefined'||!appLoaded)requestAnimationFrame(sampleLogin)}requestAnimationFrame(sampleLogin);"});
 await load();
 assert.equal(await evaluate('window.__loginFlash'),false,'Login não aparece mesmo com consulta de sessão atrasada em 1,2 segundo');
 await evaluate("window.confirm=()=>true;window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove();clearInterval(sincronizacaoInterval);clearTimeout(sincronizacaoTimer)");
 assert.equal(await evaluate("LOGIN_HABILITADO"),false);
 assert.equal(await evaluate("getComputedStyle(document.getElementById('authScreen')).display"),'none');
 assert.equal(await evaluate("document.querySelector('#filtro-situacao-solicitacoes option[value=concluidas]')===null"),true);
 await evaluate("clientes=[{id:1,nome:'João da Silva WEG',empresa:'Empresa com nome longo para verificar a quebra de linhas nos cards e botões',telefone:'11987654321',status:'ativo'}];produtosSolicitacoes=['ROTOR XPT-500 220V'];renderizarDadosSincronizados();openModal('modalSolicitacao');document.getElementById('sol-cliente').value='';document.getElementById('sol-nome').value='João';document.getElementById('sol-produto').value='ROTOR XPT-500 220V';document.getElementById('sol-data').value='2026-11-03';document.getElementById('sol-prazo').value='2026-12-31';document.getElementById('sol-descricao').value='cliente solicitou orçamento da bomba centrifuga favor verificar valor e prazo';document.getElementById('sol-email').value='';document.getElementById('sol-canal').value='';solicitacoesOrcamento=[]");
 await evaluate("document.getElementById('sol-telefone').value='';salvarSolicitacaoOrcamento()");
 assert.equal(await evaluate('solicitacoesOrcamento.length'),0);
 await evaluate("document.getElementById('sol-telefone').value='11987654321';salvarSolicitacaoOrcamento()");
 assert.equal(await evaluate('solicitacoesOrcamento.length'),1);
 assert.equal(await evaluate('solicitacoesOrcamento[0].email'),'');assert.equal(await evaluate('solicitacoesOrcamento[0].canal'),'');
 assert.equal(await evaluate('solicitacoesOrcamento[0].produto'),'ROTOR XPT-500 220V');
 assert.equal(await evaluate('solicitacoesOrcamento[0].descricao'),'Cliente solicitou orçamento da bomba centrífuga. Favor verificar valor e prazo.');
 await new Promise(r=>setTimeout(r,400));
 await evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));editarSolicitacaoOrcamento(solicitacoesOrcamento[0].id);document.getElementById('sol-email').value='joao@example.com';salvarSolicitacaoOrcamento()");
 assert.equal(await evaluate('solicitacoesOrcamento[0].email'),'joao@example.com');
 for(const [iso,br] of [['2026-01-01','01/01/2026'],['2026-11-03','03/11/2026'],['2026-12-31','31/12/2026']]) {
  await evaluate('document.getElementById("sol-data").value='+JSON.stringify(iso));
  assert.equal(await evaluate('document.getElementById("sol-data").value'),iso);
  assert.equal(await evaluate('Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").get.call(document.getElementById("sol-data"))'),br);
 }
 await evaluate("openModal('modalSolicitacao');document.getElementById('sol-data').focus();document.getElementById('sol-data').value=''");
 await call('Input.insertText',{text:'03/11/2026'});
 assert.equal(await evaluate('document.getElementById("sol-data").value'),'2026-11-03');
 await evaluate("document.getElementById('sol-data').value='31/02/2026'");
 assert.equal(await evaluate('document.getElementById("sol-data").value'),'');
 assert.equal(await evaluate('document.getElementById("sol-data").checkValidity()'),false);
 await evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));agendamentos=[{id:101,clienteId:1,data:'2026-11-03',horario:'14:30',motivo:'Retorno com descrição longa WEG XPT-500 220V '.repeat(4),prioridade:'urgente'}];contatos=[{id:102,clienteId:1,data:'2026-11-03',descricao:'Contato com descrição longa '.repeat(5),canal:'telefone'}];orcamentos=[{id:103,clienteId:1,data:'2026-12-31',obs:'Recorrente teste'}];cotacoesCompras=[{id:104,descricao:'Compra ROTOR XPT-500 220V '.repeat(8),status:'enviado',criadoEm:'2026-11-03'}];controleVendas=[{id:105,clienteId:1,cliente:'João',empresa:'Empresa de teste',numeroProposta:'PROP-123456',data:'2026-11-03',valor:150,statusPedido:'aprovado',tipoOrcamento:'pecas'}];concluidos=[{id:106,tipo:'solicitacao_orcamento',clienteId:1,nomeAvulso:'João',concluidoEm:'2026-11-03',dataOriginal:'2026-11-03',motivo:'Proposta técnica WEG XPT-500 220V',numeroOrcamentoPecas:'PROP-123456',statusProposta:'aguardando_retorno'}];renderizarDadosSincronizados();clearTimeout(saveTimer);saveTimer=null");
 await evaluate('persistirDadosSupabase()');
 const exported=await evaluate('backupPayload()');assert.equal(exported.data.controleVendas.length,1);assert.equal(exported.data.cotacoesCompras.length,1);assert.equal(exported.backupVersion,1);
 await evaluate("window.__backupWrites=__supabaseTest.writes;window.__file=new File([JSON.stringify(backupPayload())],'backup.json',{type:'application/json'});window.__transfer=new DataTransfer();__transfer.items.add(__file);document.getElementById('agenda-backup-file').files=__transfer.files;document.getElementById('agenda-backup-file').dispatchEvent(new Event('change'))");
 await new Promise(r=>setTimeout(r,100));
 assert.equal(await evaluate("document.getElementById('agenda-backup-preview').open"),true);
 assert.equal(await evaluate("document.querySelector('[data-backup-summary]').textContent.includes('1 vendas')"),true);
 assert.equal(await evaluate('__supabaseTest.writes'),await evaluate('__backupWrites'));
 await evaluate("document.querySelector('[data-backup-cancel]').click()");
 assert.equal(await evaluate('__supabaseTest.writes'),await evaluate('__backupWrites'));
 await evaluate("window.__restoreMarker=true;clientes.push({id:777,nome:'Estado anterior protegido'});localStorage.setItem('outra-aplicacao','preservar');localStorage.setItem('agenda-tool-notes-v1','[]');persistirDadosSupabase()");
 await evaluate("window.__transfer=new DataTransfer();__transfer.items.add(__file);document.getElementById('agenda-backup-file').files=__transfer.files;document.getElementById('agenda-backup-file').dispatchEvent(new Event('change'))");
 await new Promise(r=>setTimeout(r,100));
 await evaluate("document.querySelector('[data-backup-confirm]').click()");
 for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,100));try{if(await evaluate("!window.__restoreMarker && typeof appLoaded!=='undefined' && appLoaded"))break}catch{}}
 assert.equal(await evaluate('clientes.some(c=>c.id===777)'),false,'Restauração confirmada recarrega os dados do arquivo');
 assert.equal(await evaluate('AgendaApplication.services.backup.getRecoveryBackup().data.clientes.some(c=>c.id===777)'),true,'Proteção contém o estado anterior');
 await evaluate("window.confirm=()=>true;window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};clearInterval(sincronizacaoInterval);clearTimeout(sincronizacaoTimer);document.getElementById('alarmOverlay')?.remove()");
 // Zoom real do Chrome, configurado pela API interna da página de preferências.
 const matrix=[];
 await call('Emulation.clearDeviceMetricsOverride');
 const {windowId}=await call('Browser.getWindowForTarget',{targetId:target.id});
 await call('Browser.setWindowBounds',{windowId,bounds:{width:1440,height:1000}});
 for(const zoom of [80,90,100,110,125,150,175]) {
  await setBrowserZoom(zoom/100);
  assert.ok(Math.abs(await evaluate('devicePixelRatio')-zoom/100)<0.02,'Zoom real confirmado pelo devicePixelRatio');
  for(const theme of ['light','dark'])for(const view of ['dashboard','solicitacoes','clientes','agenda','orcamentos','controle-vendas','historico','ferramentas']) {
   await evaluate('applyTheme('+JSON.stringify(theme)+',false);showView('+JSON.stringify(view)+')');
   const result=await evaluate("(()=>{const root=document.querySelector('.view.active');const cards=[...root.querySelectorAll('.kanban-card,.client-card,.request-mini,.proposal-mini,.cotacao-compras-card,.hist-org-item,.tool-launch-card')].filter(e=>e.getClientRects().length);return {mainTop:document.querySelector('.main').getBoundingClientRect().top,viewportHeight:innerHeight,pageOverflow:document.documentElement.scrollWidth>innerWidth+2,cards:cards.length,overflow:cards.flatMap(card=>{const r=card.getBoundingClientRect();return [...card.querySelectorAll('button,input,select')].filter(e=>{if(!e.getClientRects().length)return false;const c=e.getBoundingClientRect();return c.left<r.left-2||c.right>r.right+2||c.top<r.top-2||c.bottom>r.bottom+2}).map(e=>({card:card.className,control:e.className}))}),iso:Array.from(root.innerText.matchAll(/(?:^|[^0-9])([0-9]{4}-[0-9]{2}-[0-9]{2})(?![0-9])/g)).some(match=>Boolean(AgendaFormat.isoDate(match[1])))}})()"); matrix.push({zoom,theme,view,...result}); assert.ok(result.mainTop<result.viewportHeight-100,"Conteudo abaixo da tela: "+JSON.stringify(matrix.at(-1))); assert.equal(result.pageOverflow,false,JSON.stringify(matrix.at(-1)));assert.deepEqual(result.overflow,[],JSON.stringify(matrix.at(-1)));assert.equal(result.iso,false,"ISO visível: "+view);
   if(!process.env.AGENDA_SKIP_CAPTURES&&[100,175].includes(zoom)&&['dashboard','solicitacoes'].includes(view)){const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('test-results/consolidation-'+view+'-'+zoom+'-'+theme+'.png',Buffer.from(shot.data,'base64'))}
  }
 }

 fs.writeFileSync('test-results/consolidation-matrix.json',JSON.stringify(matrix,null,2));
 await setBrowserZoom(1);
 for(const width of [375,768,1366]) {await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===375});for(const theme of ['light','dark'])for(const view of ['dashboard','solicitacoes','clientes','agenda','orcamentos','controle-vendas','historico','ferramentas']){await evaluate('applyTheme('+JSON.stringify(theme)+',false);showView('+JSON.stringify(view)+')');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),true,view+' '+width+' '+theme);}}
 await evaluate("window.confirm=()=>false;window.__writesBeforeErase=__supabaseTest.writes;resetarTodosDados()");
 assert.equal(await evaluate('__supabaseTest.writes'),await evaluate('__writesBeforeErase'),'Cancelar exclusão não grava');
 await evaluate("window.__eraseMarker=true;window.confirm=()=>true;resetarTodosDados();void 0");
 for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,100));try{if(await evaluate("!window.__eraseMarker && typeof appLoaded!=='undefined' && appLoaded"))break}catch{}}
 assert.equal(await evaluate("AgendaApplication.state.getSnapshot().clientes.length+controleVendas.length+cotacoesCompras.length+produtosSolicitacoes.length+contatos.length+agendamentos.length+orcamentos.length+solicitacoesOrcamento.length+concluidos.length+historicoClientes.length"),0,'Exclusão confirmada sem coleções órfãs');
 assert.equal(await evaluate("localStorage.getItem('outra-aplicacao')"),'preservar');
 assert.equal(await evaluate("localStorage.getItem('agenda-tool-notes-v1')"),'[]');
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
 console.log('Consolidação: telefone/email/canal, texto, datas, resumo e cancelamento de restauração, 112 combinações de zoom real (80/90/100/110/125/150/175%) + 48 de viewport/tema, sem ISO visível, overflow ou exceções.');
} finally {if(zoomControl){await setBrowserZoom(1);zoomControl.close();await fetch('http://127.0.0.1:9222/json/close/'+zoomPage.id)}ws.close();}
