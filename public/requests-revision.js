/* Administração do catálogo e edição das propostas, usando o estado e save() existentes. */
function atualizarSelectProdutosSolicitacoes(valor) {
  const select = document.getElementById('sol-produto');
  if (!select) return;
  const atual = valor === undefined ? select.value : valor;
  select.replaceChildren(new Option('Selecionar...', ''));
  produtosSolicitacoes.forEach(nome => select.add(new Option(nome, nome)));
  if (atual && !produtosSolicitacoes.includes(atual)) {
    select.add(new Option(`${atual} (valor anterior)`, atual));
  }
  select.value = atual || '';
}

function renderProdutosSolicitacoes() {
  let section = document.getElementById('config-produtos-solicitacoes');
  if (!section) {
    section = document.createElement('section');
    section.id = 'config-produtos-solicitacoes';
    section.className = 'card settings-card';
    section.innerHTML = `<div class="card-header"><div class="card-title">Produtos/Serviços das Solicitações</div></div>
      <div class="settings-card-body"><p>As alterações na lista não modificam solicitações já salvas.</p>
      <button class="btn btn-primary btn-sm" onclick="abrirOpcaoProduto()">Nova opção</button>
      <form id="produto-opcao-form" hidden><label for="produto-opcao-nome">Nome do produto/serviço</label>
        <input id="produto-opcao-nome" required maxlength="200" autocomplete="off">
        <div class="mini-actions"><button class="btn btn-ghost btn-sm" type="button" onclick="this.closest('form').hidden=true">Cancelar</button>
        <button class="btn btn-primary btn-sm" type="submit">Salvar</button></div></form>
      <div id="produto-opcoes-lista"></div></div>`;
    document.querySelector('#view-configuracoes .settings-grid').append(section);
    section.querySelector('form').addEventListener('submit', salvarOpcaoProduto);
  }
  const lista = section.querySelector('#produto-opcoes-lista');
  lista.replaceChildren();
  if (!produtosSolicitacoes.length) lista.textContent = 'Nenhuma opção cadastrada. Use Nova opção para começar.';
  produtosSolicitacoes.forEach(nome => {
    const row = document.createElement('div');
    row.className = 'produto-opcao-row';
    const label = document.createElement('span');
    label.textContent = nome;
    row.append(label);
    for (const [texto, action] of [['Editar', () => abrirOpcaoProduto(nome)], ['Excluir', () => excluirOpcaoProduto(nome)]]) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.textContent = texto;
      btn.onclick = action;
      row.append(btn);
    }
    lista.append(row);
  });
}

function abrirOpcaoProduto(nome = '') {
  const form = document.getElementById('produto-opcao-form');
  form.dataset.original = nome;
  form.hidden = false;
  document.getElementById('produto-opcao-nome').value = nome;
  document.getElementById('produto-opcao-nome').focus();
}

function salvarOpcaoProduto(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const original = form.dataset.original;
  const nome = document.getElementById('produto-opcao-nome').value.trim();
  if (!nome) return;
  if (produtosSolicitacoes.some(n => n !== original && n.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'))) {
    notify('Essa opção já está cadastrada.', '#7a1a1a'); return;
  }
  if (original) {
    const i = produtosSolicitacoes.indexOf(original);
    if (i < 0) { notify('A lista mudou. Abra a opção novamente.', '#7a1a1a'); return; }
    produtosSolicitacoes[i] = nome;
  } else produtosSolicitacoes.push(nome);
  form.hidden = true;
  save(); renderProdutosSolicitacoes(); atualizarSelectProdutosSolicitacoes();
}

function excluirOpcaoProduto(nome) {
  if (!confirm(`Excluir "${nome}" das opções? Solicitações existentes manterão o valor salvo.`)) return;
  produtosSolicitacoes = produtosSolicitacoes.filter(n => n !== nome);
  save(); renderProdutosSolicitacoes(); atualizarSelectProdutosSolicitacoes();
}

// As linhas administrativas têm IDs estáveis. Propostas legadas sem linha usam os campos da origem.
function linhasEdicaoProposta(p) {
  if (p.controleVendas?.length) return p.controleVendas;
  const item = propostaSourceFromRef(p.ref)?.item || {};
  const tipos = ['pecas', 'servico'].filter(t => t === 'pecas' ? p.pecas : p.servico);
  if (!tipos.length) tipos.push(item.tipoOrcamento === 'servico' ? 'servico' : 'pecas');
  return tipos.map(tipo => ({
    tipoOrcamento: tipo,
    numeroProposta: tipo === 'pecas' ? p.pecas || '' : p.servico || '',
    valor: item.valoresProposta?.[tipo] || 0,
    resumo: item.produto || ''
  }));
}

let edicaoPropostaAtual = null;
function abrirEditarProposta(ref) {
  const p = listaPropostasHistorico().find(p => p.ref === ref);
  if (!p) return;
  let modal = document.getElementById('modalEditarProposta');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalEditarProposta';
    modal.className = 'modal-overlay';
    modal.innerHTML = `<form class="modal" role="dialog" aria-modal="true" aria-labelledby="editar-proposta-title">
      <div class="modal-header"><div class="modal-title" id="editar-proposta-title">Editar proposta</div>
      <button class="modal-close" type="button" aria-label="Fechar" onclick="closeModal('modalEditarProposta')">×</button></div>
      <div class="modal-body" id="editar-proposta-linhas"></div>
      <div class="modal-footer"><button type="button" class="btn btn-ghost" onclick="closeModal('modalEditarProposta')">Cancelar</button>
      <button type="submit" class="btn btn-primary">Salvar alterações</button></div></form>`;
    modal.querySelector('form').addEventListener('submit', salvarEdicaoProposta);
    document.body.append(modal);
  }
  const rows = linhasEdicaoProposta(p);
  edicaoPropostaAtual = { ref, rows: rows.map(r => ({...r})) };
  const esc = escaparHtmlCotacaoCompras;
  document.getElementById('editar-proposta-linhas').innerHTML = rows.map((r,i) => `<fieldset class="proposta-edit-row">
    <legend>${esc(tipoOrcamentoLabel(r.tipoOrcamento))}</legend>
    <div class="form-group"><label for="editar-proposta-numero-${i}">Número da proposta</label><input id="editar-proposta-numero-${i}" class="editar-proposta-numero" value="${esc(r.numeroProposta || '')}" required maxlength="100"></div>
    <div class="form-group"><label for="editar-proposta-valor-${i}">Valor da proposta (R$)</label><input id="editar-proposta-valor-${i}" class="editar-proposta-valor" inputmode="decimal" value="${Number(r.valor || 0).toFixed(2).replace('.', ',')}" required placeholder="7.500,00"></div>
  </fieldset>`).join('');
  modal.classList.add('open');
  modal.querySelector('input').focus();
}

