import { calculateService, parseServiceNumber, CHEMICALS } from './service-calculator-math.js';
import { toolMoney as money } from './tools-common.js';
import { attachSmartNumberInput } from './smart-number-input.js';
import { toolPageHeader } from './tool-page-layout.js';

export function mountServiceCalculator(root) {
  root.insertAdjacentHTML('beforeend', `<button type="button" class="btn btn-primary" id="open-service-calculator">🧮 Calculadora de Valor de Serviço</button>
    <section id="service-calculator" hidden aria-labelledby="sc-title">
      ${toolPageHeader('service-calculator')}
      <div class="sc-layout"><form id="sc-inputs" class="card sc-panel" novalidate>
        <h3>Entradas</h3>
        <label>Salário mensal do técnico (R$)<input id="sc-salary" inputmode="decimal" value="R$ 0,00" required></label>
        <label>Horas de serviço (h)<input id="sc-hours" inputmode="decimal" value="0" required></label>
        <label>Distância sede → cliente (km)<input id="sc-distance" inputmode="decimal" value="0"></label>
        <small>O combustível considera ida e volta.</small>
        <label>Pedágio total (R$)<input id="sc-toll" inputmode="decimal" value="R$ 0,00"></label>
        <label class="sc-check"><input id="sc-food" type="checkbox"> Incluir alimentação — R$ 38,00</label>
        <fieldset class="sc-chemicals"><legend>Produtos químicos (opcionais)</legend>
          ${CHEMICALS.map(product => `<div><label class="sc-check"><input type="checkbox" id="sc-${product.id}">${product.name} — ${money(product.price)} / ${product.unit}</label><label id="sc-${product.id}-quantity-label" hidden>Quantidade (${product.unit})<input id="sc-${product.id}-quantity" inputmode="decimal" value="0" disabled></label></div>`).join('')}
        </fieldset>
        <button type="reset" class="btn btn-ghost">LIMPAR</button>
      </form><div class="card sc-panel">
        <h3>Custos calculados</h3>
        <p id="sc-status" role="status">Informe salário e horas para calcular.</p>
        <dl id="sc-breakdown"></dl>
        <div class="sc-final" aria-live="polite"><span>VALOR FINAL DO SERVIÇO</span><strong id="sc-final">—</strong></div>
      </div></div>
      <p class="sc-parameters">Parâmetros: 22 dias trabalhados/mês · 8 horas/dia · 80% encargos · 12 km/L · R$ 7,50/L gasolina · R$ 38,00 alimentação opcional · R$ 100,00 diária veículo (8 h) · 22% imposto · 30% margem. Veículo utiliza as mesmas horas do serviço. Imposto e margem incidem separadamente sobre o custo total: total × 1,52.</p>
    </section>`);
  const form = root.querySelector('#sc-inputs');
  const status = root.querySelector('#sc-status');
  const breakdown = root.querySelector('#sc-breakdown');
  const final = root.querySelector('#sc-final');
  function update() {
    const values = {};
    for (const key of ['salary', 'hours', 'distance', 'toll']) {
      const input = root.querySelector('#sc-' + key);
      values[key] = parseServiceNumber(input.value);
      const invalid = !Number.isFinite(values[key]) || values[key] < 0 || (['salary', 'hours'].includes(key) && values[key] <= 0);
      input.setAttribute('aria-invalid', String(invalid));
    }
    values.food = root.querySelector('#sc-food').checked;
    values.chemicals = {};
    for (const product of CHEMICALS) {
      const selected = root.querySelector('#sc-' + product.id).checked;
      const input = root.querySelector('#sc-' + product.id + '-quantity');
      input.disabled = !selected;
      root.querySelector('#sc-' + product.id + '-quantity-label').hidden = !selected;
      const quantity = parseServiceNumber(input.value);
      input.setAttribute('aria-invalid', String(selected && (!Number.isFinite(quantity) || quantity < 0)));
      values.chemicals[product.id] = { selected, quantity };
    }
    const neutral = ['salary','hours','distance','toll'].every(key=>values[key]===0) && !values.food && Object.values(values.chemicals).every(item=>!item.selected || item.quantity===0);
    if(neutral) for(const key of ['salary','hours']) root.querySelector('#sc-'+key).setAttribute('aria-invalid','false');
    try {
      // Estado visual neutro; a função matemática mantém sua validação original.
      const result = neutral ? {hourlyTechnician:0,technician:0,fuel:0,toll:0,meal:0,vehicle:0,chemicalTotal:0,total:0,tax:0,margin:0,final:0} : calculateService(values);
      status.textContent = 'Custo/hora do técnico: ' + money(result.hourlyTechnician);
      breakdown.replaceChildren();
      for (const [label, key] of [['Técnico','technician'],['Combustível','fuel'],['Pedágio','toll'],['Alimentação','meal'],['Veículo','vehicle'],['Produtos químicos','chemicalTotal'],['CUSTO TOTAL','total'],['Imposto — 22%','tax'],['Margem — 30%','margin']]) {
        const row = document.createElement('div');
        if (key === 'total') row.className = 'sc-total';
        const term = document.createElement('dt'); term.textContent = label;
        const value = document.createElement('dd'); value.textContent = money(result[key]);
        row.append(term, value); breakdown.append(row);
      }
      final.textContent = money(result.final);
    } catch {
      status.textContent = 'Informe salário e horas maiores que zero. Distância, pedágio e quantidades devem ser números não negativos.';
      breakdown.replaceChildren(); final.textContent = '—';
    }
  }
  form.oninput = update;
  form.onsubmit = event => event.preventDefault();
  form.onreset = () => setTimeout(() => { update(); root.querySelector('#sc-salary').focus(); }, 0);
  for(const input of form.querySelectorAll('input:not([type=checkbox])'))attachSmartNumberInput(input,['sc-salary','sc-toll'].includes(input.id)?'money':'number');
  update();
}
