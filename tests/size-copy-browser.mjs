import fs from 'node:fs';
import { SIZES, formatarTamanhoParaCopia } from '../public/size-table-data.js';
const existing = fs.readFileSync(new URL('./browser-regression.mjs',import.meta.url),'utf8');
const harness = existing.slice(0,existing.indexOf('\ntry {\n await load();'));
const checks = `
try {
 await load();
 await evaluate("showView('ferramentas');document.getElementById('open-size-table').click()");
 const models=${JSON.stringify(SIZES.map(item=>({name:item.name,text:formatarTamanhoParaCopia(item)})))};
 await call('Emulation.setFocusEmulationEnabled',{enabled:true});
 await call('Browser.grantPermissions',{origin:baseUrl,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
 async function search(value) {
  await evaluate('document.getElementById("size-search").value='+JSON.stringify(value)+';document.getElementById("size-search").dispatchEvent(new Event("input"))');
 }
 for (const model of models) {
  await search(model.name);
  assert.equal(await evaluate("document.querySelectorAll('.size-card').length"),1);
  assert.equal(await evaluate("document.querySelector('.size-card h3').textContent"),model.name);
  await call('Runtime.evaluate',{expression:"document.querySelector('.size-card button').click()",userGesture:true});
  await new Promise(r=>setTimeout(r,80));
  assert.equal((await evaluate('navigator.clipboard.readText()')).replaceAll('\\r\\n','\\n'),model.text);
  assert.equal(await evaluate("document.querySelector('.size-card button').textContent"),'✓ Copiado');
 }
 await search('sal');
 assert.equal(await evaluate("document.querySelector('.size-card h3').textContent"),'Saco de Sal');
 await call('Runtime.evaluate',{expression:"document.querySelector('.size-card button').click()",userGesture:true});
 await new Promise(r=>setTimeout(r,80));
 await evaluate("const paste=document.createElement('textarea');paste.id='size-paste-check';document.body.append(paste);paste.focus()");
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'v',code:'KeyV',windowsVirtualKeyCode:86,modifiers:2});
 await call('Input.dispatchKeyEvent',{type:'keyUp',key:'v',code:'KeyV',windowsVirtualKeyCode:86,modifiers:2});
 await new Promise(r=>setTimeout(r,100));
 assert.equal(await evaluate("document.getElementById('size-paste-check').value"),'Saco de Sal: L 50 x A 20 x C 45 (25 KG por Saco)');
 await evaluate("document.getElementById('size-paste-check').remove()");
 await new Promise(r=>setTimeout(r,1900));
 assert.equal(await evaluate("document.querySelector('.size-card button').textContent"),'COPIAR');
 await search('galão');
 assert.equal(await evaluate("document.querySelector('.size-category').textContent"),'Caixas');
 await search('caixa 7');
 assert.equal(await evaluate("document.querySelectorAll('.size-card').length"),1);
 assert.equal(await evaluate("document.querySelector('.size-card h3').textContent"),'Caixa Nº 7');
 await search('inexistente');
 assert.equal(await evaluate("document.querySelectorAll('.size-card').length"),0);
 assert.equal(await evaluate("document.getElementById('size-count').textContent"),'Nenhum tamanho encontrado.');
 await search('');
 for (const [type,count] of [['Sacos',4],['Caixas',7],['Pallet',1],['',12]]) {
  await evaluate('document.getElementById("size-type").value='+JSON.stringify(type)+';document.getElementById("size-type").dispatchEvent(new Event("change"))');
  assert.equal(await evaluate("document.querySelectorAll('.size-card').length"),count);
 }
 await evaluate("window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove()");
 for (const width of [1440,900,375]) {
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===375});
  for (const theme of ['light','dark']) {
   await evaluate('applyTheme('+JSON.stringify(theme)+',false);window.scrollTo(0,0)');
   assert.equal(await evaluate("[...document.querySelectorAll('#size-table .size-card,#size-table button,#size-table input,#size-table select')].filter(el=>{const r=el.getBoundingClientRect();return r.left<0||r.right>innerWidth+1||el.scrollWidth>el.clientWidth+1}).length"),0);
   const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
   fs.writeFileSync('test-results/size-copy-'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
  }
 }
 assert.deepEqual(errors,[]); assert.deepEqual(consoleErrors,[]);
 console.log('Tamanhos: 12 cópias exatas no clipboard real; Saco de Sal colado via Ctrl+V; feedback/restauração; busca sal/galão/caixa 7; categorias e vazio; desktop/mobile claro/escuro sem cortes.');
} finally { ws.close(); }
`;
fs.mkdirSync('test-results',{recursive:true});
const runner=new URL('../test-results/size-copy-runner.mjs',import.meta.url);
fs.writeFileSync(runner,harness+checks);
await import(runner.href);
