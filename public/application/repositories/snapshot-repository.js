import { COLLECTION_NAMES, STATE_NAMES, LOAD_STATUS, validateState } from '../state/app-state.js';
import { PersistenceResponseError, persistenceFailure } from './persistence-result.js';

function failure(operation, error) {
  return persistenceFailure(operation, error);
}

// Os ports reutilizam o único leitor/escritor Supabase do legado.
export function createSnapshotRepository({ state, loadSnapshot, writeSnapshot, isConfigured = () => true, migratedCollections = [],
  executionContext = null, atomicPersistence = null }) {
  const migrated = new Set(migratedCollections);
  if ([...migrated].some(name => !COLLECTION_NAMES.includes(name))) throw new TypeError('Coleção migrada desconhecida.');
  let loading = null;
  let saveQueue = Promise.resolve();
  let pendingSaves = 0;
  let lastResult = null;
  let confirmedSnapshot = null;
  const pendingWrites = new Map();
  let attemptSequence = 0;
  let revision = null;
  let serverProtected = false;
  let lastWrite = null;
  let recovering = false;

  function load({ recovery = false } = {}) {
    if (loading) return loading;
    if (atomicPersistence && pendingWrites.size && !recovery) return Promise.resolve({ ok:false,
      reason:'ERROR', status:'ERROR', operation:'load', recoveryRequired:true,
      error:new Error('Alterações pendentes preservadas; recuperação explícita obrigatória.') });
    state.setLoadStatus(LOAD_STATUS.LOADING);
    loading = (async () => {
      try {
        await saveQueue;
        if (!isConfigured()) throw new Error('Supabase não configurado.');
        const result = atomicPersistence ? await atomicPersistence.load() : null;
        const snapshot = structuredClone(validateState(result ? result.snapshot : await loadSnapshot()));
        if (result) {
          state.setState(snapshot);
          revision = result.revision;
          serverProtected = result.protected;
        }
        confirmedSnapshot = structuredClone(snapshot);
        state.setLoadStatus(LOAD_STATUS.READY);
        return lastResult = { ok: true, status:'SUCCESS', reason: 'SUCCESS', operation: 'load', snapshot, revision };
      } catch (error) {
        lastResult = failure('load', error);
        state.setLoadStatus(LOAD_STATUS.ERROR, lastResult.error);
        return lastResult;
      } finally {
        loading = null;
      }
    })();
    return loading;
  }

  function scheduleWrite(operation, action, options = {}) {
    if (state.getLoadStatus().status !== LOAD_STATUS.READY) {
      const result = { ...options.auditMetadata,
        ...failure(operation, new Error('Gravação bloqueada: carga bem-sucedida obrigatória.')), context: options.context || null };
      executionContext?.recordOutcome(result.context, result);
      return Promise.resolve(result);
    }
    pendingSaves++;
    const task = saveQueue.then(async () => {
      let context = options.context || null;
      try {
        // Revalida quando chegar à vez desta gravação.
        if (state.getLoadStatus().status !== LOAD_STATUS.READY || !isConfigured()) throw new Error('Gravação bloqueada: Repository indisponível.');
        if (!context && executionContext) context = await executionContext.capture(options.contextOptions || {});
        const result = await action(context);
        lastResult = { ...options.auditMetadata, ...result, context };
        executionContext?.recordOutcome(context, lastResult);
        return lastResult;
      } catch (error) {
        lastResult = { ...options.auditMetadata, ...failure(operation, error), context };
        executionContext?.recordOutcome(context, lastResult);
        return lastResult;
      } finally {
        pendingSaves--;
      }
    });
    saveQueue = task.then(() => undefined);
    return task;
  }

  async function write(candidate, collections = STATE_NAMES, { silent = false, context = null, eventId = null, baseRevision = revision } = {}) {
    const attemptId = context?.commandId || `local-attempt-${++attemptSequence}`;
    const pending = pendingWrites.get(attemptId);
    if (atomicPersistence && pendingWrites.size && (!pending || recovering))
      throw new Error('Resolva as alterações pendentes antes de enviar outro comando.');
    const expectedRevision = pending?.expectedRevision ?? baseRevision;
    const request = pending?.request || { candidate:structuredClone(candidate), collections:[...collections], context, eventId };
    if (atomicPersistence && pending) {
      const signature = (data,names) => JSON.stringify([...names].sort().map(name=>[name,data[name]]));
      if (signature(candidate,collections) !== signature(request.candidate,request.collections))
        throw new Error('commandId já utilizado por outra intenção pendente.');
    }
    const localBefore = state.getSnapshot();
    const baseBefore = confirmedSnapshot;
    try {
      const result = atomicPersistence ? await atomicPersistence.write(request.candidate, {
        collections:request.collections, expectedRevision, context:request.context, eventId:request.eventId })
        : await writeSnapshot(candidate, { collections, silent, context });
      if (result?.ok !== true) throw new PersistenceResponseError(result || { ok: false, reason: 'ERROR' });
      lastWrite = result;
      if (atomicPersistence) {
        const remote = structuredClone(validateState(result.snapshot));
        const current = state.getSnapshot();
        const patch = {};
        for (const name of STATE_NAMES) {
          if (JSON.stringify(current[name]) === JSON.stringify(baseBefore?.[name]) &&
            JSON.stringify(current[name]) === JSON.stringify(localBefore[name])) patch[name] = remote[name];
        }
        state.setState(patch);
        confirmedSnapshot = remote;
        revision = result.revision;
        serverProtected = result.protected;
      }
    } catch (error) {
      pendingWrites.set(attemptId, { attemptId, candidate: structuredClone(candidate), collections: [...collections], context,
        expectedRevision, request:structuredClone(request),
        ...failure('write', error) });
      throw error;
    }
    pendingWrites.delete(attemptId);
    if (!atomicPersistence) {
      const previous = confirmedSnapshot || candidate;
      confirmedSnapshot = structuredClone(previous);
      for (const name of collections) confirmedSnapshot[name] = structuredClone(candidate[name]);
    }
    return atomicPersistence && lastWrite.persistedAt ? lastWrite.persistedAt : new Date().toISOString();
  }

  function save(snapshot, options = {}) {
    const baseRevision = revision;
    let candidate;
    try { candidate = structuredClone(validateState(snapshot === undefined ? state.getSnapshot() : snapshot)); }
    catch (error) { return Promise.resolve(failure('save', error)); }
    return scheduleWrite('save', async context => {
      const persistedAt = await write(candidate, STATE_NAMES, { context, baseRevision });
      return { ok: true, status:'SUCCESS', reason: 'SUCCESS', confirmation: atomicPersistence ? 'RPC_ACKNOWLEDGED' : 'SDK_ACKNOWLEDGED',
        revision, protected:serverProtected, operation: 'save', snapshot: structuredClone(atomicPersistence ? confirmedSnapshot : candidate), persistedAt };
    }, options);
  }

  function saveLegacy(snapshot = null, options = {}) {
    const explicitRevision = revision;
    let explicit;
    try { explicit = snapshot === null ? null : structuredClone(validateState(snapshot)); }
    catch (error) { return Promise.resolve(failure('save', error)); }
    return scheduleWrite('save', async context => {
      // O debounce captura o estado ao executar, depois de comandos anteriores.
      const candidate = explicit || state.getSnapshot();
      const collections = STATE_NAMES.filter(name => !migrated.has(name) ||
        JSON.stringify(candidate[name]) !== JSON.stringify(confirmedSnapshot?.[name]));
      const persistedAt = await write(candidate, collections, { context, baseRevision:explicit ? explicitRevision : revision });
      return { ok: true, status:'SUCCESS', reason: 'SUCCESS', confirmation: atomicPersistence ? 'RPC_ACKNOWLEDGED' : 'SDK_ACKNOWLEDGED',
        revision, protected:serverProtected, operation: 'save', persistedAt };
    }, options);
  }

  function commitCollection(name, prepare, options = {}) {
    if (!migrated.has(name) || typeof prepare !== 'function') {
      return Promise.resolve(failure('commit', new TypeError('Comando de coleção inválido.')));
    }
    const auditMetadata = { entityType: name, entityId: null };
    return scheduleWrite('commit', async context => {
      const candidate = state.getSnapshot();
      const prepared = prepare(structuredClone(candidate[name]));
      if (!prepared || typeof prepared.changed !== 'boolean') throw new TypeError('Preparação do comando inválida.');
      auditMetadata.entityId = prepared.value?.item?.id ?? null;
      if (!prepared.changed) return { ok: true, reason: 'SUCCESS', confirmation: 'LOCAL_NO_OP', operation: 'commit', changed: false, value: structuredClone(prepared.value) };
      candidate[name] = prepared.next;
      validateState(candidate);
      const persistedAt = await write(candidate, [name], { silent: true, context, eventId:prepared.value?.event?.eventId ?? null });
      // Somente a coleção migrada é aplicada: edições legadas durante o await são preservadas.
      state.setState({ [name]: structuredClone(atomicPersistence ? confirmedSnapshot[name] : prepared.next) });
      return { ok: true, status:'SUCCESS', reason: 'SUCCESS', confirmation: atomicPersistence ? 'RPC_ACKNOWLEDGED' : 'SDK_ACKNOWLEDGED',
        revision, protected:serverProtected, replayed:lastWrite?.replayed === true, eventId:lastWrite?.eventId ?? null,
        operation: 'commit', entityType: name,
        entityId: prepared.value?.item?.id ?? null, changed: true, value: structuredClone(prepared.value), persistedAt };
    }, { ...options, auditMetadata });
  }

  function getStatus() {
    return { ...state.getLoadStatus(), configured: Boolean(isConfigured()), pendingSaves, lastResult,
      concurrency: { mode: atomicPersistence ? 'GLOBAL_REVISION' : 'UNVERSIONED', serverVersionKnown: revision !== null,
        revision, protected: Boolean(atomicPersistence && serverProtected), recoveryRequired: Boolean(atomicPersistence && pendingWrites.size) } };
  }
  return Object.freeze({ load, save, saveLegacy, commitCollection, getStatus,
    getPendingWrites: () => structuredClone([...pendingWrites.values()]),
    discardPendingWrite: attemptId => {
      if (atomicPersistence && !recovering) return false;
      const deleted = pendingWrites.delete(attemptId);
      if (!pendingWrites.size) recovering = false;
      return deleted;
    },
    reloadForRecovery: () => {
      if (!pendingWrites.size) return load();
      recovering = true; return load({ recovery:true });
    },
    getConfirmedSnapshot: () => confirmedSnapshot && structuredClone(confirmedSnapshot) });
}
