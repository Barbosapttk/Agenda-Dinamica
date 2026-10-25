import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppState, COLLECTION_NAMES } from '../public/application/state/app-state.js';
import { createSnapshotRepository } from '../public/application/repositories/snapshot-repository.js';
import { createEventBus } from '../public/application/events/event-bus.js';
import { createComprasService, COMPRA_STATUS, COMPRA_EVENT_TYPES } from '../public/application/services/compras-service.js';
import { registerComprasHandlers } from '../public/application/handlers/compras-handlers.js';

const sample = { id: 10, descricao: 'Item existente', status: 'enviado', concluida: false,
  criadoEm: '2026-10-01', atualizadoEm: '2026-10-01' };
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function fixture({ purchases = [], write, loadFailure = false } = {}) {
  let data = { ...Object.fromEntries(COLLECTION_NAMES.map(name => [name, []])), appTheme: 'dark', cotacoesCompras: structuredClone(purchases) };
  let server = structuredClone(data);
  const state = createAppState({ readState: () => data, writeState: patch => { data = { ...data, ...patch }; } });
  const writes = [], events = [], renders = [];
  const repository = createSnapshotRepository({ state, migratedCollections: ['cotacoesCompras'],
    loadSnapshot: async () => { if (loadFailure) throw new Error('Carga falhou'); state.setState(structuredClone(server)); return state.getSnapshot(); },
    writeSnapshot: async (candidate, options) => {
      writes.push({ snapshot: structuredClone(candidate), collections: [...options.collections] });
      const result = write ? await write(candidate, options, writes.length) : { ok: true };
      if (result.ok) for (const name of options.collections) server[name] = structuredClone(candidate[name]);
      return result;
    }
  });
  await repository.load();
  const bus = createEventBus();
  registerComprasHandlers(bus, { render: () => { renders.push(structuredClone(state.getCollection('cotacoesCompras'))); } });
  for (const type of COMPRA_EVENT_TYPES) bus.subscribe(type, event => { events.push(event); });
  let sequence = 0;
  const serviceOptions = { repository, eventBus: bus, today: () => '2026-10-08', now: () => '2026-10-08T12:00:00.000Z',
    createId: () => 100, createCommandId: () => `auto-${++sequence}` };
  return { state, repository, bus, service: createComprasService(serviceOptions), serviceOptions, writes, events, renders,
    getServer: () => structuredClone(server) };
}

test('criação confirma uma única escrita na chave de compras antes do evento e da renderização', async () => {
  const f = await fixture();
  const result = await f.service.criar({ descricao: '  Motor  ' }, { commandId: 'create-1' });
  assert.equal(result.ok, true);
  assert.equal(result.item.id, 100);
  assert.equal(result.item.descricao, 'Motor');
  assert.deepEqual(f.writes.map(write => write.collections), [['cotacoesCompras']]);
  assert.equal(f.getServer().cotacoesCompras[0].id, result.item.id);
  assert.equal(f.events.length, 1);
  assert.equal(f.events[0].eventType, 'SOLICITACAO_COMPRA_CRIADA');
  assert.equal(f.events[0].commandId, 'create-1');
  assert.equal(f.events[0].actorId, null);
  assert.deepEqual(f.events[0].payload, { id: 100, descricao: 'Motor', status: 'enviado', concluida: false, criadoEm: '2026-10-08', atualizadoEm: '2026-10-08' });
  assert.equal(f.renders.length, 1);
});

test('edição mantém ID/dados legados e fornece campos alterados e anterior/atual', async () => {
  const f = await fixture({ purchases: [{ ...sample, id: 'legacy-10', legado: 'preservado' }] });
  const result = await f.service.editar('legacy-10', { descricao: 'Nova descrição', status: 'sem_retorno' });
  assert.equal(result.item.id, 'legacy-10');
  assert.equal(result.item.legado, 'preservado');
  assert.equal(result.item.criadoEm, sample.criadoEm);
  assert.equal(f.writes.length, 1);
  assert.equal(f.events.length, 1);
  assert.equal(f.events[0].eventType, 'SOLICITACAO_COMPRA_EDITADA');
  assert.deepEqual(f.events[0].payload.camposAlterados.descricao, { de: 'Item existente', para: 'Nova descrição' });
  assert.equal(f.events[0].payload.atual.status, 'sem_retorno');
});

