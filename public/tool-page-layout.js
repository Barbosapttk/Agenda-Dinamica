export const TOOL_PAGES = [
  {id:'sale-price',titleId:'sp-title',name:'Calculadora de Valor de Venda',icon:'🧮',summary:'Forme o preço de venda com custos, frete, impostos e margem.',description:'Calcule o custo por item e forme o preço de venda com a margem desejada.'},
  {id:'service-calculator',titleId:'sc-title',name:'Calculadora de Valor de Serviço',icon:'🧮',summary:'Calcule os custos de um atendimento e seu valor final.',description:'Informe os dados para calcular o serviço externo.'},
  {id:'freight-quote',titleId:'freight-title',name:'Cotação de Frete',icon:'🚚',summary:'Prepare e copie os dados de coleta, entrega e carga.',description:'Prepare os dados da coleta, da entrega e da carga para copiar sua cotação.'},
  {id:'quick-texts',titleId:'quick-texts-title',name:'Textos Rápidos',icon:'📝',summary:'Encontre, edite e copie seus modelos de e-mail.',description:'Seus modelos de e-mail para visualizar, editar e copiar.'},
  {id:'size-table',titleId:'size-title',name:'Tabela de Tamanhos',icon:'📦',summary:'Consulte e copie dimensões e pesos dos volumes.',description:'Encontre os volumes e copie suas dimensões e pesos para a cotação.'},
  {id:'quick-notes',titleId:'notes-title',name:'Anotações Rápidas',icon:'📝',summary:'Guarde, encontre e copie referências do dia a dia.',description:'Referências do dia a dia, salvas neste navegador. As criadas ou editadas por último aparecem primeiro.'},
];

// Metadados estáticos; não recebe conteúdo editável pelo usuário.
export function toolPageHeader(id) {
  const page=TOOL_PAGES.find(page=>page.id===id);
  if(!page)throw new Error('Ferramenta desconhecida.');
  return `<header class="tool-page-header">
    <button type="button" class="tool-back" id="close-${page.id}">← Ferramentas</button>
    <div class="tool-title-row"><span class="tool-page-icon" aria-hidden="true">${page.icon}</span><h2 id="${page.titleId}" tabindex="-1">${page.name}</h2></div>
    <p class="tool-page-description">${page.description}</p>
  </header>`;
}

export function applyToolPageLayouts(root) {
  for(const page of TOOL_PAGES) {
    const section=root.querySelector('#'+page.id);
    section.classList.add('tool-page');
    if(section.querySelector(':scope > .tool-page-content'))continue;
    const content=document.createElement('div');content.className='tool-page-content';
    // Move os nós existentes sem recriar formulários, estado ou listeners.
    for(const child of [...section.childNodes])if(!(child.nodeType===1&&child.classList.contains('tool-page-header')))content.append(child);
    section.append(content);
  }
}
