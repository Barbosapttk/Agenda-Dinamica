import fs from 'node:fs';
const existing = fs.readFileSync(new URL('./browser-regression.mjs', import.meta.url), 'utf8');
const harness = existing.slice(0, existing.indexOf('\ntry {\n await load();'));
const checks = `
try {
 await load();
 await evaluate("showView('ferramentas');document.getElementById('open-quick-texts').click()");
 assert.deepEqual(await evaluate("[...document.querySelectorAll('.qt-card')].map(e=>e.dataset.model)"),['texto-2','texto-1','texto-3','texto-4','texto-5','texto-6','texto-7']);
 await evaluate("document.querySelector('.qt-card details').open=true");
 await new Promise(r=>setTimeout(r,100));
 await evaluate("document.querySelector('.qt-card form input').value='Título editado';document.querySelector('.qt-card form textarea').value='novo@example.com';document.querySelectorAll('.qt-card form textarea')[1].value='Texto editado completo';document.querySelector('.qt-card form').requestSubmit()");
 assert.equal(await evaluate("document.querySelector('.qt-card h3').textContent"),'Título editado');
 assert.equal(await evaluate("document.querySelector('.qt-body').textContent"),'Texto editado completo');
 await load();
 await evaluate("showView('ferramentas');document.getElementById('open-quick-texts').click()");
 assert.equal(await evaluate("document.querySelector('.qt-body').textContent"),'Texto editado completo');
 assert.equal(await evaluate("document.querySelector('.qt-card h3').textContent"),'Título editado');
 await call('Emulation.setFocusEmulationEnabled',{enabled:true});
 await call('Browser.grantPermissions',{origin:baseUrl,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
 await call('Runtime.evaluate',{expression:"document.querySelector('.qt-actions button').click()",userGesture:true});
 await new Promise(r=>setTimeout(r,100));
 assert.equal((await evaluate('navigator.clipboard.readText()')).replaceAll('\\r\\n','\\n'),'novo@example.com;'.slice(0,-1)+'\\n\\nTexto editado completo');
 await evaluate("localStorage.removeItem('agenda-tool-text-overrides-v1');document.getElementById('close-quick-texts').click();document.getElementById('open-service-calculator').click()");
 async function fill(values) {
   await evaluate('Object.entries('+JSON.stringify(values)+').forEach(([key,value])=>{const el=document.getElementById("sc-"+key); if(el.type==="checkbox")el.checked=value;else el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}));})');
 }
 await fill({salary:'6.000,00',hours:'4',distance:'100',toll:'45',food:true});
 assert.equal((await evaluate("document.getElementById('sc-final').textContent")).replace(/\\s/g,''),'R$765,25');
 assert.ok((await evaluate("document.getElementById('sc-breakdown').textContent")).includes('503,45'));
 await fill({food:false});
 assert.equal((await evaluate("document.getElementById('sc-final').textContent")).replace(/\\s/g,''),'R$707,49');
 await fill({hours:'-1'});
 assert.equal(await evaluate("document.getElementById('sc-final').textContent"),'—');
 await fill({hours:'2,5',distance:'0',toll:'0'});
 assert.equal((await evaluate("document.getElementById('sc-final').textContent")).replace(/\\s/g,''),'R$280,68');
 await fill({salary:'6000',hours:'4',distance:'100',toll:'45',food:true});
 await evaluate("window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove()");
 for (const width of [1440,900,375]) {
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===375});
  for (const theme of ['light','dark']) {
   await evaluate('applyTheme('+JSON.stringify(theme)+',false);window.scrollTo(0,0)');
   assert.equal(await evaluate("[...document.querySelectorAll('#service-calculator input,#service-calculator button,.sc-panel')].filter(el=>{const r=el.getBoundingClientRect();return r.left<0||r.right>innerWidth+1||el.scrollWidth>el.clientWidth+1}).length"),0);
   const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
   fs.writeFileSync('test-results/calculadora-'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
  }
 }
 await evaluate("document.getElementById('sc-inputs').reset()");
 await new Promise(r=>setTimeout(r,100));
 assert.equal((await evaluate("document.getElementById('sc-salary').value")).replace(/\\s/g,''),'R$0,00');
 assert.equal((await evaluate("document.getElementById('sc-final').textContent")).replace(/\\s/g,''),'R$0,00');
 assert.equal(await evaluate("document.getElementById('sc-food').checked"),false);
 assert.deepEqual(errors,[]); assert.deepEqual(consoleErrors,[]);
 console.log('Ferramentas: ordem fixa, edição/recarga/cópia; cálculo completo, alimentação, validação, horas decimais, limpar; desktop/mobile claro/escuro e limites de tela OK.');
} finally {
 await evaluate("localStorage.removeItem('agenda-tool-text-overrides-v1')").catch(()=>{});
 ws.close();
}
`;
fs.mkdirSync('test-results',{recursive:true});
const runner = new URL('../test-results/service-tools-runner.mjs', import.meta.url);
fs.writeFileSync(runner,harness+checks);
await import(runner.href);
