import fs from 'node:fs';
const existing=fs.readFileSync(new URL('./browser-regression.mjs',import.meta.url),'utf8');
const harness=existing.slice(0,existing.indexOf('\ntry {\n await load();'));
const zoomSource=fs.readFileSync(new URL('./fretes-browser.mjs',import.meta.url),'utf8');
const zoomHelper=zoomSource.slice(zoomSource.indexOf('let zoomControl;'),zoomSource.indexOf('const waitFor='));
const checks=String.raw`
const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,50));}throw Error('Não confirmou: '+expression)};
const field=async(id,value)=>evaluate('document.getElementById('+JSON.stringify(id)+').value='+JSON.stringify(value));
try {
 await call('Page.enable');await load();await call('Emulation.setFocusEmulationEnabled',{enabled:true});
 await evaluate("sessionStorage.removeItem('test-rows');AgendaApplication.repositories.snapshot.load().then(()=>renderizarDadosSincronizados())");
 await evaluate("window.confirm=()=>true;window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove();clearInterval(sincronizacaoInterval);openModal('modalCliente');document.getElementById('c-nome').value='Cliente Exemplo';document.getElementById('c-empresa').value='Empresa Exemplo';document.getElementById('c-cnpj').value='00.000.000/0000-00';document.getElementById('c-tel').value='00000000001';document.getElementById('c-email').value='cliente@example.invalid';document.getElementById('c-cidade').value='Cidade Exemplo';document.getElementById('c-estado').value='SP';document.getElementById('c-registrar-contato').checked=false;salvarCliente()");
 await waitFor('clientes.length===1');
 await evaluate("window.testClientId=clientes[0].id;produtosSolicitacoes=['Equipamento Exemplo'];renderizarDadosSincronizados();openModal('modalSolicitacao');document.getElementById('sol-cliente').value=String(testClientId);document.getElementById('sol-nome').value='Cliente Exemplo';document.getElementById('sol-empresa').value='Empresa Exemplo';document.getElementById('sol-cnpj').value='00.000.000/0000-00';document.getElementById('sol-telefone').value='00000000001';document.getElementById('sol-produto').value='Equipamento Exemplo';document.getElementById('sol-data').value='2026-11-03';document.getElementById('sol-prazo').value='2026-11-04';document.getElementById('sol-etapa').value='aguardando_cotacao';document.getElementById('sol-descricao').value='Peça genérica para teste. Descrição longa sem dados comerciais reais.';document.getElementById('sol-obs').value='Conferir disponibilidade.';salvarSolicitacaoOrcamento()");
 await waitFor('solicitacoesOrcamento.length===1');await waitFor("document.getElementById('modalFluxoSolicitacao').classList.contains('open')");
 await evaluate('window.testSolId=solicitacoesOrcamento[0].id');
 assert.equal(await evaluate("Boolean(document.querySelector('#view-solicitacoes .sol-proxima-acao'))"),false);
 await field('sol-proxima-texto','Cotar frete');await field('sol-proxima-data','2026-11-03');
 await evaluate("document.querySelector('#sol-proxima-form button[type=submit]').click()");
 await waitFor("solicitacoesOrcamento[0].proximaAcao?.texto==='Cotar frete'");
 assert.equal(await evaluate("document.querySelector('#view-dashboard .sol-proxima-acao')"),null,'Bloco novo é exclusivo dos cards da fila; Dashboard preservado');
 await evaluate('window.beforeFreight=JSON.stringify(solicitacoesOrcamento[0]);cotarFreteDaSolicitacao(testSolId)');
 assert.equal(await evaluate("document.querySelector('#view-ferramentas').classList.contains('active')&&!document.getElementById('fretes').hidden"),true);
 assert.deepEqual(await evaluate("['company','cnpj','city','goods','address','cep','weight','dimensions','invoice'].map(key=>document.getElementById('freight-'+key).value)"),['Empresa Exemplo','00.000.000/0000-00','Cidade Exemplo - SP','Equipamento Exemplo — Peça genérica para teste. Descrição longa sem dados comerciais reais.','','','','','']);
 await evaluate("const values={weight:'25',dimensions:'2 volumes; C 50 x L 40 x A 37 cm',address:'Rua Exemplo, 10',cep:'00000-000',invoice:'100'};Object.entries(values).forEach(([key,value])=>{const input=document.getElementById('freight-'+key);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))})");
 assert.equal(await evaluate('JSON.stringify(solicitacoesOrcamento[0])===beforeFreight'),true);
 assert.equal(await evaluate("document.getElementById('freight-form').checkValidity()"),true);
 assert.match(await evaluate("document.getElementById('freight-preview').value"),/Peso Total: 25 KG/);
 await call('Browser.grantPermissions',{origin:baseUrl,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
 await call('Runtime.evaluate',{expression:"document.getElementById('freight-copy').click()",userGesture:true});await new Promise(r=>setTimeout(r,100));
 assert.match(await evaluate('navigator.clipboard.readText()'),/Peso Total: 25 KG/);
 await evaluate("document.querySelector('#fretes-origem button').click()");
 assert.equal(await evaluate("document.querySelector('#view-solicitacoes').classList.contains('active')&&document.getElementById('modalFluxoSolicitacao').classList.contains('open')"),true);
 assert.equal(await evaluate('JSON.stringify(solicitacoesOrcamento[0])===beforeFreight'),true);
 await evaluate('window.confirm=()=>false;cotarFreteDaSolicitacao(testSolId)');
 assert.equal(await evaluate("document.querySelector('#view-solicitacoes').classList.contains('active')"),true,'Cancelar substituição preserva contexto');
 assert.equal(await evaluate("document.getElementById('freight-weight').value"),'25');
 await evaluate('window.confirm=()=>true;cotarFreteDaSolicitacao(testSolId)');
 assert.equal(await evaluate("document.getElementById('freight-weight').value"),'','Nova cópia não herda peso anterior');
 await evaluate("document.querySelector('#fretes-origem button').click();solicitarPecasDaSolicitacao(testSolId)");
 assert.equal(await evaluate('cotacoesCompras.length'),0,'Abrir formulário não grava');
 assert.equal(await evaluate("document.getElementById('modalCotacaoCompras').dataset.solicitacaoId"),String(await evaluate('testSolId')));
 assert.match(await evaluate("document.getElementById('cotacao-compras-descricao').value"),/Equipamento Exemplo/);
 await evaluate('salvarCotacaoCompras();salvarCotacaoCompras()');
 await waitFor('cotacoesCompras.length===1');
 await evaluate('window.testCompraId=cotacoesCompras[0].id');
 assert.equal(await evaluate('cotacoesCompras[0].solicitacaoId===testSolId'),true);
 assert.equal(await evaluate("solicitacoesOrcamento[0].etapa"),'aguardando_cotacao');
 assert.equal(await evaluate("solicitacoesOrcamento[0].proximaAcao.texto"),'Cotar frete');
 await evaluate("document.querySelector('#compra-origem-context button').click()");
 assert.match(await evaluate("document.getElementById('fluxo-solicitacao-acoes').textContent"),/Abrir compra #/);
 await evaluate('solicitarPecasDaSolicitacao(testSolId)');assert.equal(await evaluate('cotacoesCompras.length'),1);
 await load();
 await evaluate("window.confirm=()=>true;window.testSolId=solicitacoesOrcamento[0].id;window.testCompraId=cotacoesCompras[0].id;voltarParaSolicitacao(testSolId);window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};clearInterval(sincronizacaoInterval)");
 assert.equal(await evaluate('cotacoesCompras[0].solicitacaoId===testSolId'),true);
 assert.equal(await evaluate("solicitacoesOrcamento[0].proximaAcao.texto"),'Cotar frete');
 await evaluate('solicitarPecasDaSolicitacao(testSolId)');assert.equal(await evaluate('cotacoesCompras.length'),1,'Recarga conserva prevenção por vínculo');
 await evaluate("__supabaseTest.pauseNextWrite=true;document.getElementById('cotacao-compras-descricao').value='Descrição genérica revisada';window.pendingLinkedSave=salvarCotacaoCompras();void 0");
 await waitFor("typeof __supabaseTest.releaseWrite==='function'");
 await evaluate("abrirModalCotacaoCompras();document.getElementById('cotacao-compras-descricao').value='Outro formulário preservado';__supabaseTest.releaseWrite();pendingLinkedSave");
 assert.equal(await evaluate("document.getElementById('cotacao-compras-descricao').value"),'Outro formulário preservado','ACK não substitui outro formulário aberto');
 assert.equal(await evaluate("document.getElementById('modalCotacaoCompras').dataset.editId"),undefined);
 await evaluate('voltarParaSolicitacao(testSolId);solicitarPecasDaSolicitacao(testSolId)');
 await evaluate("document.querySelector('#compra-origem-context button').click()");
 expectedConsoleError=true;
 await evaluate("window.beforeAction=JSON.stringify(solicitacoesOrcamento[0].proximaAcao);__supabaseTest.failSave=true;document.getElementById('sol-proxima-texto').value='Alteração sem confirmação';document.querySelector('#sol-proxima-form button[type=submit]').click()");
 await waitFor("!document.getElementById('sol-proxima-form').dataset.pending");
 assert.equal(await evaluate('JSON.stringify(solicitacoesOrcamento[0].proximaAcao)===beforeAction'),true,'Falha preserva a ação persistida');
 assert.equal(await evaluate("document.getElementById('sol-proxima-texto').value"),'Alteração sem confirmação');
 expectedConsoleError=false;await evaluate('__supabaseTest.failSave=false');
 await field('sol-proxima-texto','Aguardar retorno do fornecedor e conferir disponibilidade do equipamento genérico com os dados recebidos.');
 await field('sol-proxima-data','31/02/2026');assert.equal(await evaluate("document.getElementById('sol-proxima-data').checkValidity()"),false);
 await field('sol-proxima-data','2026-12-31');await evaluate("document.querySelector('#sol-proxima-form button[type=submit]').click()");
 await waitFor("solicitacoesOrcamento[0].proximaAcao.data==='2026-12-31'");
 await evaluate("closeModal('modalFluxoSolicitacao');showView('solicitacoes')");
 const matrix=[];
 const audit=async label=>{
  const result=await evaluate("(()=>{const root=document.getElementById('view-solicitacoes');const cards=[...root.querySelectorAll('.request-mini')];return {page:document.documentElement.scrollWidth<=innerWidth+2,cards:cards.length,missing:cards.filter(card=>!card.querySelector('.sol-proxima-acao')).length,overflow:cards.flatMap(card=>{const r=card.getBoundingClientRect();return [...card.querySelectorAll('button,.sol-proxima-acao,time')].filter(e=>{const q=e.getBoundingClientRect();return q.left<r.left-1||q.right>r.right+1||q.bottom>r.bottom+1}).map(e=>e.className)}),date:root.querySelector('.sol-proxima-acao time')?.textContent}})()");
  assert.equal(result.page,true,label);assert.equal(result.cards,1);assert.equal(result.missing,0);assert.deepEqual(result.overflow,[],label);assert.equal(result.date,'31/12/2026');return result;
 };
 await call('Emulation.clearDeviceMetricsOverride');const {windowId}=await call('Browser.getWindowForTarget',{targetId:target.id});await call('Browser.setWindowBounds',{windowId,bounds:{width:1440,height:1000}});
 for(const zoom of [80,90,100,110,125,150,175]){
  await setBrowserZoom(zoom/100);await call('Page.bringToFront');assert.ok(Math.abs(await evaluate('devicePixelRatio')-zoom/100)<.02);
  for(const theme of ['light','dark']){
   await evaluate('applyTheme('+JSON.stringify(theme)+',false);showView("solicitacoes");window.scrollTo(0,0)');
   matrix.push({zoom,theme,...await audit(zoom+' '+theme)});
   if(!process.env.AGENDA_SKIP_CAPTURES&&[100,175].includes(zoom)){
    await evaluate("(()=>{const r=document.querySelector('#view-solicitacoes .request-mini').getBoundingClientRect();const h=document.querySelector('.topheader').getBoundingClientRect();window.scrollBy(0,r.top-h.bottom-12)})()");
    const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('test-results/sol-conexoes-'+zoom+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
   }
  }
 }
 await setBrowserZoom(1);
 for(const width of [375,768,1366]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===375});
  for(const theme of ['light','dark']){
   await evaluate('applyTheme('+JSON.stringify(theme)+',false)');matrix.push({width,theme,...await audit(width+' '+theme)});
   await evaluate('voltarParaSolicitacao(testSolId)');
   assert.deepEqual(await evaluate("[...document.querySelectorAll('#sol-proxima-form input,#sol-proxima-form button')].filter(e=>{const r=e.getBoundingClientRect();return r.left<0||r.right>innerWidth+1}).map(e=>e.id)"),[],width+' editor da próxima ação '+theme);
   await evaluate("closeModal('modalFluxoSolicitacao')");
  }
 }
 fs.writeFileSync('test-results/sol-conexoes-matrix.json',JSON.stringify(matrix,null,2));
 await evaluate('voltarParaSolicitacao(testSolId)');await field('sol-proxima-data','');await evaluate("document.querySelector('#sol-proxima-form button[type=submit]').click()");await waitFor("solicitacoesOrcamento[0].proximaAcao.data===''");
 await evaluate("document.querySelector('#sol-proxima-form button[type=button]').click()");await waitFor('solicitacoesOrcamento[0].proximaAcao===null');
 assert.equal(await evaluate("document.querySelector('#view-solicitacoes .sol-proxima-acao')"),null);
 assert.equal(await evaluate('agendamentos.length'),0,'Próxima Ação não cria Retorno');
 await evaluate("agendarRetornoFromSolicitacao(testSolId)");await new Promise(r=>setTimeout(r,120));
 await field('ag-data','2026-11-05');await field('ag-motivo','Conferir cotação genérica');await evaluate('salvarAgendamento()');
 assert.equal(await evaluate('agendamentos.length'),1);
 assert.equal(await evaluate('proximaAcaoSolicitacao(solicitacoesOrcamento[0])'),null,'Retorno só por cliente não é ação da solicitação');
 await evaluate('alterarStatusCotacaoCompras(testCompraId,"sem_retorno")');
 assert.equal(await evaluate("solicitacoesOrcamento[0].etapa"),'aguardando_cotacao');
 // Conclusão real do fluxo existente: sem venda externa nem mudança de regras.
 await evaluate('abrirConcluirSolicitacao(testSolId)');await new Promise(r=>setTimeout(r,200));
 await evaluate("document.getElementById('concluir-status-proposta').value='aguardando_retorno';document.getElementById('concluir-obs').value='Cenário genérico de validação';document.querySelector('.cv-line-numero').value='TESTE-GENERICO-001';document.querySelector('.cv-line-valor').value='100,00';confirmarConclusao()");
 assert.equal(await evaluate('solicitacoesOrcamento.length'),0);assert.equal(await evaluate('concluidos.length'),1);
 assert.equal(await evaluate('cotacoesCompras[0].solicitacaoId'),await evaluate('testSolId'));
 assert.ok(await evaluate('contatos.length>0'),'Conclusão mantém contato no fluxo existente');
 assert.equal(await evaluate("getComputedStyle(document.getElementById('authScreen')).display"),'none');
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
 console.log('B2/B3/B5: cliente → solicitação → ação → frete/cópia/retorno → compra vinculada sem duplicação/reload → acompanhamento → conclusão. Campos ausentes vazios, sem escrita bidirecional/automação, datas e remoção de ação. Zoom real 80/90/100/110/125/150/175%, claro/escuro e 375/768/1366px; sem overflow ou erros inesperados.');
} finally {if(zoomControl){await setBrowserZoom(1);zoomControl.close();await fetch('http://127.0.0.1:9222/json/close/'+zoomPage.id)}ws.close();}
`;
fs.mkdirSync('test-results',{recursive:true});const runner=new URL('../test-results/request-connections-runner.mjs',import.meta.url);fs.writeFileSync(runner,harness+zoomHelper+checks);await import(runner.href);
