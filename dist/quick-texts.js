import { QUICK_TEXTS } from './quick-texts-data.js';
import { loadTextEdits, saveTextEdits } from './quick-texts-store.js';
import { mountServiceCalculator } from './service-calculator.js';
import { copyPlainText, normalizeToolText as normalize } from './tools-common.js';
import { mountSizeTable } from './size-table.js';
import { mountFreightQuote } from './freight-quote.js';
import { setupToolsNavigation } from './tools-navigation.js';
import { mountSalePrice } from './sale-price.js';
import { mountSizeSettings } from './size-settings.js';
import { mountQuickNotes } from './quick-notes.js';
import { toolPageHeader } from './tool-page-layout.js';
let edits = loadTextEdits();
const models = () => QUICK_TEXTS.map(model => {
  const edit = edits[model.id];
  return edit && typeof edit.body === 'string' && Array.isArray(edit.recipients) && edit.recipients.every(value => typeof value === 'string')
    ? { ...model, title: typeof edit.title === 'string' && edit.title.trim() ? edit.title : model.title, body: edit.body, recipients: edit.recipients } : model;
});

const root = document.getElementById('quick-tools');

root.innerHTML = `<button type="button" class="btn btn-primary" id="open-quick-texts">📝 Textos Rápidos</button>
  <section id="quick-texts" hidden aria-labelledby="quick-texts-title">
    ${toolPageHeader('quick-texts')}
    <button type="button" class="btn btn-ghost" id="quick-open-freight">Cotação de Frete</button>
    <div class="qt-toolbar"><label>Buscar texto<input id="qt-search" type="search" placeholder="Buscar texto..."></label></div>
    <p id="qt-feedback" role="status" aria-live="polite"></p><div id="qt-cards"></div>
  </section>`;
mountServiceCalculator(root);
mountSizeTable(root);
mountFreightQuote(root);
mountSalePrice(root);
mountSizeSettings();
mountQuickNotes(root);
const search = root.querySelector('#qt-search');
const feedback = root.querySelector('#qt-feedback');
search.oninput = render;
setupToolsNavigation(root, render);

function render() {
  const cards = root.querySelector('#qt-cards');
  cards.replaceChildren();
  const query = normalize(search.value);
  for (const model of models().filter(model =>
    normalize([model.title, model.body, model.category, ...model.recipients].join(' ')).includes(query))) {
    const card = document.createElement('article');
    card.className = 'card qt-card';
    card.dataset.model = model.id;
    const title = document.createElement('h3');
    title.textContent = model.title;
    card.append(title);
    if (model.recipients.length) {
      const recipients = document.createElement('p');
      recipients.className = 'qt-recipients';
      recipients.textContent = `📧 ${model.recipients.length} destinatário${model.recipients.length === 1 ? '' : 's'}`;
      card.append(recipients);
    }
    const body = document.createElement('div');
    body.className = 'qt-body';
    body.textContent = model.body;
    const actions = document.createElement('div');
    actions.className = 'qt-actions';
    const value = model.recipients.length ? model.recipients.join('; ') + '\n\n' + model.body : model.body;
    actions.append(copyButton(value, model.title));
    card.append(body, actions);
    const editor = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'EDITAR';
    summary.className = 'btn btn-ghost qt-edit';
    editor.append(summary);
    editor.addEventListener('toggle', () => {
      if (!editor.open || editor.querySelector('form')) return;
      const form = document.createElement('form');
      const titleLabel = document.createElement('label');
      titleLabel.textContent = 'Título';
      const titleInput = document.createElement('input');
      titleInput.value = model.title;
      titleInput.required = true;
      titleInput.oninput = () => titleInput.setCustomValidity(titleInput.value.trim() ? '' : 'Informe um título.');
      titleLabel.append(titleInput);
      const recipientsLabel = document.createElement('label');
      recipientsLabel.textContent = 'Destinatários (separados por ponto e vírgula ou linha)';
      const recipientsInput = document.createElement('textarea');
      recipientsInput.value = model.recipients.join('; ');
      recipientsInput.rows = 2;
      recipientsLabel.append(recipientsInput);
      const bodyLabel = document.createElement('label');
      bodyLabel.textContent = 'Texto completo';
      const bodyInput = document.createElement('textarea');
      bodyInput.value = model.body;
      bodyInput.rows = 9;
      bodyInput.required = true;
      bodyLabel.append(bodyInput);
      const save = document.createElement('button');
      save.className = 'btn btn-primary';
      save.textContent = 'Salvar alterações';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'btn btn-ghost';
      cancel.textContent = 'Cancelar';
      cancel.onclick = () => { editor.open = false; form.remove(); summary.focus(); };
      form.append(titleLabel, recipientsLabel, bodyLabel, save, cancel);
      form.onsubmit = event => {
        event.preventDefault();
        const next = { ...edits, [model.id]: { title: titleInput.value.trim(), body: bodyInput.value, recipients: recipientsInput.value.split(/[;\n]+/).map(value => value.trim()).filter(Boolean) } };
        try {
          saveTextEdits(next);
          edits = next;
          render();
          feedback.textContent = 'Texto salvo neste navegador.';
          search.focus();
        } catch { feedback.textContent = 'Não foi possível salvar neste navegador. Suas alterações continuam abertas.'; }
      };
      editor.append(form);
    });
    card.append(editor);
    cards.append(card);
  }
  if (!cards.children.length) cards.textContent = 'Nenhum texto encontrado.';
}

function copyButton(value, title) {
  const label = 'COPIAR TUDO';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-primary';
  button.textContent = label;
  button.setAttribute('aria-label', `${label}: ${title}`);
  button.onclick = async () => {
    button.disabled = true;
    try {
      await copyPlainText(value);
      button.textContent = '✓ Copiado';
      feedback.textContent = `Copiado: ${title}`;
      setTimeout(() => { button.textContent = label; }, 1800);
    } catch { feedback.textContent = 'Não foi possível copiar. Selecione o conteúdo e copie manualmente.'; }
    finally { button.disabled = false; }
  };
  return button;
}


