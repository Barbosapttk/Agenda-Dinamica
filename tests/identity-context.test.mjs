import test from 'node:test';
import assert from 'node:assert/strict';
import { createExecutionContext, INSTANCE_STORAGE_KEY } from '../public/application/context/execution-context.js';
import { createAuthRepository } from '../public/application/repositories/auth-repository.js';
import { createEventEnvelope } from '../public/application/events/event-envelope.js';
import { createAppState, COLLECTION_NAMES } from '../public/application/state/app-state.js';
import { createSnapshotRepository } from '../public/application/repositories/snapshot-repository.js';
import { createComprasService } from '../public/application/services/compras-service.js';

function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
}

test('instanceId persiste em reload; sessionId muda sem inventar sessão autenticada', async () => {
  const saved = storage();
  const first = createExecutionContext({ storage: saved });
  const second = createExecutionContext({ storage: saved });
  assert.match(first.getInstanceId(), /^inst_/);
  assert.equal(first.getInstanceId(), second.getInstanceId());
  assert.notEqual(first.getSessionId(), second.getSessionId());
  assert.equal(first.getSessionKind(), 'technical-execution');
  const context = await first.capture();
  assert.equal(context.actorId, null);
  assert.notEqual(context.actorId, context.instanceId);
  assert.notEqual(context.sessionId, context.commandId);
});

test('duas instâncias com armazenamento independente possuem IDs diferentes', () => {
  const first = createExecutionContext({ storage: storage() });
  const second = createExecutionContext({ storage: storage() });
  assert.notEqual(first.getInstanceId(), second.getInstanceId());
  assert.notEqual(first.getSessionId(), second.getSessionId());
});

test('janela com storage copiado do opener renova seu instanceId', () => {
  const opener = createExecutionContext({ storage: storage() });
  const cloned = storage();
  cloned.setItem(INSTANCE_STORAGE_KEY, opener.getInstanceId());
  const child = createExecutionContext({ storage: cloned, getOpenerInstanceId: opener.getInstanceId });
  assert.notEqual(child.getInstanceId(), opener.getInstanceId());
  const reload = createExecutionContext({ storage: cloned, getOpenerInstanceId: opener.getInstanceId });
  assert.equal(child.getInstanceId(), reload.getInstanceId());
});

test('valor não técnico em storage é substituído; falha de armazenamento é explícita', () => {
  const saved = storage();
  saved.setItem(INSTANCE_STORAGE_KEY, 'nome@example.com');
  const context = createExecutionContext({ storage: saved });
  assert.equal(context.getInstanceId().includes('@'), false);
  assert.throws(() => createExecutionContext({ storage: { getItem: () => null, setItem() {} } }), /persistido/);
});

test('contexto aceita ator real do provider e não aceita nome/e-mail como override', async () => {
  const execution = createExecutionContext({ storage: storage(), getIdentity: async () => ({ ok: true, actorId: 'authenticated-user-id' }) });
  const context = await execution.capture();
  assert.equal(context.actorId, 'authenticated-user-id');
  assert.notEqual(context.actorId, context.instanceId);
  await assert.rejects(() => execution.capture({ actorId: 'Nome fixo' }), /override/);
  await assert.rejects(() => execution.capture({ instanceId: 'inst_falso' }), /override/);
  const unknown = createExecutionContext({ storage: storage(), getIdentity: async () => ({ ok: false, error: new Error('Não verificado') }) });
  await assert.rejects(() => unknown.capture(), /Não verificado/);
  assert.equal(unknown.getAuditRecords()[0].actorId, null);
  assert.equal(unknown.getAuditRecords()[0].confirmation, 'IDENTITY_UNCONFIRMED');
});

