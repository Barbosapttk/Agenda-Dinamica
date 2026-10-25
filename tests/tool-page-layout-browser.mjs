import fs from 'node:fs';
import {TOOL_PAGES} from '../public/tool-page-layout.js';
const existing=fs.readFileSync(new URL('./browser-regression.mjs',import.meta.url),'utf8');
const harness=existing.slice(0,existing.indexOf('\ntry {\n await load();'));
const checks=`
try {
 await load();
 const pages=${JSON.stringify(TOOL_PAGES)};
 assert.equal(await evaluate("document.querySelectorAll('#quick-tools .tool-page-header').length"),6);
 async function audit(page) {
  const result=await evaluate('(()=>{const section=document.getElementById('+JSON.stringify(page.id)+'),header=section.querySelector(":scope > .tool-page-header");return {visible:!section.hidden,children:[...section.children].map(el=>el.className),backs:[...header.querySelectorAll("button")].map(el=>el.textContent),title:header.querySelector("h2").textContent,description:header.querySelector(".tool-page-description").textContent,icon:header.querySelector(".tool-page-icon").textContent,headings:section.querySelectorAll("h2").length,old:section.textContent.includes("Central de Ferramentas"),hubHidden:document.querySelector(".tools-hub-header").hidden,backPrimary:header.querySelector("button").classList.contains("btn-primary")}})()');
  assert.deepEqual(result,{visible:true,children:['tool-page-header','tool-page-content'],backs:['← Ferramentas'],title:page.name,description:page.description,icon:page.icon,headings:1,old:false,hubHidden:true,backPrimary:false});
 }
 async function back(page) {
  await evaluate('document.getElementById("close-'+page.id+'").click()');
  assert.equal(await evaluate("document.querySelector('.tools-hub-header').hidden"),false);
  assert.equal(await evaluate("document.querySelectorAll('#quick-tools > button:not([hidden])').length"),6);
  assert.equal(await evaluate("document.querySelectorAll('#quick-tools > section:not([hidden])').length"),0);
  assert.equal(await evaluate("document.getElementById('tools-dropdown').hidden"),true);
 }
 await evaluate("window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove()");
 for(const width of [1440,900,375]) {
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===375});
  await call('Emulation.setPageScaleFactor',{pageScaleFactor:1});
  for(const theme of ['light','dark']) {
   await evaluate('applyTheme('+JSON.stringify(theme)+',false);showView("dashboard");document.querySelector(".qa-tools").click();window.scrollTo(0,0)');
   assert.equal(await evaluate("document.getElementById('tools-dropdown').hidden"),true);
   assert.equal(await evaluate("document.getElementById('view-ferramentas').classList.contains('active')"),true);
   assert.equal(await evaluate("document.querySelector('.tools-hub-header p').textContent"),'Ferramentas para agilizar suas atividades comerciais.');
   assert.deepEqual(await evaluate("[...document.querySelectorAll('.tool-launch-card strong')].map(el=>el.textContent)"),pages.map(page=>page.name));
   let shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync('test-results/layout-central-'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
   for(let index=0;index<pages.length;index++) {
    const page=pages[index];
    await evaluate('document.getElementById("open-'+page.id+'").click()');await audit(page);await back(page);
    await evaluate("showView('dashboard');document.getElementById('tools-menu-toggle').scrollIntoView({block:'center',inline:'nearest'})");
    await new Promise(r=>setTimeout(r,60));
    await evaluate("document.getElementById('tools-menu-toggle').click()");
    assert.equal(await evaluate("document.getElementById('view-dashboard').classList.contains('active')"),true);
    assert.equal(await evaluate("document.getElementById('tools-dropdown').hidden"),false);
    assert.equal(await evaluate("(()=>{const menu=document.getElementById('tools-dropdown').getBoundingClientRect();return menu.left>=0&&menu.right<=innerWidth+1&&menu.bottom<=innerHeight+1})()"),true);
    await evaluate('document.querySelectorAll("#tools-dropdown button")['+index+'].click()');await audit(page);
    assert.equal(await evaluate("document.getElementById('tools-dropdown').hidden"),true);
    await evaluate('document.getElementById('+JSON.stringify(page.titleId)+').blur();window.scrollTo(0,0)');
    assert.equal(await evaluate('(()=>{const section=document.getElementById('+JSON.stringify(page.id)+');return section.scrollWidth<=section.clientWidth+1&&[...section.querySelectorAll(".tool-page-header,.tool-title-row,h2,.tool-back,input,textarea,select,button")].every(el=>{if(!el.getClientRects().length)return true;const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&el.scrollWidth<=el.clientWidth+1})})()'),true);
    shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync('test-results/layout-'+page.id+'-'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
    await back(page);
   }
  }
 }
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
 console.log('Layout: 6/6 ferramentas com cabeçalho compartilhado; 0 layouts antigos; corpo abre Central, seta somente menu; Central/dropdown/retorno testados individualmente para todas em 1440/900/375, claro/escuro; 42 capturas e zero overflow/erros.');
} finally {ws.close();}
`;
fs.mkdirSync('test-results',{recursive:true});const runner=new URL('../test-results/tool-page-layout-runner.mjs',import.meta.url);fs.writeFileSync(runner,harness+checks);await import(runner.href);
