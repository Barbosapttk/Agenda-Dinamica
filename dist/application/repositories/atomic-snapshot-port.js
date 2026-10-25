import { STATE_NAMES, validateState } from '../state/app-state.js';

export const SNAPSHOT_KEYS = Object.freeze(Object.fromEntries(STATE_NAMES.map((name, index) => [name,
  ['secta_clientes','secta_contatos','secta_agendamentos','secta_solicitacoes_orcamento',
    'secta_orcamentos','secta_concluidos','secta_hist_clientes','secta_controle_vendas',
    'secta_cotacoes_compras','secta_alarmed','secta_produtos_solicitacoes','secta_theme'][index]])));
const isRevision = value => typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value) && BigInt(value) <= 9223372036854775807n;
export function decodeAtomicSnapshot(data) {
  if (data?.status !== 'SUCCESS' || !isRevision(data.revision) || !Array.isArray(data.rows) || typeof data.protected !== 'boolean') {
    throw new Error('Resposta de snapshot atômico inválida.');
  }
  const values = new Map();
  for (const row of data.rows) {
    if (typeof row?.key !== 'string' || values.has(row.key) || !Object.hasOwn(row,'value')) throw new Error('Rows inválidas.');
    values.set(row.key,row.value);
  }
  const snapshot = Object.fromEntries(STATE_NAMES.map(name => [name,
    values.has(SNAPSHOT_KEYS[name]) ? values.get(SNAPSHOT_KEYS[name]) : name === 'appTheme' ? 'dark' : []]));
  validateState(snapshot);
  return { ok: true, status: 'SUCCESS', reason: 'SUCCESS', confirmation: 'RPC_ACKNOWLEDGED',
    revision: data.revision, snapshot: structuredClone(snapshot), protected: data.protected,
    actorId: data.actorId, commandId: data.commandId, eventId: data.eventId, persistedAt:data.persistedAt,
    replayed: data.replayed === true };
}

export function createAtomicSnapshotPort({ getClient, getExecutionIdentity }) {
  async function identity(context = null) {
    const result = await getExecutionIdentity();
    if (!result?.ok || !result.authenticated || !result.actorId) throw new Error('Sessão authenticated válida obrigatória para persistência protegida.');
    if (context && context.actorId !== result.actorId) throw new Error('Autor mudou; operação não enviada.');
    const client = getClient();
    if (!client?.rpc) throw new Error('RPC Supabase indisponível.');
    return client;
  }
  async function load() {
    const client = await identity();
    const { data, error } = await client.rpc('agenda_snapshot_load');
    if (error) throw new Error('Falha na leitura atômica.', { cause: error });
    return decodeAtomicSnapshot(data);
  }
  async function write(snapshot, { collections, expectedRevision, context, eventId = null }) {
    validateState(snapshot);
    if (!isRevision(expectedRevision)) throw new Error('Revisão de base desconhecida.');
    if (!context?.commandId) throw new Error('commandId obrigatório.');
    if (!Array.isArray(collections) || !collections.length || new Set(collections).size !== collections.length ||
      collections.some(name=>!STATE_NAMES.includes(name))) throw new Error('Coleções inválidas.');
    const client = await identity(context);
    const technical = { commandId: context.commandId, sessionId: context.sessionId,
      instanceId: context.instanceId, correlationId: context.correlationId,
      causationId: context.causationId, origin: context.origin, eventId };
    // actorId é validado localmente, mas não enviado como fonte de verdade.
    const args = { p_expected_revision: expectedRevision,
      p_changes: collections.map(name => ({ key: SNAPSHOT_KEYS[name], value: structuredClone(snapshot[name]) })),
      p_context: Object.fromEntries(Object.entries(technical).filter(([,value])=>value !== undefined)) };
    let result;
    try { result = await client.rpc('agenda_snapshot_commit', args); }
    catch { return { ok:false, status:'ERROR', reason:'ERROR', uncertain:true,
      error:new Error('Confirmação de gravação indisponível; verificar commandId antes de repetir.') }; }
    if (result.error) {
      const definite = ['22023','42501','23505','23514','23502','P0001'].includes(result.error.code);
      return { ok:false, status:'ERROR', reason:'ERROR', uncertain:!definite,
        error:new Error('Gravação atômica não confirmada.',{cause:result.error}) };
    }
    const data = result.data;
    if (data?.status === 'CONFLICT' && data.commandId === context.commandId &&
      data.expectedRevision === expectedRevision && isRevision(data.actualRevision)) {
      return { ok:false, status:'CONFLICT', reason:'CONFLICT', commandId:data.commandId,
        expectedRevision, actualRevision:data.actualRevision, protected:data.protected === true };
    }
    try {
      const response = decodeAtomicSnapshot(data);
      if (response.commandId !== context.commandId || response.actorId !== context.actorId ||
        BigInt(response.revision) !== BigInt(expectedRevision) + 1n ||
        (!response.replayed && response.eventId !== eventId) ||
        (response.eventId != null && (typeof response.eventId !== 'string' || response.eventId === context.commandId)))
        throw new Error('Confirmação não corresponde ao comando.');
      return response;
    } catch { return { ok:false, status:'ERROR', reason:'ERROR', uncertain:true,
      error:new Error('Resposta de confirmação inválida; verificar commandId antes de repetir.') }; }
  }
  return Object.freeze({ load, write });
}