test('alteração de status preserva os estados atuais e emite anterior/novo/timestamp', async () => {
  const f = await fixture({ purchases: [sample] });
  const result = await f.service.alterarStatus('10', 'sem_retorno');
  assert.equal(result.item.id, 10);
  assert.deepEqual(COMPRA_STATUS, ['enviado', 'sem_retorno', 'concluido']);
  assert.equal(f.writes.length, 1);
  assert.deepEqual(f.events[0].payload, { id: 10, statusAnterior: 'enviado', novoStatus: 'sem_retorno', timestamp: '2026-10-08T12:00:00.000Z' });
});

test('conclusão mantém registro na coleção, retira dos ativos e emite somente CONCLUIDA', async () => {
  const f = await fixture({ purchases: [sample] });
  await f.service.concluir(10);
  const list = f.state.getCollection('cotacoesCompras');
  assert.equal(list.length, 1);
  assert.equal(list[0].status, 'concluido');
  assert.equal(list[0].concluida, true);
  assert.equal(list.filter(item => item.concluida !== true && item.status !== 'concluido').length, 0);
  assert.equal(f.writes.length, 1);
  assert.deepEqual(f.events.map(event => event.eventType), ['SOLICITACAO_COMPRA_CONCLUIDA']);
  assert.equal(f.events[0].payload.dataConclusao, '2026-10-08');
});

test('exclusão remove apenas o ID solicitado e preserva auditoria mínima no evento', async () => {
  const f = await fixture({ purchases: [sample, { ...sample, id: 11 }] });
  await f.service.excluir('10');
  assert.deepEqual(f.state.getCollection('cotacoesCompras').map(item => item.id), [11]);
  assert.equal(f.writes.length, 1);
  assert.equal(f.events[0].eventType, 'SOLICITACAO_COMPRA_EXCLUIDA');
  assert.deepEqual(f.events[0].payload, sample);
});

test('nenhum estado, evento ou renderização é antecipado enquanto persistência está pendente', async () => {
  const entered = deferred(), release = deferred();
  const f = await fixture({ write: async () => { entered.resolve(); await release.promise; return { ok: true }; } });
  const operation = f.service.criar({ descricao: 'Pendente' });
  await entered.promise;
  assert.deepEqual(f.state.getCollection('cotacoesCompras'), []);
  assert.deepEqual(f.events, []);
  assert.deepEqual(f.renders, []);
  release.resolve();
  assert.equal((await operation).ok, true);
  assert.equal(f.state.getCollection('cotacoesCompras').length, 1);
  assert.equal(f.events.length, 1);
  assert.equal(f.renders.length, 1);
});

for (const [name, command] of [
  ['criação', service => service.criar({ descricao: 'Falha' })],
  ['edição', service => service.editar(10, { descricao: 'Falha' })],
  ['status', service => service.alterarStatus(10, 'sem_retorno')],
  ['conclusão', service => service.concluir(10)],
  ['exclusão', service => service.excluir(10)]
]) {
  test(`falha de persistência na ${name} não altera estado nem emite evento`, async () => {
    const f = await fixture({ purchases: [sample], write: async () => ({ ok: false, error: new Error('Negado') }) });
    const result = await command(f.service);
    assert.equal(result.ok, false);
    assert.deepEqual(f.state.getCollection('cotacoesCompras'), [sample]);
    assert.deepEqual(f.getServer().cotacoesCompras, [sample]);
    assert.equal(f.writes.length, 1);
    assert.deepEqual(f.events, []);
    assert.deepEqual(f.renders, []);
  });
}

