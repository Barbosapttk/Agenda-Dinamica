import fs from 'node:fs';
const existing = fs.readFileSync(new URL('./browser-regression.mjs', import.meta.url), 'utf8');
const harness = existing.slice(0, existing.indexOf('\ntry {\n await load();'));
const example = `GROWN OPTICAL LTDA
CNPJ: 60.570.108/0001-41
Endereço: AV JORNALISTA PAULO ZINGG, 572 - TERREO ANDAR 1, 2, 3 E 4 SUBSL
Bairro: JARDIM JARAGUA
Cidade: São Paulo - SP
CEP: 05157-030`;
const checks = `
try {
 await load();
 await evaluate("showView('ferramentas')");
 assert.equal(await evaluate("document.querySelectorAll('#quick-tools > button').length"),6);
 assert.equal(await evaluate("document.querySelector('#open-sale-price strong').textContent"),'Calculadora de Valor de Venda');
 await evaluate("document.getElementById('open-size-table').click()");
 assert.equal(await evaluate("document.querySelectorAll('#size-rows .size-card').length"),12);
 await evaluate("document.getElementById('size-search').value='Conj. Galão reprocessadora';document.getElementById('size-search').dispatchEvent(new Event('input'))");
 assert.deepEqual(await evaluate("[...document.querySelectorAll('#size-rows .size-category,#size-rows h3,#size-rows .size-dimensions,#size-rows .size-weight')].map(e=>e.textContent)"),['Caixas','Conj. Galão reprocessadora','L 40 x A 37 x C 50','3 KG por unidade']);
 assert.equal(await evaluate("document.getElementById('size-table').textContent.includes('Modelo A')"),false);
 await evaluate("document.getElementById('size-search').value='';document.getElementById('size-search').dispatchEvent(new Event('input'))");
 for (const [type,count] of [['Sacos',4],['Caixas',7],['Pallet',1]]) {
  await evaluate('document.getElementById("size-type").value='+JSON.stringify(type)+';document.getElementById("size-type").dispatchEvent(new Event("change"))');
  assert.equal(await evaluate("document.querySelectorAll('#size-rows .size-card').length"),count);
 }
 await evaluate("document.getElementById('size-type').value='';document.getElementById('size-type').dispatchEvent(new Event('change'));document.getElementById('close-size-table').click();document.getElementById('open-quick-texts').click();document.getElementById('quick-open-freight').click()");
 assert.equal(await evaluate("document.getElementById('quick-texts').hidden"),true);
 async function fill(values) {
  await evaluate('Object.entries('+JSON.stringify(values)+').forEach(([key,value])=>{const el=document.getElementById(key);if(el.type==="checkbox")el.checked=value;else el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}));})');
 }
 await fill({'freight-goods':'Peças','freight-invoice':'R$ 1.500,00','freight-weight':'3','freight-dimensions':'37 × 40 × 50 cm','freight-source':${JSON.stringify(example)}});
 await evaluate("document.getElementById('freight-identify').click()");
 assert.deepEqual(await evaluate("['company','cnpj','address','district','city','cep'].map(key=>document.getElementById('freight-'+key).value)"),['GROWN OPTICAL LTDA','60.570.108/0001-41','AV JORNALISTA PAULO ZINGG, 572 - TERREO ANDAR 1, 2, 3 E 4 SUBSL','JARDIM JARAGUA','São Paulo - SP','05157-030']);
 assert.deepEqual(await evaluate("['goods','invoice','weight','dimensions'].map(key=>document.getElementById('freight-'+key).value)"),['Peças','R$ 1.500,00','3','37 × 40 × 50 cm']);
 await call('Emulation.setFocusEmulationEnabled',{enabled:true});
 await call('Browser.grantPermissions',{origin:baseUrl,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
 await call('Runtime.evaluate',{expression:"document.getElementById('freight-copy').click()",userGesture:true});
 await new Promise(r=>setTimeout(r,100));
 const copied=(await evaluate('navigator.clipboard.readText()')).replaceAll('\\r\\n','\\n');
 assert.equal(copied,await evaluate("document.getElementById('freight-preview').value"));
 for (const value of ['Secta System','21.707.512/0001-62','06529-350','GROWN OPTICAL LTDA','Peças','R$ 1.500,00','3','37 × 40 × 50 cm']) assert.ok(copied.includes(value));
 assert.equal(await evaluate("document.getElementById('freight-copy').textContent"),'✓ Copiado');
 await new Promise(r=>setTimeout(r,1900));
 assert.equal(await evaluate("document.getElementById('freight-copy').textContent"),'COPIAR COTAÇÃO');
 await fill({'freight-invoice':'-1'});
 assert.equal(await evaluate("document.getElementById('freight-form').checkValidity()"),false);
 await fill({'freight-invoice':'R$ 1.500,00','freight-goods':'   '});
 assert.equal(await evaluate("document.getElementById('freight-form').checkValidity()"),false);
 await fill({'freight-goods':'Peças'});
 assert.equal(await evaluate("document.getElementById('freight-form').checkValidity()"),true);
 await fill({'freight-source':'CNPJ : 123'});
 await evaluate("document.getElementById('freight-identify').click()");
 assert.equal(await evaluate("document.getElementById('freight-city').value"),'');
 assert.ok((await evaluate("document.getElementById('freight-city-hint').textContent")).includes('Não foi possível'));
 assert.equal(await evaluate("document.getElementById('freight-cnpj').getAttribute('aria-invalid')"),'true');
 assert.equal(await evaluate("document.getElementById('freight-goods').value"),'Peças');
 assert.equal(await evaluate("document.getElementById('freight-form').checkValidity()"),false);
 await fill({'freight-source':${JSON.stringify(example)}});
 await evaluate("document.getElementById('freight-identify').click();document.getElementById('close-freight-quote').click();document.getElementById('open-service-calculator').click()");
 await fill({'sc-salary':'6000','sc-hours':'4','sc-hypochlorite':true,'sc-hypochlorite-quantity':'2','sc-hydroxide':true,'sc-hydroxide-quantity':'5','sc-peracetic':true,'sc-peracetic-quantity':'2'});
 assert.ok((await evaluate("document.getElementById('sc-breakdown').textContent")).includes('178,00'));
 assert.equal((await evaluate("document.getElementById('sc-final').textContent")).replace(/\\s/g,''),'R$719,65');
 assert.equal(await evaluate("document.getElementById('sc-hypochlorite-quantity-label').hidden"),false);
 await fill({'sc-hypochlorite':false});
 assert.equal(await evaluate("document.getElementById('sc-hypochlorite-quantity-label').hidden"),true);
 assert.equal((await evaluate("document.getElementById('sc-final').textContent")).replace(/\\s/g,''),'R$692,29');
 await fill({'sc-hypochlorite':true,'sc-hypochlorite-quantity':'-2'});
 assert.equal(await evaluate("document.getElementById('sc-final').textContent"),'—');
 await fill({'sc-hypochlorite-quantity':'2'});
 await evaluate("window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove()");
 for (const tool of ['service-calculator','size-table','freight-quote','quick-texts']) {
  await evaluate("[...document.querySelectorAll('#quick-tools > section')].filter(el=>!el.hidden).forEach(el=>document.getElementById('close-'+el.id).click());document.getElementById('open-"+tool+"').click()");
  for (const width of [1440,900,375]) {
   await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===375});
   for (const theme of ['light','dark']) {
    await evaluate('applyTheme('+JSON.stringify(theme)+',false);window.scrollTo(0,0)');
    assert.equal(await evaluate("[...document.querySelectorAll('#"+tool+" input,#"+tool+" textarea,#"+tool+" button,#"+tool+" .size-scroll')].filter(el=>{if(!el.getClientRects().length)return false;const r=el.getBoundingClientRect();return r.left<0||r.right>innerWidth+1}).length"),0);
    if(tool==='size-table' && width===375) assert.equal(await evaluate("document.getElementById('size-rows').scrollWidth<=document.getElementById('size-rows').clientWidth"),true);
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    fs.writeFileSync('test-results/tools-'+tool+'-'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
   }
  }
 }
 await evaluate("document.getElementById('close-quick-texts').click();document.getElementById('open-service-calculator').click();document.getElementById('sc-inputs').reset()");
 await new Promise(r=>setTimeout(r,100));
 assert.equal(await evaluate("document.getElementById('sc-hypochlorite').checked"),false);
 assert.equal(await evaluate("document.getElementById('sc-hypochlorite-quantity-label').hidden"),true);
 assert.equal((await evaluate("document.getElementById('sc-final').textContent")).replace(/\\s/g,''),'R$0,00');
 assert.deepEqual(errors,[]); assert.deepEqual(consoleErrors,[]);
 console.log('Tabela: 12 itens, busca obrigatória, filtros e rolagem. Frete: extração, campos manuais, validação e clipboard real. Químicos: seleção, quantidades, total e limpar. Quatro ferramentas em 1440/900/375, claro/escuro, 24 capturas e console OK.');
} finally { ws.close(); }
`;
fs.mkdirSync('test-results',{recursive:true});
const runner = new URL('../test-results/freight-sizes-runner.mjs',import.meta.url);
fs.writeFileSync(runner,harness+checks);
await import(runner.href);
