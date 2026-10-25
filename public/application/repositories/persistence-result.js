export const PERSISTENCE_REASON = Object.freeze({ SUCCESS: 'SUCCESS', CONFLICT: 'CONFLICT', ERROR: 'ERROR' });

export class PersistenceResponseError extends Error {
  constructor(response) {
    super(response.error?.message || (response.reason === 'CONFLICT' ? 'Conflito informado pelo servidor.' : 'Persistência não confirmada.'));
    this.name = 'PersistenceResponseError';
    this.response = response;
  }
}

export function persistenceFailure(operation, error) {
  const response = error?.response;
  const conflict = (response?.reason || response?.status) === PERSISTENCE_REASON.CONFLICT;
  const result = { ok: false, operation, reason: conflict ? PERSISTENCE_REASON.CONFLICT : PERSISTENCE_REASON.ERROR,
    status: conflict ? PERSISTENCE_REASON.CONFLICT : PERSISTENCE_REASON.ERROR,
    error: error instanceof Error ? error : new Error(error?.message || String(error), { cause: error }) };
  if (conflict) {
    result.expectedVersion = response.expectedVersion ?? null;
    result.actualVersion = response.actualVersion ?? null;
    result.expectedRevision = response.expectedRevision ?? response.expectedVersion ?? null;
    result.actualRevision = response.actualRevision ?? response.actualVersion ?? null;
    result.commandId = response.commandId ?? null;
  }
  if (response?.uncertain || ['TimeoutError', 'AbortError'].includes(error?.name) ||
      ['TimeoutError', 'AbortError'].includes(response?.error?.name)) {
    result.uncertain = true;
    result.retryRequiresVerification = true;
  }
  return result;
}
