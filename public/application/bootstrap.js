import { createEventBus } from './events/event-bus.js';
import { EVENT_TYPES } from './events/event-types.js';
import { createEventEnvelope } from './events/event-envelope.js';
import { createAppState } from './state/app-state.js';
import { createSnapshotRepository } from './repositories/snapshot-repository.js';
import { createAuthRepository } from './repositories/auth-repository.js';
import { createAttachmentRepository } from './repositories/attachment-repository.js';
import { createLegacyUiAdapter } from './adapters/legacy-ui-adapter.js';
import { createComprasService } from './services/compras-service.js';
import { createComprasUiAdapter } from './adapters/compras-ui-adapter.js';
import { registerComprasHandlers } from './handlers/compras-handlers.js';
import { createExecutionContext, INSTANCE_STORAGE_KEY } from './context/execution-context.js';
import { createAtomicSnapshotPort } from './repositories/atomic-snapshot-port.js';
import { PERSISTENCE_MODE } from './persistence-config.js';

const APPLICATION_KEY = Symbol.for('agenda-dinamica.application');

export function bootstrapApplication(scope = window, { persistenceMode = PERSISTENCE_MODE } = {}) {
  if (scope[APPLICATION_KEY]) return scope[APPLICATION_KEY];
  const legacy = createLegacyUiAdapter();
  const auth = createAuthRepository({ getClient: legacy.getClient, getCurrentUser: legacy.getCurrentUser });
  auth.startSessionTracking();
  const executionContext = createExecutionContext({ storage: scope.sessionStorage,
    getIdentity: auth.getExecutionIdentity,
    getOpenerInstanceId: () => scope.top?.opener?.sessionStorage.getItem(INSTANCE_STORAGE_KEY) || null });
  const state = createAppState({ readState: legacy.getState, writeState: legacy.setState });
  if (!['legacy','rpc'].includes(persistenceMode)) throw new Error('Modo de persistência inválido.');
  const atomicPersistence = persistenceMode === 'rpc'
    ? createAtomicSnapshotPort({ getClient:legacy.getClient, getExecutionIdentity:auth.getExecutionIdentity }) : null;
  const snapshot = createSnapshotRepository({
    state, loadSnapshot: legacy.loadSnapshot, writeSnapshot: legacy.writeSnapshot,
    isConfigured: legacy.isConfigured, migratedCollections: ['cotacoesCompras'], executionContext, atomicPersistence
  });
  legacy.connectRepository(snapshot);
  const bus = createEventBus();
  const compras = createComprasService({ repository: snapshot, eventBus: bus, getActorId: auth.getActorId, today: legacy.today,
    createCommandId: executionContext.createCommandId, getExecutionContext: executionContext.capture });
  registerComprasHandlers(bus, { render: legacy.renderPurchases });
  let resolveReady, rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  let started = false;
  const application = Object.freeze({
    version: 1, state, legacy, executionContext,
    events: Object.freeze({ bus, types: EVENT_TYPES, createEnvelope: createEventEnvelope }),
    services: Object.freeze({ compras }),
    adapters: Object.freeze({ compras: createComprasUiAdapter({ service: compras, createCommandId: executionContext.createCommandId }) }),
    repositories: Object.freeze({
      snapshot,
      auth,
      attachments: createAttachmentRepository({ prepare: legacy.prepareAttachments, getUrl: legacy.getAttachmentUrl })
    }),
    ready,
    start() {
      if (!started) {
        started = true;
        legacy.start().then(() => resolveReady(application), rejectReady);
      }
      return ready;
    }
  });
  Object.defineProperty(scope, APPLICATION_KEY, { value: application });
  Object.defineProperty(scope, 'AgendaApplication', { value: application, configurable: false });
  return application;
}

if (typeof window !== 'undefined') {
  const application = bootstrapApplication();
  const start = () => { application.start().catch(error => console.error('Falha na inicialização da Agenda:', error)); };
  if (document.readyState === 'complete') start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
}
