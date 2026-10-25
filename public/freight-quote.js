import { SENDER, RECIPIENT_FIELDS, CARGO_FIELDS, identifyRecipient, validCnpj, validCep, buildFreightQuote } from './freight-quote-data.js';
import { copyPlainText } from './tools-common.js';
import { parseServiceNumber } from './service-calculator-math.js';
import { attachSmartNumberInput } from './smart-number-input.js';

export function mountFreightQuote(root) {
  root.insertAdjacentHTML('beforeend', `<button type="button" class="btn btn-primary" id="open-freight-quote">🚚 Cotação de Frete</button>
    <section id="freight-quote" hidden aria-labelledby="freight-title">
      <button type="button" class="btn btn-ghost" id="close-freight-quote">← Central de Ferramentas</button>
      <h2 id="freight-title" tabindex="-1">Cotação de Frete</h2>
      <div class="card sc-panel"><h3>Colar dados da proposta</h3>
        <label for="freight-source">Cole o trecho com os dados do destinatário</label>
        <textarea id="freight-source" rows="6" placeholder="Razão social, CNPJ, endereço, bairro, cidade e CEP"></textarea>
        <button type="button" id="freight-identify" class="btn btn-primary">IDENTIFICAR DADOS</button>
        <p>Confira os dados identificados e ajuste os campos abaixo. Os dados da carga são preenchidos manualmente.</p>
      </div>
      <form id="freight-form"><div class="sc-layout">
        <div class="card sc-panel"><h3>Dados da coleta</h3><p id="freight-sender"></p>
          <h3>Dados da entrega</h3>
          ${RECIPIENT_FIELDS.map(([key,label]) => `<label>${label}<input id="freight-${key}" ${key !== 'district' ? 'required' : ''} aria-describedby="freight-${key}-hint"><small id="freight-${key}-hint"></small></label>`).join('')}
        </div>
        <div class="card sc-panel"><h3>Dados da carga</h3>
          ${CARGO_FIELDS.map(([key,label]) => `<label>${label}${key === 'dimensions' ? `<textarea id="freight-${key}" rows="4" required></textarea>` : key==='weight'?`<span class="tool-input-unit"><input id="freight-weight" inputmode="decimal" value="0" required><span>KG</span></span>`:`<input id="freight-${key}" required ${key === 'invoice' ? 'inputmode="decimal" placeholder="R$ 0,00"' : ''}>`}</label>`).join('')}
          <p>Preencha todos os campos, exceto Bairro quando não se aplicar. CNPJ e CEP são conferidos; os avisos permitem correção sem interromper a cópia.</p>
          <button type="submit" class="btn btn-primary" id="freight-copy">COPIAR COTAÇÃO</button>
          <p id="freight-feedback" role="status" aria-live="polite"></p>
        </div>
      </div></form>
      <label class="freight-preview-label">Prévia da cotação<textarea id="freight-preview" rows="20" readonly></textarea></label>
    </section>`);
  root.querySelector('#freight-sender').textContent = [SENDER.company, 'CNPJ: ' + SENDER.cnpj, SENDER.address, 'CEP: ' + SENDER.cep, SENDER.city].join('\n');
  const field = key => root.querySelector('#freight-' + key);
  const read = fields => Object.fromEntries(fields.map(([key]) => {
    const text=field(key).value.trim(),number=parseServiceNumber(text);
    return [key,key==='weight'?(text&&Number.isFinite(number)?number:null):text];
  }));
  const feedback = field('feedback');
  function refresh() {
    field('preview').value = buildFreightQuote(read(RECIPIENT_FIELDS), read(CARGO_FIELDS));
  }
  function validate() {
    for (const [key] of [...RECIPIENT_FIELDS, ...CARGO_FIELDS]) {
      const input = field(key);
      input.setCustomValidity(input.required && !input.value.trim() ? 'Preencha este campo.' : '');
    }
    const invoice = field('invoice');
    if (invoice.value.trim() && !Number.isFinite(parseServiceNumber(invoice.value))) invoice.setCustomValidity('Informe um valor de NF não negativo.');
    const weight=field('weight');
    if(weight.value.trim()&&!Number.isFinite(parseServiceNumber(weight.value)))weight.setCustomValidity('Informe o peso em KG como número não negativo.');
    for (const [key, valid, message] of [['cnpj',validCnpj,'Confira o CNPJ informado.'],['cep',validCep,'Confira o CEP (8 dígitos).']]) {
      const input = field(key);
      const invalid = Boolean(input.value.trim()) && !valid(input.value);
      field(key + '-hint').textContent = invalid ? message : '';
      input.setAttribute('aria-invalid', String(invalid));
    }
  }
  field('identify').onclick = () => {
    const data = identifyRecipient(field('source').value);
    for (const [key] of RECIPIENT_FIELDS) {
      field(key).value = data[key];
      field(key + '-hint').textContent = data[key] ? '' : 'Não foi possível identificar este campo.';
    }
    validate();
    // Mantém a indicação de campos ausentes após a conferência de formato.
    for (const key of ['cnpj','cep']) if (!data[key]) field(key + '-hint').textContent = 'Não foi possível identificar este campo.';
    feedback.textContent = 'Identificação concluída. Confira os dados da entrega.';
    refresh();
  };
  const form = field('form');
  form.oninput = event => {
    if (event.target.id.startsWith('freight-')) {
      const hint = field(event.target.id.slice(8) + '-hint');
      if (hint) hint.textContent = '';
    }
    validate(); refresh();
  };
  attachSmartNumberInput(field('invoice'),'money');attachSmartNumberInput(field('weight'));
  form.onsubmit = async event => {
    event.preventDefault();
    validate(); refresh();
    const button = field('copy');
    button.disabled = true;
    try {
      await copyPlainText(field('preview').value);
      button.textContent = '✓ Copiado';
      feedback.textContent = 'Cotação copiada.' + (!validCnpj(field('cnpj').value) || !validCep(field('cep').value) ? ' Confira os avisos de CNPJ e CEP.' : '');
      setTimeout(() => { button.textContent = 'COPIAR COTAÇÃO'; }, 1800);
    } catch { feedback.textContent = 'Não foi possível copiar. Selecione e copie a prévia abaixo.'; }
    finally { button.disabled = false; }
  };
  refresh();
}
