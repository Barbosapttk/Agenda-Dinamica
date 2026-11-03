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
 auth:{async getSession(){window.__supabaseTest.sessions++;return {data:{session:null},error:null}},onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
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
}let zoomControl;
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

const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,50));}throw Error('Não confirmou: '+expression)};
const openCarriers=()=>evaluate("document.querySelector('.tools-central-link').click();document.getElementById('open-fretes').click();document.getElementById('fretes-tab-transportadoras').click()");
const fill=async data=>evaluate('Object.entries('+JSON.stringify(data)+').forEach(([key,value])=>{document.getElementById("carrier-"+key).value=value})');
try {
 await call('Page.enable');await load();await call('Emulation.setFocusEmulationEnabled',{enabled:true});
 await evaluate("sessionStorage.removeItem('test-rows');AgendaApplication.repositories.snapshot.load().then(()=>renderizarDadosSincronizados())");
 await evaluate("window.confirm=()=>true;window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove();clearInterval(sincronizacaoInterval)");
 assert.equal(await evaluate("document.querySelectorAll('#view-fretes,[data-view=fretes]').length"),0);
 assert.equal(await evaluate("document.querySelectorAll('#quick-tools > #fretes').length"),1);
 assert.equal(await evaluate("document.querySelectorAll('#freight-form').length"),1);
 assert.equal(await evaluate("document.querySelectorAll('#quick-tools > button').length"),7);
 assert.equal(await evaluate("document.querySelector('#open-freight-quote')"),null);
 assert.equal(await evaluate("document.querySelector('#close-freight-quote')"),null);
 assert.equal(await evaluate("document.querySelector('#fretes #freight-quote')!==null"),true);
 assert.equal(await evaluate("document.querySelector('#quick-tools > #freight-quote')"),null);
 assert.deepEqual(await evaluate("[...document.querySelectorAll('#quick-tools > button strong')].map(el=>el.textContent)"),['Calculadora de Valor de Venda','Calculadora de Valor de Serviço','Fretes','Textos Rápidos','Tabela de Tamanhos','Anotações Rápidas','Tabelas de Referência']);
 assert.equal(await evaluate("[...document.querySelectorAll('#tools-dropdown button')].some(b=>b.textContent.includes('Cotação de Frete'))"),false);
 await evaluate("document.querySelector('.tools-central-link').click();document.getElementById('open-fretes').click()");
 assert.equal(await evaluate("document.querySelector('#view-ferramentas').classList.contains('active') && !document.getElementById('fretes').hidden"),true);
 assert.equal(await evaluate("document.querySelector('#fretes > .tool-page-header h2').textContent"),'Fretes');
 assert.equal(await evaluate("document.getElementById('freight-form').getClientRects().length>0"),true);
 await evaluate("document.getElementById('fretes-tab-cotacao').focus()");
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
 assert.equal(await evaluate('document.activeElement.id'),'fretes-tab-transportadoras');
 assert.equal(await evaluate("document.getElementById('fretes-tab-transportadoras').getAttribute('aria-selected')"),'true');
 await evaluate("document.getElementById('fretes-tab-cotacao').click();const values={company:'Destinatário WEG',cnpj:'60.570.108/0001-41',cep:'05157-030',address:'Rua Exemplo, 10',district:'Centro',city:'São Paulo - SP',goods:'Peças',invoice:'1500',weight:'25',dimensions:'2 volumes; C 50 x L 40 x A 37 cm'};Object.entries(values).forEach(([key,value])=>{const input=document.getElementById('freight-'+key);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))})");
 assert.equal(await evaluate("document.getElementById('freight-form').checkValidity()"),true);
 assert.match(await evaluate("document.getElementById('freight-preview').value"),/Peso Total: 25 KG/);
 await call('Browser.grantPermissions',{origin:baseUrl,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
 await call('Runtime.evaluate',{expression:"document.getElementById('freight-copy').click()",userGesture:true});await new Promise(r=>setTimeout(r,100));
 assert.equal((await evaluate('navigator.clipboard.readText()')).replaceAll('\r\n','\n'),await evaluate("document.getElementById('freight-preview').value"));
 for(const id of ['freight-cnpj','freight-cep','freight-dimensions']){
  await evaluate('document.getElementById('+JSON.stringify(id)+').focus()');
  assert.equal(await evaluate('(()=>{const e=document.getElementById('+JSON.stringify(id)+');return e.selectionStart===0&&e.selectionEnd===e.value.length})()'),true,id+' seleciona conteúdo técnico');
 }
 for(const [id,text] of [['freight-cnpj','21.707.512/0001-62'],['freight-cep','06529-350'],['freight-dimensions','3 volumes; C 50 x L 40 x A 37 cm']]) {
  await evaluate('document.activeElement.blur();document.getElementById('+JSON.stringify(id)+').scrollIntoView({block:"center"})');
  const point=await evaluate('(()=>{const r=document.getElementById('+JSON.stringify(id)+').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()');
  await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
  assert.equal(await evaluate('(()=>{const e=document.getElementById('+JSON.stringify(id)+');return e.selectionStart===0&&e.selectionEnd===e.value.length})()'),true,id+' primeiro clique seleciona');
  await call('Input.insertText',{text});assert.equal(await evaluate('document.getElementById('+JSON.stringify(id)+').value'),text);
 }
 await evaluate("showView('clientes');document.querySelector('.tools-central-link').click();document.getElementById('open-fretes').click()");assert.equal(await evaluate("document.getElementById('freight-weight').value"),'25');
 await evaluate("document.getElementById('close-fretes').click()");
 assert.equal(await evaluate("document.querySelector('#view-ferramentas').classList.contains('active') && !document.querySelector('.tools-hub-header').hidden"),true,'Retorno permanece na Central');
 assert.equal(await evaluate('document.activeElement.id'),'open-fretes');
 await evaluate("showView('dashboard');document.getElementById('tools-menu-toggle').click();document.querySelectorAll('#tools-dropdown button')[2].click()");
 assert.equal(await evaluate("document.querySelector('#view-ferramentas').classList.contains('active') && !document.getElementById('fretes').hidden"),true,'Dropdown abre a ferramenta Fretes');
 assert.equal(await evaluate("document.getElementById('freight-weight').value"),'25','Retorno e dropdown preservam a cotação');
 await openCarriers();await evaluate("document.getElementById('carrier-new').click()");
 const data={nome:'Transportadora Exemplo',telefone:'(18) 99999-9999',atendente:'João',email:'atendimento@exemplo.com',cidades:'  Presidente Prudente, Dracena e região.\nOeste Paulista.  ',observacoes:'Coleta somente à tarde.\nConferir disponibilidade.'};
 await fill(data);await evaluate("document.getElementById('carrier-save').click();document.getElementById('carrier-save').click()");
 await waitFor("document.getElementById('carrier-form').hidden");
 assert.equal(await evaluate('transportadoras.length'),1);
 const id=await evaluate('transportadoras[0].id');assert.ok(id);
 assert.equal(await evaluate('transportadoras[0].cidades'),data.cidades);
 assert.equal(await evaluate('transportadoras[0].observacoes'),data.observacoes);
 assert.deepEqual(await evaluate('__supabaseTest.batches.at(-1).map(row=>row.key)'),['secta_transportadoras']);
 await load();await openCarriers();assert.equal(await evaluate('transportadoras[0].id'),id);
 assert.equal(await evaluate('transportadoras[0].observacoes'),data.observacoes);
 await evaluate("document.querySelector('.carrier-card button').click()");await fill({...data,atendente:'Maria',nome:'Transportadora Ágil'});
 await evaluate("document.getElementById('carrier-save').click()");await waitFor("document.getElementById('carrier-form').hidden");
 assert.equal(await evaluate('transportadoras[0].id'),id);assert.equal(await evaluate('transportadoras.length'),1);
 for(const query of ['AGIL','maria','prudente','Oeste Paulista']){await evaluate('document.getElementById("carrier-search").value='+JSON.stringify(query)+';document.getElementById("carrier-search").dispatchEvent(new Event("input"))');assert.equal(await evaluate("document.querySelectorAll('.carrier-card').length"),1)}
 await evaluate("document.getElementById('carrier-search').value='inexistente';document.getElementById('carrier-search').dispatchEvent(new Event('input'))");assert.equal(await evaluate("document.querySelectorAll('.carrier-card').length"),0);
 await evaluate("document.getElementById('carrier-search').value='';document.getElementById('carrier-search').dispatchEvent(new Event('input'));document.getElementById('carrier-new').click()");
 await fill({...data,nome:'Transportadora Ágil'});await evaluate("window.confirm=()=>false;document.getElementById('carrier-save').click()");
 assert.equal(await evaluate('transportadoras.length'),1);
 await evaluate("window.confirm=()=>true;document.getElementById('carrier-save').click()");await waitFor("document.getElementById('carrier-form').hidden");
 assert.equal(await evaluate('transportadoras.length'),2);assert.equal(await evaluate('transportadoras[0].id!==transportadoras[1].id'),true);
 await evaluate("window.confirm=()=>false;document.querySelector('.carrier-card .btn-danger').click()");assert.equal(await evaluate('transportadoras.length'),2);
 await evaluate("window.confirm=()=>true;document.querySelector('.carrier-card .btn-danger').click()");await waitFor('transportadoras.length===1');
 assert.notEqual(await evaluate('transportadoras[0].id'),id);
 await load();await openCarriers();assert.equal(await evaluate('transportadoras.length'),1);assert.notEqual(await evaluate('transportadoras[0].id'),id);
 expectedConsoleError=true;
 await evaluate("__supabaseTest.failSave=true;document.querySelector('.carrier-card button').click();document.getElementById('carrier-nome').value='Alteração não confirmada';document.getElementById('carrier-save').click()");
 await waitFor("!document.getElementById('carrier-save').disabled");
 assert.equal(await evaluate('transportadoras[0].nome'),'Transportadora Ágil');
 assert.equal(await evaluate("document.getElementById('carrier-form').hidden"),false);
 assert.equal(await evaluate("document.getElementById('carrier-nome').value"),'Alteração não confirmada');
 expectedConsoleError=false;await evaluate("__supabaseTest.failSave=false;document.getElementById('carrier-cancel').click()");
 assert.equal(await evaluate('backupPayload().data.transportadoras.length'),1);
 // URLs oficiais: clique real abre outro target, mantendo a Agenda.
 await evaluate("document.getElementById('fretes-tab-correios').click()");
 const popups=[];ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.method==='Page.windowOpen')popups.push(m.params.url)});
 for(const [button,url] of [['correios-calcular','https://www2.correios.com.br/sistemas/precosPrazos/'],['correios-rastrear','https://rastreamento.correios.com.br/app/index.php']]){
  assert.deepEqual(await evaluate('(()=>{const a=document.getElementById('+JSON.stringify(button)+');return {url:a.href,target:a.target,rel:a.rel}})()'),{url,target:'_blank',rel:'noopener noreferrer'});
  const before=(await(await fetch('http://127.0.0.1:9222/json')).json()).map(p=>p.id);
  await call('Runtime.evaluate',{expression:'document.getElementById('+JSON.stringify(button)+').click()',userGesture:true});
  await new Promise(r=>setTimeout(r,250));
  const created=(await(await fetch('http://127.0.0.1:9222/json')).json()).filter(p=>p.type==='page'&&!before.includes(p.id));assert.equal(created.length,1);
  for(const page of created)await fetch('http://127.0.0.1:9222/json/close/'+page.id);
  assert.equal(await evaluate('location.href'),baseUrl+'/original-index.html');
 }
 assert.deepEqual(popups,['https://www2.correios.com.br/sistemas/precosPrazos/','https://rastreamento.correios.com.br/app/index.php']);
 await call('Page.bringToFront');
 await evaluate("window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove();clearInterval(sincronizacaoInterval);document.getElementById('carrier-new').click()");
 await fill({nome:'Transportadora com nome muito longo para verificar quebra e alinhamento de ações',telefone:'(18) 99999-9999',atendente:'Atendente de teste',email:'teste@example.com',cidades:'Presidente Prudente, Dracena, Presidente Venceslau, Oeste Paulista e Mato Grosso do Sul.'});
 const audit=async(label)=>{
  const result=await evaluate("(()=>{const root=document.querySelector('#fretes'),r=root.getBoundingClientRect();return {page:document.documentElement.scrollWidth<=innerWidth+2,mainTop:document.querySelector('.main').getBoundingClientRect().top,height:innerHeight,controls:[...root.querySelectorAll('input,textarea,button,a')].filter(e=>{if(!e.getClientRects().length)return false;const x=e.getBoundingClientRect();return x.left<0||x.right>innerWidth+1||(!e.matches('input,textarea')&&e.scrollWidth>e.clientWidth+2)}).map(e=>e.id)}})()");
  assert.equal(result.page,true,label+' página');assert.ok(result.mainTop<result.height-100,label+' conteúdo acessível');assert.deepEqual(result.controls,[],label+' controles');return result;
 };
 const matrix=[];
 await call('Emulation.clearDeviceMetricsOverride');const {windowId}=await call('Browser.getWindowForTarget',{targetId:target.id});await call('Browser.setWindowBounds',{windowId,bounds:{width:1440,height:1000}});
 for(const zoom of [80,90,100,110,125,150,175]){
  await setBrowserZoom(zoom/100);await call('Page.bringToFront');assert.ok(Math.abs(await evaluate('devicePixelRatio')-zoom/100)<.02);
  for(const theme of ['light','dark'])for(const section of ['cotacao','transportadoras','correios']){
   await evaluate('applyTheme('+JSON.stringify(theme)+',false);document.querySelector(".tools-central-link").click();document.getElementById("open-fretes").click();document.getElementById("fretes-tab-'+section+'").click();window.scrollTo(0,0)');
   matrix.push({zoom,theme,section,...await audit(zoom+' '+theme+' '+section)});
   if(!process.env.AGENDA_SKIP_CAPTURES&&[100,175].includes(zoom)){const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync('test-results/b1-'+section+'-'+zoom+'-'+theme+'.png',Buffer.from(shot.data,'base64'))}
  }
 }
 await setBrowserZoom(1);
 for(const width of [375,768,1366,1440]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===375});
  for(const theme of ['light','dark'])for(const section of ['cotacao','transportadoras','correios']){
   await evaluate('applyTheme('+JSON.stringify(theme)+',false);document.getElementById("fretes-tab-'+section+'").click();window.scrollTo(0,0)');
   matrix.push({width,theme,section,...await audit(width+' '+theme+' '+section)});
  }
 }
 fs.writeFileSync('test-results/b1-matrix.json',JSON.stringify(matrix,null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
 console.log('B1 revisado: Central → Fretes, card/dropdown/retorno com foco, sem aba principal ou cotação separada. Cotação/KG/clipboard preservados, CRUD/observações/IDs/reload, duplicidade, pesquisa, falha sem perda, backup e Correios em novas guias. 42 combinações de zoom real + 24 viewport/tema. Console sem erros inesperados.');
} finally {if(zoomControl){await setBrowserZoom(1);zoomControl.close();await fetch('http://127.0.0.1:9222/json/close/'+zoomPage.id)}ws.close();}
