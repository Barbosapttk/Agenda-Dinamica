import test from 'node:test';
import assert from 'node:assert/strict';
import {formatToolNumber} from '../public/smart-number-input.js';
import {SALE_DEFAULTS,calculatePurchaseCost,calculateSalePrice} from '../public/sale-price-math.js';
import {buildFreightQuote} from '../public/freight-quote-data.js';
const compact=value=>value.replace(/\s/g,'');
test('campos monetários aceitam valores inteiros, centavos e agrupamento brasileiro',()=>{
 for(const [input,expected] of [['100','R$100,00'],['6000','R$6.000,00'],['10,5','R$10,50'],['1.500','R$1.500,00'],['1.500,50','R$1.500,50']])assert.equal(compact(formatToolNumber(input,'money')),expected);
});
test('percentuais e números mantêm formato e precisão sem unidade no valor numérico',()=>{
 assert.equal(formatToolNumber('40%','percent'),'40,00%');assert.equal(formatToolNumber('9,25%','percent'),'9,25%');
 assert.equal(formatToolNumber('10','number'),'10');assert.equal(formatToolNumber('10,5','number'),'10,5');
 assert.equal(formatToolNumber('10,505','money').includes('10,505'),true);
 assert.equal(formatToolNumber('','money'),'');assert.equal(formatToolNumber('-1','money'),'-1');
});
test('margem inicial 40% e margem manual 30% usam a fórmula existente',()=>{
 assert.equal(SALE_DEFAULTS.margin,40);
 const cost=calculatePurchaseCost({...SALE_DEFAULTS,purchase:10});
 const forty=calculateSalePrice(cost.finalCost,SALE_DEFAULTS);
 const thirty=calculateSalePrice(cost.finalCost,{...SALE_DEFAULTS,margin:30});
 assert.ok(Math.abs(forty.gross-26.48854961832061)<1e-9);assert.ok(Math.abs(thirty.gross-20.292397660818713)<1e-9);
 assert.ok(Math.abs(forty.netMargin-40)<1e-9);
});
test('peso numérico é copiado com uma única unidade KG',()=>{
 const text=buildFreightQuote({}, {weight:150});assert.ok(text.includes('Peso Total: 150 KG'));assert.equal(text.includes('KG KG'),false);
 assert.ok(buildFreightQuote({}, {weight:10.5}).includes('Peso Total: 10,5 KG'));
});
