import assert from 'node:assert/strict';
const baseUrl=process.env.AGENDA_TEST_BASE_URL||'http://127.0.0.1:3000';
const endpoint=await (await fetch('http://127.0.0.1:9222/json/version')).json();
const ws=new WebSocket(endpoint.webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let sequence=0;
const pending=new Map(),errors=[];
ws.addEventListener('message',({data})=>{
  const message=JSON.parse(data);
  if(message.id){const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(message.error):task.resolve(message.result);}
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);
  if(message.method==='Fetch.requestPaused')void paused(message).catch(error=>errors.push(error.message));
});
function call(method,params={},sessionId){return new Promise((resolve,reject)=>{
  const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...sessionId?{sessionId}:{}}));
});}
const mock=`const testUser={id:'11111111-1111-4111-8111-111111111111'};
window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:{user:testUser}},error:null}),
 getUser:async()=>({data:{user:testUser},error:null}),onAuthStateChange(callback){queueMicrotask(()=>callback('INITIAL_SESSION',{user:testUser}));return {data:{subscription:{unsubscribe(){}}}}}},
 rpc:async(name,args)=>await (await fetch('http://127.0.0.1:3310/rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args||{})})).json(),
 from(){throw new Error('Fallback upsert proibido no teste RPC')},channel(){return {on(){return this},subscribe(){return this}}}}}};`;
async function paused(message){
  const {requestId,request}=message.params;
  let body;
  if(request.url.includes('supabase-js'))body=mock;
  else if(request.url.includes('/application/persistence-config.js'))body="export const PERSISTENCE_MODE='rpc';";
  if(body!==undefined)return call('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/javascript'}],body:Buffer.from(body).toString('base64')},message.sessionId);
  if(request.url.includes('.supabase.co'))return call('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'},message.sessionId);
  return call('Fetch.continueRequest',{requestId},message.sessionId);
}
async function evaluate(sessionId,expression){
  const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result.value;
}
const contexts=[];
async function browser(){
  const {browserContextId}=await call('Target.createBrowserContext');contexts.push(browserContextId);
  const {targetId}=await call('Target.createTarget',{url:'about:blank',browserContextId});
  const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
  await call('Runtime.enable',{},sessionId);
  await call('Fetch.enable',{patterns:[{urlPattern:'*supabase*'},{urlPattern:'*persistence-config.js*'}]},sessionId);
  await call('Page.navigate',{url:`${baseUrl}/original-index.html`},sessionId);
  for(let i=0;i<100;i++){
    if(await evaluate(sessionId,"Boolean(window.AgendaApplication && appLoaded && window.AgendaApplication.repositories.snapshot.getStatus().status==='READY')"))return sessionId;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('Inicialização RPC não concluída');
}
try{
  const a=await browser(),b=await browser();
  assert.equal(await evaluate(a,'AgendaApplication.repositories.snapshot.getStatus().concurrency.revision'),'10');
  assert.equal(await evaluate(b,'AgendaApplication.repositories.snapshot.getStatus().concurrency.revision'),'10');
  await evaluate(b,"controleVendas[0].valor=1200; persistirDadosSupabase()");
  assert.equal(await evaluate(b,'AgendaApplication.repositories.snapshot.getStatus().concurrency.revision'),'11');
  const failed=await evaluate(a,"abrirModalCotacaoCompras(); document.getElementById('cotacao-compras-descricao').value='Intenção A'; salvarCotacaoCompras()");
  assert.equal(failed.reason,'CONFLICT');assert.equal(failed.expectedRevision,'10');assert.equal(failed.actualRevision,'11');
  assert.equal(await evaluate(a,"document.getElementById('cotacao-compras-descricao').value"),'Intenção A');
  assert.equal(await evaluate(a,"document.getElementById('modalCotacaoCompras').classList.contains('open')"),true);
  assert.equal(await evaluate(a,'getCotacoesCompras().length'),0);
  assert.equal(await evaluate(a,"Boolean(document.querySelector('[data-compra-recovery]'))"),true);
  const stats=await (await fetch('http://127.0.0.1:3310/stats')).json();
  assert.equal(stats.snapshot.revision,'11');
  assert.equal(stats.snapshot.rows.find(x=>x.key==='secta_controle_vendas').value[0].valor,1200);
  await evaluate(a,"window.confirm=()=>true; document.querySelector('[data-compra-recovery]').click(); void 0;");
  for(let i=0;i<100;i++){
    if(await evaluate(a,"!document.querySelector('[data-compra-recovery]')"))break;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  assert.equal(await evaluate(a,"document.getElementById('cotacao-compras-descricao').value"),'Intenção A');
  const saved=await evaluate(a,'salvarCotacaoCompras()');
  assert.equal(saved.ok,true);assert.equal(saved.revision,'12');
  assert.equal(await evaluate(a,'controleVendas[0].valor'),1200);
  await evaluate(b,'AgendaApplication.repositories.snapshot.load()');
  const changed=await evaluate(a,"alterarStatusCotacaoCompras(getCotacoesCompras()[0].id,'sem_retorno')");
  assert.equal(changed.revision,'13');
  const cardConflict=await evaluate(b,'concluirCotacaoCompras(getCotacoesCompras()[0].id)');
  assert.equal(cardConflict.reason,'CONFLICT');
  assert.equal(await evaluate(b,"Boolean(document.querySelector('[data-compra-recovery]') && !document.querySelector('[data-compra-recovery]').closest('#modalCotacaoCompras'))"),true);
  await evaluate(b,"window.confirm=()=>true; document.querySelector('[data-compra-recovery]').click(); void 0;");
  for(let i=0;i<100;i++){
    if(await evaluate(b,"!document.querySelector('[data-compra-recovery]')"))break;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  assert.equal(await evaluate(b,'getCotacoesCompras()[0].status'),'sem_retorno');
  const concluded=await evaluate(b,'concluirCotacaoCompras(getCotacoesCompras()[0].id)');
  assert.equal(concluded.revision,'14');
  assert.deepEqual(errors,[]);
  console.log('Duas instâncias Chrome isoladas + PostgreSQL local: V10/V11, conflito, formulário preservado, recuperação V12, conflito de card e reaplicação V14 sem perder venda OK. Auth/CDN simulados; Supabase remoto NÃO testado.');
}finally{
  for(const browserContextId of contexts)await call('Target.disposeBrowserContext',{browserContextId});ws.close();
}
