import test from 'node:test';
import assert from 'node:assert/strict';
import { SIZES, findSizes, formatarTamanhoParaCopia } from '../public/size-table-data.js';

test('Saco de Sal: cópia exata com dados definidos nesta tarefa', () => {
  assert.equal(formatarTamanhoParaCopia(findSizes('sal')[0]), 'Saco de Sal: L 50 x A 20 x C 45 (25 KG por Saco)');
});
test('Conj. Galão reprocessadora: categoria, nome, dimensões e cópia exatos', () => {
  const [item] = findSizes('galão');
  assert.equal(item.type,'Caixas');
  assert.equal(formatarTamanhoParaCopia(item),'Conj. Galão reprocessadora: L 40 x A 37 x C 50 (3 KG por unidade)');
});
test('sem peso não inventa valores ou unidades', () => {
  const [item] = findSizes('caixa 7');
  assert.equal(formatarTamanhoParaCopia(item),'Caixa Nº 7: L 15 x A 20 x C 15');
  assert.equal(formatarTamanhoParaCopia({...item,weight:0}),'Caixa Nº 7: L 15 x A 20 x C 15');
  assert.equal(formatarTamanhoParaCopia({...item,weight:3}),'Caixa Nº 7: L 15 x A 20 x C 15 (3 KG)');
});
test('Pallet mantém altura desconhecida e dimensões existentes', () => {
  assert.equal(formatarTamanhoParaCopia(findSizes('pallet')[0]),'Pallet: L 100 x A — x C 120');
});
test('busca ignora acentos e número da caixa é exato', () => {
  assert.deepEqual(findSizes('caixa 7').map(item=>item.name),['Caixa Nº 7']);
  assert.deepEqual(findSizes('caixa Nº 17').map(item=>item.name),['Caixa Nº 17']);
  assert.deepEqual(findSizes('GALAO').map(item=>item.name),['Conj. Galão reprocessadora']);
  assert.equal(findSizes('galão','Sacos').length,0);
});
test('todos os 12 itens geram uma linha limpa em ordem L A C', () => {
  for (const item of SIZES) {
    const text = formatarTamanhoParaCopia(item);
    assert.ok(text.startsWith(item.name+': L '));
    assert.match(text,/ x A .+ x C /);
    assert.doesNotMatch(text,/[\n\r<>]|undefined|NaN|\(0 KG/);
  }
});
