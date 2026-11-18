import { unzipSync, zipSync, strFromU8, strToU8 } from '../../vendor/fflate/esm/browser.js';

export const COMPRA_PRIORIDADES = Object.freeze({ media: 'Média', urgente: 'Urgente', critica: 'Crítica' });
export const FQ09_LIMITE_ITENS = 12;

const text = value => String(value ?? '').trim();
const priorityBox = { media: 1255, urgente: 1253, critica: 1254 };

function dateForPrint(value) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  const date = new Date(value ?? '');
  if (!parts || !Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value)
    throw new Error('A solicitação de compra precisa ter uma data válida.');
  return `${parts[3]}/${parts[2]}/${parts[1]}`;
}

function xmlText(value) {
  if (value.length > 32767 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(value))
    throw new Error('Há um campo com texto incompatível com o formulário Excel. Revise o conteúdo e tente novamente.');
  return value.replace(/_x[0-9a-f]{4}_/gi, match => '_x005F_' + match.slice(1))
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\r', '&#13;');
}

function wrappedHeight(value, width) {
  // Larguras conservadoras para Arial 12 nas células mescladas do modelo.
  const lines = value.split(/\r\n|\r|\n/).reduce((total, line) => {
    let count = 1;
    let used = 0;
    for (const word of line.split(/\s+/)) {
      const length = [...word].reduce((sum, char) => sum + (/[MW@%#]/u.test(char) ? 1.5 : 1), 0);
      if (used && used + 1 + length > width) {
        count++;
        used = 0;
      }
      const extraLines = Math.max(0, Math.ceil(length / width) - 1);
      count += extraLines;
      used += (used ? 1 : 0) + length - extraLines * width;
    }
    return total + count;
  }, 0);
  return Math.ceil(lines * 16 + 3);
}

export function prepararFQ09(compra) {
  const requisitante = 'Patrick Barbosa';
  const itens = Array.isArray(compra.itens) ? compra.itens : [];
  if (!itens.length) throw new Error('Adicione pelo menos um item para gerar a Solicitação de Compra.');
  const descricaoArquivo = text(itens[0]?.descricao)
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim()
    .slice(0, 120).replace(/[\uD800-\uDBFF]$/u, '').replace(/[. ]+$/, '')
    .replace(/^(?:CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(?= *\.)/i, '_$&');
  if (!descricaoArquivo) throw new Error('Informe a descrição do material para gerar o arquivo.');
  if (itens.length > FQ09_LIMITE_ITENS)
    throw new Error(`O formulário FQ 09 aceita até ${FQ09_LIMITE_ITENS} itens. Reduza a quantidade de itens nesta solicitação antes de gerar o Excel.`);
  const box = Object.hasOwn(priorityBox, compra.prioridade) ? priorityBox[compra.prioridade] : null;
  if (!box) throw new Error('Selecione a prioridade para gerar a Solicitação de Compra.');
  const numero = compra.numero;
  if (!Number.isSafeInteger(numero) || numero < 1)
    throw new Error('Esta Solicitação de Compra não possui número comercial salvo para gerar o Excel.');
  const observacoes = text(compra.observacoes);
  const cells = { J2: numero, J4: dateForPrint(compra.criadoEm), A6: requisitante, A24: observacoes };
  const heights = { 6: wrappedHeight(requisitante, 34), 24: wrappedHeight(observacoes, 95) - 30 };
  itens.forEach((item, index) => {
    const row = 11 + index;
    const descricao = text(item?.descricao);
    const unidade = text(item?.unidade);
    const quantidade = item?.quantidade;
    if (typeof quantidade !== 'number' || !Number.isFinite(quantidade) || quantidade <= 0 || !unidade || !descricao)
      throw new Error(`Informe quantidade positiva, unidade e descrição no item ${index + 1}.`);
    const prd = text(item.prd);
    const aplicacao = text(item.aplicacao);
    for (const [column, value] of Object.entries({ A: index + 1, B: quantidade, C: unidade, D: prd, F: descricao, I: aplicacao }))
      cells[column + row] = value;
    heights[row] = Math.max(wrappedHeight(descricao, 43), wrappedHeight(aplicacao, 26),
      wrappedHeight(prd, 15), wrappedHeight(unidade, 5));
  });
  if (Object.values(heights).some(height => height > 409))
    throw new Error('Um dos textos excede a altura disponível em uma célula do formulário FQ 09. Revise o conteúdo antes de exportar.');
  for (const [address, value] of Object.entries(cells)) {
    cells[address] = typeof value === 'number' ? `<v>${value}</v>`
      : value ? `<is><t xml:space="preserve">${xmlText(value)}</t></is>` : '';
  }
  return { cells, heights, box, filename: `${descricaoArquivo} - ${numero}.xlsx` };
}

const priorityMark = '<xdr:txBody><a:bodyPr anchor="ctr" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>'
  + '<a:p><a:pPr algn="ctr"/><a:r><a:rPr sz="1400" b="1"/><a:t>X</a:t></a:r></a:p></xdr:txBody>';

export function preencherFQ09(template, { cells, heights, box }) {
  const parts = unzipSync(template);
  const sheetPath = 'xl/worksheets/sheet1.xml';
  const drawingPath = 'xl/drawings/drawing1.xml';
  let sheet = strFromU8(parts[sheetPath]);
  for (const [address, content] of Object.entries(cells)) {
    if (!content) continue;
    const cell = new RegExp(`<c r="${address}" s="(\\d+)"/>`);
    if (!cell.test(sheet)) throw new Error(`A célula ${address} não está disponível no modelo FQ 09.`);
    const type = content.startsWith('<is>') ? 'inlineStr' : 'n';
    sheet = sheet.replace(cell, (_, style) => `<c r="${address}" s="${style}" t="${type}">${content}</c>`);
  }
  sheet = sheet.replace(/(<row r="(\d+)"[^>]*? ht=")([\d.]+)"/g,
    (full, prefix, row, base) => heights[row] > Number(base) ? `${prefix}${heights[row]}"` : full);
  const shape = new RegExp(`(<xdr:sp [^>]*><xdr:nvSpPr><xdr:cNvPr id="${box}"[\\s\\S]*?</xdr:spPr>)(</xdr:sp>)`);
  const drawing = strFromU8(parts[drawingPath]);
  if (!shape.test(drawing)) throw new Error('A caixa de prioridade não está disponível no modelo FQ 09.');
  parts[sheetPath] = strToU8(sheet);
  parts[drawingPath] = strToU8(drawing.replace(shape, (_, properties, end) => properties + priorityMark + end));
  return zipSync(parts);
}

export async function gerarExcelCompra(compra) {
  const form = prepararFQ09(compra);
  const response = await fetch(new URL('../../modelos/FQ09.xlsx', import.meta.url));
  if (!response.ok) throw new Error('Não foi possível carregar o modelo oficial FQ 09.');
  const bytes = preencherFQ09(new Uint8Array(await response.arrayBuffer()), form);
  const file = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = form.filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
