import fs from 'node:fs';
const file='public/original-index.html';
let h=fs.readFileSync(file,'utf8');
function replace(a,b){if(!h.includes(a))throw Error('Missing '+a.slice(0,90));h=h.replace(a,b);}
replace('<input type="text" id="sol-produto" spellcheck="true" lang="pt-BR" placeholder="Ex: CALIBRAÇÃO, MANUTENÇÃO, PEÇA X...">','<select id="sol-produto" aria-label="Produto/Serviço solicitado"><option value="">Selecionar...</option></select><small>Cadastre as opções em Configurações → Produtos/Serviços das Solicitações.</small>');
replace("  theme: 'secta_theme'", "  produtosSolicitacoes: 'secta_produtos_solicitacoes',\n  theme: 'secta_theme'");
replace('let cotacoesCompras = [];','let cotacoesCompras = [];\nlet produtosSolicitacoes = [];');
replace('  applyTheme(appTheme, false);', '  produtosSolicitacoes = Array.isArray(values[STORAGE_KEYS.produtosSolicitacoes]) ? values[STORAGE_KEYS.produtosSolicitacoes] : [];\n  applyTheme(appTheme, false);');
replace('    { key: STORAGE_KEYS.theme, value: appTheme }','    { key: STORAGE_KEYS.produtosSolicitacoes, value: produtosSolicitacoes },\n    { key: STORAGE_KEYS.theme, value: appTheme }');
h=h.replaceAll('cotacoesCompras, alarmedIds, appTheme','cotacoesCompras, produtosSolicitacoes, alarmedIds, appTheme');
replace('function renderizarDadosSincronizados() {','function renderizarDadosSincronizados() {\n  renderProdutosSolicitacoes();\n  atualizarSelectProdutosSolicitacoes();');
replace('function renderConfiguracoes() {','function renderConfiguracoes() {\n  renderProdutosSolicitacoes();');
replace('    utilizadorPlanilha: usuarioAtivo,','    utilizadorPlanilha: usuarioAtivo,\n    produtosSolicitacoes,');
replace("  document.getElementById('sol-produto').value = sol.produto || '';", "  atualizarSelectProdutosSolicitacoes(sol.produto || '');");
replace("  const produto = formatarTextoSistema(document.getElementById('sol-produto').value);", "  const produto = document.getElementById('sol-produto').value;\n  const produtoAnterior = solicitacoesOrcamento.find(s => String(s.id) === document.getElementById('modalSolicitacao').dataset.editId)?.produto || '';\n  if ((!produto || !produtosSolicitacoes.includes(produto)) && produto !== produtoAnterior) { notify('Selecione um produto/serviço cadastrado nas Configurações.', '#7a1a1a'); return; }\n  if (!produto && !document.getElementById('modalSolicitacao').dataset.editId) { notify('Cadastre e selecione um produto/serviço nas Configurações.', '#7a1a1a'); return; }");
replace('  dados.produto = formatarTextoSistema(dados.produto);','  // Produto é uma opção cadastrada ou o texto original de um registro legado.');
// New requests must never inherit the temporary legacy option from an edit.
replace("    document.getElementById('sol-produto').value = '';", "    atualizarSelectProdutosSolicitacoes('');");
// Keep the existing action handlers and drag/drop while replacing only card content.
const start=h.indexOf('function cardKanbanSolicitacao(sol,');
const end=h.indexOf('\nfunction getSolicitacaoConcluida',start);
const old=h.slice(start,end);
const actions=old.slice(old.indexOf('      <div class="orcamento-card-mini-actions">'),old.indexOf('\n    </div>\n    <div class="orcamento-card-meta">'));
const newCard=`function cardKanbanSolicitacao(sol, classeExtra='') {
  const d = dadosSolicitacaoCliente(sol);
  const esc = escaparHtmlCotacaoCompras;
  const atrasado = !sol._concluida && sol.prazo && sol.prazo < today();
  return \`<div class="orcamento-card request-mini \${classeExtra || ''}" draggable="\${!sol._concluida}" data-sol-id="\${sol.id}" \${!sol._concluida ? \`ondblclick="irParaSolicitacaoEditar(\${sol.id})" title="Duplo clique para editar"\` : ''} ondragstart="dragSolicitacaoKanban(event, \${sol.id})" ondragend="dragEndSolicitacaoKanban(event)">
    <div class="mini-heading">
      <div class="orcamento-card-title">\${esc(d.nome)}</div>
      <div class="mini-deadline \${atrasado ? 'overdue' : ''}"><small>\${sol._concluida ? 'Concluído em' : 'Prazo de envio'}</small><strong>\${fmtDate(sol._concluida ? sol.concluidoEm : sol.prazo)}</strong>\${atrasado ? '<small>Atrasada</small>' : ''}</div>
    </div>
    <div class="mini-item"><small>Item solicitado</small><strong>\${esc(sol.produto || 'Não informado')}</strong></div>
    \${d.solicitante ? \`<div class="mini-requester">Solicitante: \${esc(d.solicitante)}</div>\` : ''}
    \${!sol.clienteId ? '<div class="mini-requester">Sem cliente cadastrado</div>' : ''}
    <div class="mini-actions">
${actions}
      \${!sol._concluida ? \`<button class="btn btn-ghost btn-sm" title="Abrir detalhes" onclick="abrirFluxoSolicitacao(\${sol.id}); event.stopPropagation();">Detalhes</button><button class="btn btn-danger btn-sm" title="Excluir solicitação" onclick="excluirSolicitacaoOrcamento(\${sol.id}); event.stopPropagation();"><i class="fa-solid fa-trash"></i></button>\` : ''}
      \${!sol._concluida && !sol.clienteId ? \`<button class="btn btn-ghost btn-sm" title="Criar cliente" onclick="criarClienteFromSolicitacao(\${sol.id}); event.stopPropagation();"><i class="fa-solid fa-user-plus"></i></button>\` : ''}
    </div>
  </div>\`;
}

`;
h=h.slice(0,start)+newCard+h.slice(end);
const rs=h.indexOf('function renderSolicitacaoCards(list)');
const re=h.indexOf('\nfunction getSolicitacoesFiltradasBase',rs);
h=h.slice(0,rs)+"function renderSolicitacaoCards(list) {\n  return list.map(sol => cardKanbanSolicitacao(sol, 'solicitacao')).join('');\n}\n"+h.slice(re);
// Edit the effective final proposal renderer; earlier definitions are superseded.
const ps=h.lastIndexOf('  window.renderPropostaKanbanCard = function(p){');
const pe=h.indexOf('  window.renderPropostasAcompanhamentoKanban = function()',ps);
const pold=h.slice(ps,pe);
const pa=pold.slice(pold.indexOf('      <div class="proposta-kanban-actions">'),pold.indexOf('\n    </div>`;'));
const proposal=`  window.renderPropostaKanbanCard = function(p){
    const status = p.status || 'aguardando_retorno';
    const rows = linhasEdicaoProposta(p);
    const source = propostaSourceFromRef(p.ref)?.item;
    const resumo = source?.produto || rows.map(r => r.resumo).filter(Boolean).join(' / ') || p.descricao || 'Não informado';
    return \`<div class="proposta-kanban-card proposal-mini" draggable="true" data-proposta-ref="\${escFinal(p.ref)}" ondblclick="abrirAtualizarStatusProposta('\${escFinal(p.ref)}')" ondragstart="dragPropostaKanban(event,'\${escFinal(p.ref)}')" ondragend="dragEndPropostaKanban(event)">
      <div class="mini-heading"><div class="proposta-kanban-title">\${escFinal(p.nome)}</div><div class="mini-proposal-numbers">\${rows.map(r => \`<div><small>Proposta \${escFinal(r.numeroProposta || 'Sem nº')}</small><strong>\${moedaBRFinal(r.valor)}</strong></div>\`).join('')}</div></div>
      <div class="mini-item"><small>Item / resumo da proposta</small><strong>\${escFinal(resumo)}</strong></div>
      <div class="mini-requester">Status: \${statusPropostaLabelFinal(status)}</div>
      \${rows.filter(r => r.statusPedido).map(r => \`<div class="mini-requester">\${tipoOrcamentoLabelFinal(r.tipoOrcamento)}: \${statusPedidoLabelFinal(r.statusPedido)}</div>\`).join('')}
      \${p.observacaoAtualizacao ? \`<div class="mini-requester">Última atualização: \${escFinal(p.observacaoAtualizacao)}</div>\` : ''}
${pa.replace('<div class="proposta-kanban-actions">', '<div class="proposta-kanban-actions"><button class="btn btn-ghost btn-sm" onclick="abrirEditarProposta(\'${escFinal(p.ref)}\'); event.stopPropagation();"><i class="fa-solid fa-pen"></i> Editar</button>')}
    </div>\`;
  };

`;
h=h.slice(0,ps)+proposal+h.slice(pe);
h=h.replaceAll('Prazo para preparar','Prazo de envio').replaceAll('Prazo original:', 'Prazo de envio original:').replaceAll('Prazo:', 'Prazo de envio:').replaceAll("'Prazo'", "'Prazo de envio'").replaceAll('• Prazo ${','• Prazo de envio ${').replaceAll('Prazo de solicitação chegou!', 'Prazo de envio chegou!').replaceAll('Prazo de orçamento chegando hoje.', 'Prazo de envio chegando hoje.');
replace('</body>', '<link rel="stylesheet" href="requests-revision.css">\n<script src="requests-revision.js"></script>\n</body>');
fs.writeFileSync(file,h);
