export const INSTANCE_STORAGE_KEY = 'agendaDinamica.technicalInstance.v1';
const INSTANCE_PATTERN = /^inst_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createTechnicalId(kind, randomUUID = () => globalThis.crypto.randomUUID()) {
  if (!['inst', 'run', 'cmd', 'evt', 'corr'].includes(kind)) throw new TypeError('Tipo de identificador desconhecido.');
  return `${kind}_${randomUUID()}`;
}

export function createExecutionContext({ storage, getIdentity = async () => ({ ok: true, actorId: null }),
  getOpenerInstanceId = () => null, randomUUID = () => globalThis.crypto.randomUUID(),
  now = () => new Date().toISOString(), auditLimit = 100 }) {
  if (!Number.isSafeInteger(auditLimit) || auditLimit < 1) throw new TypeError('Limite de auditoria inválido.');
  if (!storage?.getItem || !storage?.setItem) throw new Error('Armazenamento de identidade técnica indisponível.');
  let instanceId = storage.getItem(INSTANCE_STORAGE_KEY);
  // sessionStorage pode ser copiado para uma janela com opener. Essa janela
  // passa a ter outra instância, mantendo o novo ID nos reloads seguintes.
  let openerId = null;
  try { openerId = getOpenerInstanceId(); } catch { /* Opener de outra origem. */ }
  if (!INSTANCE_PATTERN.test(instanceId || '') || (openerId && openerId === instanceId)) {
    instanceId = createTechnicalId('inst', randomUUID);
    storage.setItem(INSTANCE_STORAGE_KEY, instanceId);
  }
  if (storage.getItem(INSTANCE_STORAGE_KEY) !== instanceId) throw new Error('instanceId não pôde ser persistido.');
  // Identifica uma execução do documento; não é uma sessão autenticada.
  const sessionId = createTechnicalId('run', randomUUID);
  const records = [];
  const createCommandId = () => createTechnicalId('cmd', randomUUID);

  async function capture(options = {}) {
    for (const name of Object.keys(options)) {
      if (!['commandId', 'correlationId', 'causationId', 'origin'].includes(name)) throw new TypeError(`Contexto não aceita override de ${name}.`);
    }
    const commandId = options.commandId ?? createCommandId();
    const correlationId = options.correlationId === undefined ? commandId : options.correlationId;
    const causationId = options.causationId ?? null;
    const origin = options.origin ?? 'agenda-dinamica/iframe';
    for (const [name, value] of Object.entries({ commandId, correlationId, causationId, origin })) {
      if (value === null && ['correlationId', 'causationId'].includes(name)) continue;
      if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} inválido.`);
    }
    const technical = { actorId: null, instanceId, sessionId, commandId, correlationId, causationId, origin };
    try {
      const identity = await getIdentity();
      if (!identity?.ok) throw identity?.error || new Error('Identidade da sessão não confirmada.');
      const actorId = identity.actorId ?? null;
      if (actorId !== null && (typeof actorId !== 'string' || !actorId.trim())) throw new TypeError('actorId inválido.');
      return Object.freeze({ ...technical, actorId });
    } catch (error) {
      recordOutcome(technical, { ok: false, reason: 'ERROR', operation: 'identity', confirmation: 'IDENTITY_UNCONFIRMED' });
      throw error;
    }
  }

  function recordOutcome(context, result) {
    if (!context) return;
    // Auditoria somente em memória, sem payload comercial, e-mail, senha ou token.
    records.push(Object.freeze({ ...context, timestamp: now(), operation: result.operation || 'write',
      entityType: result.entityType || 'snapshot', entityId: result.entityId ?? null,
      expectedVersion: result.expectedVersion ?? null, actualVersion: result.actualVersion ?? null,
      reason: result.reason || (result.ok ? 'SUCCESS' : 'ERROR'),
      uncertain: result.uncertain === true, confirmation: result.confirmation || null,
      expectedRevision:result.expectedRevision ?? null, actualRevision:result.actualRevision ?? result.revision ?? null,
      concurrencyProtected: result.protected === true }));
    if (records.length > auditLimit) records.splice(0, records.length - auditLimit);
  }

  return Object.freeze({ capture, createCommandId,
    getInstanceId: () => instanceId, getSessionId: () => sessionId,
    getSessionKind: () => 'technical-execution',
    recordOutcome, getAuditRecords: () => structuredClone(records) });
}
