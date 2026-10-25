import test from 'node:test';
import assert from 'node:assert/strict';
import { createAtomicSnapshotPort } from '../public/application/repositories/atomic-snapshot-port.js';
import { createSnapshotRepository } from '../public/application/repositories/snapshot-repository.js';
import { createAppState, STATE_NAMES } from '../public/application/state/app-state.js';
import { createComprasService } from '../public/application/services/compras-service.js';
import { createEventBus } from '../public/application/events/event-bus.js';
import { EVENT_TYPES } from '../public/application/events/event-types.js';
import { createAuthRepository } from '../public/application/repositories/auth-repository.js';

const actor = '11111111-1111-4111-8111-111111111111';
import { databaseFixture } from './helpers/atomic-db-fixture.mjs';

const change = (key, value) => ({ key, value });

test('PostgreSQL: infraestrutura preserva dados e legado; bridge invalida revisão anterior', async () => {
  const f = await databaseFixture();
  try {
    const initial = await f.load();
    assert.equal(initial.revision,'0'); assert.equal(initial.protected,false);
    assert.equal(initial.rows.find(x=>x.key==='secta_controle_vendas').value[0].valor,1000);
    await f.asUser(tx=>tx.exec(`UPDATE public.agenda_dinamica_storage SET value='[{"valor":1200}]' WHERE key='secta_controle_vendas'`));
    assert.equal((await f.load()).revision,'1');
    const denied = await f.commit('0',[change('secta_contatos',[])],'stale');
    assert.equal(denied.status,'CONFLICT'); assert.equal(denied.actualRevision,'1');
  } finally { await f.db.close(); }
});
test('PostgreSQL: A/B V10 → V11; snapshot antigo não sobrescreve B', async () => {
  const f = await databaseFixture();
  try {
    await f.db.exec('UPDATE public.agenda_dinamica_metadata SET revision=10 WHERE id=1');
    await f.activate();
    const a=await f.load(), b=await f.load();
    const result=await f.commit(b.revision,[change('secta_controle_vendas',[{valor:1200}])],'B');
    assert.equal(result.revision,'11'); assert.equal(result.protected,true);
    const conflict=await f.commit(a.revision,[change('secta_contatos',[{descricao:'A'}]),
      change('secta_controle_vendas',[{valor:1000}])],'A');
    assert.equal(conflict.status,'CONFLICT'); assert.equal(conflict.actualRevision,'11');
    assert.equal((await f.load()).rows.find(x=>x.key==='secta_controle_vendas').value[0].valor,1200);
    assert.equal((await f.db.query('SELECT count(*)::int AS total FROM public.agenda_dinamica_command_receipts')).rows[0].total,1);
  } finally { await f.db.close(); }
});
test('PostgreSQL: multi-key atômico, recibo durável e replay antes de CAS', async () => {
  const f = await databaseFixture();
  try {
    const changes=[change('secta_clientes',[{nome:'Novo'}]),change('secta_contatos',[{descricao:'Novo'}]),
      change('secta_hist_clientes',[{id:1}]),change('secta_controle_vendas',[{valor:1200}])];
    const first=await f.commit('0',changes,'multi',undefined,{eventId:'evt-1',instanceId:'inst-1'});
    assert.equal(first.revision,'1'); assert.equal(first.rows.length,4);
    await f.commit('1',[change('secta_theme','light')],'other');
    const repeat=await f.commit('0',[...changes].reverse(),'multi');
    assert.equal(repeat.replayed,true); assert.equal(repeat.revision,'1'); assert.equal(repeat.eventId,'evt-1');
    assert.equal((await f.load()).revision,'2');
    await assert.rejects(f.commit('0',[change('secta_clientes',[])],'multi'));
    await assert.rejects(f.commit('0',changes,'multi',{uid:'22222222-2222-4222-8222-222222222222'}));
  } finally { await f.db.close(); }
});
test('PostgreSQL: erro numa row desfaz valores, revisão, token e recibo', async () => {
  const f = await databaseFixture();
  try {
    await f.db.exec(`CREATE FUNCTION public.fixture_fail() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN IF NEW.key='secta_contatos' THEN RAISE EXCEPTION 'falha intencional'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER fixture_fail BEFORE INSERT OR UPDATE ON public.agenda_dinamica_storage
        FOR EACH ROW EXECUTE FUNCTION public.fixture_fail();`);
    const before=await f.load();
    await assert.rejects(f.commit('0',[change('secta_clientes',[{nome:'Nunca'}]),change('secta_contatos',[])],'fail'));
    assert.deepEqual(await f.load(),before);
    assert.equal((await f.db.query('SELECT rpc_transaction FROM public.agenda_dinamica_metadata')).rows[0].rpc_transaction,null);
    assert.equal((await f.db.query('SELECT count(*)::int AS total FROM public.agenda_dinamica_command_receipts')).rows[0].total,0);
  } finally { await f.db.close(); }
});
test('PostgreSQL: anon, identidade nula, actor forjado, keys/tipos/duplicatas inválidos rejeitados', async () => {
  const f = await databaseFixture();
  try {
    await assert.rejects(f.load({role:'anon',uid:null}));
    await assert.rejects(f.commit('0',[change('secta_contatos',[])],'anon',{role:'anon',uid:null}));
    await assert.rejects(f.asUser(tx=>tx.exec(`UPDATE public.agenda_dinamica_storage SET value='[]' WHERE key='secta_clientes'`),{role:'anon',uid:null}));
    await assert.rejects(f.commit('0',[change('secta_contatos',[])],'null',{uid:null}));
    await assert.rejects(f.commit('0',[change('secta_contatos',[])],'fake',undefined,{actorId:actor}));
    for(const values of [[change('inventada',[])],[change('secta_clientes',{})],
      [change('secta_theme',[])],[change('secta_contatos',[]),change('secta_contatos',[])],[],[null]]) {
      await assert.rejects(f.commit('0',values,'invalid'));
    }
    assert.equal((await f.load()).revision,'0');
  } finally { await f.db.close(); }
});
test('PostgreSQL: cutover bloqueia upsert direto/metadata/helper, preserva RPC authenticated', async () => {
  const f = await databaseFixture();
  try {
    await f.activate();
    await assert.rejects(f.asUser(tx=>tx.exec(`INSERT INTO public.agenda_dinamica_storage VALUES('secta_contatos','[]',now())`)));
    await assert.rejects(f.asUser(tx=>tx.exec(`UPDATE public.agenda_dinamica_metadata SET rpc_transaction=txid_current()`)));
    await assert.rejects(f.asUser(tx=>tx.exec(`SELECT agenda_dinamica_internal.guard_snapshot_write()`)));
    // Mesmo regrant acidental não contorna o guard baseado em transação privada.
    await f.db.exec('GRANT INSERT,UPDATE ON public.agenda_dinamica_storage TO authenticated');
    await assert.rejects(f.asUser(tx=>tx.exec(`UPDATE public.agenda_dinamica_storage SET value='[]' WHERE key='secta_clientes'`)));
    const result=await f.commit('0',[change('secta_contatos',[])],'allowed');
    assert.equal(result.status,'SUCCESS'); assert.equal(result.revision,'1');
  } finally { await f.db.close(); }
});
test('PostgreSQL: BIGINT transmitido como string e ator recebido do auth.uid()', async () => {
  const f = await databaseFixture();
  try {
    await f.db.exec(`UPDATE public.agenda_dinamica_metadata SET revision=9007199254740993 WHERE id=1`);
    const result=await f.commit('9007199254740993',[change('secta_contatos',[])],'big');
    assert.equal(result.revision,'9007199254740994'); assert.equal(result.actorId,actor);
    assert.equal((await f.db.query('SELECT actor_id::text FROM public.agenda_dinamica_command_receipts')).rows[0].actor_id,actor);
  } finally { await f.db.close(); }
});

