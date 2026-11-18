import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from '../public/vendor/fflate/esm/browser.js';
import { prepararFQ09, preencherFQ09 } from '../public/application/services/compras-excel.js';

const template = readFileSync(new URL('../public/modelos/FQ09.xlsx', import.meta.url));
const original = unzipSync(template);
const item = { quantidade: 2.5, unidade: 'M²', prd: '0001', descricao: 'Mancal & vedação', aplicacao: 'Bancada' };
const compra = { id: 1763477600000, numero: 27, criadoEm: '2026-11-18', nomeReferencia: 'João Silva',
  prioridade: 'media', observacoes: 'Confirmar antes da compra.', itens: [item] };
const sheetPath = 'xl/worksheets/sheet1.xml';
const drawingPath = 'xl/drawings/drawing1.xml';
const xml = (parts, path = sheetPath) => strFromU8(parts[path]);
const result = input => unzipSync(preencherFQ09(template, prepararFQ09(input)));
const cell = (sheet, address) => sheet.match(new RegExp(`<c r="${address}"[^>]*?(?:/>|>[\\s\\S]*?</c>)`))?.[0];

test('preenche o formulário oficial para um item e preserva as partes do workbook', () => {
  const filled = result(compra);
  const sheet = xml(filled);
  assert.deepEqual(Object.keys(filled), Object.keys(original));
  for (const path of Object.keys(filled).filter(path => ![sheetPath, drawingPath].includes(path))) {
    assert.deepEqual(filled[path], original[path], path);
  }
  assert.match(xml(filled, 'xl/workbook.xml'), /<sheet name="FQ 09"/);
  assert.match(xml(filled, 'xl/sharedStrings.xml'), /FQ 09 - Solicitação de Compra/);
  assert.ok(filled['xl/media/image1.png'].length > 0);
  assert.match(sheet, /paperSize="9"[^>]+orientation="portrait"/);
  assert.match(cell(sheet, 'J2'), /t="n"><v>27<\/v>/);
  assert.match(cell(sheet, 'J4'), /18\/11\/2026/);
  assert.match(cell(sheet, 'A6'), />Patrick Barbosa</);
  assert.match(cell(sheet, 'A11'), /t="n"><v>1<\/v>/);
  assert.match(cell(sheet, 'B11'), /t="n"><v>2\.5<\/v>/);
  assert.match(cell(sheet, 'C11'), /M²/);
  assert.match(cell(sheet, 'D11'), /0001/);
  assert.match(cell(sheet, 'F11'), /Mancal &amp; vedação/);
  assert.match(cell(sheet, 'I11'), /Bancada/);
  assert.match(cell(sheet, 'A24'), /Confirmar antes da compra\./);
  assert.equal(prepararFQ09(compra).filename, 'Mancal & vedação - 27.xlsx');
});

test('exporta 5 e 12 itens em linhas distintas, mantendo o rodapé, as datas das assinaturas e as observações', () => {
  for (const size of [5, 12]) {
    const sheet = xml(result({ ...compra, itens: Array.from({ length: size }, (_, i) => ({ ...item, descricao: `Peça ${i + 1}` })) }));
    for (let i = 0; i < size; i++) {
      assert.ok(cell(sheet, `A${11 + i}`).includes(`<v>${i + 1}</v>`));
      assert.ok(cell(sheet, `F${11 + i}`).includes(`Peça ${i + 1}</t>`));
    }
    assert.match(cell(sheet, 'A24'), /Confirmar antes da compra/);
    for (const address of ['E26', 'J26', 'C27', 'H27', 'A29'])
      assert.equal(cell(sheet, address), cell(xml(original), address));
  }
});

