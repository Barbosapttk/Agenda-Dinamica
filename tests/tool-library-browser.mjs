import fs from 'node:fs';
const existing=fs.readFileSync(new URL('./browser-regression.mjs',import.meta.url),'utf8');
const harness=existing.slice(0,existing.indexOf('\ntry {\n await load();'));
const checks=String.raw`
let originalTexts;
try {
 await load();originalTexts=await evaluate("localStorage.getItem('agenda-tool-text-overrides-v1')");
 await evaluate("localStorage.removeItem('agenda-tool-text-overrides-v1')");await load();
 const open=id=>evaluate('document.querySelector(".tools-central-link").click();document.getElementById("open-'+id+'").click()');
 const fill=values=>evaluate('Object.entries('+JSON.stringify(values)+').forEach(([id,value])=>document.getElementById(id).value=value)');
 const wait=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,50));}assert.fail('Timeout: '+expression);};
 await open('quick-texts');
 await evaluate("document.getElementById('qt-new').click();document.querySelector('#qt-editor input').value=' ';document.querySelectorAll('#qt-editor textarea')[1].value='mensagem';document.getElementById('qt-editor').requestSubmit()");
 assert.equal(await evaluate("document.getElementById('qt-new-panel').hidden"),false);
 assert.equal(await evaluate("document.querySelectorAll('.qt-card').length"),7);
 await evaluate("document.querySelector('#qt-editor input').value='texto de exemplo novo';document.querySelector('#qt-editor textarea').value='email@exemplo.com';document.querySelectorAll('#qt-editor textarea')[1].value='Mensagem de exemplo.\\n\\nSegundo parágrafo.';document.querySelectorAll('#qt-editor input')[1].value='Comercial';document.getElementById('qt-editor').requestSubmit()");
 assert.equal(await evaluate("document.querySelectorAll('.qt-card').length"),8);
 const customId=await evaluate("document.querySelector('.qt-card:last-child').dataset.model");
 await call('Emulation.setFocusEmulationEnabled',{enabled:true});await call('Browser.grantPermissions',{origin:baseUrl,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
 await call('Runtime.evaluate',{expression:"document.querySelector('.qt-card:last-child .qt-actions button').click()",userGesture:true});await new Promise(r=>setTimeout(r,100));
 assert.ok((await evaluate('navigator.clipboard.readText()')).includes('email@exemplo.com'));
 await load();await open('quick-texts');assert.equal(await evaluate("document.querySelectorAll('.qt-card').length"),8);
 await evaluate("document.querySelector('.qt-card:last-child details').open=true");await wait("document.querySelector('.qt-card:last-child form')!==null");
 await evaluate("document.querySelector('.qt-card:last-child form input').value='texto de exemplo editado';document.querySelectorAll('.qt-card:last-child form textarea')[1].value='Mensagem editada.';document.querySelector('.qt-card:last-child form').requestSubmit()");
 assert.equal(await evaluate("document.querySelector('.qt-card:last-child h3').textContent"),'texto de exemplo editado');
 await load();await open('quick-texts');assert.equal(await evaluate("document.querySelector('.qt-card:last-child .qt-body').textContent"),'Mensagem editada.');
 await evaluate("window.__confirm=window.confirm;window.confirm=()=>false;document.querySelector('.qt-card:last-child .qt-delete').click()");assert.equal(await evaluate("document.querySelectorAll('.qt-card').length"),8);
 await evaluate("window.confirm=()=>true;document.querySelector('.qt-card:last-child .qt-delete').click();window.confirm=window.__confirm");assert.equal(await evaluate("document.querySelectorAll('.qt-card').length"),7);
 await load();await open('quick-texts');assert.equal(await evaluate('document.querySelector(\'[data-model="'+customId+'"]\')===null'),true);
 await open('size-table');assert.equal(await evaluate("document.querySelector('#view-configuracoes #size-settings')===null"),true);assert.equal(await evaluate("document.querySelector('#size-table #size-settings')!==null"),true);
 await open('reference-tables');await wait("!document.getElementById('references-new').disabled");
 await evaluate("document.getElementById('references-new').click()");
 await fill({'references-edit-title':'tabela de exemplo','references-edit-description':'Referência visual de exemplo.'});
 async function upload(color) {
  await evaluate('(async()=>{const canvas=document.createElement("canvas");canvas.width=1600;canvas.height=1000;const ctx=canvas.getContext("2d");ctx.fillStyle='+JSON.stringify(color)+';ctx.fillRect(0,0,1600,1000);ctx.fillStyle="black";ctx.font="30px sans-serif";ctx.fillText("Tabela de exemplo",50,60);const blob=await new Promise(r=>canvas.toBlob(r,"image/png"));const dt=new DataTransfer();dt.items.add(new File([blob],"tabela-exemplo.png",{type:"image/png"}));document.getElementById("references-edit-image").files=dt.files;})()');
 }
 await evaluate("const dt=new DataTransfer();dt.items.add(new File(['inválida'],'imagem.png',{type:'image/png'}));document.getElementById('references-edit-image').files=dt.files;document.getElementById('references-editor').requestSubmit()");
 await wait("document.getElementById('references-feedback').textContent.includes('Não foi possível ler')");
 assert.equal(await evaluate("document.getElementById('references-editor').hidden"),false);
 assert.equal(await evaluate("document.querySelectorAll('.reference-card').length"),0);
 await upload('#eeeeee');await evaluate("document.getElementById('references-editor').requestSubmit()");await wait("document.getElementById('references-editor').hidden");
 const refId=await evaluate("document.querySelector('.reference-card').dataset.referenceId");
 await evaluate("document.querySelector('.reference-card button').click()");await wait("document.getElementById('references-viewer-image').naturalWidth===1600");
 assert.equal(await evaluate("document.getElementById('references-viewer').open"),true);
 const before=await evaluate("document.getElementById('references-viewer-image').style.width");await evaluate("document.getElementById('references-zoom-in').click()");assert.notEqual(await evaluate("document.getElementById('references-viewer-image').style.width"),before);
 await evaluate("document.getElementById('references-actual').click()");assert.equal(await evaluate("document.getElementById('references-viewer-image').style.width"),'1600px');
 await evaluate("document.getElementById('references-fit').click();document.getElementById('references-viewer-close').click()");assert.equal(await evaluate("document.getElementById('references-viewer').open"),false);
 await load();await open('reference-tables');await wait("document.querySelector('.reference-card')!==null");
 assert.equal(await evaluate("document.querySelector('.reference-card h3').textContent"),'tabela de exemplo');
 await evaluate("document.querySelectorAll('.reference-card button')[1].click()");
 await fill({'references-edit-title':'tabela de exemplo editada','references-edit-description':'Descrição atualizada.'});
 await upload('#ddffee');await evaluate("document.getElementById('references-editor').requestSubmit()");await wait("document.getElementById('references-editor').hidden");
 await load();await open('reference-tables');await wait("document.querySelector('.reference-card')!==null");assert.equal(await evaluate("document.querySelector('.reference-card h3').textContent"),'tabela de exemplo editada');
 await evaluate("document.querySelector('.reference-card button').click()");await wait("document.getElementById('references-viewer-image').naturalWidth===1600");
 assert.deepEqual(await evaluate("(()=>{const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;const ctx=canvas.getContext('2d');ctx.drawImage(document.getElementById('references-viewer-image'),0,0);return [...ctx.getImageData(0,0,1,1).data];})()"),[221,255,238,255],'Imagem substituída persiste');
 await evaluate("document.getElementById('references-viewer-close').click()");
 await evaluate("window.checkAlarms=()=>{};window.checkAlarmsComerciais=()=>{};document.getElementById('alarmOverlay')?.remove()");
 for(const width of [1440,900,375]) {
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===375});
  for(const theme of ['light','dark']) {
   await evaluate('applyTheme('+JSON.stringify(theme)+',false)');
   for(const id of ['size-table','quick-texts','reference-tables']) {
    await open(id);
    if(id==='size-table')await evaluate("document.getElementById('size-settings').open=true;document.getElementById('size-new').click()");
    if(id==='quick-texts')await evaluate("document.getElementById('qt-new').click()");
    assert.equal(await evaluate('(()=>{const section=document.getElementById('+JSON.stringify(id)+');return section.scrollWidth<=section.clientWidth+1&&[...section.querySelectorAll("input,textarea,select,button")].every(e=>{if(!e.getClientRects().length)return true;const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})})()'),true,id+' overflow '+width);
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync('test-results/library-'+id+'-'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
    if(id==='reference-tables'){
     await evaluate("document.querySelector('.reference-card button').click()");await wait("document.getElementById('references-viewer-image').naturalWidth===1600");
     assert.equal(await evaluate("document.getElementById('references-viewer').getBoundingClientRect().right<=innerWidth+1"),true);
     await evaluate("document.getElementById('references-zoom-in').click()");
     const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('test-results/library-viewer-'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
     await evaluate("document.getElementById('references-viewer-close').click()");
    }
   }
  }
 }
 await evaluate("window.confirm=()=>false;document.querySelectorAll('.reference-card button')[2].click()");assert.equal(await evaluate("document.querySelectorAll('.reference-card').length"),1);
 await evaluate("window.confirm=()=>true;document.querySelectorAll('.reference-card button')[2].click()");await wait("document.querySelectorAll('.reference-card').length===0");
 await load();await open('reference-tables');await wait("!document.getElementById('references-new').disabled");assert.equal(await evaluate("document.querySelectorAll('.reference-card').length"),0);
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
 console.log('Bibliotecas: Textos CRUD/validação/cópia/reload; migração de Tamanhos; referências upload/edição/substituição/exclusão/reload/zoom; 24 capturas em 1440/900/375 e dois temas sem overflow.');
} finally {
 if(originalTexts!==undefined)await evaluate('('+JSON.stringify(originalTexts)+')===null?localStorage.removeItem("agenda-tool-text-overrides-v1"):localStorage.setItem("agenda-tool-text-overrides-v1",'+JSON.stringify(originalTexts)+')').catch(()=>{});
 ws.close();
}
`;
fs.mkdirSync('test-results',{recursive:true});const runner=new URL('../test-results/tool-library-runner.mjs',import.meta.url);fs.writeFileSync(runner,harness+checks);await import(runner.href);
