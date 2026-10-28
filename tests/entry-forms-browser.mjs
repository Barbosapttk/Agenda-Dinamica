import fs from 'node:fs';
const existing=fs.readFileSync(new URL('./browser-regression.mjs',import.meta.url),'utf8');
const harness=existing.slice(0,existing.indexOf('\ntry {\n await load();'));
const checks=`
try {
 await load();
 await evaluate("window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove()");
 for(const width of [1440,900,375]) {
  await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===375});
  for(const theme of ['light','dark']) {
   await evaluate('applyTheme('+JSON.stringify(theme)+',false)');
   for(const id of ['modalCliente','modalContato','modalSolicitacao']) {
    await evaluate('openModal('+JSON.stringify(id)+')');
    const info=await evaluate('(()=>{const root=document.getElementById('+JSON.stringify(id)+');const modal=root.querySelector(".modal");const css=getComputedStyle(modal);return {bg:css.backgroundColor,image:css.backgroundImage,width:modal.clientWidth,height:modal.clientHeight,overflow:[...root.querySelectorAll("input,select,textarea,button")].filter(e=>{if(!e.getClientRects().length)return false;const r=e.getBoundingClientRect();return r.left<0||r.right>innerWidth+1}).map(e=>e.id||e.className),placeholder:[...root.querySelectorAll("[placeholder]")].every(e=>/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/u.test(e.placeholder)),close:root.querySelector(".modal-close").getAttribute("aria-label")};})()');
    assert.equal(info.image,'none',id+' solid panel');
    if(id==='modalSolicitacao') {
     assert.equal(await evaluate("getComputedStyle(document.getElementById('modalSolicitacao')).getPropertyValue('--entry-accent').trim()"),'#dc2626');
     assert.equal(await evaluate("[...document.querySelectorAll('#modalSolicitacao .sol-request-grid > .form-group')].every(group=>{const label=group.querySelector('label').getBoundingClientRect(),input=group.querySelector('input,select').getBoundingClientRect();return label.bottom<=input.top&&input.width>=100;})"),true,'Labels sem sobreposição');
     assert.equal(await evaluate("(()=>{const icon=document.querySelector('.sol-client-search-input i').getBoundingClientRect(),input=document.getElementById('sol-cliente-busca'),r=input.getBoundingClientRect();return icon.right<r.left+parseFloat(getComputedStyle(input).paddingLeft)})()"),true,'Ícone separado do texto da busca');
    }
    assert.ok(!info.bg.includes('rgba'),id+' opaque background');
    assert.deepEqual(info.overflow,[],id+' overflow at '+width+' '+theme);
    assert.equal(info.placeholder,true);assert.ok(info.close);
    if(id==='modalContato'&&width>900)assert.ok(info.width>info.height,'Contact landscape');
    const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('test-results/entry-'+id+'-'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
    await evaluate('closeModal('+JSON.stringify(id)+')');
   }
  }
 }
 await evaluate("openModal('modalContato');document.getElementById('ct-proposta-enviada').click()");
 assert.notEqual(await evaluate("getComputedStyle(document.getElementById('ct-proposta-campos')).display"),'none');
 await evaluate("document.getElementById('ct-proposta-enviada').click()");
 assert.equal(await evaluate("getComputedStyle(document.getElementById('ct-proposta-campos')).display"),'none');
 await evaluate("clientes=[{id:999,nome:'cliente de exemplo',status:'ativo'}];populateClienteSelects();document.getElementById('ct-cliente').value='999'");
 for(const days of [5,10,15]) {
  await evaluate('calcRetorno("ct-retorno",'+days+',"ct-cliente")');
  assert.ok(await evaluate("/^\\\\d{4}-\\\\d{2}-\\\\d{2}$/.test(document.getElementById('ct-retorno').value)"));
 }
 await evaluate("closeModal('modalContato');openModal('modalCliente');document.querySelector('#modalCliente .modal-close').click()");
 assert.equal(await evaluate("document.getElementById('modalCliente').classList.contains('open')"),false);
 await evaluate("openModal('modalCliente');document.getElementById('c-nome').value='';window.__beforeClients=clientes.length;salvarCliente()");
 assert.equal(await evaluate("clientes.length===window.__beforeClients"),true,'Client validation');
 await evaluate("(async()=>{window.__upload=criarAnexoDeArquivo;criarAnexoDeArquivo=async(file)=>({id:'pdf-example',nome:file.name,name:file.name,tipo:'application/pdf',type:'application/pdf',size:file.size});await handlePdfUpload({target:{files:[new File(['%PDF-1.4'],'exemplo.pdf',{type:'application/pdf'})],disabled:false,value:''}});criarAnexoDeArquivo=window.__upload;})()");
 assert.equal(await evaluate("pdfsTempCliente.length"),1,'PDF handler');
 await evaluate("removePdf(0);document.getElementById('c-nome').value='cliente de exemplo novo';document.getElementById('c-registrar-contato').checked=true;salvarCliente()");
 await new Promise(r=>setTimeout(r,300));
 assert.equal(await evaluate("clientes.length===window.__beforeClients+1&&document.getElementById('modalContato').classList.contains('open')"),true,'Contact after save');
 await evaluate("document.getElementById('ct-descricao').value='';window.__beforeContacts=contatos.length;salvarContato()");
 assert.equal(await evaluate("contatos.length===window.__beforeContacts"),true,'Contact validation');
 await evaluate("document.getElementById('ct-descricao').value='descrição de exemplo';document.getElementById('ct-sem-resposta').checked=true;document.getElementById('ct-proposta-enviada').checked=true;togglePropostaContato();document.getElementById('ct-retorno').value='2099-01-01';document.getElementById('ct-horario-alarme').value='14:30';document.getElementById('ct-lembrete').value='lembrete de exemplo';salvarContato()");
 assert.equal(await evaluate("contatos.length===window.__beforeContacts+1&&contatos.at(-1).semResposta&&contatos.at(-1).propostaEnviada"),true,'Contact saved');
 assert.equal(await evaluate("agendamentos.some(a=>a.data==='2099-01-01'&&a.horario==='14:30')"),true,'Alarm and reminder');
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
 console.log('Formulários: 18 combinações de janela/viewport/tema sem overflow, painéis opacos, contato em paisagem, placeholders, fechar, proposta e atalhos de retorno OK.');
} finally {ws.close();}
`;
fs.mkdirSync('test-results',{recursive:true});const runner=new URL('../test-results/entry-forms-runner.mjs',import.meta.url);fs.writeFileSync(runner,harness+checks);await import(runner.href);
