import test from 'node:test';
import assert from 'node:assert/strict';
import { SIZES, findSizes } from '../public/size-table-data.js';
import { identifyRecipient, buildFreightQuote, validCnpj, validCep, SENDER } from '../public/freight-quote-data.js';

export const proposal = `GROWN OPTICAL LTDA
CNPJ: 60.570.108/0001-41
Endereço: AV JORNALISTA PAULO ZINGG, 572 - TERREO ANDAR 1, 2, 3 E 4 SUBSL
Bairro: JARDIM JARAGUA
Cidade: São Paulo - SP
CEP: 05157-030`;
const expected = {company:'GROWN OPTICAL LTDA',cnpj:'60.570.108/0001-41',address:'AV JORNALISTA PAULO ZINGG, 572 - TERREO ANDAR 1, 2, 3 E 4 SUBSL',district:'JARDIM JARAGUA',city:'São Paulo - SP',cep:'05157-030'};
test('tabela contém todos os itens e dados, sem duplicar a caixa', () => {
  assert.equal(SIZES.length,12);
  assert.equal(findSizes('','Sacos').length,4);
  assert.equal(findSizes('','Caixas').length,7);
  assert.equal(findSizes('','Pallet').length,1);
  assert.deepEqual(findSizes('Conj. Galão reprocessadora'),[{type:'Caixas',name:'Conj. Galão reprocessadora',height:37,width:40,length:50,weight:3,weightUnit:'unidade'}]);
  assert.deepEqual(findSizes('galAO'),findSizes('Conj. Galão reprocessadora'));
  assert.equal(findSizes('galão','Sacos').length,0);
  assert.equal(JSON.stringify(SIZES).includes('Modelo A'),false);
  assert.deepEqual(findSizes('Saco').map(i=>[i.height,i.width,i.length]),[[20,50,45],[50,45,20],[60,40,10],[60,40,10]]);
  assert.deepEqual(findSizes('Caixa Nº').map(i=>[i.height,i.width,i.length]),[[20,15,15],[25,25,14],[35,25,25],[50,30,25],[50,40,35],[70,50,40]]);
  assert.deepEqual(findSizes('Pallet').map(i=>[i.height,i.width,i.length,i.weight]),[[null,100,120,null]]);
});
test('frete identifica exatamente o exemplo fornecido, sem extrair carga', () => {
  assert.deepEqual(identifyRecipient(proposal),expected);
  assert.deepEqual(identifyRecipient(proposal+'\nMercadoria: não extrair\nPeso: 99 kg'),expected);
});
test('frete reconhece rótulos, caixa, acentos, espaços e CRLF', () => {
  const text = proposal.replace('CNPJ:','CNPJ :').replace('Endereço:','ENDEREÇO:').replace('Bairro:','BAIRRO:').replace('Cidade:','CIDADE:').replace('CEP:','CEP -').replaceAll('\n','\r\n');
  assert.deepEqual(identifyRecipient(text),expected);
  assert.deepEqual(identifyRecipient('Razão Social: '+proposal.replaceAll('\n','  ')),expected);
});
test('frete deixa campos ausentes vazios, sem presumir informações', () => {
  assert.deepEqual(identifyRecipient(''),{company:'',cnpj:'',address:'',district:'',cep:'',city:''});
  assert.deepEqual(identifyRecipient('CNPJ: 123\nCEP - 05157-030'),{company:'',cnpj:'123',address:'',district:'',cep:'05157-030',city:''});
  assert.equal(identifyRecipient('Proposta comercial\nCNPJ: 123').company,'');
});
test('validação amigável de CNPJ e CEP', () => {
  assert.equal(validCnpj(SENDER.cnpj),true);
  assert.equal(validCnpj(expected.cnpj),true);
  for (const cnpj of ['','11111111111111','21.707.512/0001-63','texto']) assert.equal(validCnpj(cnpj),false);
  for (const cep of ['05157-030','05157030']) assert.equal(validCep(cep),true);
  for (const cep of ['','05157','abc05157030']) assert.equal(validCep(cep),false);
});
test('cotação completa preserva coleta, entrega, carga manual e quebras', () => {
  const cargo = {goods:'Peças',invoice:'R$ 1.500,00',weight:3,dimensions:'Volume 1: 37 × 40 × 50 cm\nVolume 2: 20 × 15 × 15 cm'};
  const quote = buildFreightQuote(expected,cargo);
  for (const value of [...Object.values(SENDER),...Object.values(expected),...Object.values(cargo),'DADOS DA COLETA','DADOS DA ENTREGA','DADOS DA CARGA']) assert.ok(quote.includes(value),value);
  assert.ok(quote.indexOf('DADOS DA COLETA')<quote.indexOf('DADOS DA ENTREGA'));
  assert.ok(quote.indexOf('DADOS DA ENTREGA')<quote.indexOf('DADOS DA CARGA'));
});
