import test from 'node:test';
import assert from 'node:assert/strict';
import { SALE_DEFAULTS,calculatePurchaseCost,calculateSalePrice } from '../public/sale-price-math.js';
const defaults={...SALE_DEFAULTS,purchase:10,quantity:null,margin:30};
test('estado inicial de venda é zero sem divisão por zero',()=>{
  assert.equal(SALE_DEFAULTS.purchase,0);assert.equal(SALE_DEFAULTS.quantity,0);
  assert.equal(calculatePurchaseCost(SALE_DEFAULTS).finalCost,0);
  assert.equal(calculateSalePrice(0,SALE_DEFAULTS).gross,0);
});
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} ≠ ${expected}`);
test('compra padrão: IPI, créditos e custo sem arredondamento intermediário',()=>{
  const cost=calculatePurchaseCost(defaults);
  assert.equal(cost.ipi,0);assert.equal(cost.pisCredit,0.925);assert.equal(cost.icmsCredit,0.4);
  assert.equal(cost.realCost,8.675);assert.equal(cost.finalCost,8.675);
  assert.equal(cost.realCost.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}).replace(/\s/g,''),'R$8,68');
});
test('venda padrão: formação e PDV reproduzem 30% de margem',()=>{
  const sale=calculateSalePrice(calculatePurchaseCost(defaults).finalCost,defaults);
  close(sale.gross,20.292397660818713);close(sale.icms,3.6526315789473687);close(sale.pis,1.877046783625731);
  close(sale.net,14.762719298245614);close(sale.profit,6.087719298245614);close(sale.netMargin,30);assert.equal(sale.ipi,0);
});
test('frete é adicionado após créditos e somente ele é dividido pela quantidade',()=>{
  const cost=calculatePurchaseCost({...defaults,freight:100,quantity:10});
  assert.equal(cost.realCost,8.675);assert.equal(cost.freightUnit,10);assert.equal(cost.finalCost,18.675);
  close(calculateSalePrice(cost.finalCost,defaults).gross,43.68421052631579);
});
test('alteração de todos os percentuais de compra e venda',()=>{
  const values={...defaults,purchase:20,buyIpi:5,buyPis:10,buyIcms:12,margin:40,sellIpi:5,sellIcms:18,sellPis:9.25};
  const cost=calculatePurchaseCost(values);assert.equal(cost.realCost,16.6);
  const sale=calculateSalePrice(cost.finalCost,values);close(sale.gross,16.6/0.2775);close(sale.netMargin,40);
  close(sale.ipi,sale.gross*0.05);close(sale.net,sale.gross-sale.ipi-sale.icms-sale.pis);
});
test('frete 120: quantidades 12 e 24 geram frete unitário 10 e 5',()=>{
  assert.equal(calculatePurchaseCost({...defaults,freight:120,quantity:12}).freightUnit,10);
  assert.equal(calculatePurchaseCost({...defaults,freight:120,quantity:24}).freightUnit,5);
});
test('frete ausente, quantidade ausente e quantidade zero sem frete',()=>{
  assert.equal(calculatePurchaseCost({...defaults,freight:100,quantity:null}).freightUnit,0);
  assert.equal(calculatePurchaseCost({...defaults,freight:100,quantity:null}).freightIgnored,true);
  assert.equal(calculatePurchaseCost({...defaults,quantity:0}).finalCost,8.675);
  assert.throws(()=>calculatePurchaseCost({...defaults,freight:100,quantity:0}),/quantidade maior que zero/);
});
test('validação rejeita negativos, NaN, percentuais inválidos e custo negativo',()=>{
  for(const values of [{purchase:-1},{freight:-1},{quantity:-1},{purchase:NaN},{buyIpi:101},{buyPis:101},{buyIcms:-1},{buyPis:80,buyIcms:80}]) assert.throws(()=>calculatePurchaseCost({...defaults,...values}),RangeError);
  for(const values of [{margin:-1},{sellIpi:101},{sellIcms:NaN},{sellPis:-1}]) assert.throws(()=>calculateSalePrice(10,{...defaults,...values}),RangeError);
  assert.throws(()=>calculateSalePrice(-1,defaults),RangeError);
});
test('soma de margem e tributos igual ou superior a 100% não divide',()=>{
  for(const margin of [72.75,80]) assert.throws(()=>calculateSalePrice(10,{...defaults,margin}),/Os percentuais informados não permitem calcular um preço de venda válido/);
});
test('zero, decimais, valores grandes e overflow são tratados',()=>{
  assert.deepEqual(calculateSalePrice(0,defaults),{gross:0,ipi:0,icms:0,pis:0,net:0,cost:0,profit:0,netMargin:0});
  const cost=calculatePurchaseCost({...defaults,purchase:1234567.89,freight:25.5,quantity:2.5});
  close(cost.freightUnit,10.2);close(calculateSalePrice(cost.finalCost,defaults).netMargin,30);
  assert.throws(()=>calculatePurchaseCost({...defaults,purchase:Number.MAX_VALUE,buyIpi:100}),RangeError);
});
