import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateService, parseServiceNumber } from '../public/service-calculator-math.js';
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} ≠ ${expected}`);
test('custos independentes e imposto/margem sobre o total', () => {
  const result = calculateService({ salary: 6000, hours: 4, distance: 100, toll: 45, food: true });
  close(result.hourlyTechnician, 61.36363636363636);
  close(result.technician, 245.45454545454544);
  assert.equal(result.fuel, 125);
  assert.equal(result.vehicle, 50);
  assert.equal(result.meal, 38);
  close(result.total, 503.45454545454544);
  close(result.tax, 110.76);
  close(result.margin, 151.03636363636363);
  close(result.final, 765.2509090909091);
});
test('sem deslocamento, pedágio ou alimentação', () => {
  const result = calculateService({ salary: 6000, hours: 4 });
  assert.equal(result.fuel + result.toll + result.meal, 0);
  close(result.total, 295.45454545454544);
  close(result.final, 449.09090909090907);
});
test('decimais, horas fracionadas e grandes valores', () => {
  for (const salary of [6000.55, 1000000000.99]) {
    const result = calculateService({ salary, hours: 2.5, distance: 10.25, toll: 4.75 });
    close(result.vehicle, 31.25);
    close(result.fuel, 12.8125);
    close(result.final, (salary / 22 * 1.8 / 8 * 2.5 + 12.8125 + 4.75 + 31.25) * 1.52);
  }
});
test('entradas inválidas nunca produzem resultado', () => {
  for (const input of [{salary:0},{hours:0},{salary:NaN},{hours:-1},{distance:-1},{toll:-1},{salary:Infinity},{salary:1e308,hours:1e308}]) {
    assert.throws(() => calculateService({ salary:6000, hours:4, ...input }), RangeError);
  }
});
test('entrada monetária brasileira e decimal simples', () => {
  for (const [input, expected] of [['R$ 6.000,55',6000.55],['6000',6000],['6000.55',6000.55],['6.000',6000],['2,5',2.5],['',0]]) assert.equal(parseServiceNumber(input), expected);
  for (const input of ['abc','-1','1,2,3','Infinity']) assert.ok(Number.isNaN(parseServiceNumber(input)));
});
test('produtos químicos opcionais, preços e quantidades', () => {
  for (const [id, quantity, cost] of [['hypochlorite',1,9],['hypochlorite',2,18],['hydroxide',1,8],['hydroxide',5,40],['peracetic',1,60],['peracetic',2,120]]) {
    const result = calculateService({salary:6000, hours:4, chemicals:{[id]:{selected:true,quantity}}});
    assert.equal(result.chemicalCosts[id],cost);
    assert.equal(result.chemicalTotal,cost);
    close(result.total,295.45454545454544+cost);
    close(result.final,(295.45454545454544+cost)*1.52);
  }
});
test('químicos combinados, desativados e quantidades inválidas', () => {
  const base = {salary:6000,hours:4};
  assert.equal(calculateService(base).chemicalTotal,0);
  const chemicals = {hypochlorite:{selected:true,quantity:2},hydroxide:{selected:true,quantity:5},peracetic:{selected:true,quantity:2}};
  assert.equal(calculateService({...base,chemicals}).chemicalTotal,178);
  assert.equal(calculateService({...base,chemicals:{hypochlorite:{selected:false,quantity:NaN}}}).chemicalTotal,0);
  assert.equal(calculateService({...base,chemicals:{hydroxide:{selected:true,quantity:0.5}}}).chemicalTotal,4);
  for (const quantity of [-1,NaN,Infinity,'2']) assert.throws(()=>calculateService({...base,chemicals:{hypochlorite:{selected:true,quantity}}}),RangeError);
});