test('exceção do escritor produz falha explícita sem evento', async () => {
  const f = await fixture({ write: async () => { throw new Error('Rede'); } });
  assert.equal((await f.service.criar({ descricao: 'Teste' })).ok, false);
  assert.deepEqual(f.events, []);
  assert.deepEqual(f.state.getCollection('cotacoesCompras'), []);
});

test('mesmo commandId concorrente/repetido cria uma vez e publica uma vez', async () => {
  const entered = deferred(), release = deferred();
  const f = await fixture({ write: async () => { entered.resolve(); await release.promise; return { ok: true }; } });
  const args = [{ descricao: 'Única' }, { commandId: 'same-command' }];
  const first = f.service.criar(...args);
  assert.equal(f.service.criar(...args), first);
  await entered.promise;
  release.resolve();
  const result = await first;
  const replay = await f.service.criar(...args);
  assert.equal(replay.item.id, result.item.id);
  assert.equal(replay.event.eventId, result.event.eventId);
  assert.equal(replay.replayed, true);
  assert.equal(f.writes.length, 1);
  assert.equal(f.events.length, 1);
});

test('falha pode ser repetida com o mesmo commandId e ID reservado', async () => {
  const f = await fixture({ write: async (_candidate, _options, attempt) => ({ ok: attempt > 1, error: new Error('Primeira falhou') }) });
  const args = [{ descricao: 'Retry' }, { commandId: 'retry' }];
  assert.equal((await f.service.criar(...args)).ok, false);
  assert.equal((await f.service.criar(...args)).ok, true);
  assert.equal(f.writes[0].snapshot.cotacoesCompras[0].id, f.writes[1].snapshot.cotacoesCompras[0].id);
  assert.equal(f.events.length, 1);
});

test('criação repetida após recriar Service reconhece commandId persistido', async () => {
  const f = await fixture();
  const args = [{ descricao: 'Recarregar' }, { commandId: 'reload-command' }];
  const first = await f.service.criar(...args);
  await f.repository.load();
  const service = createComprasService(f.serviceOptions);
  const result = await service.criar(...args);
  assert.equal(result.item.id, first.item.id);
  assert.equal(result.changed, false);
  assert.equal(f.writes.length, 1);
  assert.equal(f.events.length, 1);
});

test('repetir edição, status, conclusão e exclusão não grava nem emite novamente', async () => {
  const f = await fixture({ purchases: [sample] });
  await f.service.editar(10, { descricao: 'Editado' });
  assert.equal((await f.service.editar(10, { descricao: 'Editado' })).changed, false);
  await f.service.alterarStatus(10, 'sem_retorno');
  assert.equal((await f.service.alterarStatus(10, 'sem_retorno')).changed, false);
  await f.service.concluir(10);
  assert.equal((await f.service.concluir(10)).changed, false);
  await f.service.excluir(10);
  assert.equal((await f.service.excluir(10)).changed, false);
  assert.equal(f.writes.length, 4);
  assert.equal(f.events.length, 4);
});

test('commandId reaproveitado para dados diferentes falha sem afetar outra solicitação', async () => {
  const f = await fixture();
  await f.service.criar({ descricao: 'Primeiro' }, { commandId: 'unique' });
  assert.equal((await f.service.criar({ descricao: 'Outro' }, { commandId: 'unique' })).ok, false);
  assert.equal((await f.service.excluir(100, { commandId: 'unique' })).ok, false);
  assert.equal(f.writes.length, 1);
  assert.equal(f.state.getCollection('cotacoesCompras').length, 1);
});

test('IDs de criação não colidem e dados não recebem vínculo comercial', async () => {
  const f = await fixture();
  await Promise.all([f.service.criar({ descricao: 'A' }), f.service.criar({ descricao: 'B' })]);
  const list = f.state.getCollection('cotacoesCompras');
  assert.deepEqual(list.map(item => item.id), [100, 101]);
  for (const item of list) {
    assert.equal(Object.hasOwn(item, 'clienteId'), false);
    assert.equal(Object.hasOwn(item, 'refProposta'), false);
  }
  for (const name of ['clientes', 'contatos', 'solicitacoesOrcamento', 'controleVendas', 'concluidos']) assert.deepEqual(f.state.getCollection(name), []);
});

