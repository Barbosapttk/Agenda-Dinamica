import assert from 'node:assert/strict';

// Usa o mesmo navegador e Supabase simulado da regressão original.
export async function runPropostaObservacaoChecks({ evaluate, load }) {
  const conclusionRef = await evaluate("'cc-'+concluidos[0].id");
  async function flush() {
    assert.equal(await evaluate('(async()=>{clearTimeout(saveTimer);saveTimer=null;return (await persistirDadosSupabase()).ok;})()'), true);
  }
  async function assertCard(ref, text) {
    await evaluate("showView('solicitacoes'); renderPropostasAcompanhamentoKanban();");
    const result = await evaluate(`(()=>{
      const card=[...document.querySelectorAll('.proposta-kanban-card')].find(el=>el.dataset.propostaRef===${JSON.stringify(ref)});
      return {found:Boolean(card),text:card?.textContent||'',images:card?.querySelectorAll('img').length||0};
    })()`);
    assert.equal(result.found, true);
    assert.equal(result.text.includes(text), true, 'Observação presente no card específico');
    assert.equal(result.images, 0, 'Observação é texto, não HTML executável');
  }

  // Editar número/valor não pode apagar a observação já confirmada.
  await evaluate(`abrirEditarProposta(${JSON.stringify(conclusionRef)}); document.querySelector('.editar-proposta-numero').value='TESTE-OBS-002'; document.querySelector('.editar-proposta-valor').value='175,50'; document.querySelector('#modalEditarProposta form').requestSubmit();`);
  await flush();
  await load();
  assert.equal(await evaluate('controleVendas[0].numeroProposta'), 'TESTE-OBS-002');
  assert.equal(await evaluate('controleVendas[0].valor'), 175.5);
  assert.equal(await evaluate('concluidos[0].observacaoAtualizacao'), 'Observação após concluir');
  assert.equal(await evaluate('concluidos[0].clienteId'), 1);
  assert.equal(await evaluate('concluidos[0].statusProposta'), 'recusada');
  await assertCard(conclusionRef, 'Observação após concluir');

  const input = 'Observação de teste <img src=x onerror="window.observacaoExecutada=true"> & condição 42';
  const expected = await evaluate(`formatarTextoSistema(${JSON.stringify(input)})`);
  await evaluate(`window.observacaoExecutada=false; abrirAtualizarStatusProposta(${JSON.stringify(conclusionRef)}); document.getElementById('status-proposta-obs').value=${JSON.stringify(input)}; salvarStatusPropostaAcompanhamento();`);
  await flush();
  await load();
  assert.equal(await evaluate('concluidos[0].observacaoAtualizacao'), expected);
  assert.equal(await evaluate('controleVendas[0].observacao'), expected);
  await assertCard(conclusionRef, expected);
  assert.equal(await evaluate('window.observacaoExecutada===true'), false);
  await evaluate(`abrirAtualizarStatusProposta(${JSON.stringify(conclusionRef)})`);
  assert.equal(await evaluate("document.getElementById('status-proposta-obs').value"), expected);
  await evaluate("closeModal('modalStatusProposta')");

  // Registros legados podem fornecer a última observação pelo log de status.
  await evaluate('delete concluidos[0].observacaoAtualizacao');
  await flush();
  await load();
  assert.equal(await evaluate(`listaPropostasHistorico().find(p=>p.ref===${JSON.stringify(conclusionRef)}).observacaoAtualizacao`), expected);
  await assertCard(conclusionRef, expected);

  // Segunda origem: contato marcado como proposta, em outra data para não ser
  // suprimido pela regra legada de conclusão por cliente/data.
  await evaluate(`openModal('modalContato'); document.getElementById('ct-cliente').value='1'; document.getElementById('ct-data').value=addDays(today(),-1); document.getElementById('ct-descricao').value='Proposta de contato para teste'; document.getElementById('ct-proposta-enviada').checked=true; document.getElementById('ct-numero-pecas').value='CONTATO-OBS-001'; salvarContato();`);
  const contactId = await evaluate('contatos.find(ct=>ct.numeroOrcamentoPecas===\'CONTATO-OBS-001\').id');
  const contactRef = `ct-${contactId}`;
  await evaluate(`abrirAtualizarStatusProposta(${JSON.stringify(contactRef)}); document.getElementById('status-proposta-obs').value='Observação da proposta por contato'; salvarStatusPropostaAcompanhamento();`);
  await flush();
  await load();
  assert.equal(await evaluate(`contatos.find(ct=>ct.id===${contactId}).observacaoAtualizacao`), 'Observação da proposta por contato');
  await assertCard(contactRef, 'Observação da proposta por contato');
  assert.equal(await evaluate('controleVendas.length'), 1, 'Verificação não cria venda extra');
}
