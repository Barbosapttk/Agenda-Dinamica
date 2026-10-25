// Preserva formulário, confirmação, renderizadores e textos existentes.
export function createComprasUiAdapter({ service, createCommandId = () => globalThis.crypto.randomUUID() }) {
  let formPending = null;
  const pendingActions = new Map();
  const reportFailure = result => {
    if (!result.ok) {
      notify(result.reason === 'CONFLICT'
        ? 'Outro navegador atualizou os dados. Sua alteração foi mantida; recarregue os dados atuais antes de tentar novamente.'
        : result.uncertain ? 'A confirmação não chegou. Sua alteração foi mantida; repita a mesma tentativa para verificar o comando.'
          : 'Erro ao salvar no Supabase. Verifique o console.', '#7a1a1a');
      if (result.reason === 'CONFLICT') {
        const field = document.getElementById('cotacao-compras-descricao');
        const modal = document.getElementById('modalCotacaoCompras');
        const host = modal?.classList.contains('open') ? field.parentElement
          : document.getElementById('cotacoes-compras-kanban')?.parentElement;
        if (host) {
          let button = document.querySelector('[data-compra-recovery]');
          if (!button) {
            button = document.createElement('button');
            button.type = 'button'; button.className = 'btn btn-ghost'; button.dataset.compraRecovery = 'true';
            button.textContent = 'Recarregar dados atuais';
            button.addEventListener('click', () => recover(button));
          }
          host.append(button);
        }
      }
    }
    return result;
  };
  async function recover(button) {
    const formRecovery = Boolean(button.closest('#modalCotacaoCompras'));
    if (!confirm(formRecovery
      ? 'Recarregar os dados atuais? O texto do formulário será mantido para você revisar antes de salvar novamente.'
      : 'Recarregar os dados atuais? A operação rejeitada não será aplicada. Revise os dados antes de tentar novamente.')) return;
    button.disabled = true;
    try {
      const repository = window.AgendaApplication.repositories.snapshot;
      const result = await repository.reloadForRecovery();
      if (!result.ok) return reportFailure(result);
      // O usuário pediu recuperação; candidatos continuam disponíveis até este passo explícito.
      for (const pending of repository.getPendingWrites()) repository.discardPendingWrite(pending.attemptId);
      const modal = document.getElementById('modalCotacaoCompras');
      delete modal.dataset.compraCommandId; delete modal.dataset.compraCommandFingerprint;
      renderizarDadosSincronizados();
      button.remove();
      notify('Dados atuais carregados. Revise sua alteração antes de salvar.', '#6a4a00');
    } finally { button.disabled = false; }
  }

  function save() {
    if (formPending) return formPending;
    const modal = document.getElementById('modalCotacaoCompras');
    const field = document.getElementById('cotacao-compras-descricao');
    const descricao = field.value.trim();
    const status = document.getElementById('cotacao-compras-status').value;
    if (!descricao) {
      notify('Informe a descrição dos itens para salvar a solicitação.', '#7a1a1a');
      field.focus();
      return Promise.resolve({ ok: false, validation: true });
    }
    const editId = modal.dataset.editId;
    const fingerprint = JSON.stringify([editId || null, descricao, status]);
    if (!modal.dataset.compraCommandId || modal.dataset.compraCommandFingerprint !== fingerprint) {
      modal.dataset.compraCommandId = createCommandId();
      modal.dataset.compraCommandFingerprint = fingerprint;
    }
    const commandId = modal.dataset.compraCommandId;
    formPending = (async () => {
      try {
        const result = await (editId
          ? service.editar(editId, { descricao, status }, { commandId })
          : service.criar({ descricao, status }, { commandId }));
        if (!result.ok) return reportFailure(result);
        // Não fecha outro formulário que o usuário tenha aberto durante o await.
        if (modal.dataset.compraCommandId === commandId) {
          closeModal('modalCotacaoCompras');
          limparModalCotacaoCompras();
        }
        notify('✓ Solicitação salva.', '#0d3d2a');
        return result;
      } finally { formPending = null; }
    })();
    return formPending;
  }

  function action(key, execute) {
    if (pendingActions.has(key)) return pendingActions.get(key);
    const promise = Promise.resolve().then(execute).then(reportFailure).finally(() => pendingActions.delete(key));
    pendingActions.set(key, promise);
    return promise;
  }

  function excluir(id) {
    const key = `excluir:${id}`;
    if (pendingActions.has(key)) return pendingActions.get(key);
    if (!confirm('Excluir definitivamente esta solicitação para compras?')) return Promise.resolve({ ok: true, changed: false });
    return action(key, async () => {
      const result = await service.excluir(id);
      if (result.ok && result.changed) notify('✓ Solicitação excluída.', '#0d3d2a');
      return result;
    });
  }

  return Object.freeze({ save, excluir,
    alterarStatus: (id, status) => action(`status:${id}:${status}`, () => service.alterarStatus(id, status)),
    concluir: id => action(`status:${id}:concluido`, () => service.concluir(id)) });
}