test('validação impede descrição vazia, status inválido e edição de ID inexistente', async () => {
  const f = await fixture({ purchases: [sample] });
  assert.equal((await f.service.criar({ descricao: ' ' })).ok, false);
  assert.equal((await f.service.editar(999, { descricao: 'Não criar' })).ok, false);
  assert.equal((await f.service.alterarStatus(10, 'inventado')).ok, false);
  assert.equal(f.writes.length, 0);
  assert.deepEqual(f.state.getCollection('cotacoesCompras'), [sample]);
});

test('falha de carga bloqueia comandos novos e escritor legado', async () => {
  const f = await fixture({ loadFailure: true });
  assert.equal((await f.service.criar({ descricao: 'Bloqueada' })).ok, false);
  assert.equal((await f.repository.saveLegacy()).ok, false);
  assert.equal(f.writes.length, 0);
  assert.equal(f.events.length, 0);
});

test('registro dos handlers é idempotente e efeitos não persistem', async () => {
  const bus = createEventBus();
  let renders = 0;
  const options = { render: () => { renders++; } };
  const dispose = registerComprasHandlers(bus, options);
  assert.equal(registerComprasHandlers(bus, options), dispose);
  assert.equal(bus.getSubscriptions().length, 5);
  dispose();
  assert.equal(bus.getSubscriptions().length, 0);
  assert.equal(renders, 0);
});

test('erro de handler não transforma gravação confirmada em falha nem provoca retry de escrita', async () => {
  const f = await fixture();
  f.bus.subscribe(COMPRA_EVENT_TYPES[0], () => { throw new Error('Render externo'); });
  const args = [{ descricao: 'Persistida' }, { commandId: 'handler-error' }];
  const result = await f.service.criar(...args);
  assert.equal(result.ok, true);
  assert.equal(result.delivery.errors.length, 1);
  assert.equal((await f.service.criar(...args)).ok, true);
  assert.equal(f.writes.length, 1);
  assert.equal(f.events.length, 1);
});

test('reconciliação remota não publica eventos de compras', async () => {
  const f = await fixture({ purchases: [sample] });
  await f.repository.load();
  await f.repository.load();
  assert.equal(f.events.length, 0);
  assert.equal(f.writes.length, 0);
});

test('fila comum preserva edição legada durante await e não regrava compras no debounce posterior', async () => {
  const entered = deferred(), release = deferred();
  const f = await fixture({ write: async (_candidate, _options, attempt) => {
    if (attempt === 1) { entered.resolve(); await release.promise; }
    return { ok: true };
  } });
  f.state.setState({ clientes: [{ id: 1, nome: 'Antes' }] });
  const legacyBefore = f.repository.saveLegacy();
  await entered.promise;
  const purchase = f.service.criar({ descricao: 'Coexistência' });
  f.state.setState({ clientes: [{ id: 1, nome: 'Durante' }] });
  release.resolve();
  await legacyBefore;
  await purchase;
  await f.repository.saveLegacy();
  assert.equal(f.state.getCollection('clientes')[0].nome, 'Durante');
  assert.equal(f.getServer().clientes[0].nome, 'Durante');
  assert.equal(f.writes.length, 3);
  assert.deepEqual(f.writes[1].collections, ['cotacoesCompras']);
  assert.equal(f.writes[2].collections.includes('cotacoesCompras'), false);
  assert.equal(f.writes.filter(write => write.collections.includes('cotacoesCompras') && write.snapshot.cotacoesCompras.length === 1).length, 1);
  assert.equal(f.events.length, 1);
});

test('reset legado de compras continua persistindo quando realmente muda a coleção', async () => {
  const f = await fixture({ purchases: [sample] });
  f.state.setState({ cotacoesCompras: [] });
  await f.repository.saveLegacy();
  assert.equal(f.writes[0].collections.includes('cotacoesCompras'), true);
  assert.deepEqual(f.getServer().cotacoesCompras, []);
  assert.equal(f.events.length, 0);
});