test('command/event/correlation/causation possuem papéis distintos e payload não é alterado', async () => {
  const execution = createExecutionContext({ storage: storage() });
  const context = await execution.capture({ correlationId: 'corr-sequence', causationId: 'previous-event' });
  const event = createEventEnvelope({ ...context, eventType: 'SOLICITACAO_COMPRA_CRIADA', entityType: 'compra', entityId: 1 });
  assert.equal(event.instanceId, context.instanceId);
  assert.equal(event.sessionId, context.sessionId);
  assert.notEqual(event.eventId, event.commandId);
  assert.equal(event.correlationId, 'corr-sequence');
  assert.equal(event.causationId, 'previous-event');
  assert.equal(event.actorId, null);
  assert.equal(event.schemaVersion, 2);
  assert.throws(() => createEventEnvelope({ ...event, eventId: event.commandId }), /eventId/);
});

test('auditoria técnica é limitada, somente em memória e não copia dados comerciais', async () => {
  const execution = createExecutionContext({ storage: storage(), auditLimit: 2 });
  for (let i = 0; i < 3; i++) {
    const context = await execution.capture();
    execution.recordOutcome(context, { ok: false, reason: 'ERROR', payload: { token: 'não-copiar' }, error: new Error('não-copiar') });
  }
  const records = execution.getAuditRecords();
  assert.equal(records.length, 2);
  assert.equal(JSON.stringify(records).includes('não-copiar'), false);
  assert.equal(records[0].expectedVersion, null);
  assert.equal(records[0].actualVersion, null);
  assert.equal(records[0].concurrencyProtected, false);
  records[0].reason = 'mudou';
  assert.equal(execution.getAuditRecords()[0].reason, 'ERROR');
});

test('Auth acompanha uma única subscription e confirma usuário via getUser existente', async () => {
  let notify, registrations = 0, reads = 0, unsubscribed = 0;
  const client = { auth: {
    onAuthStateChange(callback) { notify = callback; registrations++; return { data: { subscription: { unsubscribe() { unsubscribed++; } } } }; },
    getUser: async () => { reads++; return { data: { user: { id: 'real-user' } }, error: null }; }
  } };
  const auth = createAuthRepository({ getClient: () => client, getCurrentUser: () => null });
  const stop = auth.startSessionTracking();
  assert.equal(auth.startSessionTracking(), stop);
  assert.equal(registrations, 1);
  assert.equal((await auth.getExecutionIdentity()).actorId, null);
  assert.equal(reads, 0);
  notify('SIGNED_IN', { user: { id: 'real-user' } });
  assert.equal((await auth.getExecutionIdentity()).actorId, 'real-user');
  assert.equal(reads, 1);
  notify('SIGNED_OUT', null);
  assert.equal((await auth.getExecutionIdentity()).actorId, null);
  stop();
  assert.equal(unsubscribed, 1);
  assert.equal(stop(), false);
  const secondStop = auth.startSessionTracking();
  assert.equal(registrations, 2);
  assert.equal(stop(), false, 'Handle antigo não altera o tracking atual');
  assert.equal(auth.startSessionTracking(), secondStop);
  secondStop();
});

test('identidade não verificada ou sessão alterada durante await não fornece actorId', async () => {
  const auth = createAuthRepository({ getClient: () => ({ auth: { getUser: async () => ({ error: new Error('Expirou') }) } }),
    getCurrentUser: () => ({ id: 'real-user' }) });
  assert.equal((await auth.getExecutionIdentity()).ok, false);
  let notify, release;
  const changing = createAuthRepository({ getClient: () => ({ auth: {
    onAuthStateChange(callback) { notify = callback; return { data: { subscription: { unsubscribe() {} } } }; },
    getUser: () => new Promise(resolve => { release = resolve; })
  } }), getCurrentUser: () => ({ id: 'real-user' }) });
  changing.startSessionTracking();
  const pending = changing.getExecutionIdentity();
  notify('SIGNED_OUT', null);
  release({ data: { user: { id: 'real-user' } }, error: null });
  assert.equal((await pending).ok, false);
});

