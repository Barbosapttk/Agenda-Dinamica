import assert from 'node:assert/strict';

// Usa a sessão isolada e o SDK interceptado do teste existente. Não cria screenshots.
export async function runComprasBrowserChecks({ evaluate, call, baseUrl, setExpectedConsoleError }) {
  async function waitFor(expression) {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error(`Condição de navegador não atingida: ${expression}`);
  }
  const eventTypes = [
    'SOLICITACAO_COMPRA_CRIADA', 'SOLICITACAO_COMPRA_EDITADA', 'SOLICITACAO_COMPRA_STATUS_ALTERADO',
    'SOLICITACAO_COMPRA_CONCLUIDA', 'SOLICITACAO_COMPRA_EXCLUIDA'
  ];
  await evaluate(`(async()=>{
    clearTimeout(saveTimer); saveTimer=null;
    solicitacoesOrcamento=[]; agendamentos=[]; orcamentos=[]; contatos=[]; concluidos=[]; controleVendas=[]; cotacoesCompras=[];
    await persistirDadosSupabase();
    window.__pilotEvents=[];
    window.__offPilot=${JSON.stringify(eventTypes)}.map(type=>AgendaApplication.events.bus.subscribe(type,event=>{
      const rows=JSON.parse(sessionStorage.getItem('test-rows')||'[]');
      __pilotEvents.push({event,stored:rows.find(row=>row.key==='secta_cotacoes_compras')?.value});
    }));
    showView('dashboard'); renderCotacoesComprasPainel();
  })()`);
  const independent = await evaluate("JSON.stringify({clientes,contatos,agendamentos,solicitacoesOrcamento,orcamentos,concluidos,controleVendas,historicoClientes})");

  async function once(type, action, done) {
    const before = await evaluate('({writes:__supabaseTest.writes,events:__pilotEvents.length})');
    await evaluate(action);
    await waitFor(done);
    // Também cobre um debounce atrasado acidental.
    await new Promise(resolve => setTimeout(resolve, 350));
    const after = await evaluate('({writes:__supabaseTest.writes,events:__pilotEvents.length,batch:__supabaseTest.batches.at(-1),last:__pilotEvents.at(-1)})');
    assert.equal(after.writes - before.writes, 1, `${type}: uma única gravação efetiva`);
    assert.equal(after.events - before.events, 1, `${type}: um evento`);
    assert.equal(after.last.event.eventType, type);
    assert.deepEqual(after.batch.map(row=>row.key), ['secta_cotacoes_compras']);
    assert.ok(after.last.event.commandId);
    assert.equal(after.last.event.actorId, null);
    return after.last;
  }

  const created = await once(eventTypes[0], `abrirModalCotacaoCompras(); document.getElementById('cotacao-compras-descricao').value='Motor do piloto'; document.querySelector('#modalCotacaoCompras .btn-primary').click(); document.querySelector('#modalCotacaoCompras .btn-primary').click();`, "getCotacoesCompras().length===1 && !document.getElementById('modalCotacaoCompras').classList.contains('open')");
  const id = created.event.entityId;
  assert.equal(created.stored[0].id, id, 'Evento observado somente com dado já persistido');
  await once(eventTypes[1], `document.querySelector('.cotacao-compras-acoes button').click(); document.getElementById('cotacao-compras-descricao').value='Motor editado'; document.querySelector('#modalCotacaoCompras .btn-primary').click();`, "getCotacoesCompras()[0].descricao==='Motor editado' && !document.getElementById('modalCotacaoCompras').classList.contains('open')");
  const moved = await once(eventTypes[2], `[...document.querySelectorAll('.cotacao-compras-acoes button')].find(button=>button.textContent.trim()==='Sem retorno').click();`, "getCotacoesCompras()[0].status==='sem_retorno' && document.querySelectorAll('.cotacoes-compras-coluna')[1].querySelectorAll('.cotacao-compras-card').length===1");
  assert.equal(moved.event.payload.statusAnterior, 'enviado');
  assert.equal(moved.event.payload.novoStatus, 'sem_retorno');
  await once(eventTypes[3], "document.querySelector('.acao-concluir').click();", "getCotacoesCompras()[0].status==='concluido' && document.querySelectorAll('.cotacao-compras-card').length===0");
  assert.equal(await evaluate('getCotacoesCompras().length'), 1);
  await once(eventTypes[4], `window.confirm=()=>true; excluirCotacaoCompras(${JSON.stringify(id)});`, 'getCotacoesCompras().length===0');
  assert.equal(await evaluate("JSON.stringify({clientes,contatos,agendamentos,solicitacoesOrcamento,orcamentos,concluidos,controleVendas,historicoClientes})"), independent);

  // A coleção de cliente permanece no servidor: o mock modela upsert por chave.
  await evaluate('carregarDadosSupabase()');
  assert.equal(await evaluate('clientes[0].id'), 1);
  assert.equal(await evaluate('__pilotEvents.length'), 5, 'Reconciliação não republica compras');

  // Falha mantém formulário aberto e dados anteriores; retry reutiliza a intenção.
  const beforeFailure = await evaluate('({writes:__supabaseTest.writes,events:__pilotEvents.length})');
  setExpectedConsoleError(true);
  try {
    await evaluate("__supabaseTest.failSave=true; abrirModalCotacaoCompras(); document.getElementById('cotacao-compras-descricao').value='Retry UI'; salvarCotacaoCompras()");
  } finally { setExpectedConsoleError(false); }
  assert.equal(await evaluate('getCotacoesCompras().length'), 0);
  assert.equal(await evaluate("document.getElementById('modalCotacaoCompras').classList.contains('open')"), true);
  assert.equal(await evaluate("document.getElementById('cotacao-compras-descricao').value"), 'Retry UI');
  assert.equal(await evaluate('__pilotEvents.length'), beforeFailure.events);
  await evaluate('__supabaseTest.failSave=false; salvarCotacaoCompras()');
  assert.equal(await evaluate('__supabaseTest.writes'), beforeFailure.writes + 2, 'Uma tentativa falha e uma confirmação, sem debounce extra');
  assert.equal(await evaluate('__pilotEvents.length'), beforeFailure.events + 1);
  const retryItem = await evaluate('getCotacoesCompras()[0]');
  const attempts = await evaluate('__supabaseTest.batches.slice(-2).map(batch=>batch[0].value[0].id)');
  assert.deepEqual(attempts, [retryItem.id, retryItem.id], 'ID mantido na repetição');

  // Escrita pausada não muda card/estado nem publica; escritor legado aguarda a fila.
  const beforePause = await evaluate('({writes:__supabaseTest.writes,events:__pilotEvents.length})');
  await evaluate(`__supabaseTest.pauseNextWrite=true; window.__pausedOperation=alterarStatusCotacaoCompras(${JSON.stringify(retryItem.id)},'sem_retorno'); void 0;`);
  await waitFor('typeof __supabaseTest.releaseWrite === "function"');
  assert.equal(await evaluate('getCotacoesCompras()[0].status'), 'enviado');
  assert.equal(await evaluate('__pilotEvents.length'), beforePause.events);
  await evaluate("clientes[0].empresa='Edição legada durante await'; window.__queuedLegacy=persistirDadosSupabase(); void 0;");
  assert.equal(await evaluate('__supabaseTest.writes'), beforePause.writes + 1, 'Escrita legada não concorre com o comando');
  await evaluate('(async()=>{__supabaseTest.releaseWrite();await __pausedOperation;await __queuedLegacy;})()');
  assert.equal(await evaluate('clientes[0].empresa'), 'Edição legada durante await');
  const pausedBatches = await evaluate(`__supabaseTest.batches.slice(${beforePause.writes}).map(batch=>batch.map(row=>row.key))`);
  assert.deepEqual(pausedBatches[0], ['secta_cotacoes_compras']);
  assert.equal(pausedBatches[1].includes('secta_cotacoes_compras'), false, 'Legado não grava compras novamente');
  assert.equal(await evaluate('__pilotEvents.length'), beforePause.events + 1);

  const beforeRepeat = await evaluate('__supabaseTest.writes');
  await evaluate(`alterarStatusCotacaoCompras(${JSON.stringify(retryItem.id)},'sem_retorno')`);
  assert.equal(await evaluate('__supabaseTest.writes'), beforeRepeat);
  assert.equal(await evaluate('__pilotEvents.length'), beforePause.events + 1);
  await evaluate(`window.confirm=()=>false; excluirCotacaoCompras(${JSON.stringify(retryItem.id)});`);
  assert.equal(await evaluate('getCotacoesCompras().length'), 1, 'Cancelar confirmação mantém o registro');
  assert.equal(await evaluate('__supabaseTest.writes'), beforeRepeat);
  assert.equal(await evaluate('__pilotEvents.length'), beforePause.events + 1);

  for (const view of ['dashboard','solicitacoes','clientes','agenda','orcamentos','controle-vendas','historico','configuracoes']) {
    await evaluate(`showView('${view}')`);
    assert.equal(await evaluate(`document.getElementById('view-${view}').classList.contains('active')`), true);
  }
  await evaluate("showView('solicitacoes'); renderPropostasAcompanhamentoKanban(); showView('dashboard'); __offPilot.forEach(off=>off());");
  assert.equal(await evaluate('AgendaApplication.events.bus.getSubscriptions().length'), 5);

  // Verifica a mesma entrada usada pelo usuário, com React e iframe.
  await call('Page.navigate', { url: `${baseUrl}/` });
  await waitFor("document.querySelector('iframe')?.contentWindow.AgendaApplication?.repositories.snapshot.getStatus().status==='READY'");
  assert.equal(await evaluate("document.querySelector('iframe').contentWindow.AgendaApplication.events.bus.getSubscriptions().length"), 5);
}