async function applicationFixture(database, { dropFirstResponse = false } = {}) {
  let data = Object.fromEntries(STATE_NAMES.map(name=>[name,name==='appTheme'?'dark':[]]));
  let calls=0, verified=true;
  const state=createAppState({readState:()=>data,writeState:patch=>{data={...data,...patch};}});
  const client={rpc:async(name,args)=>{
    if(name==='agenda_snapshot_load') return {data:await database.load(),error:null};
    calls++;
    try {
      const result=await database.commit(args.p_expected_revision,args.p_changes,args.p_context.commandId,undefined,
        Object.fromEntries(Object.entries(args.p_context).filter(([key])=>key!=='commandId')));
      if(dropFirstResponse){dropFirstResponse=false;throw new Error('Timeout depois do commit');}
      return {data:result,error:null};
    } catch(error){if(error.message==='Timeout depois do commit')throw error;return {data:null,error:{code:error.code,message:'Erro de banco'}};}
  }};
  const port=createAtomicSnapshotPort({getClient:()=>client,
    getExecutionIdentity:async()=>({ok:true,authenticated:verified,actorId:verified?actor:null})});
  const context=commandId=>({actorId:actor,commandId,instanceId:'inst-1',sessionId:'run-1',correlationId:commandId,causationId:null,origin:'test'});
  const repository=createSnapshotRepository({state,atomicPersistence:port,migratedCollections:['cotacoesCompras'],
    loadSnapshot:()=>{throw new Error('Leitor legado não deve ser chamado em RPC');},
    writeSnapshot:()=>{throw new Error('Fallback legado proibido');},
    executionContext:{capture:async opts=>context(opts.commandId || crypto.randomUUID()),recordOutcome(){}}});
  const bus=createEventBus(), events=[];
  bus.subscribe(EVENT_TYPES.SOLICITACAO_COMPRA_CRIADA,e=>events.push(e));
  const service=createComprasService({repository,eventBus:bus,getExecutionContext:async opts=>context(opts.commandId),createId:()=>100});
  assert.equal((await repository.load()).ok,true);
  return {state,repository,service,events,calls:()=>calls,expire:()=>{verified=false;}};
}
test('Repository + PostgreSQL: Compras confirma antes do bus; legado multi-key usa RPC e não duplica Compras', async () => {
  const db=await databaseFixture();
  try{
    await db.activate();
    const f=await applicationFixture(db);
    const result=await f.service.criar({descricao:'Motor'},{commandId:'compra'});
    assert.equal(result.ok,true);assert.equal(result.revision,'1');assert.equal(result.confirmation,'RPC_ACKNOWLEDGED');
    assert.equal(f.events.length,1);assert.equal(f.state.getCollection('cotacoesCompras').length,1);
    assert.equal(f.repository.getStatus().concurrency.protected,true);
    f.state.setState({contatos:[{descricao:'Contato novo'}]});
    assert.equal((await f.repository.saveLegacy()).ok,true);
    assert.equal(f.calls(),2);assert.equal((await db.load()).revision,'2');
    assert.equal((await db.load()).rows.find(x=>x.key==='secta_cotacoes_compras').value.length,1);
    assert.equal(f.events.length,1);
  }finally{await db.db.close();}
});
test('Repository + PostgreSQL: dois estados isolados, conflito mantém intenção, sem evento ou sucesso falso', async () => {
  const db=await databaseFixture();
  try{
    const a=await applicationFixture(db), b=await applicationFixture(db);
    assert.equal((await b.service.criar({descricao:'B'},{commandId:'B-browser'})).ok,true);
    const denied=await a.service.criar({descricao:'A'},{commandId:'A-browser'});
    assert.equal(denied.reason,'CONFLICT');assert.equal(denied.expectedRevision,'0');assert.equal(denied.actualRevision,'1');
    assert.equal(a.events.length,0);assert.equal(a.state.getCollection('cotacoesCompras').length,0);
    assert.equal(a.repository.getConfirmedSnapshot().cotacoesCompras.length,0);
    assert.equal(a.repository.getPendingWrites()[0].candidate.cotacoesCompras[0].descricao,'A');
    assert.equal((await a.repository.load()).recoveryRequired,true);
    assert.equal(a.repository.discardPendingWrite('A-browser'),false);
    assert.equal((await a.repository.reloadForRecovery()).ok,true);
    assert.equal(a.repository.discardPendingWrite('A-browser'),true);
    assert.equal((await a.service.criar({descricao:'A'},{commandId:'A-reapplied'})).ok,true);
    assert.deepEqual((await db.load()).rows.find(x=>x.key==='secta_cotacoes_compras').value.map(x=>x.descricao),['B','A']);
  }finally{await db.db.close();}
});
test('Repository + PostgreSQL: timeout após commit repete request/eventId sem duplicar recibo, estado ou bus', async () => {
  const db=await databaseFixture();
  try{
    const f=await applicationFixture(db,{dropFirstResponse:true});
    const input={descricao:'Retry'};
    const failed=await f.service.criar(input,{commandId:'retry-server'});
    assert.equal(failed.uncertain,true);assert.equal(f.events.length,0);
    assert.equal(f.state.getCollection('cotacoesCompras').length,0);
    const result=await f.service.criar(input,{commandId:'retry-server'});
    assert.equal(result.ok,true);assert.equal(result.replayed,true);assert.equal(f.events.length,1);
    assert.equal((await db.load()).revision,'1');assert.equal(f.repository.getPendingWrites().length,0);
    assert.equal(result.event.eventId,(await db.db.query('SELECT event_id FROM public.agenda_dinamica_command_receipts')).rows[0].event_id);
  }finally{await db.db.close();}
});
test('Repository + PostgreSQL: falha de identidade não aciona escritor legado e não confirma estado', async () => {
  const db=await databaseFixture();
  try{
    const f=await applicationFixture(db);f.expire();
    const denied=await f.service.criar({descricao:'Negado'},{commandId:'expired'});
    assert.equal(denied.ok,false);assert.equal(f.calls(),0);assert.equal(f.events.length,0);
    assert.equal((await db.load()).revision,'0');
  }finally{await db.db.close();}
});