async function repositoryFixture(write) {
  let data = { ...Object.fromEntries(COLLECTION_NAMES.map(name => [name, []])), appTheme: 'dark' };
  const state = createAppState({ readState: () => data, writeState: patch => { data = { ...data, ...patch }; } });
  const execution = createExecutionContext({ storage: storage() });
  const repository = createSnapshotRepository({ state, executionContext: execution, migratedCollections: ['cotacoesCompras'],
    loadSnapshot: async () => state.getSnapshot(), writeSnapshot: write });
  await repository.load();
  const events = [];
  const service = createComprasService({ repository, eventBus: { publish: async event => { events.push(event); return { delivered: 0, errors: [] }; } },
    getExecutionContext: execution.capture, createCommandId: execution.createCommandId });
  return { state, execution, repository, service, events };
}

test('sucesso confirmado mantém contexto de Compras no Repository e evento', async () => {
  let received;
  const f = await repositoryFixture(async (_candidate, options) => { received = options.context; return { ok: true }; });
  const result = await f.service.criar({ descricao: 'Teste' }, { correlationId: 'flow', causationId: 'cause' });
  assert.equal(result.reason, 'SUCCESS');
  assert.equal(result.context.commandId, received.commandId);
  assert.equal(f.events[0].commandId, received.commandId);
  assert.equal(f.events[0].instanceId, f.execution.getInstanceId());
  assert.equal(f.events[0].correlationId, 'flow');
  assert.equal(f.events[0].causationId, 'cause');
  assert.equal(f.execution.getAuditRecords()[0].reason, 'SUCCESS');
  assert.equal(f.repository.getStatus().concurrency.protected, false, 'Não simula proteção que o servidor não possui');
});

test('contrato cliente preserva CONFLICT informado por um port, sem decidir versões no frontend', async () => {
  const f = await repositoryFixture(async () => ({ ok: false, reason: 'CONFLICT', expectedVersion: 10, actualVersion: 11 }));
  const result = await f.service.criar({ descricao: 'Candidato local' }, { commandId: 'cmd-conflict' });
  assert.equal(result.reason, 'CONFLICT');
  assert.equal(result.expectedVersion, 10);
  assert.equal(result.actualVersion, 11);
  assert.equal(f.state.getCollection('cotacoesCompras').length, 0);
  assert.equal(f.events.length, 0);
  assert.equal(f.repository.getPendingWrites()[0].candidate.cotacoesCompras[0].descricao, 'Candidato local');
  assert.equal(f.execution.getAuditRecords()[0].actualVersion, 11);
  assert.equal(f.execution.getAuditRecords()[0].entityType, 'cotacoesCompras');
  assert.equal(f.execution.getAuditRecords()[0].entityId, f.repository.getPendingWrites()[0].candidate.cotacoesCompras[0].id);
});

test('timeout pode ocorrer após aceitação: não declara sucesso nem emite evento', async () => {
  let accepted;
  const f = await repositoryFixture(async candidate => {
    accepted = structuredClone(candidate);
    const error = new Error('Resposta não chegou'); error.name = 'TimeoutError'; throw error;
  });
  const result = await f.service.criar({ descricao: 'Resultado ambíguo' });
  assert.equal(result.reason, 'ERROR');
  assert.equal(result.uncertain, true);
  assert.equal(result.retryRequiresVerification, true);
  assert.equal(accepted.cotacoesCompras.length, 1);
  assert.equal(f.state.getCollection('cotacoesCompras').length, 0);
  assert.equal(f.events.length, 0);
  assert.equal(f.repository.getPendingWrites().length, 1);
});

test('sucesso de outro comando não apaga candidato pendente de conflito', async () => {
  let attempts = 0;
  const f = await repositoryFixture(async () => ++attempts === 1
    ? { ok: false, reason: 'CONFLICT', expectedVersion: 10, actualVersion: 11 } : { ok: true });
  await f.service.criar({ descricao: 'Conflito' }, { commandId: 'cmd-old' });
  await f.service.criar({ descricao: 'Outro' }, { commandId: 'cmd-new' });
  assert.equal(f.repository.getPendingWrites().length, 1);
  assert.equal(f.repository.getPendingWrites()[0].context.commandId, 'cmd-old');
  assert.equal(f.repository.discardPendingWrite('cmd-old'), true);
  assert.equal(f.repository.getPendingWrites().length, 0);
});
