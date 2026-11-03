import { backupSummary, parseBackup } from '../services/backup-service.js';

export function installBackupUi({ scope, service }) {
  let selected = null;
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true; input.id = 'agenda-backup-file';
  document.body.append(input);
  const dialog = document.createElement('dialog');
  dialog.id = 'agenda-backup-preview'; dialog.className = 'backup-preview';
  dialog.innerHTML = '<h3>Restaurar backup da Agenda</h3><p data-backup-created></p><pre data-backup-summary></pre><p>Serão substituídos todos os dados comerciais, o tema e as preferências de alarmes. Ferramentas pessoais e arquivos do Storage permanecem. Uma cópia do estado atual será protegida neste navegador antes da substituição.</p><div class="settings-actions"><button class="btn btn-ghost" data-backup-cancel>Cancelar</button><button class="btn btn-danger" data-backup-confirm>Confirmar restauração</button></div>';
  document.body.append(dialog);
  function cancel() { selected = null; input.value = ''; dialog.close(); }
  dialog.querySelector('[data-backup-cancel]').onclick = cancel;
  dialog.addEventListener('cancel', () => { selected = null; input.value = ''; });
  async function execute(action) {
    if (service.isBusy()) return;
    const app = document.querySelector('.app');
    const wasLoaded = appLoaded;
    // Suspende autosync e edição durante a substituição, sem recriar identidade/autenticação.
    appLoaded = false;
    app?.setAttribute('inert','');
    try {
      // O port legado requer appLoaded para gravar; sincronização é suspensa separadamente.
      appLoaded = wasLoaded;
      scope.agendaDataMaintenance = true;
      const result = await action();
      notify('✓ Dados confirmados. Recarregando a Agenda.','#0d3d2a');
      scope.location.reload();
      return result;
    } catch (error) {
      notify(`Operação não concluída: ${error.message} A cópia de proteção, se criada, está disponível em Configurações.`, '#7a1a1a');
      return { ok:false, error };
    } finally {
      appLoaded = wasLoaded; scope.agendaDataMaintenance = false; app?.removeAttribute('inert');
    }
  }
  input.onchange = async () => {
    selected = null;
    if (!input.files?.[0]) return;
    try {
      selected = parseBackup(await input.files[0].text());
      dialog.querySelector('[data-backup-summary]').textContent = backupSummary(selected);
      dialog.querySelector('[data-backup-created]').textContent = `Criado em ${AgendaFormat.dateTime(selected.createdAt)}`;
      dialog.showModal();
    } catch (error) { input.value = ''; notify(error.message,'#7a1a1a'); }
  };
  dialog.querySelector('[data-backup-confirm]').onclick = async () => {
    if (!selected) return;
    const backup = selected; cancel();
    await execute(() => service.restore(backup,{ confirmed:true }));
  };
  scope.selecionarBackupAgenda = () => { input.value = ''; input.click(); };
  scope.baixarProtecaoAgenda = () => {
    try { downloadBlobFile(`protecao_agenda_${today()}.json`,JSON.stringify(service.getRecoveryBackup(),null,2),'application/json'); }
    catch { notify('Nenhuma cópia de proteção válida neste navegador.','#6a4a00'); }
  };
  scope.resetarTodosDados = async () => {
    if (!confirm('Apagar os dados comerciais da Agenda no Supabase (clientes, contatos, retornos, solicitações, recorrentes, conclusões/propostas, histórico de alterações, vendas, compras, produtos e transportadoras), alarmes exibidos, tema e preferências de alarmes deste navegador? Textos, notas pessoais, tamanhos, tabelas locais e arquivos do Storage serão preservados.')) return;
    if (!confirm('Confirma a exclusão desses dados? Uma cópia de proteção será mantida neste navegador.')) return;
    return execute(() => service.erase({confirmed:true}));
  };
}
