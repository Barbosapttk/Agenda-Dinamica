# VERSÃO DE TESTE OFICIAL — Agenda Dinâmica

Última fase funcional planejada: B2, B3 e B5. Após a validação desta versão, o
escopo fica congelado para os testes oficiais de **03/11/2026**, salvo correções
de bugs críticos. Não iniciar B4, novas ferramentas, migração arquitetural ou
alterações de concorrência. Nenhum commit, push ou publicação foi realizado.

## Inventário anterior às alterações

- Solicitações: array `solicitacoesOrcamento`, chave `secta_solicitacoes_orcamento`,
  com ID numérico, clienteId opcional, nome/empresa/CNPJ/telefone/e-mail, produto,
  descrição, observações, datas, prioridade, etapa e anexos. Não havia campo de
  Próxima Ação, peso, dimensões, quantidade ou endereço/CEP no formulário atual.
- Clientes: possuem cidade/estado, empresa e CNPJ aproveitáveis. Endereço/CEP não
  estão no formulário atual; somente valores estruturados presentes em registros
  importados podem fornecer esses campos.
- Fretes: ferramenta da Central, única montagem de `mountFreightQuote`. Destinatário
  com razão social/CNPJ/endereço/bairro/cidade/CEP; carga com Mercadoria, NF,
  Peso Total em KG e Dimensões por volume. Não tem telefone nem quantidade isolada.
  Prepara/copia o texto de cotação; não consulta preços ou prazos de transportadoras.
- Compras: `cotacoesCompras`, chave `secta_cotacoes_compras`; ID numérico, descrição,
  status `enviado`/`sem_retorno`/`concluido`, flag de conclusão, datas e ID técnico
  de criação. CRUD usa ComprasService, Event Bus, Repository e formulário existentes.
  Não havia relação com Solicitações nem campos separados de cliente/empresa.
- Retornos: `agendamentos`, em geral relacionados somente por clienteId. Isso não
  identifica uma Solicitação específica. Ações do Dia e observações também não
  são campos de Próxima Ação por Solicitação e não foram reinterpretados.

## B2 — Solicitação → Cotação de Frete

Uma ação **Cotar Frete** fica no detalhe contextual já existente da Solicitação.
Abre Central → Fretes → Cotação na mesma Agenda, com a implementação atual. Não
há botão duplicado nos cards nem nova calculadora. A referência de origem é
somente o ID da Solicitação em memória, exibido com **Voltar para Solicitação**.
O retorno abre a fila e o detalhe original, sem nova guia/janela.

Mapeamento explícito em `mapSolicitacaoParaFrete`:

| Destino | Origem e precedência |
|---|---|
| Razão Social | Empresa da Solicitação, empresa do cliente vinculado, nome da Solicitação ou nome do cliente |
| CNPJ | CNPJ da Solicitação ou do cliente vinculado |
| Cidade | Cidade e UF/estado estruturados da Solicitação; fallback para cidade/estado do cliente |
| Endereço, Bairro, CEP | Campos estruturados homônimos presentes na Solicitação ou no cliente; ausentes ficam vazios |
| Mercadoria | Produto e descrição, unidos quando diferentes, sem interpretar o texto |
| Valor da NF | Vazio: não há valor compatível na Solicitação |
| Peso Total | Somente `pesoKg` numérico, finito e não negativo; ausente fica vazio |
| Dimensões por volume | Somente `dimensoes` estruturado como texto; ausente fica vazio |
| Telefone/quantidade | Sem destino isolado no formulário atual: não criados nem inferidos |

Campos estruturados opcionais importados são aceitos por correspondência explícita;
não se adicionaram esses campos ao cadastro nem se extraem CEP, endereço, peso,
quantidade ou medidas da descrição/observação. O peso não é calculado a partir de
texto e continua KG. Valores ausentes limpam a cotação anterior, sem herdar dados
de outro atendimento. Uma cotação editada exige confirmação antes de ser substituída;
cancelar conserva os valores e a Solicitação aberta.

O preenchimento é uma cópia inicial de valores, sem referência mutável ao objeto
original. Alterar peso, endereço, descrição ou qualquer campo no Frete não grava
a Solicitação, não muda sua etapa/Próxima Ação e não cria Retorno. O contexto e a
cotação continuam sem persistência de rascunho, como antes; reload encerra o contexto.

## B3 — Solicitação → Compras

