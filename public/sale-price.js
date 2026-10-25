import { SALE_DEFAULTS, calculatePurchaseCost, calculateSalePrice } from './sale-price-math.js';
import { parseServiceNumber } from './service-calculator-math.js';
import { toolMoney } from './tools-common.js';
import { attachSmartNumberInput } from './smart-number-input.js';
const purchaseFields=[['quantity','Quantidade'],['purchase','Preço de compra (R$)'],['buyPis','PIS/COFINS (%)'],['buyIcms','ICMS de compra (%)'],['buyIpi','IPI (%)'],['freight','Custo total do frete (R$)']];
const saleFields=[['margin','Margem (%)'],['sellIpi','IPI (%)'],['sellIcms','ICMS (%)'],['sellPis','PIS/COFINS (%)']];
const currencyKeys=['purchase','freight'];
const percentKeys=['buyIpi','buyPis','buyIcms','margin','sellIpi','sellIcms','sellPis'];
const percent=value=>value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
export function mountSalePrice(root) {
  const fields=items=>items.map(([key,label])=>`<label>${label}<input id="sp-${key}" inputmode="decimal" ${key==='quantity'?'placeholder="Não informada"':''}></label>`).join('');
  root.insertAdjacentHTML('beforeend',`<button type="button" class="btn btn-primary" id="open-sale-price">🧮 Calculadora de Valor de Venda</button>
    <section id="sale-price" hidden aria-labelledby="sp-title">
      <button type="button" class="btn btn-ghost" id="close-sale-price">← Central de Ferramentas</button>
      <h2 id="sp-title" tabindex="-1">Calculadora de Valor de Venda</h2>
      <p>Calcule o custo por item e forme o preço de venda com a margem desejada.</p>
      <form id="sp-form"><div class="sc-layout">
        <div class="card sc-panel"><h3>🛒 Custo de compra</h3><div class="sp-fields">${fields(purchaseFields)}</div>
          <p id="sp-cost-status" role="status"></p><dl id="sp-cost-details" class="sp-details"></dl>
          <div class="sp-highlight">CUSTO REAL<strong id="sp-real-cost">—</strong></div>
          <div class="sp-highlight">CUSTO FINAL DO ITEM<strong id="sp-final-cost">—</strong></div>
          <p class="sp-note">Compra + IPI − crédito PIS/COFINS − ICMS próprio. Depois, adicione frete ÷ quantidade. Sem quantidade, o frete não é adicionado.</p>
        </div>
        <div class="card sc-panel"><h3>💰 Preço de venda</h3>
          <label>Custo automático por item<input id="sp-auto-cost" readonly></label>
          <div class="sp-fields">${fields(saleFields)}</div>
          <p id="sp-sale-status" role="status"></p>
          <div class="sc-final" aria-live="polite">PREÇO DE VENDA<strong id="sp-price">—</strong></div>
          <p class="sp-note">Custo ÷ (1 − margem − IPI − ICMS − PIS/COFINS). Percentuais de venda incidem sobre a venda bruta.</p>
        </div></div>
        <div class="card sc-panel sp-results"><h3>📊 Resultados</h3><dl id="sp-results" class="sp-details"></dl></div>
        <button type="reset" class="btn btn-ghost">LIMPAR</button>
      </form>
    </section>`);
  const field=key=>root.querySelector('#sp-'+key);
  const form=field('form');
  function reset() {
    for (const [key,value] of Object.entries(SALE_DEFAULTS)) field(key).value=value===null?'':currencyKeys.includes(key)?toolMoney(value):percentKeys.includes(key)?percent(value):value;
    update();
  }
  function rows(target,entries) {
    target.replaceChildren();
    for (const [label,value,highlight] of entries) {
      const row=document.createElement('div'); if(highlight)row.className='sp-emphasis';
      const term=document.createElement('dt');term.textContent=label;
      const description=document.createElement('dd');description.textContent=value;
      row.append(term,description);target.append(row);
    }
  }
  function clearSale() {field('auto-cost').value='';field('price').textContent='—';field('results').replaceChildren();}
  function update() {
    const values={};
    for (const key of Object.keys(SALE_DEFAULTS)) {
      const raw=field(key).value.trim();
      values[key]=key==='quantity'&&!raw?null:parseServiceNumber(raw.replace(/%/g,''));
      const invalid=(key!=='quantity' && !raw)|| (values[key]!==null&&(!Number.isFinite(values[key])||values[key]<0||(percentKeys.includes(key)&&values[key]>100)));
      if(invalid)values[key]=NaN;
      field(key).setAttribute('aria-invalid',String(invalid));
    }
    clearSale();field('sale-status').textContent='';
    let cost;
    try {
      cost=calculatePurchaseCost(values);
      field('cost-status').textContent=cost.freightIgnored?'Frete não adicionado: informe a quantidade para distribuí-lo.':'';
      rows(field('cost-details'),[['IPI',toolMoney(cost.ipi)],['Crédito PIS/COFINS',toolMoney(cost.pisCredit)],['ICMS próprio',toolMoney(cost.icmsCredit)],['Frete por unidade',toolMoney(cost.freightUnit)]]);
      field('real-cost').textContent=toolMoney(cost.realCost);field('final-cost').textContent=toolMoney(cost.finalCost);
      field('auto-cost').value=toolMoney(cost.finalCost);
    } catch(error) {
      field('cost-status').textContent=error.message;field('cost-details').replaceChildren();field('real-cost').textContent=field('final-cost').textContent='—';return;
    }
    try {
      const sale=calculateSalePrice(cost.finalCost,values);
      field('price').textContent=toolMoney(sale.gross);
      rows(field('results'),[['Venda bruta',toolMoney(sale.gross)],['IPI',toolMoney(sale.ipi)],['ICMS',toolMoney(sale.icms)],['PIS/COFINS',toolMoney(sale.pis)],['Faturamento líquido',toolMoney(sale.net)],['Custo',toolMoney(sale.cost)],['Lucro bruto',toolMoney(sale.profit),true],['Margem líquida',percent(sale.netMargin),true]]);
    } catch(error) {field('sale-status').textContent=error.message;}
  }
  form.onsubmit=event=>event.preventDefault();form.oninput=update;
  form.onreset=event=>{event.preventDefault();reset();field('purchase').focus();};
  for (const key of Object.keys(SALE_DEFAULTS)) attachSmartNumberInput(field(key),currencyKeys.includes(key)?'money':percentKeys.includes(key)?'percent':'number');
  reset();
}
