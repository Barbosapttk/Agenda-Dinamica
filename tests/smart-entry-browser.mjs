import fs from 'node:fs';
const existing=fs.readFileSync(new URL('./browser-regression.mjs',import.meta.url),'utf8');
const harness=existing.slice(0,existing.indexOf('\ntry {\n await load();'));
const checks=`
try {
 await load();
 await call('Emulation.setFocusEmulationEnabled',{enabled:true});
 await call('Browser.grantPermissions',{origin:baseUrl,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
 async function click(selector,touch=false) {
  await evaluate('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"center",inline:"nearest"})');
  await new Promise(r=>setTimeout(r,50));
  const point=await evaluate('(()=>{const r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()');
  if(touch){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else {await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});}
 }
 async function type(selector,text,expected,touch=false) {
  await click(selector,touch);
  assert.equal(await evaluate('(()=>{const el=document.querySelector('+JSON.stringify(selector)+');return el.selectionStart===0&&el.selectionEnd===el.value.length})()'),true);
  await call('Input.insertText',{text});
  assert.equal(await evaluate('document.querySelector('+JSON.stringify(selector)+').value'),text);
  await evaluate('document.querySelector('+JSON.stringify(selector)+').blur()');
  assert.equal((await evaluate('document.querySelector('+JSON.stringify(selector)+').value')).replaceAll(String.fromCharCode(160),' '),expected);
 }
 async function key(key,code,number) {await call('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:number});await call('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:number});}
 const open=id=>evaluate('document.querySelector(".tools-central-link").click();document.getElementById("open-'+id+'").click()');
 assert.equal(await evaluate("document.querySelectorAll('#quick-tools > button').length"),6);
 assert.equal(await evaluate("document.querySelectorAll('#tools-dropdown button').length"),6);
 assert.equal(await evaluate("document.getElementById('budget-desk')"),null);
 await click('.qa-tools');assert.equal(await evaluate("document.getElementById('tools-dropdown').hidden"),true);
 assert.equal(await evaluate("document.querySelector('#view-ferramentas').classList.contains('active')"),true);
 await click('#tools-menu-toggle');assert.equal(await evaluate("document.getElementById('tools-dropdown').hidden"),false);
 await click('.tools-central-link');assert.equal(await evaluate("document.getElementById('tools-dropdown').hidden"),true);
 await open('sale-price');
 assert.equal(await evaluate("document.getElementById('sp-margin').value"),'40,00%');
 await type('#sp-purchase','100','R$ 100,00');
 await type('#sp-purchase','1500','R$ 1.500,00');await type('#sp-purchase','2000','R$ 2.000,00');
 // Segundo clique permite posicionar o cursor; não há seleção forçada durante edição.
 await click('#sp-purchase');await click('#sp-purchase');
 assert.equal(await evaluate("document.getElementById('sp-purchase').selectionStart===document.getElementById('sp-purchase').selectionEnd"),true);
 await evaluate("const input=document.getElementById('sp-purchase');input.setSelectionRange(input.value.length-2,input.value.length)");
 await key('Delete','Delete',46);await call('Input.insertText',{text:'50'});await evaluate("document.getElementById('sp-purchase').blur()");
 assert.equal((await evaluate("document.getElementById('sp-purchase').value")).replaceAll(String.fromCharCode(160),' '),'R$ 2.000,50');
 await type('#sp-purchase','10','R$ 10,00');assert.equal((await evaluate("document.getElementById('sp-price').textContent")).replaceAll(String.fromCharCode(160),' '),'R$ 26,49');
 await type('#sp-margin','30','30,00%');assert.equal((await evaluate("document.getElementById('sp-price').textContent")).replaceAll(String.fromCharCode(160),' '),'R$ 20,29');
 await type('#sp-margin','35','35,00%');await type('#sp-buyIcms','18','18,00%');await type('#sp-buyPis','10','10,00%');await type('#sp-buyIpi','5','5,00%');
 await type('#sp-freight','200','R$ 200,00');await type('#sp-quantity','10','10');await type('#sp-quantity','25','25');
 await click('#sp-quantity');await key('Backspace','Backspace',8);await call('Input.insertText',{text:'10,5'});await evaluate("document.getElementById('sp-quantity').blur()");assert.equal(await evaluate("document.getElementById('sp-quantity').value"),'10,5');
 await evaluate("document.getElementById('sp-quantity').focus()");await key('Tab','Tab',9);
 assert.equal(await evaluate("document.activeElement.id"),'sp-purchase');assert.equal(await evaluate("document.activeElement.selectionStart===0&&document.activeElement.selectionEnd===document.activeElement.value.length"),true);
 assert.equal(await evaluate("document.getElementById('sp-auto-cost').dataset.smartNumber"),undefined);
 await open('service-calculator');await type('#sc-salary','6000','R$ 6.000,00');await type('#sc-hours','4','4');await type('#sc-distance','100','100');await type('#sc-toll','50','R$ 50,00');
 assert.equal((await evaluate("document.getElementById('sc-final').textContent")).replaceAll(String.fromCharCode(160),' '),'R$ 715,09');await type('#sc-hours','8','8');
 await open('freight-quote');await type('#freight-weight','150','150');
 assert.equal(await evaluate("document.querySelector('.tool-input-unit > span').textContent"),'KG');
 await evaluate("const values={company:'GROWN OPTICAL LTDA',cnpj:'60.570.108/0001-41',address:'AV JORNALISTA PAULO ZINGG, 572',district:'JARDIM JARAGUA',city:'São Paulo - SP',cep:'05157-030',goods:'Peças',invoice:'R$ 100,00',dimensions:'L 40 x A 37 x C 50'};Object.entries(values).forEach(([key,value])=>{const el=document.getElementById('freight-'+key);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}))})");
 assert.equal(await evaluate("document.getElementById('freight-preview').value.includes('Peso Total: 150 KG')"),true);
 await call('Runtime.evaluate',{expression:"document.getElementById('freight-copy').click()",userGesture:true});await new Promise(r=>setTimeout(r,100));assert.equal((await evaluate('navigator.clipboard.readText()')).includes('Peso Total: 150 KG'),true);
 await evaluate("window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove()");
 for(const width of [1440,900,375]) {
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===375});
  await call('Emulation.setPageScaleFactor',{pageScaleFactor:1});
  for(const theme of ['light','dark']) {
   await evaluate('applyTheme('+JSON.stringify(theme)+',false);showView("dashboard");window.scrollTo(0,0)');
   await click('#tools-menu-toggle',width===375);
   if(width===1440){const heights=await evaluate("({tools:document.querySelector('.tools-quick-group').getBoundingClientRect().height,peer:document.querySelector('.qa-cotacao').getBoundingClientRect().height})");assert.equal(heights.tools,heights.peer);}
   assert.equal(await evaluate("document.getElementById('tools-dropdown').hidden"),false);
   assert.equal(await evaluate("(()=>{const menu=document.getElementById('tools-dropdown').getBoundingClientRect(),button=document.querySelector('.tools-quick-group').getBoundingClientRect();return menu.top>=button.bottom&&menu.left>=0&&menu.right<=innerWidth+1})()"),true);
   const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('test-results/smart-menu-'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
   await evaluate("document.querySelector('.main').click()");assert.equal(await evaluate("document.getElementById('tools-dropdown').hidden"),true);
   await open('sale-price');await type('#sp-purchase','10,50','R$ 10,50',width===375);
   assert.equal(await evaluate("[...document.querySelectorAll('#sale-price input')].filter(el=>{const r=el.getBoundingClientRect();return r.left<0||r.right>innerWidth+1}).length"),0);
  }
 }
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
 console.log('Entrada real: clique/toque + digitação substituem zeros e valores existentes; monetários, percentuais, quantidade, horas/km; edição parcial, Delete, Backspace e Tab. Margem 40/30, Serviço preservado, peso 150 KG no clipboard. Menu principal e seis ferramentas: desktop/notebook/mobile claro/escuro OK.');
} finally {ws.close();}
`;
fs.mkdirSync('test-results',{recursive:true});const runner=new URL('../test-results/smart-entry-runner.mjs',import.meta.url);fs.writeFileSync(runner,harness+checks);await import(runner.href);