function salvarEdicaoProposta(event) {
  event.preventDefault();
  const editing = edicaoPropostaAtual;
  if (!editing) return;
  const p = listaPropostasHistorico().find(p => p.ref === editing.ref);
  const source = propostaSourceFromRef(editing.ref);
  if (!p || !source) { notify('Proposta indisponível. Atualize a lista.', '#7a1a1a'); return; }
  const atual = linhasEdicaoProposta(p);
  if (JSON.stringify(atual.map(r => [r.id, r.numeroProposta, r.valor])) !== JSON.stringify(editing.rows.map(r => [r.id, r.numeroProposta, r.valor]))) {
    notify('A proposta mudou. Feche e abra a edição novamente.', '#7a1a1a'); return;
  }
  const novas = [...document.querySelectorAll('#editar-proposta-linhas .proposta-edit-row')].map(el => {
    const numero = el.querySelector('.editar-proposta-numero').value.trim();
    const texto = el.querySelector('.editar-proposta-valor').value.trim();
    const valido = /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(texto) || /^\d+\.\d{1,2}$/.test(texto);
    const valor = Number(texto.includes(',') || /^\d{1,3}(?:\.\d{3})+$/.test(texto) ? texto.replaceAll('.', '').replace(',', '.') : texto);
    return { numero, valor, valido: valido && Number.isFinite(valor) && valor >= 0 && valor <= Number.MAX_SAFE_INTEGER / 100 };
  });
  if (novas.some(n => !n.numero || !n.valido)) { notify('Informe número e valor válidos, por exemplo 7.500,00.', '#7a1a1a'); return; }
  // Impede colisões com a chave que o Controle de Vendas utiliza para deduplicação.
  const norm = v => String(v || '').trim().toLocaleLowerCase('pt-BR');
  const keys = new Set();
  for (let i=0; i<atual.length; i++) {
    const row = atual[i], nova = novas[i];
    const key = `${norm(nova.numero)}|${row.tipoOrcamento}`;
    if (keys.has(key) || (row.id && controleVendas.some(r => !r.excluido && r.id !== row.id && norm(r.numeroProposta) === norm(nova.numero) && r.tipoOrcamento === row.tipoOrcamento && ((r.clienteId && r.clienteId === row.clienteId) || norm(r.cliente) === norm(row.cliente))))) {
      notify('Já existe uma proposta desse tipo com esse número para o cliente.', '#7a1a1a'); return;
    }
    keys.add(key);
  }
  const item = source.item;
  // Atualiza somente contatos espelhados que correspondem à origem, data e números anteriores.
  const espelhos = source.tipo === 'concluido' ? contatos.filter(ct => ct.clienteId === item.clienteId && ct.data === item.concluidoEm && ct.origemOrcamento && (ct.numeroOrcamentoPecas || ct.numeroOrcamentoServico) && (ct.numeroOrcamentoPecas || '') === (item.numeroOrcamentoPecas || '') && (ct.numeroOrcamentoServico || '') === (item.numeroOrcamentoServico || '')) : [];
  atual.forEach((row,i) => {
    if (row.id) {
      row.numeroProposta = novas[i].numero;
      row.valor = novas[i].valor;
      row.chaveControle = `${row.numeroProposta}::${row.tipoOrcamento}::${row.clienteId || row.cliente}`;
      row.atualizadoEm = today();
    }
  });
  for (const destino of [item, ...espelhos]) {
    destino.valoresProposta = {...destino.valoresProposta};
    for (const tipo of ['pecas', 'servico']) {
      const indices = atual.map((r,i) => r.tipoOrcamento === tipo ? i : -1).filter(i => i >= 0);
      if (!indices.length) continue;
      destino[tipo === 'pecas' ? 'numeroOrcamentoPecas' : 'numeroOrcamentoServico'] = indices.map(i => novas[i].numero).join(' / ');
      destino.valoresProposta[tipo] = indices.reduce((s,i) => s + novas[i].valor, 0);
    }
    destino.atualizadoEm = today();
  }
  save(); closeModal('modalEditarProposta'); edicaoPropostaAtual = null;
  renderizarDadosSincronizados();
  notify('✓ Número e valor da proposta atualizados.', '#0d3d2a');
}

renderProdutosSolicitacoes();
atualizarSelectProdutosSolicitacoes();
