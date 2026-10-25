// Reutiliza o harness CDP e o Supabase simulado da regressão, sem alterar a suíte.
import fs from 'node:fs';
import { QUICK_TEXTS } from '../public/quick-texts-data.js';
const existing = fs.readFileSync(new URL('./browser-regression.mjs', import.meta.url), 'utf8');
const harness = existing.slice(0, existing.indexOf('\ntry {\n await load();'));
for (const file of ['quick-texts.js','quick-texts.css','quick-texts-data.js']) {
  const source = fs.readFileSync(new URL('../public/' + file, import.meta.url), 'utf8');
  if (/favorit|localStorage|sessionStorage|aria-pressed|qt-all|qt-card-header|Copiar e-mails|Copiar texto/i.test(source)) throw new Error('Código removido ainda presente: ' + file);
}
const checks = `
try {
 await load();
 const models = ${JSON.stringify(QUICK_TEXTS)};
 await evaluate("document.querySelector('.tools-central-link').click(); document.getElementById('open-quick-texts').click()");
 assert.equal(await evaluate("document.querySelector('#view-ferramentas').classList.contains('active')"), true);
 assert.equal(await evaluate("document.querySelectorAll('.qt-card').length"), 7);
 for (const model of models) {
   const selector = '[data-model="' + model.id + '"]';
   assert.equal(await evaluate('document.querySelector(' + JSON.stringify(selector + ' .qt-body') + ').textContent'), model.body);
   assert.equal(await evaluate('document.querySelector(' + JSON.stringify(selector + ' .qt-recipients') + ')?.textContent || ""'), model.recipients.length ? '📧 ' + model.recipients.length + ' destinatários' : '');
   assert.equal(await evaluate('document.querySelectorAll(' + JSON.stringify(selector + ' .qt-actions button') + ').length'), 1);
   assert.equal(await evaluate('document.querySelectorAll(' + JSON.stringify(selector + ' button') + ').length'), 1);
   assert.equal(await evaluate('document.querySelector(' + JSON.stringify(selector + ' button') + ').textContent'), 'COPIAR TUDO');
 }
 await call('Emulation.setFocusEmulationEnabled', {enabled:true});
 await call('Browser.grantPermissions', {origin: baseUrl, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite']});
 for (const model of models) {
   const expected = model.recipients.length ? model.recipients.join('; ') + '\\n\\n' + model.body : model.body;
   const selector = '[data-model="' + model.id + '"] button';
   await call('Runtime.evaluate',{expression:'document.querySelector(' + JSON.stringify(selector) + ').click()', userGesture:true});
   await new Promise(r=>setTimeout(r,80));
   // O clipboard nativo do Windows converte LF em CRLF; os parágrafos devem permanecer idênticos.
   assert.equal((await evaluate('navigator.clipboard.readText()')).replaceAll('\\r\\n','\\n'), expected);
   assert.equal(await evaluate('document.querySelector(' + JSON.stringify(selector) + ').textContent'), '✓ Copiado');
 }
 await new Promise(r=>setTimeout(r,1900));
 assert.equal(await evaluate("document.querySelector('.qt-actions button').textContent"), 'COPIAR TUDO');
 for (const [query,count] of [['cotacao',1],['faturamento',4],['E-mails',7],['inexistente-987',0]]) {
   await evaluate('document.getElementById("qt-search").value=' + JSON.stringify(query) + ';document.getElementById("qt-search").dispatchEvent(new Event("input"))');
   assert.equal(await evaluate("document.querySelectorAll('.qt-card').length"),count);
 }
 assert.equal(await evaluate("document.getElementById('qt-cards').textContent"),'Nenhum texto encontrado.');
 await load();
 await evaluate("showView('ferramentas');document.getElementById('open-quick-texts').click()");
 assert.equal(await evaluate("document.querySelectorAll('.qt-card').length"),7);
 assert.equal(await evaluate("/favorit|[★☆]|Copiar e-mails|Copiar texto/i.test(document.getElementById('quick-tools').textContent)"),false);
 assert.equal(await evaluate("document.querySelectorAll('#quick-tools [aria-pressed], #quick-tools [role=group], .qt-card select').length"),0);
 await evaluate("window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove()");
 for (const width of [1440,900,600,375]) {
   await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
   for (const theme of ['light','dark']) {
     await evaluate('applyTheme(' + JSON.stringify(theme) + ',false);showView("ferramentas");window.scrollTo(0,0)');
     assert.equal(await evaluate("[...document.querySelectorAll('.qt-card, .qt-actions button, .qt-body, .qt-recipients')].filter(el=>{const r=el.getBoundingClientRect(),p=el.closest('.qt-card').getBoundingClientRect();return r.left<p.left-1||r.right>p.right+1||el.scrollWidth>el.clientWidth+1}).length"),0);
     const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
     fs.mkdirSync('test-results',{recursive:true});
     fs.writeFileSync('test-results/textos-'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
   }
 }
 await evaluate("document.getElementById('close-quick-texts').click()");
 assert.equal(await evaluate("document.getElementById('quick-texts').hidden"),true);
 for (const view of ['dashboard','clientes','agenda','orcamentos','controle-vendas','historico','solicitacoes','configuracoes','ferramentas']) await evaluate('showView('+JSON.stringify(view)+')');
 assert.deepEqual(errors,[]);
 assert.deepEqual(consoleErrors,[]);
 console.log('Textos Rápidos: 7 conteúdos/destinatários; 7 cópias completas no clipboard real e feedback; botão único; busca/recarga; ausência de favoritos; navegação; 8 capturas/limites responsivos; console OK.');
} finally { ws.close(); }
`;
fs.mkdirSync('test-results', {recursive:true});
const runner = new URL('../test-results/quick-texts-runner.mjs', import.meta.url);
fs.writeFileSync(runner, harness + checks);
await import(runner.href);
