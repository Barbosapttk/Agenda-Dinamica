import { COMPRA_EVENT_TYPES } from '../services/compras-service.js';

const registrations = new WeakMap();

export function registerComprasHandlers(bus, { render }) {
  if (registrations.has(bus)) return registrations.get(bus);
  const handler = () => render();
  const subscriptions = COMPRA_EVENT_TYPES.map(type => bus.subscribe(type, handler, { subscriptionId: `compras:render:${type}` }));
  const dispose = () => { subscriptions.forEach(off => off()); registrations.delete(bus); };
  registrations.set(bus, dispose);
  return dispose;
}
