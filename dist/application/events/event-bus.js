import { isEventType } from './event-types.js';
import { copyEvent } from './event-envelope.js';

export function createEventBus({ onHandlerError = () => {} } = {}) {
  const subscriptions = new Map();
  let sequence = 0;

  function subscribe(eventType, handler, { subscriptionId } = {}) {
    if (!isEventType(eventType) || typeof handler !== 'function') throw new TypeError('Subscription inválida.');
    if (subscriptionId !== undefined && (typeof subscriptionId !== 'string' || !subscriptionId.trim())) throw new TypeError('subscriptionId inválido.');
    const group = subscriptions.get(eventType) || new Map();
    const existingById = subscriptionId && group.get(subscriptionId);
    if (existingById && existingById.handler !== handler) throw new Error('subscriptionId já utilizado neste evento.');
    const existing = existingById || [...group.values()].find(item => item.handler === handler);
    if (existing) return existing.unsubscribe;
    let id = subscriptionId;
    if (!id) { do { id = `subscription-${++sequence}`; } while (group.has(id)); }
    const record = { id, handler };
    record.unsubscribe = () => {
      if (group.get(id) !== record) return false;
      group.delete(id);
      if (!group.size) subscriptions.delete(eventType);
      return true;
    };
    group.set(id, record);
    subscriptions.set(eventType, group);
    return record.unsubscribe;
  }

  function unsubscribe(eventType, handlerOrId) {
    const group = subscriptions.get(eventType);
    const record = typeof handlerOrId === 'function'
      ? [...(group?.values() || [])].find(item => item.handler === handlerOrId)
      : group?.get(handlerOrId);
    return record?.unsubscribe() || false;
  }

  async function publish(input) {
    const event = copyEvent(input);
    const group = subscriptions.get(event.eventType);
    const result = { eventId: event.eventId, delivered: 0, errors: [] };
    // Ordem de inscrição; um handler com falha não interrompe os demais.
    for (const record of [...(group?.values() || [])]) {
      if (group.get(record.id) !== record) continue;
      try {
        await record.handler(event);
        result.delivered++;
      } catch (error) {
        result.errors.push({ subscriptionId: record.id, error });
        try { onHandlerError(error, { event, subscriptionId: record.id }); } catch { /* Isola também o observador. */ }
      }
    }
    return result;
  }

  function getSubscriptions() {
    return [...subscriptions].flatMap(([eventType, group]) =>
      [...group.values()].map(record => ({ eventType, subscriptionId: record.id })));
  }

  return Object.freeze({ subscribe, unsubscribe, publish, emit: publish, getSubscriptions });
}
