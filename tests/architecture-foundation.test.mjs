import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createEventBus } from '../public/application/events/event-bus.js';
import { createEventEnvelope } from '../public/application/events/event-envelope.js';
import { EVENT_TYPES } from '../public/application/events/event-types.js';
import { createAppState, COLLECTION_NAMES } from '../public/application/state/app-state.js';
import { createSnapshotRepository } from '../public/application/repositories/snapshot-repository.js';
import { createAuthRepository } from '../public/application/repositories/auth-repository.js';
import { createAttachmentRepository } from '../public/application/repositories/attachment-repository.js';

function fixture() {
  let data = { ...Object.fromEntries(COLLECTION_NAMES.map(name => [name, []])), appTheme: 'dark' };
  const state = createAppState({ readState: () => data, writeState: patch => { data = { ...data, ...patch }; } });
  return { state };
}
const envelope = (payload = {}) => createEventEnvelope({ eventType: EVENT_TYPES.CLIENTE_CRIADO, entityType: 'cliente', entityId: 1, payload });

test('catálogo contém todos os 37 nomes exigidos, sem repetição', () => {
  assert.equal(Object.keys(EVENT_TYPES).length, 37);
  assert.equal(new Set(Object.values(EVENT_TYPES)).size, 37);
  assert.equal(EVENT_TYPES.SOLICITACAO_COMPRA_CONCLUIDA, 'SOLICITACAO_COMPRA_CONCLUIDA');
  assert.equal(Object.isFrozen(EVENT_TYPES), true);
});

test('envelope preserva IDs legados, não inventa ator e isola o payload original', () => {
  const payload = { cliente: { nome: 'Original' } };
  const event = envelope(payload);
  payload.cliente.nome = 'Alterado';
  assert.equal(event.entityId, 1);
  assert.equal(event.actorId, null);
  assert.equal(event.commandId, null);
  assert.equal(event.payload.cliente.nome, 'Original');
  assert.throws(() => { event.payload.cliente.nome = 'Handler'; }, TypeError);
  assert.notEqual(event.eventId, envelope().eventId);
});

test('envelope rejeita tipos e identidades incompletos', () => {
  assert.throws(() => createEventEnvelope({ eventType: 'ABRIR_MODAL', entityType: 'ui', entityId: 1 }), TypeError);
  assert.throws(() => createEventEnvelope({ eventType: EVENT_TYPES.CLIENTE_CRIADO, entityType: 'cliente' }), TypeError);
  assert.throws(() => createEventEnvelope({ eventType: EVENT_TYPES.CLIENTE_CRIADO, entityType: 'cliente', entityId: 1, actorId: ' ' }), TypeError);
});

test('payload rejeita ciclos e objetos mutáveis que não representam dados JSON', () => {
  const cyclic = {}; cyclic.self = cyclic;
  for (const payload of [cyclic, { map: new Map() }, { when: new Date() }, { value: Infinity }, { value: undefined }]) {
    assert.throws(() => envelope(payload), TypeError);
  }
  assert.throws(() => createEventEnvelope({ eventType: { toString: () => EVENT_TYPES.CLIENTE_CRIADO }, entityType: 'cliente', entityId: 1 }), TypeError);
});

test('bus deduplica handler/ID, identifica listeners e respeita unsubscribe', async () => {
  const bus = createEventBus();
  let calls = 0;
  const handler = () => { calls++; };
  const off = bus.subscribe(EVENT_TYPES.CLIENTE_CRIADO, handler, { subscriptionId: 'cliente-handler' });
  assert.equal(bus.subscribe(EVENT_TYPES.CLIENTE_CRIADO, handler), off);
  assert.equal(bus.subscribe(EVENT_TYPES.CLIENTE_CRIADO, handler, { subscriptionId: 'cliente-handler' }), off);
  assert.throws(() => bus.subscribe(EVENT_TYPES.CLIENTE_CRIADO, () => {}, { subscriptionId: 'cliente-handler' }));
  assert.deepEqual(bus.getSubscriptions(), [{ eventType: EVENT_TYPES.CLIENTE_CRIADO, subscriptionId: 'cliente-handler' }]);
  assert.equal((await bus.publish(envelope())).delivered, 1);
  assert.equal(calls, 1);
  assert.equal(off(), true);
  assert.equal(off(), false);
  assert.equal((await bus.emit(envelope())).delivered, 0);
});

