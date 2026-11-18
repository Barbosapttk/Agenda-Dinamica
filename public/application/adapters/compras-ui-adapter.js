import { COMPRA_PRIORIDADES, gerarExcelCompra } from '../services/compras-excel.js';

const purchaseField = name => document.getElementById(`cotacao-compras-${name}`);
const itemFields = [
  ['quantidade', 'Quantidade', 'number'], ['unidade', 'Unidade', 'text'],
  ['prd', 'PRD', 'text'], ['descricao', 'Descrição do material', 'textarea'],
  ['aplicacao', 'Aplicação', 'textarea']
];

function addPurchaseItem(item = {}) {
  const list = purchaseField('itens');
  const row = document.createElement('fieldset');
  row.className = 'compra-item';
  row.innerHTML = `<legend>Item</legend>${itemFields.map(([key, label, type]) => `
    <label class="form-group"><span>${label}</span>${type === 'textarea'
      ? `<textarea name="${key}" rows="2"></textarea>`
      : `<input name="${key}" type="${type}" ${type === 'number' ? 'min="0" step="any"' : ''}>`}</label>`).join('')}
    <button type="button" class="btn btn-ghost btn-sm">Remover item</button>`;
  for (const [key] of itemFields) row.querySelector(`[name="${key}"]`).value = item?.[key] ?? '';
  row.querySelector('button').addEventListener('click', () => {
    const focusTarget = row.nextElementSibling?.querySelector('input') || purchaseField('adicionar-item');
    row.remove();
    renumberItems(list);
    focusTarget.focus();
  });
  list.append(row);
  renumberItems(list);
  return row;
}

function renumberItems(list) {
  Array.from(list.children).forEach((row, index) => {
    row.querySelector('legend').textContent = `Item ${index + 1}`;
  });
}

function setPurchaseDetails(item) {
  purchaseField('referencia').value = item?.nomeReferencia ?? '';
  const priority = purchaseField('prioridade');
  priority.replaceChildren(new Option('Selecione', ''), ...Object.entries(COMPRA_PRIORIDADES)
    .map(([value, label]) => new Option(label, value)));
  priority.value = item?.prioridade ?? '';
  purchaseField('observacoes').value = item?.observacoes ?? '';
  purchaseField('itens').replaceChildren();
  if (Array.isArray(item?.itens)) item.itens.forEach(addPurchaseItem);
  purchaseField('excel-salvo').hidden = !item;
}

function readPurchaseDetails() {
  const itens = Array.from(purchaseField('itens').children, row => {
    const item = Object.fromEntries(itemFields.map(([key]) => [key, row.querySelector(`[name="${key}"]`).value.trim()]));
    item.quantidade = row.querySelector('[name="quantidade"]').valueAsNumber;
    if (!Number.isFinite(item.quantidade)) item.quantidade = null;
    return item;
  });
  return { nomeReferencia: purchaseField('referencia').value.trim(), prioridade: purchaseField('prioridade').value,
    observacoes: purchaseField('observacoes').value.trim(), itens };
}

function purchaseFailureMessage(result, form) {
  if (result.reason === 'CONFLICT')
    return 'Outro navegador atualizou os dados. Sua alteração foi mantida; recarregue os dados atuais antes de tentar novamente.';
  if (result.uncertain)
    return 'A confirmação não chegou. Sua alteração foi mantida; repita a mesma tentativa para verificar o comando.';

  const error = result.error?.response?.error ?? result.error;
  const code = error?.code;
  const preserved = form ? ' Os dados preenchidos continuam no formulário.' : '';
  if (code === '42501')
    return 'O Supabase recusou a gravação por falta de permissão (42501).' + preserved;
  if (error?.name?.startsWith('Auth'))
    return 'Falha ao verificar a sessão do Supabase.' + preserved;
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError'))
    return 'A Agenda não conseguiu se conectar ao Supabase. Verifique a conexão e tente novamente.';
  const reference = typeof code === 'string' && /^[A-Z0-9]{5,12}$/.test(code) ? ` (${code})` : '';
  return `Não foi possível salvar a solicitação${reference}.${preserved}`;
}

export function createComprasUiAdapter({ service, createCommandId = () => globalThis.crypto.randomUUID() }) {
  let formPending = null;
  const pendingActions = new Map();
  const reportFailure = (result, form = false) => {
    if (!result.ok) {
      notify(purchaseFailureMessage(result, form), '#7a1a1a');
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
    const solicitacaoId=modal.dataset.solicitacaoId ? Number(modal.dataset.solicitacaoId) : null;
    const input = { descricao, status, ...readPurchaseDetails() };
    const fingerprint = JSON.stringify([editId || null, input, solicitacaoId]);
    if (!modal.dataset.compraCommandId || modal.dataset.compraCommandFingerprint !== fingerprint) {
      modal.dataset.compraCommandId = createCommandId();
      modal.dataset.compraCommandFingerprint = fingerprint;
    }
    const commandId = modal.dataset.compraCommandId;
    formPending = (async () => {
      try {
        const result = await (editId
          ? service.editar(editId, input, { commandId })
          : service.criar({ ...input, solicitacaoId }, { commandId }));
        if (!result.ok) return reportFailure(result, true);
        // Não fecha outro formulário que o usuário tenha aberto durante o await.
        const sameForm=modal.dataset.compraCommandId === commandId;
        const showLinked=sameForm && modal.classList.contains('open');
        if (sameForm) {
          closeModal('modalCotacaoCompras');
          limparModalCotacaoCompras();
        }
        notify('✓ Solicitação salva.', '#0d3d2a');
        if(solicitacaoId && result.item) {
          renderSolicitacoesTabela();
          if(showLinked)abrirModalCotacaoCompras(result.item.id);
        }
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

  async function exportExcel(id, button) {
    button.disabled = true;
    try {
      const item = getCotacoesCompras().find(compra => compra && String(compra.id) === String(id));
      if (!item) throw new Error('Solicitação de Compra indisponível. Atualize a Agenda.');
      await gerarExcelCompra(item);
    } catch (error) {
      notify(error.message || 'Não foi possível gerar o Excel.', '#7a1a1a');
    } finally {
      button.disabled = false;
    }
  }

  return Object.freeze({ save, excluir, setPurchaseDetails, exportExcel,
    addItem: () => addPurchaseItem().querySelector('input').focus(),
    alterarStatus: (id, status) => action(`status:${id}:${status}`, () => service.alterarStatus(id, status)),
    concluir: id => action(`status:${id}:concluido`, () => service.concluir(id)) });
}