Na etapa **Aguardando cotação de peças**, o detalhe oferece **Solicitar cotação de
peças**. Abre o formulário existente de Compras, com descrição inicial composta
por produto, descrição e observações. Abrir não grava: o usuário revisa e salva.
O único campo relacional adicionado à Compra é **`solicitacaoId`**, ID numérico
estável da origem. Cliente/empresa são consultados na origem, sem novo cadastro
espelhado, relação por nome ou campos comerciais duplicados.

O ComprasService valida a origem e a etapa antes de criar, usando o mesmo comando,
fila, writer e evento de Compras. A aplicação só aplica/publica depois do ACK.
A busca por `solicitacaoId` ocorre dentro da preparação serializada: duas ações
locais simultâneas ou comandos diferentes não criam duas compras da mesma origem.
Uma Compra existente, inclusive concluída, é reutilizada sem escrita/evento extra.
Edição/status preservam o vínculo. Falha de gravação não aplica uma Compra fictícia.

Solicitação mostra o ID da Compra no card e permite **Abrir compra** no detalhe.
Compra mostra **Solicitação de origem** e **Abrir solicitação** no card/modal,
aproveitando o painel existente de Compras e o detalhe existente da Solicitação.
Não há nova página de Compras. Se a origem já foi concluída/removida, o ID permanece
e a interface informa sua indisponibilidade; não se reabre ou duplica a Solicitação.

Criar/editar/concluir Compra não altera a etapa, Próxima Ação, proposta, preço ou
conclusão da Solicitação. Não há retorno automático de valores, criação de orçamento
ou integração externa. A prevenção local não é uma restrição única no servidor:
no modo legacy continuam existindo as limitações entre navegadores já documentadas.

## B5 — Próxima Ação

Menor estrutura adicional, dentro de cada Solicitação:

```json
{ "proximaAcao": { "texto": "Consultar fornecedor", "data": "2026-11-03" } }
```

Texto editável, data opcional ISO internamente. O formulário compacto usa duas
entradas no detalhe, com Salvar e Remover. A persistência usa `commitCollection`
do Repository existente para enviar somente Solicitações; os demais fluxos legados
continuam. Só aplica depois do ACK; falha mantém a ação antiga e o texto em edição.
Remover grava `proximaAcao: null`. Editar os demais campos não elimina a ação.

O card exibe um bloco discreto, menor que cliente/produto, com **Próxima ação**,
texto escapado e data **DD/MM/AAAA** quando houver. Etapa/prioridade permanecem
separadas. Sem ação, não há bloco vazio nem sugestão inventada pelo status/prazo.
Textos longos quebram dentro do card, sem escala global ou altura fixa.

Somente um Retorno futuro que já possua referência explícita `solicitacaoId` pode
fornecer ação/data em registros sem campo manual. Não se infere relação por cliente,
nome, observação ou semelhança de texto. No fluxo atual os Retornos normalmente
possuem apenas clienteId, portanto não são associados automaticamente. Não se cria
Retorno para preencher o card. A ação manual tem precedência; remoção explícita
suprime o bloco sem apagar Retornos existentes. Não há automação ao cotar Frete ou
criar Compra. A conclusão continua encerrando a fila, sem migração da ação ao Histórico.

## Persistência, limites e congelamento

Nenhuma coleção, localStorage comercial, IndexedDB, backend, API ou cliente Supabase
novo. Os campos adicionais seguem dentro das coleções já cobertas por backup,
restauração e exclusão do Bloco A. O JSON continua versão 1, preservando atributos
dos registros. Sem migration de dados ou alteração SQL nesta fase.

Modo **legacy** mantido. Não foram ativados RPC, CAS, revisão global, receipts ou
autenticação; não se declara proteção de concorrência server-side. A fila e o
tratamento de comandos locais de Compras são os existentes, não receipts duráveis.
Nenhuma regra de conclusão, Propostas, Contatos, Retornos, Histórico, Vendas,
fórmulas ou valores padrão das ferramentas foi reescrita. O Dashboard continua
usando seus renderizadores existentes; o bloco novo do renderer compartilhado é
restrito à fila de Solicitações, preservando os cards resumidos do Dashboard.

Os novos testes usam nomes genéricos, telefone/CNPJ fictícios e domínio reservado
`example.invalid`, com SDK interceptado e banco de testes local. Não houve escrita
ou consulta de dados comerciais do Supabase real. Configurações de remetente e
fixtures históricas preexistentes foram preservadas.

Após validação, esta é a **VERSÃO DE TESTE OFICIAL**, congelada para 03/11/2026.
Não há escopo para iniciar B4, novas ferramentas ou melhorias futuras nesta execução.
