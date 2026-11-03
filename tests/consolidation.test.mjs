import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/agenda-format.js';
import { createBackup, parseBackup, backupSummary, createBackupService, RECOVERY_KEY, ALARM_SETTINGS_KEY } from '../public/application/services/backup-service.js';
import { createAppState, COLLECTION_NAMES } from '../public/application/state/app-state.js';
import { createSnapshotRepository } from '../public/application/repositories/snapshot-repository.js';

const empty = () => ({...Object.fromEntries(COLLECTION_NAMES.map(n=>[n,[]])),appTheme:'dark'});
async function fixture() {
  let data=empty(), remote=empty();
  const storage=new Map(); storage.removeItem=storage.delete.bind(storage); storage.getItem=k=>storage.get(k)??null; storage.setItem=(k,v)=>storage.set(k,v);
  let fail=false, mismatch=false;
  const state=createAppState({readState:()=>data,writeState:p=>{data={...data,...p}}});
  const repository=createSnapshotRepository({state,loadSnapshot:async()=>remote,
    readSnapshot:async()=> {if(mismatch){mismatch=false;return empty()}return remote},
    writeSnapshot:async candidate=>{if(fail)return {ok:false};remote=structuredClone(candidate);return {ok:true}}});
  await repository.load();
  const service=createBackupService({state,repository,storage});
  return {state,repository,service,storage,remote:()=>remote,fail:()=>{fail=true},mismatch:()=>{mismatch=true}};
}
test('normalização natural preserva siglas, nomes, números, unidades, códigos e URLs',()=>{
  assert.equal(AgendaFormat.text('cliente solicitou orçamento da bomba centrifuga favor verificar valor e prazo'),'Cliente solicitou orçamento da bomba centrífuga. Favor verificar valor e prazo.');
  assert.equal(AgendaFormat.text('ROTOR XPT-500 220V'),'ROTOR XPT-500 220V');
  assert.equal(AgendaFormat.text('verificar   bomba WEG com João a 5 kg'),'Verificar bomba WEG com João a 5 kg');
  assert.equal(AgendaFormat.name('SECTA de João'),'SECTA de João');
  assert.equal(AgendaFormat.text('https://example.com/ABC-500'),'https://example.com/ABC-500');
  assert.equal(AgendaFormat.text('a máquina centrifuga a amostra'),'A máquina centrifuga a amostra');
});
test('telefone requer DDD e número válido; rejeita vazio, texto e repetições',()=>{
  for(const value of ['', 'abc','123','00000000000'])assert.equal(AgendaFormat.validPhone(value),false);
  for(const value of ['11987654321','(11) 3456-7890','+55 11 98765-4321'])assert.equal(AgendaFormat.validPhone(value),true);
});
for(const [iso,br] of [['2026-01-01','01/01/2026'],['2026-11-03','03/11/2026'],['2026-12-31','31/12/2026']]) test(`datas ida/volta sem inversão ${br}`,()=>{
  assert.equal(AgendaFormat.date(iso),br); assert.equal(AgendaFormat.isoDate(br),iso);
});
test('datas inválidas, vazias e limites de mês/ano são validados',()=>{
  for(const d of ['', '31/02/2026','29/02/2026','00/11/2026','2026-13-01'])assert.equal(AgendaFormat.isoDate(d),'');
  assert.equal(AgendaFormat.isoDate('29/02/2028'),'2028-02-29');
  assert.equal(AgendaFormat.dateTime('2026-11-03T14:30:00'),'03/11/2026 14:30');
  assert.deepEqual(['2027-01-01','2026-12-31'].sort(),['2026-12-31','2027-01-01']);
});
test('backup contém todas as 12 coleções, configurações, versão e timestamp',()=>{
  const backup=createBackup(empty());
  assert.equal(backup.backupVersion,1);assert.ok(Date.parse(backup.createdAt));
  assert.deepEqual(Object.keys(backup.data).sort(),[...COLLECTION_NAMES,'appTheme'].sort());
  assert.match(backupSummary(backup),/0 vendas/);assert.match(backupSummary(backup),/0 compras/);
});
test('backup inválido, incompleto, versão futura e registros duplicados são rejeitados',()=>{
  assert.throws(()=>parseBackup('{'));assert.throws(()=>parseBackup({}));
  const backup=createBackup(empty());backup.backupVersion=2;assert.throws(()=>parseBackup(backup),/Versão/);
  backup.backupVersion=1;delete backup.data.controleVendas;assert.throws(()=>parseBackup(backup));
  const duplicate=createBackup(empty());duplicate.data.clientes=[{id:1},{id:1}];assert.throws(()=>parseBackup(duplicate));
});
test('restauração exige confirmação e não escreve ao validar um arquivo inválido',async()=>{
  const f=await fixture();const before=f.remote();
  await assert.rejects(f.service.restore(createBackup(empty())),/Confirmação/);
  await assert.rejects(f.service.restore({},{confirmed:true}));
  assert.deepEqual(f.remote(),before);assert.equal(f.storage.getItem(RECOVERY_KEY),null);
});
test('restauração protege o estado anterior antes da escrita e recupera todas as coleções',async()=>{
  const f=await fixture();const next=empty();
  for(const name of COLLECTION_NAMES)next[name]=['produtosSolicitacoes','alarmedIds'].includes(name)?['teste']:[{id:1}];
  next.appTheme='light';
  assert.equal((await f.service.restore(createBackup(next,{alarms:{som:true}}),{confirmed:true})).ok,true);
  assert.deepEqual(f.remote(),next);assert.deepEqual(f.state.getSnapshot(),next);
  assert.deepEqual(parseBackup(f.storage.getItem(RECOVERY_KEY)).data,empty());
  assert.equal(JSON.parse(f.storage.getItem(ALARM_SETTINGS_KEY)).som,true);
});
test('falha ao proteger impede substituição remota',async()=>{
  const f=await fixture();f.storage.setItem=()=>{throw Error('quota')};
  const data=empty();data.clientes=[{id:7}];
  await assert.rejects(f.service.restore(createBackup(data),{confirmed:true}),/quota/);
  assert.deepEqual(f.remote(),empty());
});
test('falha de escrita preserva a UI e a proteção, bloqueando novos saves',async()=>{
  const f=await fixture();f.fail();const data=empty();data.clientes=[{id:8}];
  await assert.rejects(f.service.restore(createBackup(data),{confirmed:true}));
  assert.deepEqual(f.state.getSnapshot(),empty());assert.ok(f.storage.getItem(RECOVERY_KEY));
  assert.equal((await f.repository.save()).ok,false);
});
test('falha de verificação desfaz a escrita inteira sem estado parcial',async()=>{
  const f=await fixture();f.mismatch();const data=empty();data.clientes=[{id:9}];
  await assert.rejects(f.service.restore(createBackup(data),{confirmed:true}),/diverge/);
  assert.deepEqual(f.remote(),empty());assert.deepEqual(f.state.getSnapshot(),empty());
});
test('exclusão exige confirmação, limpa todo escopo e preserva ferramentas e chaves alheias',async()=>{
  const f=await fixture();
  f.storage.setItem('outra-aplicacao','preservar');f.storage.setItem('agenda-tool-notes-v1','pessoal');f.storage.setItem('secta_clientes','antigo');
  const data=empty();data.cotacoesCompras=[{id:3}];data.controleVendas=[{id:4}];data.produtosSolicitacoes=['Bomba'];
  await f.service.restore(createBackup(data),{confirmed:true});
  await assert.rejects(f.service.erase({confirmed:false}));
  await f.service.erase({confirmed:true});
  assert.deepEqual(f.remote(),empty());assert.equal(f.storage.getItem('secta_clientes'),null);
  assert.equal(f.storage.getItem('outra-aplicacao'),'preservar');assert.equal(f.storage.getItem('agenda-tool-notes-v1'),'pessoal');
  assert.equal(f.service.getRecoveryBackup().data.cotacoesCompras.length,1);
});