test('deixa opcionais vazios e rejeita campos obrigatórios e mais de 12 itens', () => {
  const sheet = xml(result({ ...compra, observacoes: '', itens: [{ ...item, prd: '', aplicacao: '' }] }));
  for (const address of ['D11', 'I11', 'A24']) assert.equal(cell(sheet, address), cell(xml(original), address));
  assert.match(cell(xml(result({ ...compra, nomeReferencia: '' })), 'A6'), />Patrick Barbosa</);
  assert.throws(() => prepararFQ09({ ...compra, numero: undefined }), /não possui número comercial/);
  assert.throws(() => prepararFQ09({ ...compra, itens: [] }), /pelo menos um item/);
  assert.throws(() => prepararFQ09({ ...compra, itens: Array(13).fill(item) }), /até 12 itens/);
  assert.throws(() => prepararFQ09({ ...compra, itens: [{ ...item, quantidade: null }] }), /item 1/);
  assert.throws(() => prepararFQ09({ ...compra, itens: [{ ...item, unidade: '' }] }), /item 1/);
  assert.throws(() => prepararFQ09({ ...compra, itens: [{ ...item, descricao: '' }] }),
    { message: 'Informe a descrição do material para gerar o arquivo.' });
  assert.throws(() => prepararFQ09({ ...compra, criadoEm: '2026-02-30' }), /data válida/);
  assert.throws(() => prepararFQ09({ ...compra, prioridade: '' }), /Selecione a prioridade/);
});

test('usa a descrição do primeiro item no arquivo e sanitiza somente o nome', () => {
  const first = { ...item, descricao: 'Bomba Centrífuga 2CV' };
  assert.equal(prepararFQ09({ ...compra, numero: 1, itens: [first] }).filename, 'Bomba Centrífuga 2CV - 1.xlsx');
  assert.equal(prepararFQ09({ ...compra, numero: 5, itens: [
    { ...first, descricao: 'Bomba Centrífuga' }, { ...item, descricao: 'Kit de Vedação' }
  ] }).filename, 'Bomba Centrífuga - 5.xlsx');
  const descricao = 'Bomba /  Conjunto:\n2CV';
  const input = { ...compra, numero: 10, itens: [{ ...item, descricao }] };
  assert.equal(prepararFQ09(input).filename, 'Bomba Conjunto 2CV - 10.xlsx');
  assert.ok(cell(xml(result(input)), 'F11').includes(descricao));
  assert.equal(input.itens[0].descricao, descricao);
  assert.equal(prepararFQ09({ ...input, itens: [{ ...item, descricao: 'NUL.peça' }] }).filename, '_NUL.peça - 10.xlsx');
});

test('estende apenas as linhas necessárias e conserva textos longos e códigos literais', () => {
  const descricao = 'AZ_123 & código _x000A_\n' + 'Descrição para manutenção. '.repeat(7).trim();
  const aplicacao = 'Usar no conjunto de transmissão. '.repeat(8).trim();
  const observacoes = 'Conferir medidas com a equipe antes da compra.\n'.repeat(8).trim();
  const sheet = xml(result({ ...compra, observacoes, itens: [{ ...item, descricao, aplicacao }] }));
  for (const row of [11, 24]) {
    const height = Number(sheet.match(new RegExp(`<row r="${row}"[^>]* ht="([\\d.]+)"`))[1]);
    assert.ok(height > 30 && height <= 409);
  }
  assert.match(cell(sheet, 'F11'), /AZ_123 &amp; código _x005F_x000A_\nDescrição/);
  assert.ok(cell(sheet, 'I11').includes(aplicacao));
  assert.ok(cell(sheet, 'A24').includes(observacoes));
  assert.equal(cell(sheet, 'A12'), cell(xml(original), 'A12'));
  assert.throws(() => prepararFQ09({ ...compra, itens: [{ ...item, descricao: 'texto\n'.repeat(100) }] }), /altura disponível/);
});

for (const [prioridade, id] of [['media', 1255], ['urgente', 1253], ['critica', 1254]]) {
  test(`marca somente a caixa oficial para prioridade ${prioridade}`, () => {
    const drawing = xml(result({ ...compra, prioridade }), drawingPath);
    const marked = [...drawing.matchAll(/<xdr:sp [^>]*>[\s\S]*?<\/xdr:sp>/g)].map(match => match[0]).filter(shape => shape.includes('<a:t>X</a:t>'));
    assert.equal(marked.length, 1);
    assert.ok(marked[0].includes(`id="${id}"`));
  });
}
