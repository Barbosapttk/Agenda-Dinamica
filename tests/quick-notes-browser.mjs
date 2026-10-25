import fs from 'node:fs';
const existing=fs.readFileSync(new URL('./browser-regression.mjs',import.meta.url),'utf8');
const harness=existing.slice(0,existing.indexOf('\ntry {\n await load();'));
const checks = `
let previous;
try {
 await load();previous=await evaluate("localStorage.getItem('agenda-tool-notes-v1')");
 await evaluate("localStorage.removeItem('agenda-tool-notes-v1')");await load();
 async function fill(values) {
  await evaluate('Object.entries('+JSON.stringify(values)+').forEach(([selector,value])=>{const el=document.querySelector(selector);el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}));})');
 }
 await call('Emulation.setFocusEmulationEnabled',{enabled:true});await call('Browser.grantPermissions',{origin:baseUrl,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
 await evaluate("document.querySelector('.tools-central-link').click();document.getElementById('open-quick-notes').click();document.getElementById('notes-new').click()");
 await fill({'#notes-edit-title':'Fornecedor A','#notes-edit-body':'Caixa: 70 x 50 x 40'});await evaluate("document.getElementById('notes-editor').requestSubmit()");
 await evaluate("document.getElementById('notes-new').click()");await fill({'#notes-edit-title':'Telefone','#notes-edit-body':'Fornecedor: 11 99999-9999'});await evaluate("document.getElementById('notes-editor').requestSubmit()");
 assert.deepEqual(await evaluate("[...document.querySelectorAll('.note-card h3')].map(el=>el.textContent)"),['Telefone','Fornecedor A']);
 await evaluate("document.querySelectorAll('.note-card')[1].querySelectorAll('button')[1].click()");
 const body='  Caixa: 70 x 50 x 40\\n\\nPeso: 25 KG  ';
 await fill({'#notes-edit-title':'Medidas fornecedor X','#notes-edit-body':body});await evaluate("document.getElementById('notes-editor').requestSubmit()");
 assert.deepEqual(await evaluate("[...document.querySelectorAll('.note-card h3')].map(el=>el.textContent)"),['Medidas fornecedor X','Telefone']);
 await load();await evaluate("document.querySelector('.tools-central-link').click();document.getElementById('open-quick-notes').click()");
 assert.deepEqual(await evaluate("[...document.querySelectorAll('.note-card h3')].map(el=>el.textContent)"),['Medidas fornecedor X','Telefone']);
 await call('Runtime.evaluate',{expression:"document.querySelector('.note-card button').click()",userGesture:true});await new Promise(r=>setTimeout(r,100));
 assert.equal((await evaluate('navigator.clipboard.readText()')).replaceAll('\\r\\n','\\n'),body);
 assert.equal(await evaluate("document.querySelector('.note-card button').textContent"),'✓ Copiado');
 await new Promise(r=>setTimeout(r,1900));assert.equal(await evaluate("document.querySelector('.note-card button').textContent"),'COPIAR');
 await fill({'#notes-search':'caixa'});assert.equal(await evaluate("document.querySelectorAll('.note-card').length"),1);
 await fill({'#notes-search':'TELEFONE'});assert.equal(await evaluate("document.querySelector('.note-card h3').textContent"),'Telefone');
 await fill({'#notes-search':'sem resultado'});assert.equal(await evaluate("document.querySelectorAll('.note-card').length"),0);await fill({'#notes-search':''});
 await call('Page.enable');
 async function confirmAction(expression,accept) {
  const action=call('Runtime.evaluate',{expression});await new Promise(r=>setTimeout(r,80));await call('Page.handleJavaScriptDialog',{accept});await action;
 }
 await confirmAction("document.querySelector('.note-card').querySelectorAll('button')[2].click()",false);assert.equal(await evaluate("document.querySelectorAll('.note-card').length"),2);
 await confirmAction("document.querySelector('.note-card').querySelectorAll('button')[2].click()",true);assert.equal(await evaluate("document.querySelectorAll('.note-card').length"),1);
 await load();await evaluate("document.querySelector('.tools-central-link').click();document.getElementById('open-quick-notes').click()");assert.equal(await evaluate("document.querySelectorAll('.note-card').length"),1);assert.equal(await evaluate("document.querySelector('.note-card h3').textContent"),'Telefone');
 await evaluate("window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove()");
 for(const tool of ['quick-notes']) {
  await evaluate('document.querySelector(".tools-central-link").click();document.getElementById("open-'+tool+'").click()');
  for(const width of [1440,900,375]) {
   await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===375});
   for(const theme of ['light','dark']) {
    await evaluate('applyTheme('+JSON.stringify(theme)+',false);window.scrollTo(0,0)');
    assert.equal(await evaluate("[...document.querySelectorAll('#"+tool+" input,#"+tool+" textarea,#"+tool+" select,#"+tool+" button')].filter(el=>{if(!el.getClientRects().length)return false;const r=el.getBoundingClientRect();return r.left<0||r.right>innerWidth+1||el.scrollWidth>el.clientWidth+1}).length"),0);
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync('test-results/'+tool+'-'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
   }
  }
 }

 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
 console.log('Anotações: criar/editar/ordenar/buscar/copiar/reload, cancelamento/confirmação de exclusão, desktop/mobile e ambos os temas OK.');
} finally {
 if(previous!==undefined)await evaluate('('+JSON.stringify(previous)+')===null?localStorage.removeItem("agenda-tool-notes-v1"):localStorage.setItem("agenda-tool-notes-v1",'+JSON.stringify(previous)+')').catch(()=>{});
 ws.close();
}
`;
fs.mkdirSync("test-results",{recursive:true});const runner=new URL("../test-results/quick-notes-runner.mjs",import.meta.url);fs.writeFileSync(runner,harness+checks);await import(runner.href);
