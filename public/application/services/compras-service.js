import { EVENT_TYPES } from '../events/event-types.js';
import { createEventEnvelope } from '../events/event-envelope.js';

export const COMPRA_STATUS = Object.freeze(['enviado', 'sem_retorno', 'concluido']);
export const COMPRA_EVENT_TYPES = Object.freeze([
  EVENT_TYPES.SOLICITACAO_COMPRA_CRIADA, EVENT_TYPES.SOLICITACAO_COMPRA_EDITADA,
  EVENT_TYPES.SOLICITACAO_COMPRA_STATUS_ALTERADO, EVENT_TYPES.SOLICITACAO_COMPRA_CONCLUIDA,
  EVENT_TYPES.SOLICITACAO_COMPRA_EXCLUIDA
]);

const normalizeStatus = status => COMPRA_STATUS.includes(status) ? status : 'enviado';
const sameId = (left, right) => String(left) === String(right);
function audit(item) {
  return { id: item.id, descricao: item.descricao || '', status: item.status || 'enviado',
    concluida: item.concluida === true, criadoEm: item.criadoEm || null, atualizadoEm: item.atualizadoEm || null };
}

export function createComprasService({ repository, eventBus, createEnvelope = createEventEnvelope,
  getActorId = () => null, today = () => new Date().toISOString().slice(0, 10),
  now = () => new Date().toISOString(), createCommandId = () => globalThis.crypto.randomUUID(),
  createId = () => Date.now(), getExecutionContext = null }) {
  // Idempotência local: mesmo comando em andamento compartilha a Promise.
  // Sucessos não são regravados nem republicados; falhas podem ser tentadas novamente.
  const commands = new Map();

  function run(operation, input, options, prepare) {
    const commandId = options?.commandId ?? createCommandId();
    if (typeof commandId !== 'string' || !commandId.trim()) return Promise.resolve({ ok: false, reason: 'ERROR', error: new TypeError('commandId inválido.') });
    const fingerprint = JSON.stringify([operation, input]);
    let command = commands.get(commandId);
    if (command && command.fingerprint !== fingerprint) return Promise.resolve({ ok: false, reason: 'ERROR', commandId, error: new Error('commandId reutilizado para outra operação.') });
    if (command?.pending) return command.pending;
    if (command?.result?.ok) return Promise.resolve({ ...command.result, replayed: true });
    if (!command) {
      command = { fingerprint, creationId: null, pending: null, result: null };
      commands.set(commandId, command);
    }
    command.pending = Promise.resolve().then(async () => {
      try {
        let context = null;
        if (getExecutionContext) {
          const contextOptions = { commandId };
          for (const key of ['correlationId', 'causationId', 'origin']) if (options?.[key] !== undefined) contextOptions[key] = options[key];
          context = await getExecutionContext(contextOptions);
          if (command.context && command.context.actorId !== context.actorId) throw new Error('Autor mudou entre tentativas do mesmo comando.');
          command.context = context;
        }
        const result = await repository.commitCollection('cotacoesCompras', list => {
          if (command.prepared && repository.getStatus().concurrency.mode === 'GLOBAL_REVISION') return structuredClone(command.prepared);
          const prepared = prepare(list, command, commandId);
          if (prepared.changed) {
            let actorId = null;
            if (!context) { try { actorId = getActorId(); } catch { /* Identidade desconhecida. */ } }
            // Valida o fato antes de escrever; publicação só ocorre depois da confirmação.
            prepared.value.event = createEnvelope({ ...context, eventType: prepared.value.eventType,
              entityType: 'solicitacao_compra', entityId: prepared.value.item.id, commandId,
              occurredAt: now(), actorId: context ? context.actorId : typeof actorId === 'string' && actorId.trim() ? actorId : null,
              payload: prepared.value.payload });
          }
          if (prepared.changed && repository.getStatus().concurrency.mode === 'GLOBAL_REVISION') command.prepared = structuredClone(prepared);
          return prepared;
        }, { context });
        if (!result.ok) return command.result = { ...result, commandId };
        const value = result.value;
        const response = { ok: true, reason: 'SUCCESS', confirmation: result.confirmation,
          revision:result.revision, protected:result.protected, replayed:result.replayed === true,
          changed: result.changed, commandId, context, item: value?.item || null };
        if (result.changed) {
          // Estado já confirmado pelo Repository; falha de handler não desfaz gravação.
          response.event = value.event;
          try {
            response.event = createEnvelope({ ...value.event, eventId:result.eventId || value.event.eventId,
              occurredAt: result.persistedAt || value.event.occurredAt });
            response.delivery = await eventBus.publish(response.event);
          }
          catch (error) { response.delivery = { delivered: 0, errors: [{ error }] }; }
        }
        return command.result = response;
      } catch (error) {
        return command.result = { ok: false, reason: 'ERROR', commandId, error };
      } finally {
        command.pending = null;
      }
    });
    return command.pending;
  }

  function criar({ descricao, status = 'enviado' } = {}, options) {
    const text = typeof descricao === 'string' ? descricao.trim() : '';
    const selected = normalizeStatus(status);
    return run('criar', { descricao: text, status: selected }, options, (list, command, commandId) => {
      if (!text) throw new Error('Informe a descrição dos itens para salvar a solicitação.');
      const existing = list.find(item => item?.creationCommandId === commandId);
      if (existing) return { changed: false, value: { item: existing } };
      let id = command.creationId ?? createId();
      if (!Number.isSafeInteger(id)) throw new TypeError('ID de compra inválido.');
      while (list.some(item => item && sameId(item.id, id))) id++;
      command.creationId = id;
      const date = today();
      const item = { id, descricao: text, status: selected, concluida: selected === 'concluido',
        criadoEm: date, atualizadoEm: date, creationCommandId: commandId };
      return { changed: true, next: [...list, item], value: { item,
        eventType: EVENT_TYPES.SOLICITACAO_COMPRA_CRIADA, payload: { ...audit(item) } } };
    });
  }

  function editar(id, { descricao, status } = {}, options) {
    const text = typeof descricao === 'string' ? descricao.trim() : '';
    return run('editar', { id: String(id), descricao: text, status: status ?? null }, options, list => {
      if (!text) throw new Error('Informe a descrição dos itens para salvar a solicitação.');
      const index = list.findIndex(item => item && sameId(item.id, id));
      if (index < 0) throw new Error('Solicitação para compras não encontrada.');
      const previous = list[index];
      const selected = status === undefined ? previous.status || 'enviado' : normalizeStatus(status);
      const changes = {};
      for (const [field, value] of Object.entries({ descricao: text, status: selected, concluida: selected === 'concluido' })) {
        if (previous[field] !== value) changes[field] = { de: previous[field] ?? null, para: value };
      }
      if (!Object.keys(changes).length) return { changed: false, value: { item: previous } };
      const item = { ...previous, descricao: text, status: selected, concluida: selected === 'concluido', atualizadoEm: today() };
      const next = [...list]; next[index] = item;
      return { changed: true, next, value: { item, eventType: EVENT_TYPES.SOLICITACAO_COMPRA_EDITADA,
        payload: { id: item.id, camposAlterados: changes, anterior: audit(previous), atual: audit(item) } } };
    });
  }

  function changeStatus(id, status, options) {
    return run('status', { id: String(id), status }, options, list => {
      if (!COMPRA_STATUS.includes(status)) throw new Error('Status de compras inválido.');
      const index = list.findIndex(item => item && sameId(item.id, id));
      if (index < 0) return { changed: false, value: { item: null } };
      const previous = list[index];
      if (previous.status === status && previous.concluida === (status === 'concluido')) return { changed: false, value: { item: previous } };
      const item = { ...previous, status, concluida: status === 'concluido', atualizadoEm: today() };
      const next = [...list]; next[index] = item;
      const concluded = status === 'concluido';
      return { changed: true, next, value: { item,
        eventType: concluded ? EVENT_TYPES.SOLICITACAO_COMPRA_CONCLUIDA : EVENT_TYPES.SOLICITACAO_COMPRA_STATUS_ALTERADO,
        payload: concluded ? { id: item.id, status, statusAnterior: previous.status || 'enviado', dataConclusao: item.atualizadoEm }
          : { id: item.id, statusAnterior: previous.status || 'enviado', novoStatus: status, timestamp: now() } } };
    });
  }

  function excluir(id, options) {
    return run('excluir', { id: String(id) }, options, list => {
      const item = list.find(row => row && sameId(row.id, id));
      if (!item) return { changed: false, value: { item: null } };
      return { changed: true, next: list.filter(row => !row || !sameId(row.id, id)),
        value: { item, eventType: EVENT_TYPES.SOLICITACAO_COMPRA_EXCLUIDA, payload: { ...audit(item) } } };
    });
  }

  return Object.freeze({ criar, editar, alterarStatus: changeStatus,
    concluir: (id, options) => changeStatus(id, 'concluido', options), excluir });
}
