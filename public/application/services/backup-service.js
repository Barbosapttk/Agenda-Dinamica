import { COLLECTION_NAMES, STATE_NAMES, validateState } from '../state/app-state.js';

export const BACKUP_VERSION = 1;
export const RECOVERY_KEY = 'agenda-dinamica.recovery.v1';
export const ALARM_SETTINGS_KEY = 'agendaDinamicaAlarmSettingsV2';
export const COLLECTION_LABELS = Object.freeze({ clientes:'clientes', contatos:'contatos', agendamentos:'retornos',
  solicitacoesOrcamento:'solicitações', orcamentos:'recorrentes', concluidos:'conclusões/propostas',
  historicoClientes:'alterações de clientes', controleVendas:'vendas', cotacoesCompras:'compras',
  alarmedIds:'alarmes já exibidos', produtosSolicitacoes:'produtos/serviços', transportadoras:'transportadoras' });

function validateData(data) {
  validateState(data);
  if (!['light','dark'].includes(data.appTheme)) throw new Error('Tema inválido.');
  for (const name of COLLECTION_NAMES) {
    if (['alarmedIds','produtosSolicitacoes'].includes(name)) {
      if (data[name].some(item => typeof item !== 'string' && (name !== 'alarmedIds' || typeof item !== 'number'))) throw new Error(`Coleção inválida: ${name}`);
      continue;
    }
    const ids = new Set();
    for (const item of data[name]) {
      if (!item || typeof item !== 'object' || Array.isArray(item) || !['string','number'].includes(typeof item.id) || (typeof item.id === 'number' && !Number.isFinite(item.id)) || !String(item.id).trim() || ids.has(String(item.id))) throw new Error(`Registro inválido/duplicado em ${name}.`);
      ids.add(String(item.id));
    }
  }
  return data;
}
function validateSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings) || Object.keys(settings).some(key => key !== 'alarms')) throw new Error('Configurações inválidas.');
  if (settings.alarms !== null && (typeof settings.alarms !== 'object' || Array.isArray(settings.alarms))) throw new Error('Preferências de alarmes inválidas.');
  if (settings.alarms) for (const [key,value] of Object.entries(settings.alarms)) {
    if (['retornos','recorrentes','solicitacoesHoje','propostasSemResposta','propostasAjuste','som','push'].includes(key)) {
      if (typeof value !== 'boolean') throw new Error('Preferência de alarme inválida.');
    } else if (key === 'sonecaMinutos') {
      if (!Number.isFinite(value) || value <= 0 || value > 1440) throw new Error('Soneca inválida.');
    } else if (key === 'horaComercial') {
      if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Horário de alarme inválido.');
    } else throw new Error(`Preferência de alarme desconhecida: ${key}`);
  }
}
export function createBackup(data, settings = { alarms:null }, now = () => new Date().toISOString()) {
  validateData(data); validateSettings(settings);
  return structuredClone({ backupVersion:BACKUP_VERSION, createdAt:now(), application:'Agenda Dinâmica',
    metadata:{ collections:[...COLLECTION_NAMES], attachments:'embedded-data-and-remote-references',
      excluded:['local-tools','authentication','remote-attachment-binaries'] }, data, settings });
}
export function parseBackup(input) {
  const backup = typeof input === 'string' ? JSON.parse(input) : structuredClone(input);
  if (!backup || backup.application !== 'Agenda Dinâmica') throw new Error('Formato de backup inválido. Selecione o JSON versionado da Agenda.');
  if (backup.backupVersion !== BACKUP_VERSION) throw new Error(`Versão de backup não suportada: ${backup.backupVersion ?? 'ausente'}.`);
  if (typeof backup.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(backup.createdAt) || !Number.isFinite(Date.parse(backup.createdAt))) throw new Error('Data de criação inválida.');
  if (!backup.metadata || !Array.isArray(backup.metadata.collections)) throw new Error('Inventário do backup incompleto.');
  const inventory=JSON.stringify([...backup.metadata.collections].sort());
  const oldNames=COLLECTION_NAMES.filter(name=>name!=='transportadoras');
  // Extensão aditiva do formato 1: backups anteriores ao B1 não possuem transportadoras.
  // A prévia mostra explicitamente zero transportadoras antes da confirmação de substituição.
  if (inventory===JSON.stringify([...oldNames].sort()) && backup.data && !Object.hasOwn(backup.data,'transportadoras')) {
    backup.data.transportadoras=[];backup.metadata.collections=[...COLLECTION_NAMES];
  } else if(inventory!==JSON.stringify([...COLLECTION_NAMES].sort())) throw new Error('Inventário do backup incompleto.');
  validateData(backup.data); validateSettings(backup.settings);
  return backup;
}
export function backupSummary(backup) {
  const valid = parseBackup(backup);
  return COLLECTION_NAMES.map(name => `${valid.data[name].length} ${COLLECTION_LABELS[name]}`).join('\n');
}
export function createBackupService({ state, repository, storage, beforeReplace = () => {}, afterReplace = () => {} }) {
  let busy = false;
  const settings = () => ({ alarms:JSON.parse(storage.getItem(ALARM_SETTINGS_KEY) || 'null') });
  const exportBackup = () => createBackup(state.getSnapshot(), settings());
  async function replace(backup, { confirmed = false, deleting = false } = {}) {
    if (!confirmed) throw new Error('Confirmação explícita obrigatória.');
    if (busy) throw new Error('Outra operação de dados está em andamento.');
    const valid = parseBackup(backup);
    busy = true;
    try {
      await beforeReplace();
      const protection = exportBackup();
      const serialized = JSON.stringify(protection);
      storage.setItem(RECOVERY_KEY, serialized);
      if (storage.getItem(RECOVERY_KEY) !== serialized) throw new Error('Não foi possível proteger o estado atual. Nenhum dado foi substituído.');
      const result = await repository.replaceSnapshot(valid.data, {
        applySettings() {
          if (valid.settings.alarms === null) storage.removeItem(ALARM_SETTINGS_KEY);
          else storage.setItem(ALARM_SETTINGS_KEY,JSON.stringify(valid.settings.alarms));
        },
        rollbackSettings() {
          if (protection.settings.alarms === null) storage.removeItem(ALARM_SETTINGS_KEY);
          else storage.setItem(ALARM_SETTINGS_KEY,JSON.stringify(protection.settings.alarms));
        }
      });
      if (!result.ok) throw result.error || new Error('Falha ao substituir dados.');
      if (deleting) {
        // Somente as antigas chaves comerciais da Agenda, nunca o armazenamento global.
        for (const key of ['secta_clientes','secta_contatos','secta_agendamentos','secta_solicitacoes_orcamento','secta_orcamentos','secta_concluidos','secta_hist_clientes','secta_controle_vendas','secta_cotacoes_compras','secta_alarmed','secta_produtos_solicitacoes','secta_transportadoras','secta_theme']) storage.removeItem(key);
      }
      afterReplace();
      return result;
    } finally { busy = false; }
  }
  return Object.freeze({ exportBackup, restore:replace,
    erase(options) {
      const empty = Object.fromEntries(STATE_NAMES.map(name => [name, name === 'appTheme' ? 'dark' : []]));
      return replace(createBackup(empty), { ...options, deleting:true });
    }, getRecoveryBackup:() => parseBackup(storage.getItem(RECOVERY_KEY)), isBusy:() => busy });
}
