import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../public/agenda-format.js';
import { mapSolicitacaoParaFrete } from '../public/freight-quote-data.js';

test('B2: mapeamento explícito usa empresa/CNPJ/produto e cidade/UF do cadastro, sem mutar fontes',()=>{
  const sol={id:77,nome:'Cliente Genérico',empresa:'Empresa Exemplo',cnpj:'00000000000000',produto:'Equipamento Genérico',descricao:'Endereço fictício no texto, 25 kg, CEP 00000-000'};
  const client={nome:'Contato',cidade:'Cidade Exemplo',estado:'SP',telefone:'00000000000'};
  const before=JSON.stringify([sol,client]);const data=mapSolicitacaoParaFrete(sol,client);
  assert.deepEqual(data,{company:'Empresa Exemplo',cnpj:'00000000000000',city:'Cidade Exemplo - SP',goods:'Equipamento Genérico — Endereço fictício no texto, 25 kg, CEP 00000-000',address:'',district:'',cep:'',invoice:'',weight:'',dimensions:''});
  assert.equal(JSON.stringify([sol,client]),before);data.company='Alterado';assert.equal(sol.empresa,'Empresa Exemplo');
  assert.equal(Object.hasOwn(data,'telefone'),false);
});
test('B2: ausência de CEP/endereço/CNPJ/peso/dimensões deixa campos vazios, sem inferência pelo texto',()=>{
  const data=mapSolicitacaoParaFrete({nome:'Cliente Exemplo',descricao:'Produto 25 kg; medidas 40 x 50; CEP 00000-000'});
  for(const key of ['address','district','cep','cnpj','weight','dimensions','invoice'])assert.equal(data[key],'');
  assert.equal(data.company,'Cliente Exemplo');assert.equal(data.goods,'Produto 25 kg; medidas 40 x 50; CEP 00000-000');
});
test('B2: dados estruturados explícitos são aceitos, peso exige campo em KG e valor finito',()=>{
  const data=mapSolicitacaoParaFrete({endereco:'Rua Exemplo',cep:'00000-000',cidade:'Cidade Exemplo',uf:'SP',pesoKg:25,dimensoes:'2 volumes; C 50 x L 40 x A 37 cm'});
  assert.equal(data.address,'Rua Exemplo');assert.equal(data.cep,'00000-000');assert.equal(data.weight,'25');assert.equal(data.dimensions,'2 volumes; C 50 x L 40 x A 37 cm');
  for(const value of [-1,NaN,Infinity,'25'])assert.equal(mapSolicitacaoParaFrete({pesoKg:value}).weight,'');
  assert.equal(mapSolicitacaoParaFrete({peso:25}).weight,'');assert.equal(mapSolicitacaoParaFrete({pesoKg:0}).weight,'0');
});
function actionContext(returns=[]) {
  const source=fs.readFileSync('public/requests-revision.js','utf8');
  const context=vm.createContext({AgendaFormat,agendamentos:returns,today:()=> '2026-11-03',getCotacoesCompras:()=>[],fmtDate:AgendaFormat.date,
    escaparHtmlCotacaoCompras:value=>String(value||'').replaceAll('<','&lt;').replaceAll('>','&gt;')});
  vm.runInContext(source.slice(source.indexOf('// B2/B3/B5:'),source.indexOf('function voltarParaSolicitacao')),context);
  return context;
}
test('B5: sem ação não inventa pelo status, observação, cliente ou prazo',()=>{
  const ctx=actionContext([{id:1,clienteId:10,data:'2026-11-04',motivo:'Retorno de outro contexto'}]);
  for(const etapa of ['nova','aguardando_info','aguardando_cotacao','em_elaboracao']) {
    assert.equal(ctx.proximaAcaoSolicitacao({id:77,clienteId:10,etapa,prazo:'2026-11-04',obs:'Cotar frete'}),null);
    assert.equal(ctx.blocoProximaAcao({id:77,etapa}),'');
  }
});
test('B5: ação manual opcional preserva texto, data brasileira e escapa HTML',()=>{
  const ctx=actionContext();const sol={id:77,proximaAcao:{texto:'Consultar <fornecedor> '+ 'ação longa '.repeat(15),data:'2026-11-03'}};
  const html=ctx.blocoProximaAcao(sol);assert.match(html,/03\/11\/2026/);assert.match(html,/&lt;fornecedor&gt;/);assert.ok(!html.includes('<fornecedor>'));
  assert.equal(ctx.proximaAcaoSolicitacao(sol).texto,sol.proximaAcao.texto);
  assert.equal(ctx.proximaAcaoSolicitacao({proximaAcao:{texto:'Enviar orçamento',data:''}}).data,'');
  assert.equal(ctx.proximaAcaoSolicitacao({proximaAcao:null}),null);
});
test('B5: reaproveita somente retorno futuro com referência explícita à solicitação, sem criar registros',()=>{
  const returns=[{id:1,solicitacaoId:77,data:'2026-11-02',motivo:'Passado'},
    {id:2,solicitacaoId:77,data:'2026-11-05',motivo:'Depois'},{id:3,solicitacaoId:77,data:'2026-11-04',motivo:'Confirmar dados'},
    {id:4,clienteId:10,data:'2026-11-03',motivo:'Outro assunto'}];
  const before=JSON.stringify(returns),ctx=actionContext(returns);
  const action=ctx.proximaAcaoSolicitacao({id:77,clienteId:10});assert.equal(action.texto,'Confirmar dados');assert.equal(action.data,'2026-11-04');
  assert.equal(ctx.proximaAcaoSolicitacao({id:77,proximaAcao:null}),null);
  assert.equal(ctx.proximaAcaoSolicitacao({id:77,proximaAcao:{texto:'Cotar frete',data:''}}).texto,'Cotar frete');
  assert.equal(JSON.stringify(returns),before);
});