test('IDs automáticos não sobrescrevem subscriptions nomeadas', async () => {
  const bus = createEventBus();
  bus.subscribe(EVENT_TYPES.CLIENTE_CRIADO, () => {}, { subscriptionId: 'subscription-1' });
  bus.subscribe(EVENT_TYPES.CLIENTE_CRIADO, () => {});
  assert.equal((await bus.publish(envelope())).delivered, 2);
});

test('bus isola tipos e erros síncronos/assíncronos e não duplica publicação', async () => {
  const bus = createEventBus({ onHandlerError() { throw new Error('Falha do observador'); } });
  const calls = [];
  bus.subscribe(EVENT_TYPES.CLIENTE_CRIADO, () => { throw new Error('Falha síncrona'); });
  bus.subscribe(EVENT_TYPES.CLIENTE_CRIADO, async () => { throw new Error('Falha assíncrona'); });
  bus.subscribe(EVENT_TYPES.CLIENTE_CRIADO, async event => { calls.push(event.eventId); });
  bus.subscribe(EVENT_TYPES.PROPOSTA_EDITADA, () => { calls.push('outro tipo'); });
  const event = envelope();
  const result = await bus.publish(event);
  assert.equal(result.errors.length, 2);
  assert.equal(result.delivered, 1);
  assert.deepEqual(calls, [event.eventId]);
});

test('estado acompanha substituições do legado; snapshot é separado e patch valida antes de gravar', () => {
  const { state } = fixture();
  const clients = [{ id: 1 }];
  state.setState({ clientes: clients });
  assert.equal(state.getCollection('clientes'), clients);
  const snapshot = state.getSnapshot();
  snapshot.clientes[0].id = 99;
  assert.equal(state.getCollection('clientes')[0].id, 1);
  assert.throws(() => state.setState({ clientes: [], campoDesconhecido: 1 }), TypeError);
  assert.equal(state.getCollection('clientes').length, 1);
  state.updateState(current => ({ clientes: [...current.clientes, { id: 2 }] }));
  assert.equal(state.getCollection('clientes').length, 2);
  assert.throws(() => state.getCollection('window.controleVendas'));
});

test('Repository bloqueia escrita antes/durante/depois de carga falha e permite recuperação', async () => {
  const { state } = fixture();
  let writes = 0, rejectLoad;
  const repository = createSnapshotRepository({ state,
    loadSnapshot: () => new Promise((_, reject) => { rejectLoad = reject; }),
    writeSnapshot: async () => { writes++; return { ok: true }; }
  });
  assert.equal((await repository.save()).ok, false);
  const loading = repository.load();
  assert.equal(repository.load(), loading);
  assert.equal(repository.getStatus().status, 'LOADING');
  assert.equal((await repository.save()).ok, false);
  await Promise.resolve();
  rejectLoad(new Error('Sem conexão'));
  assert.equal((await loading).ok, false);
  assert.equal(repository.getStatus().status, 'ERROR');
  assert.equal((await repository.save()).ok, false);
  assert.equal(writes, 0);
  const recovery = createSnapshotRepository({ state, loadSnapshot: async () => state.getSnapshot(), writeSnapshot: async () => ({ ok: true }) });
  assert.equal((await recovery.load()).ok, true);
  assert.equal((await recovery.save()).ok, true);
});

test('save somente confirma após await; falha explícita/throw nunca substitui snapshot confirmado', async () => {
  const { state } = fixture();
  let release, mode = 'delayed';
  const repository = createSnapshotRepository({ state, loadSnapshot: async () => state.getSnapshot(),
    writeSnapshot: async () => {
      if (mode === 'delayed') return new Promise(resolve => { release = resolve; });
      if (mode === 'throw') throw new Error('Erro de rede');
      if (mode === 'missing') return undefined;
      return { ok: false, error: { message: 'Negado' } };
    }
  });
  await repository.load();
  const candidate = state.getSnapshot();
  candidate.clientes = [{ id: 10 }];
  const pending = repository.save(candidate);
  candidate.clientes[0].id = 999;
  await Promise.resolve();
  assert.equal(repository.getStatus().pendingSaves, 1);
  assert.deepEqual(repository.getConfirmedSnapshot().clientes, []);
  release({ ok: true });
  assert.equal((await pending).ok, true);
  assert.equal(repository.getConfirmedSnapshot().clientes[0].id, 10);
  assert.deepEqual(state.getCollection('clientes'), [], 'Repository não faz commit visual prematuro');
  for (mode of ['failure', 'throw', 'missing']) {
    const result = await repository.save(state.getSnapshot());
    assert.equal(result.ok, false);
    assert.ok(result.error instanceof Error);
    assert.equal(repository.getConfirmedSnapshot().clientes[0].id, 10);
  }
});

