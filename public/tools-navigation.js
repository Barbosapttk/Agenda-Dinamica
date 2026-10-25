import { TOOL_PAGES,applyToolPageLayouts } from './tool-page-layout.js';
export function setupToolsNavigation(root, renderTexts) {
  const tools=TOOL_PAGES.map(page=>[page.id,page.titleId,page.name,page.icon,page.summary]);
  applyToolPageLayouts(root);
  const hubHeader=document.querySelector('#view-ferramentas > .page-header');
  for(const [id,,name,icon,description] of tools) {
    const button=root.querySelector('#open-'+id);
    button.className='tool-launch-card'; button.replaceChildren();
    const symbol=document.createElement('span');symbol.className='tool-launch-icon';symbol.textContent=icon;symbol.setAttribute('aria-hidden','true');
    const title=document.createElement('strong');title.textContent=name;
    const text=document.createElement('span');text.className='tool-launch-description';text.textContent=description;
    button.append(symbol,title,text);
  }
  root.prepend(...tools.map(([id])=>root.querySelector('#open-'+id)));
  function show(id) {
    root.classList.toggle('tools-hub',!id);
    hubHeader.hidden=Boolean(id);
    for (const [tool, title] of tools) {
      root.querySelector('#' + tool).hidden = tool !== id;
      root.querySelector('#open-' + tool).hidden = Boolean(id);
      if (tool === id) root.querySelector('#' + title).focus();
    }
    if (id === 'quick-texts') renderTexts();
  }
  for (const [id] of tools) {
    root.querySelector('#open-' + id).onclick = () => show(id);
    root.querySelector('#close-' + id).onclick = () => { show(null); root.querySelector('#open-' + id).focus(); };
  }
  root.querySelector('#quick-open-freight').onclick = () => show('freight-quote');
  const main=document.querySelector('.qa-tools');
  if(main) {
    main.setAttribute('aria-label','Ferramentas');main.title='Central de Ferramentas';
    const group=document.createElement('div');group.className='tools-quick-group';main.before(group);group.append(main);
    const toggle=document.createElement('button');toggle.type='button';toggle.className='tools-menu-toggle';toggle.textContent='▼';toggle.id='tools-menu-toggle';
    toggle.setAttribute('aria-label','Abrir ferramentas');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','tools-dropdown');group.append(toggle);
    const menu=document.createElement('div');menu.id='tools-dropdown';menu.hidden=true;menu.setAttribute('popover','manual');menu.setAttribute('aria-label','Acesso rápido às ferramentas');document.body.append(menu);
    function closeMenu(focus=false) {
      if(menu.matches(':popover-open'))menu.hidePopover();menu.hidden=true;toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus();
    }
    function position() {
      const rect=group.getBoundingClientRect();const width=Math.min(320,innerWidth-16);
      menu.style.width=width+'px';menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-width-8))+'px';menu.style.top=(rect.bottom+6)+'px';menu.style.maxHeight=Math.max(60,innerHeight-rect.bottom-14)+'px';
    }
    for(const [id,,name] of tools) {
      const button=document.createElement('button');button.type='button';button.textContent=name;
      button.onclick=()=>{closeMenu();window.showView('ferramentas');show(id);};menu.append(button);
    }
    function toggleMenu() {
      if(!menu.hidden){closeMenu();return;}
      position();menu.hidden=false;menu.showPopover();toggle.setAttribute('aria-expanded','true');
    }
    main.title='Central de Ferramentas';
    main.onclick=()=>{closeMenu();window.showView('ferramentas');show(null);};
    toggle.onclick=event=>{event.stopPropagation();toggleMenu();};
    const central=document.createElement('a');central.href='#view-ferramentas';central.className='tools-central-link';central.textContent='Central de Ferramentas';
    central.onclick=event=>{event.preventDefault();closeMenu();window.showView('ferramentas');show(null);};menu.append(central);
    toggle.onkeydown=event=>{if(event.key==='ArrowDown'){event.preventDefault();if(menu.hidden)toggle.click();menu.querySelector('button').focus();}};
    document.addEventListener('click',event=>{if(!group.contains(event.target)&&!menu.contains(event.target))closeMenu();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden)closeMenu(true);});
    window.addEventListener('resize',()=>{if(!menu.hidden)position();});
    document.addEventListener('scroll',event=>{if(!menu.hidden&&!menu.contains(event.target))closeMenu();},true);
  }
  show(null);
}
