import { isEventType } from './event-types.js';

export function cloneData(value) {
  return structuredClone(value);
}

function freezeData(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freezeData);
  }
  return value;
}

function validatePayload(value, ancestors = new Set()) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object') throw new TypeError('payload deve conter dados JSON.');
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('payload deve conter objetos e arrays simples.');
  if (ancestors.has(value)) throw new TypeError('payload não pode conter ciclos.');
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string')) throw new TypeError('payload não pode conter chaves Symbol.');
  ancestors.add(value);
  Object.values(value).forEach(item => validatePayload(item, ancestors));
  ancestors.delete(value);
}

export function validateEvent(event) {
  if (!event || !isEventType(event.eventType)) throw new TypeError('Tipo de evento desconhecido.');
  if (typeof event.eventId !== 'string' || !event.eventId.trim()) throw new TypeError('eventId obrigatório.');
  if (!Number.isInteger(event.schemaVersion) || event.schemaVersion < 1) throw new TypeError('schemaVersion inválida.');
  if (typeof event.occurredAt !== 'string' || !Number.isFinite(Date.parse(event.occurredAt))) throw new TypeError('occurredAt inválido.');
  if (typeof event.entityType !== 'string' || !event.entityType.trim()) throw new TypeError('entityType obrigatório.');
  if (!['string', 'number'].includes(typeof event.entityId) || (typeof event.entityId === 'string' && !event.entityId.trim()) ||
      (typeof event.entityId === 'number' && !Number.isFinite(event.entityId))) throw new TypeError('entityId inválido.');
  for (const key of ['commandId', 'correlationId', 'causationId', 'actorId']) {
    if (event[key] !== null && (typeof event[key] !== 'string' || !event[key].trim())) throw new TypeError(`${key} inválido.`);
  }
  for (const key of ['instanceId', 'sessionId']) {
    if (event[key] != null && (typeof event[key] !== 'string' || !event[key].trim())) throw new TypeError(`${key} inválido.`);
  }
  if (event.commandId && event.eventId === event.commandId) throw new TypeError('eventId não pode ser commandId.');
  if (typeof event.origin !== 'string' || !event.origin.trim()) throw new TypeError('origin obrigatório.');
  if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) throw new TypeError('payload deve ser um objeto.');
  validatePayload(event.payload);
  return event;
}

export function createEventEnvelope({
  eventId = globalThis.crypto.randomUUID(), eventType, schemaVersion = 2,
  occurredAt = new Date().toISOString(), entityType, entityId,
  commandId = null, correlationId = commandId, causationId = null,
  actorId = null, instanceId = null, sessionId = null, origin = 'agenda-dinamica/iframe', payload = {}
}) {
  return freezeData(cloneData(validateEvent({
    eventId, eventType, schemaVersion, occurredAt, entityType, entityId,
    commandId, correlationId, causationId, actorId, instanceId, sessionId, origin, payload
  })));
}

export function copyEvent(event) {
  return freezeData(cloneData(validateEvent(event)));
}
