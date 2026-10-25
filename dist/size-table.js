import { findSizes, formatSizeDimensions, formatSizeWeight, formatarTamanhoParaCopia } from './size-table-data.js';
import { copyPlainText } from './tools-common.js';
import { getSizeCatalog } from './size-catalog-store.js';

export function mountSizeTable(root) {
  const catalog = getSizeCatalog();
  root.insertAdjacentHTML('beforeend', `<button type="button" class="btn btn-primary" id="open-size-table">📦 Tabela de Tamanhos</button>
    <section id="size-table" hidden aria-labelledby="size-title">
      <button type="button" class="btn btn-ghost" id="close-size-table">← Central de Ferramentas</button>
      <h2 id="size-title" tabindex="-1">Tabela de Tamanhos</h2>
      <div class="qt-toolbar"><label>Buscar tamanho<input type="search" id="size-search" placeholder="🔎 Buscar tamanho..."></label>
      <label>Tipo<select id="size-type"><option value="">Todos</option><option>Sacos</option><option>Caixas</option><option>Pallet</option></select></label></div>
      <p>Consulte e copie as dimensões em cm: L (largura) x A (altura) x C (comprimento). — indica medida não informada.</p>
      <p id="size-count" role="status"></p>
      <p id="size-feedback" role="status" aria-live="polite"></p>
      <div id="size-rows" class="size-cards"></div>
    </section>`);
  function render() {
    const items = findSizes(root.querySelector('#size-search').value, root.querySelector('#size-type').value, catalog.list());
    const rows = root.querySelector('#size-rows');
    rows.replaceChildren();
    for (const item of items) {
      const row = document.createElement('article');
      row.className = 'card size-card';
      const category = document.createElement('small');
      category.className = 'size-category'; category.textContent = item.type;
      const name = document.createElement('h3'); name.textContent = item.name;
      const dimensions = document.createElement('p');
      dimensions.className = 'size-dimensions'; dimensions.textContent = formatSizeDimensions(item);
      row.append(category, name, dimensions);
      const weight = formatSizeWeight(item);
      if (weight) {
        const description = document.createElement('p');
        description.className = 'size-weight'; description.textContent = weight;
        row.append(description);
      }
      const copy = document.createElement('button');
      copy.type = 'button'; copy.className = 'btn btn-primary'; copy.textContent = 'COPIAR';
      copy.setAttribute('aria-label', 'COPIAR: ' + item.name);
      copy.onclick = async () => {
        copy.disabled = true;
        const feedback = root.querySelector('#size-feedback');
        try {
          await copyPlainText(formatarTamanhoParaCopia(item));
          copy.textContent = '✓ Copiado'; feedback.textContent = 'Copiado: ' + item.name;
          setTimeout(() => { copy.textContent = 'COPIAR'; }, 1800);
        } catch { feedback.textContent = 'Não foi possível copiar. Tente novamente ou copie as informações do item manualmente.'; }
        finally { copy.disabled = false; }
      };
      row.append(copy);
      rows.append(row);
    }
    root.querySelector('#size-count').textContent = items.length ? `${items.length} ${items.length === 1 ? 'item encontrado' : 'itens encontrados'}` : 'Nenhum tamanho encontrado.';
    root.querySelector('#size-feedback').textContent = '';
    if (catalog.error) root.querySelector('#size-feedback').textContent = catalog.error;
  }
  root.querySelector('#size-search').oninput = render;
  root.querySelector('#size-type').onchange = render;
  catalog.subscribe(render);
  render();
}