test('Repository + PostgreSQL: snapshot capturado antes de outro commit não recebe revisão nova da fila', async () => {
  const db=await databaseFixture();
  try{
    const f=await applicationFixture(db);
    const old=f.state.getSnapshot();
    // A preparação de Compras entra antes; save já captura o snapshot/base antigo.
    const purchase=f.repository.commitCollection('cotacoesCompras',()=>({changed:true,next:[{id:9}],value:{item:{id:9}}}),
      {context:{actorId:actor,commandId:'first'}});
    const queued=f.repository.save(old,{context:{actorId:actor,commandId:'old-queued'}});
    assert.equal((await purchase).ok,true);
    const conflict=await queued;
    assert.equal(conflict.reason,'CONFLICT');assert.equal(conflict.expectedRevision,'0');
    assert.equal((await db.load()).rows.find(x=>x.key==='secta_cotacoes_compras').value[0].id,9);
  }finally{await db.db.close();}
});
test('Repository + PostgreSQL: replay antigo não promove snapshot antigo à revisão atual do banco', async () => {
  const db=await databaseFixture();
  try{
    const a=await applicationFixture(db,{dropFirstResponse:true});
    await a.service.criar({descricao:'A'},{commandId:'receipt-old'});
    const b=await applicationFixture(db);
    b.state.setState({controleVendas:[{valor:1200}]});assert.equal((await b.repository.saveLegacy()).ok,true);
    assert.equal((await a.service.criar({descricao:'A'},{commandId:'receipt-old'})).ok,true);
    assert.equal(a.repository.getStatus().concurrency.revision,'1');
    a.state.setState({contatos:[{descricao:'Contato A'}]});
    assert.equal((await a.repository.saveLegacy()).reason,'CONFLICT');
    assert.equal((await db.load()).rows.find(x=>x.key==='secta_controle_vendas').value[0].valor,1200);
  }finally{await db.db.close();}
});
test('Auth diagnóstico classifica sessão verificada sem expor token e não inventa usuário', async () => {
  let session=null,valid=true;
  const token=`${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({role:'authenticated'})).toString('base64url')}.fixture`;
  const auth=createAuthRepository({getCurrentUser:()=>null,getClient:()=>({auth:{
    getSession:async()=>({data:{session},error:null}),
    getUser:async()=>valid?{data:{user:{id:actor}},error:null}:{data:null,error:{message:'Expired'}}}})});
  assert.deepEqual(await auth.inspectAccess(),{ok:true,role:'anon',actorId:null,authenticated:false,hasSession:false});
  session={user:{id:actor},access_token:token};
  const result=await auth.inspectAccess();
  assert.equal(result.role,'authenticated');assert.equal(result.actorId,actor);
  assert.equal(JSON.stringify(result).includes(token),false);
  valid=false;assert.equal((await auth.inspectAccess()).role,'UNKNOWN');
});

test('Repository + PostgreSQL: commandId pendente não aceita outra intenção e mantém o pedido original', async () => {
  const db=await databaseFixture();
  try{
    const f=await applicationFixture(db,{dropFirstResponse:true});
    const original=f.state.getSnapshot();
    original.contatos=[{descricao:'Original'}];
    const context={actorId:actor,commandId:'same-intent'};
    assert.equal((await f.repository.save(original,{context})).uncertain,true);
    const changed=structuredClone(original);changed.contatos=[{descricao:'Outra intenção'}];
    assert.equal((await f.repository.save(changed,{context})).ok,false);
    assert.equal(f.calls(),1);
    assert.equal(f.repository.getPendingWrites()[0].request.candidate.contatos[0].descricao,'Original');
    assert.equal((await f.repository.save(original,{context})).ok,true);
    assert.equal((await db.load()).revision,'1');
  }finally{await db.db.close();}
});