test('Repository serializa escritas; erro de uma não impede a próxima', async () => {
  const { state } = fixture();
  const seen = [];
  let release;
  const repository = createSnapshotRepository({ state, loadSnapshot: async () => state.getSnapshot(),
    writeSnapshot: async snapshot => {
      seen.push(snapshot.appTheme);
      if (snapshot.appTheme === 'first') await new Promise(resolve => { release = resolve; });
      return { ok: snapshot.appTheme !== 'first', error: new Error('Primeira falhou') };
    }
  });
  await repository.load();
  const first = repository.save({ ...state.getSnapshot(), appTheme: 'first' });
  const second = repository.save({ ...state.getSnapshot(), appTheme: 'second' });
  await Promise.resolve();
  assert.deepEqual(seen, ['first']);
  release();
  assert.equal((await first).ok, false);
  assert.equal((await second).ok, true);
  assert.deepEqual(seen, ['first', 'second']);
  assert.equal(repository.getStatus().pendingSaves, 0);
});

test('Repository rejeita snapshot incompleto e conexão não configurada', async () => {
  const { state } = fixture();
  let writes = 0;
  const repository = createSnapshotRepository({ state, loadSnapshot: async () => state.getSnapshot(),
    writeSnapshot: async () => { writes++; return { ok: true }; }
  });
  await repository.load();
  assert.equal((await repository.save({ clientes: [] })).ok, false);
  assert.equal(writes, 0);
  const disconnected = createSnapshotRepository({ state, loadSnapshot: async () => state.getSnapshot(), writeSnapshot: async () => { writes++; }, isConfigured: () => false });
  assert.equal((await disconnected.load()).ok, false);
  assert.equal((await disconnected.save()).ok, false);
  assert.equal(writes, 0);
});

test('carga bem-sucedida vazia é diferente de falha; recarga falha bloqueia novas escritas', async () => {
  const { state } = fixture();
  let failLoad = false, writes = 0;
  const repository = createSnapshotRepository({ state,
    loadSnapshot: async () => { if (failLoad) throw new Error('Falha de reconciliação'); return state.getSnapshot(); },
    writeSnapshot: async () => { writes++; return { ok: true }; }
  });
  assert.equal((await repository.load()).ok, true);
  assert.equal((await repository.save()).ok, true);
  assert.equal(writes, 1);
  failLoad = true;
  assert.equal((await repository.load()).ok, false);
  assert.equal((await repository.save()).ok, false);
  assert.equal(writes, 1);
  assert.deepEqual(repository.getConfirmedSnapshot().clientes, []);
});

test('fachadas de Auth/anexos reutilizam os ports e retornam falhas', async () => {
  const auth = createAuthRepository({ getClient: () => ({ auth: { getSession: async () => ({ error: new Error('Negado') }) } }), getCurrentUser: () => ({ email: 'nome-fixo' }) });
  assert.equal(auth.getActorId(), null);
  assert.equal((await auth.getSession()).ok, false);
  const files = createAttachmentRepository({ prepare: async () => { throw new Error('Upload'); }, getUrl: async () => 'data:test' });
  assert.equal((await files.prepare([])).ok, false);
  assert.equal((await files.getUrl({})).url, 'data:test');
});

test('imports da fundação resolvem; scripts clássicos continuam sintaticamente válidos', async () => {
  await import('../public/application/bootstrap.js');
  const html = fs.readFileSync(new URL('../public/original-index.html', import.meta.url), 'utf8');
  let count = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc=/.test(match[1])) { new vm.Script(match[2]); count++; }
  }
  assert.equal(count, 14);
  assert.match(html, /<script type="module" src="application\/bootstrap.js"><\/script>/);
});
