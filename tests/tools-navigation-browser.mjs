import fs from 'node:fs';
const existing=fs.readFileSync(new URL('./browser-regression.mjs',import.meta.url),'utf8');
const harness=existing.slice(0,existing.indexOf('\ntry {\n await load();'));
const checks=`
try {
 await load();
 const ids=['sale-price','service-calculator','freight-quote','quick-texts','size-table','quick-notes'];
 const names=['Calculadora de Valor de Venda','Calculadora de Valor de Serviço','Cotação de Frete','Textos Rápidos','Tabela de Tamanhos','Anotações Rápidas'];
 await evaluate("document.querySelector('.tools-central-link').click()");
 assert.equal(await evaluate("document.querySelector('#view-ferramentas .page-header h2').textContent"),'Central de Ferramentas');
 assert.deepEqual(await evaluate("[...document.querySelectorAll('#quick-tools > button strong')].map(el=>el.textContent)"),names);
 assert.deepEqual(await evaluate("[...document.querySelectorAll('#tools-dropdown button')].map(el=>el.textContent)"),names);
 assert.equal(await evaluate("document.querySelectorAll('.tool-launch-description').length"),6);
 assert.equal(await evaluate("document.querySelectorAll('.tool-launch-icon').length"),6);
 await evaluate("document.getElementById('open-sale-price').click()");
 assert.deepEqual(await evaluate("[...document.querySelectorAll('#sale-price .sp-fields')[0].querySelectorAll('input')].map(el=>el.id)"),['sp-quantity','sp-purchase','sp-buyPis','sp-buyIcms','sp-buyIpi','sp-freight']);
 assert.equal(await evaluate("document.getElementById('sp-quantity').value"),'0');
 assert.equal((await evaluate("document.getElementById('sp-purchase').value")).replace(/\\s/g,''),'R$0,00');
 assert.equal((await evaluate("document.getElementById('sp-price').textContent")).replace(/\\s/g,''),'R$0,00');
 await evaluate("document.querySelector('.tools-central-link').click();document.getElementById('open-service-calculator').click()");
 assert.equal(await evaluate("document.getElementById('sc-title').textContent"),names[1]);
 for(const key of ['salary','toll'])assert.equal((await evaluate('document.getElementById("sc-'+key+'").value')).replace(/\\s/g,''),'R$0,00');
 for(const key of ['hours','distance','hypochlorite-quantity','hydroxide-quantity','peracetic-quantity'])assert.equal(await evaluate('document.getElementById("sc-'+key+'").value'),'0');
 assert.equal((await evaluate("document.getElementById('sc-final').textContent")).replace(/\\s/g,''),'R$0,00');
 assert.equal(await evaluate("document.querySelectorAll('#sc-inputs input[type=checkbox]:checked').length"),0);
 assert.equal(await evaluate("/NaN|Infinity|undefined/.test(document.getElementById('service-calculator').textContent)"),false);
 await evaluate("showView('configuracoes')");
 assert.equal(await evaluate("document.getElementById('size-settings').open"),true);
 assert.equal(await evaluate("document.getElementById('size-settings').nextElementSibling.classList.contains('settings-grid')"),true);
 assert.equal(await evaluate("document.querySelector('#size-settings #mini-relatorio-comercial')===null"),true);
 await evaluate("window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove()");
 for(const width of [1440,900,375]) {
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===375});
  for(const theme of ['light','dark']) {
   await evaluate('applyTheme('+JSON.stringify(theme)+',false);showView("dashboard");window.scrollTo(0,0)');
   await evaluate("document.getElementById('tools-menu-toggle').scrollIntoView({block:'center',inline:'center'})");
   await new Promise(r=>setTimeout(r,100));
   await evaluate("document.getElementById('tools-menu-toggle').click()");
   assert.equal(await evaluate("document.getElementById('tools-menu-toggle').getAttribute('aria-expanded')"),'true');
   assert.equal(await evaluate("(()=>{const m=document.getElementById('tools-dropdown').getBoundingClientRect(),b=document.querySelector('.tools-quick-group').getBoundingClientRect();return m.top>=b.bottom&&m.left>=0&&m.right<=innerWidth&&m.bottom<=innerHeight+1})()"),true);
   const menuShot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('test-results/tools-menu-'+width+'-'+theme+'.png',Buffer.from(menuShot.data,'base64'));
   await evaluate("document.querySelector('#view-dashboard h2')?.click() || document.querySelector('.main').click()");
   assert.equal(await evaluate("document.getElementById('tools-dropdown').hidden"),true);
   for(let index=0;index<ids.length;index++) {
    await evaluate("showView('dashboard');document.getElementById('tools-menu-toggle').scrollIntoView({block:'center',inline:'center'})");
    await new Promise(r=>setTimeout(r,60));
    await evaluate('document.getElementById("tools-menu-toggle").click();document.querySelectorAll("#tools-dropdown button")['+index+'].click()');
    assert.equal(await evaluate('document.getElementById('+JSON.stringify(ids[index])+').hidden'),false);
    assert.equal(await evaluate("document.querySelectorAll('#quick-tools > section:not([hidden])').length"),1);
    assert.equal(await evaluate("document.getElementById('tools-dropdown').hidden"),true);
    if(index===0)assert.equal(await evaluate("Math.abs(document.getElementById('sp-quantity').getBoundingClientRect().top-document.getElementById('sp-purchase').getBoundingClientRect().top)<1"),true);
   }
   await evaluate("document.querySelector('.tools-central-link').click();window.scrollTo(0,0)");
   assert.equal(await evaluate("document.querySelectorAll('#quick-tools > section:not([hidden])').length"),0);
   assert.equal(await evaluate("[...document.querySelectorAll('.tool-launch-card')].every(el=>{const r=el.getBoundingClientRect();return r.height>=160&&r.left>=0&&r.right<=innerWidth&&el.scrollWidth<=el.clientWidth})"),true);
   const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync('test-results/tools-hub-'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
  }
 }
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
 console.log('Central: seis ferramentas na ordem exata. Dropdown: seis acessos diretos, fora fecha, link abre Central. Defaults/ordem dos campos e Tamanhos visível. Desktop/mobile claro/escuro: 12 capturas, sem cortes ou erros.');
} finally {ws.close();}
`;
fs.mkdirSync('test-results',{recursive:true});const runner=new URL('../test-results/tools-navigation-runner.mjs',import.meta.url);fs.writeFileSync(runner,harness+checks);await import(runner.href);
