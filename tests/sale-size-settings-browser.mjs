import fs from 'node:fs';
const existing=fs.readFileSync(new URL('./browser-regression.mjs',import.meta.url),'utf8');
const harness=existing.slice(0,existing.indexOf('\ntry {\n await load();'));
const checks=`
let previousCatalog;
try {
 await load();
 previousCatalog=await evaluate("localStorage.getItem('agenda-tool-sizes-v1')");
 await evaluate("localStorage.removeItem('agenda-tool-sizes-v1')");await load();
 await evaluate("showView('ferramentas');document.getElementById('open-sale-price').click()");
 const text=key=>evaluate('document.getElementById("sp-'+key+'").textContent');
 const compact=value=>value.replace(/\\s/g,'');
 assert.equal(compact(await text('real-cost')),'R$0,00');
 assert.equal(compact(await text('price')),'R$0,00');
 await evaluate("document.getElementById('sp-margin').value='30';document.getElementById('sp-purchase').value='10';document.getElementById('sp-quantity').value='10';document.getElementById('sp-purchase').dispatchEvent(new Event('input',{bubbles:true}))");
 assert.equal(compact(await text('real-cost')),'R$8,68');
 assert.equal(compact(await text('final-cost')),'R$8,68');
 assert.equal(compact(await text('price')),'R$20,29');
 assert.deepEqual((await evaluate("[...document.querySelectorAll('#sp-results dd')].map(el=>el.textContent)")).map(compact),['R$20,29','R$0,00','R$3,65','R$1,88','R$14,76','R$8,68','R$6,09','30,00%']);
 async function fill(values) {
  await evaluate('Object.entries('+JSON.stringify(values)+').forEach(([key,value])=>{const input=document.getElementById(key);input.value=value;input.dispatchEvent(new Event("input",{bubbles:true}));})');
 }
 await fill({'sp-freight':'100','sp-quantity':'10'});
 assert.equal(compact(await text('final-cost')),'R$18,68');assert.equal(compact(await text('price')),'R$43,68');
 await fill({'sp-freight':'120','sp-quantity':'12'});
 assert.ok(compact(await text('cost-details')).includes('R$10,00'));
 await fill({'sp-quantity':'24'});assert.equal(compact(await text('final-cost')),'R$13,68');
 await fill({'sp-quantity':''});assert.equal(compact(await text('final-cost')),'R$8,68');assert.ok((await text('cost-status')).includes('Frete não adicionado'));
 await fill({'sp-quantity':'0'});assert.equal(await text('price'),'—');assert.ok((await text('cost-status')).includes('maior que zero'));
 await fill({'sp-freight':'0','sp-quantity':'','sp-purchase':'20','sp-buyIpi':'5','sp-buyPis':'10','sp-buyIcms':'12','sp-margin':'40'});
 assert.equal(compact(await text('real-cost')),'R$16,60');assert.equal(compact(await text('price')),'R$50,69');
 await fill({'sp-sellIpi':'5'});assert.equal(compact(await text('price')),'R$59,82');
 assert.ok((await text('results')).includes('40,00%'));
 await fill({'sp-margin':'80'});assert.equal(await text('price'),'—');assert.equal(await text('sale-status'),'Os percentuais informados não permitem calcular um preço de venda válido.');
 assert.equal(compact(await text('real-cost')),'R$16,60');
 await fill({'sp-purchase':'-1'});assert.equal(await text('real-cost'),'—');assert.equal(await text('price'),'—');
 await evaluate("document.getElementById('sp-form').reset()");assert.equal(compact(await text('price')),'R$0,00');
 await evaluate("showView('configuracoes');document.getElementById('size-settings').open=true");
 assert.equal(await evaluate("document.querySelectorAll('.size-admin-row').length"),12);
 await evaluate("document.getElementById('size-new').click()");
 await fill({'size-edit-name':'Volume teste de navegador','size-edit-type':'Caixas','size-edit-width':'12,5','size-edit-height':'20','size-edit-length':'30','size-edit-weight':'4','size-edit-weightUnit':'unidade'});
 await evaluate("document.getElementById('size-editor').requestSubmit()");
 assert.equal(await evaluate("document.querySelectorAll('.size-admin-row').length"),13);
 await load();await evaluate("showView('configuracoes');document.getElementById('size-settings').open=true");
 assert.equal(await evaluate("document.querySelectorAll('.size-admin-row').length"),13);
 await evaluate("[...document.querySelectorAll('.size-admin-row')].find(el=>el.textContent.includes('Volume teste de navegador')).querySelector('button').click()");
 await fill({'size-edit-name':'Volume editado','size-edit-width':'15'});await evaluate("document.getElementById('size-editor').requestSubmit()");
 assert.equal(await evaluate("document.querySelectorAll('.size-admin-row').length"),13);
 await evaluate("showView('ferramentas');document.getElementById('size-search').value='Volume editado';document.getElementById('size-search').dispatchEvent(new Event('input'))");
 // A seção anterior pode continuar aberta após navegar entre módulos.
 await evaluate("document.querySelectorAll('#quick-tools > section').forEach(el=>{if(!el.hidden)document.getElementById('close-'+el.id).click()});document.getElementById('open-size-table').click()");
 assert.equal(await evaluate("document.querySelectorAll('.size-card').length"),1);
 await call('Emulation.setFocusEmulationEnabled',{enabled:true});await call('Browser.grantPermissions',{origin:baseUrl,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
 await call('Runtime.evaluate',{expression:"document.querySelector('.size-card button').click()",userGesture:true});await new Promise(r=>setTimeout(r,100));
 assert.equal((await evaluate('navigator.clipboard.readText()')).replaceAll('\\r\\n','\\n'),'Volume editado: L 15 x A 20 x C 30 (4 KG por unidade)');
 await load();await evaluate("showView('configuracoes');document.getElementById('size-settings').open=true");
 assert.ok((await evaluate("document.getElementById('size-settings-list').textContent")).includes('Volume editado: L 15'));
 await call('Page.enable');
 async function remove(accept) {
  const pendingClick=call('Runtime.evaluate',{expression:"[...document.querySelectorAll('.size-admin-row')].find(el=>el.textContent.includes('Volume editado')).querySelectorAll('button')[1].click()"});
  await new Promise(r=>setTimeout(r,100));await call('Page.handleJavaScriptDialog',{accept});await pendingClick;
 }
 await remove(false);assert.equal(await evaluate("document.querySelectorAll('.size-admin-row').length"),13);
 await remove(true);assert.equal(await evaluate("document.querySelectorAll('.size-admin-row').length"),12);
 await load();await evaluate("showView('configuracoes');document.getElementById('size-settings').open=true");
 assert.equal(await evaluate("document.querySelectorAll('.size-admin-row').length"),12);
 await evaluate("window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove()");
 for(const view of ['sale','settings']) {
  if(view==='sale')await evaluate("showView('ferramentas');document.getElementById('open-sale-price').click()");
  else await evaluate("showView('configuracoes');document.getElementById('size-settings').open=true;document.getElementById('size-new').click()");
  for(const width of [1440,900,375]) {
   await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===375});
   for(const theme of ['light','dark']) {
    await evaluate('applyTheme('+JSON.stringify(theme)+',false);window.scrollTo(0,0)');
    const scope=view==='sale'?'#sale-price':'#size-settings';
    assert.equal(await evaluate("[...document.querySelectorAll('"+scope+" input,"+scope+" select,"+scope+" button')].filter(el=>{if(!el.getClientRects().length)return false;const r=el.getBoundingClientRect();return r.left<0||r.right>innerWidth+1||el.scrollWidth>el.clientWidth+1}).length"),0);
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync('test-results/'+view+'-'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
   }
  }
 }
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
 console.log('Venda: padrão/PDV, frete, quantidade, impostos editáveis, IPI, validação e limpar. Tamanhos: criar/editar/reload/cópia, cancelar/confirmar exclusão/reload. Desktop/mobile, claro/escuro, 12 capturas e console OK.');
} finally {
 if(previousCatalog!==undefined)await evaluate('('+JSON.stringify(previousCatalog)+')===null?localStorage.removeItem("agenda-tool-sizes-v1"):localStorage.setItem("agenda-tool-sizes-v1",'+JSON.stringify(previousCatalog)+')').catch(()=>{});
 ws.close();
}
`;
fs.mkdirSync('test-results',{recursive:true});const runner=new URL('../test-results/sale-size-settings-runner.mjs',import.meta.url);fs.writeFileSync(runner,harness+checks);await import(runner.href);
