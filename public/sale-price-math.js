export const SALE_DEFAULTS = {
  purchase:0,buyIpi:0,buyPis:9.25,buyIcms:4,freight:0,quantity:0,
  margin:40,sellIpi:0,sellIcms:18,sellPis:9.25,
};
export function calculatePurchaseCost(values) {
  for (const key of ['purchase','freight']) if (!Number.isFinite(values[key]) || values[key]<0) throw new RangeError('Preço de compra e frete devem ser números não negativos.');
  for (const key of ['buyIpi','buyPis','buyIcms']) if (!Number.isFinite(values[key]) || values[key]<0 || values[key]>100) throw new RangeError('Percentuais de compra devem estar entre 0% e 100%.');
  if (values.quantity!==null && (!Number.isFinite(values.quantity) || values.quantity<0 || (values.freight>0 && values.quantity===0))) throw new RangeError('Informe uma quantidade maior que zero para distribuir o frete.');
  const ipi=values.purchase*values.buyIpi/100;
  const pisCredit=values.purchase*values.buyPis/100;
  const icmsCredit=values.purchase*values.buyIcms/100;
  const realCost=values.purchase*(100+values.buyIpi-values.buyPis-values.buyIcms)/100;
  if (realCost<0) throw new RangeError('As deduções geram um custo negativo. Confira os percentuais de compra.');
  const freightUnit=values.quantity>0 ? values.freight/values.quantity : 0;
  const finalCost=realCost+freightUnit;
  if (![ipi,pisCredit,icmsCredit,realCost,freightUnit,finalCost].every(Number.isFinite)) throw new RangeError('Valores acima do limite de cálculo.');
  return {ipi,pisCredit,icmsCredit,realCost,freightUnit,finalCost,freightIgnored:values.freight>0 && values.quantity===null};
}
export function calculateSalePrice(cost,values) {
  if (!Number.isFinite(cost) || cost<0) throw new RangeError('Custo deve ser um número não negativo.');
  for (const key of ['margin','sellIpi','sellIcms','sellPis']) if (!Number.isFinite(values[key]) || values[key]<0 || values[key]>100) throw new RangeError('Percentuais de venda devem estar entre 0% e 100%.');
  const totalRate=values.margin+values.sellIpi+values.sellIcms+values.sellPis;
  if (totalRate>=100) throw new RangeError('Os percentuais informados não permitem calcular um preço de venda válido.');
  const gross=cost/(1-totalRate/100);
  const ipi=gross*values.sellIpi/100;
  const icms=gross*values.sellIcms/100;
  const pis=gross*values.sellPis/100;
  const net=gross-ipi-icms-pis;
  const profit=net-cost;
  const netMargin=gross>0?profit/gross*100:0;
  if (![gross,ipi,icms,pis,net,profit,netMargin].every(Number.isFinite)) throw new RangeError('Valores acima do limite de cálculo.');
  return {gross,ipi,icms,pis,net,cost,profit,netMargin};
}
