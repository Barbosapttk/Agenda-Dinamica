import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppState, STATE_NAMES } from '../public/application/state/app-state.js';
import { createSnapshotRepository } from '../public/application/repositories/snapshot-repository.js';
import { createCarriersService, searchCarriers } from '../public/application/services/carriers-service.js';
import { createBackup, parseBackup, backupSummary } from '../public/application/services/backup-service.js';
import { SNAPSHOT_KEYS, decodeAtomicSnapshot } from '../public/application/repositories/atomic-snapshot-port.js';
const empty=()=>Object.fromEntries(STATE_NAMES.map(name=>[name,name==='appTheme'?'dark':[]]));
const sample={nome:'Transportadora Exemplo',telefone:'(18) 99999-9999',atendente:'João',email:'atendimento@exemplo.com',cidades:'  Presidente Prudente, Dracena e região.\nOeste Paulista.  '};
async function fixture() {
  let data=empty(),remote=empty(),failure=false;const batches=[];
  const state=createAppState({readState:()=>data,writeState:patch=>{data={...data,...patch}}});
  const repository=createSnapshotRepository({state,migratedCollections:['transportadoras'],
    loadSnapshot:async()=>{data=structuredClone(remote);return data},
    readSnapshot:async()=>structuredClone(remote),
    writeSnapshot:async(snapshot,{collections})=>{batches.push(collections);if(failure)return {ok:false,error:Error('Falha simulada')};for(const name of collections)remote[name]=structuredClone(snapshot[name]);return {ok:true}}
  });
  await repository.load();let id=0;
  return {state,repository,service:createCarriersService({repository,createId:()=>`carrier-${++id}`}),batches,
    fail:()=>{failure=true},remote:()=>structuredClone(remote)};
}
test('transportadoras: criar, editar preservando ID, recarregar e excluir somente o registro escolhido',async()=>{
  const f=await fixture();
  const first=await f.service.save(sample);assert.equal(first.ok,true);
  const id=first.value.item.id;assert.equal(f.remote().transportadoras[0].cidades,sample.cidades);
  await f.service.save({...sample,nome:'Outra'});
  assert.equal((await f.service.save({...sample,atendente:'Maria'},{id,editing:true})).ok,true);
  await f.repository.load();assert.equal(f.state.getCollection('transportadoras')[0].id,id);
  assert.equal(f.state.getCollection('transportadoras')[0].atendente,'Maria');
  assert.equal((await f.service.remove(id,{confirmed:true})).ok,true);
  await f.repository.load();assert.equal(f.state.getCollection('transportadoras').length,1);
  assert.equal(f.state.getCollection('transportadoras')[0].nome,'Outra');
  assert.deepEqual(f.batches,[['transportadoras'],['transportadoras'],['transportadoras'],['transportadoras']]);
});
test('transportadoras: nomes iguais são cadastros independentes, sem merge',async()=>{
  const f=await fixture();await f.service.save(sample);await f.service.save(sample);
  const items=f.remote().transportadoras;assert.equal(items.length,2);assert.notEqual(items[0].id,items[1].id);
});
test('transportadoras: não exige campos extras ou telefone/email/cidades preenchidos',async()=>{
  const f=await fixture();assert.equal((await f.service.save({nome:'Só nome'})).ok,true);
  assert.equal((await f.service.save({telefone:'(18) 99999-9999'})).ok,true);
  assert.equal((await f.service.save({})).ok,false);assert.equal((await f.service.save({nome:42})).ok,false);
  assert.equal(f.remote().transportadoras.length,2);
});
test('transportadoras: pesquisa por nome, atendente e cidades ignora acentos e caixa',()=>{
  const items=[{id:'1',...sample},{id:'2',nome:'Transportes Sul',atendente:'Ana',cidades:'Curitiba'}];
  for(const query of ['EXEMPLO','joao','PRUDENTE','oeste paulista','exemplo dracena'])assert.deepEqual(searchCarriers(items,query).map(i=>i.id),['1']);
  assert.equal(searchCarriers(items,'nenhuma').length,0);assert.equal(searchCarriers(items,'').length,2);
  assert.equal(items[0].cidades,sample.cidades);
});
test('transportadoras: exclusão exige confirmação e edição inexistente não cria cadastro',async()=>{
  const f=await fixture();await f.service.save(sample);
  assert.equal((await f.service.remove('carrier-1')).ok,false);assert.equal(f.remote().transportadoras.length,1);
  assert.equal((await f.service.save(sample,{id:'ausente',editing:true})).ok,false);assert.equal(f.remote().transportadoras.length,1);
});
test('transportadoras: repetição do mesmo ID/conteúdo é no-op; colisão não substitui registro',async()=>{
  const f=await fixture();await f.service.save(sample,{id:'estavel'});
  const repeated=await f.service.save(sample,{id:'estavel'});assert.equal(repeated.ok,true);assert.equal(repeated.changed,false);
  assert.equal((await f.service.save({...sample,nome:'Outro'},{id:'estavel'})).ok,false);
  assert.equal(f.remote().transportadoras[0].nome,sample.nome);assert.equal(f.batches.length,1);
});
test('transportadoras: falha de escrita mantém estado e não anuncia sucesso',async()=>{
  const f=await fixture();await f.service.save(sample);const before=f.state.getSnapshot();f.fail();
  assert.equal((await f.service.save({...sample,nome:'Alteração'},{id:'carrier-1',editing:true})).ok,false);
  assert.deepEqual(f.state.getSnapshot(),before);assert.deepEqual(f.remote(),before);
});
test('transportadoras: backup/contagem/restauração incluem o catálogo; formato 1 anterior permanece legível',()=>{
  const data=empty();data.transportadoras=[{id:'1',...sample}];const backup=createBackup(data);
  assert.match(backupSummary(backup),/1 transportadoras/);assert.deepEqual(parseBackup(JSON.stringify(backup)).data.transportadoras,data.transportadoras);
  const old=createBackup(empty());delete old.data.transportadoras;old.metadata.collections=old.metadata.collections.filter(n=>n!=='transportadoras');
  assert.deepEqual(parseBackup(old).data.transportadoras,[]);assert.equal(Object.hasOwn(old.data,'transportadoras'),false);
  const malformed=createBackup(empty());delete malformed.data.transportadoras;assert.throws(()=>parseBackup(malformed),/incompleto/);
});
test('transportadoras: mapeamento de snapshot preserva todas as chaves e o tema, sem depender da posição',()=>{
  assert.equal(SNAPSHOT_KEYS.transportadoras,'secta_transportadoras');assert.equal(SNAPSHOT_KEYS.appTheme,'secta_theme');
  assert.equal(new Set(Object.values(SNAPSHOT_KEYS)).size,STATE_NAMES.length);
  const data=empty();data.transportadoras=[{id:'1',...sample}];data.appTheme='light';
  const result=decodeAtomicSnapshot({status:'SUCCESS',revision:'1',protected:true,rows:STATE_NAMES.map(name=>({key:SNAPSHOT_KEYS[name],value:data[name]}))});
  assert.deepEqual(result.snapshot,data);
});
test('transportadoras: observações são opcionais e preservadas na edição/backup sem mudar o ID',async()=>{
  const f=await fixture();await f.service.save(sample);
  assert.equal(f.remote().transportadoras[0].observacoes,'');
  const observacoes='  Coleta somente à tarde.\nConferir antes de agendar.  ';
  const id=f.remote().transportadoras[0].id;
  assert.equal((await f.service.save({...sample,observacoes},{id,editing:true})).ok,true);
  await f.repository.load();assert.equal(f.state.getCollection('transportadoras')[0].id,id);
  assert.equal(f.state.getCollection('transportadoras')[0].observacoes,observacoes);
  assert.equal(parseBackup(JSON.stringify(createBackup(f.state.getSnapshot()))).data.transportadoras[0].observacoes,observacoes);
});
