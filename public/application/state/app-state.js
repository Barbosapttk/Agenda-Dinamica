export const COLLECTION_NAMES = Object.freeze([
  'clientes', 'contatos', 'agendamentos', 'solicitacoesOrcamento', 'orcamentos',
  'concluidos', 'historicoClientes', 'controleVendas', 'cotacoesCompras',
  'alarmedIds', 'produtosSolicitacoes'
]);
export const STATE_NAMES = Object.freeze([...COLLECTION_NAMES, 'appTheme']);
export const LOAD_STATUS = Object.freeze({ IDLE: 'IDLE', LOADING: 'LOADING', READY: 'READY', ERROR: 'ERROR' });

export function validateState(value, { partial = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Estado inválido.');
  for (const name of Object.keys(value)) {
    if (!STATE_NAMES.includes(name)) throw new TypeError(`Campo de estado desconhecido: ${name}`);
    if (name === 'appTheme' ? typeof value[name] !== 'string' : !Array.isArray(value[name])) throw new TypeError(`Valor inválido: ${name}`);
  }
  if (!partial && STATE_NAMES.some(name => !Object.hasOwn(value, name))) throw new TypeError('Snapshot incompleto.');
  return value;
}

export function createAppState({ readState, writeState }) {
  let lifecycle = Object.freeze({ status: LOAD_STATUS.IDLE, error: null });
  const getState = () => validateState(readState());
  const getSnapshot = () => structuredClone(getState());
  const getCollection = name => {
    if (!COLLECTION_NAMES.includes(name)) throw new TypeError(`Coleção desconhecida: ${name}`);
    return getState()[name];
  };
  const setState = patch => {
    validateState(patch, { partial: true });
    writeState(patch);
    return getState();
  };
  const updateState = updater => {
    if (typeof updater !== 'function') throw new TypeError('Atualizador inválido.');
    return setState(updater(getSnapshot()));
  };
  const setLoadStatus = (status, error = null) => {
    if (!Object.values(LOAD_STATUS).includes(status)) throw new TypeError('Status de carga inválido.');
    lifecycle = Object.freeze({ status, error });
    return lifecycle;
  };
  return Object.freeze({ getState, getSnapshot, getCollection, setState, updateState, setLoadStatus, getLoadStatus: () => lifecycle });
}
