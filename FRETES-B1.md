# Fretes — Bloco B1

Atualização final B2: **Cotar Frete** no detalhe da Solicitação abre esta mesma
ferramenta com campos compatíveis e retorno à origem, sem escrita bidirecional.
O card da Central, cabeçalho e abas internos continuam os mesmos. Contrato e
limites em [VERSAO-TESTE-OFICIAL.md](VERSAO-TESTE-OFICIAL.md).

## Navegação e cotação

**Fretes** é uma ferramenta dentro da **Central de Ferramentas**, com três abas
internas: Cotação de Frete (inicial), Transportadoras e Correios. Não existe aba,
entrada lateral ou view operacional principal de Fretes. Card e dropdown abrem
a mesma seção `#fretes` dentro de `#quick-tools`, na terceira posição do catálogo.
O cabeçalho usa `toolPageHeader`, com o mesmo ícone, título, descrição e retorno
“← Ferramentas” das demais ferramentas. Retornar exibe a Central, mantendo a área
principal Ferramentas e devolvendo o foco ao card Fretes. Trocar de aba interna
preserva a edição; recarregar mantém o comportamento anterior da cotação, sem
persistência de cálculos/rascunhos. As abas suportam setas, Home/End e foco visível.

`mountFretes`, em `public/fretes.js`, é chamado uma única vez na montagem da Central
e chama `mountFreightQuote` no painel interno. Não há segunda calculadora.
Remetente, extração, validações CNPJ/CEP, parser, texto e clipboard foram preservados;
o módulo de dados/fórmulas não foi alterado. Apenas lançador e retorno à Central
foram retirados. Peso Total permanece numérico em **KG**, visível na interface e
uma única vez no resultado. NF/peso mantêm os campos inteligentes; CNPJ, CEP e
dimensões selecionam ao receber foco, sem interpretar códigos ou unidades.

O formulário existente tem Mercadoria, Valor da NF, Peso Total e **Dimensões por
volume**. Quantidade, comprimento, largura e altura continuam livres nesse último
campo, por exemplo `2 volumes; C 50 x L 40 x A 37 cm`. Não foram inventados inputs,
fórmulas ou seleção de unidade para mudar esse comportamento.

## Central e ferramentas preservadas

Cotação não aparece como ferramenta independente: fica somente dentro de Fretes.
Central e dropdown têm sete entradas, nesta ordem: Calculadora de Valor de Venda,
Calculadora de Valor de Serviço, **Fretes**, Textos Rápidos, Tabela de Tamanhos,
Anotações Rápidas e Tabelas de Referência. As outras seis ferramentas mantêm módulos,
layouts, cálculos e dados. Não há lançador órfão, navegação paralela ou integração
Tamanhos → Frete / Solicitação → Frete.

## Transportadoras

Nome, número/telefone, atendente, e-mail, cidades/regiões e observações opcionais,
aproveitando o mesmo padrão de textarea do editor. Sem campos adicionais
obrigatórios. Dados parciais são aceitos; apenas cadastro totalmente vazio é
rejeitado. E-mail preenchido usa validação nativa. Textos, inclusive cidades,
espaços e quebras, são preservados como digitados. Registros anteriores sem
observações continuam válidos: o editor mostra o campo vazio e preserva seu ID.

Permite adicionar, editar, consultar e excluir com confirmação. Pesquisa simples
por nome/atendente/cidades, sem distinção de caixa/acentos. Cards rotulados e editor
embutido adaptam-se à largura, sem tabela horizontal obrigatória no mobile.

UUID identifica cada registro, não o nome. Editar conserva o ID; excluir remove
somente esse ID. Nomes iguais não mesclam cadastros: a segunda criação pede
confirmação e recebe outro UUID. Repetir ID/conteúdo é no-op; colisão na criação
com outro conteúdo é rejeitada. Durante gravação, botões e campos são desabilitados.
Falha mantém a edição e não aplica o candidato nem anuncia sucesso.

## Persistência, backup e exclusão

`CarriersService` usa `commitCollection('transportadoras')` no mesmo
SnapshotRepository. Binding lexical registrado no AppState e no adapter existente;
nada de banco, localStorage comercial, cliente Supabase ou array isolado.
Chave **`secta_transportadoras`**, array JSON na tabela **`public.agenda_dinamica_storage`**.
Ausência da chave inicia lista vazia sem migração de dados. O serviço envia somente
essa coleção e aplica o resultado após ACK, pela fila/carga já existentes.

O modo continua **legacy**. Não houve ativação de RPC, CAS, login ou mudança remota.
Port atômico e whitelist na fonte SQL ainda inativa reconhecem a chave nova para
manter contratos/testes compatíveis. Nenhum SQL foi aplicado ao Supabase. Caso uma
instalação tenha aplicado a RPC antiga, editar o arquivo local não a atualiza;
eventual atualização/ativação remota continua fora desta etapa.

Transportadoras participa de carga, sincronização, snapshots, JSON, relatórios
CSV/XLSX, proteção anterior, restauração e exclusão. Backup agora cobre **12 coleções
+ tema**, além de preferências de alarmes. JSON permanece **versão 1**, com extensão
aditiva: inventário completo pré-B1 é reconhecido e a prévia mostra **zero
transportadoras** antes de confirmar sua restauração. Declarar a coleção nova e
omitir seus dados é inválido. Restaurar backup pré-B1 substitui esse catálogo por
vazio após confirmação; a proteção anterior conserva o catálogo existente.
Ferramentas pessoais, credenciais e binários externos continuam fora do escopo
comercial, como definido no Bloco A. A exclusão limpa também `secta_transportadoras`.

## Correios

Somente links oficiais, `target="_blank"` e `rel="noopener noreferrer"`:

- [Calcular frete](https://www2.correios.com.br/sistemas/precosPrazos/)
- [Rastrear objeto](https://rastreamento.correios.com.br/app/index.php)

Destinos conferidos em [Sistemas dos Correios](https://www.correios.com.br/atendimento/ferramentas/sistemas).
Abrem em nova guia, mantendo a Agenda. Não há iframe, API, preenchimento automático,
consulta de preço/prazo, envio ou rastreamento incorporado.

## Testes

`carriers-service.test.mjs`: CRUD/IDs, dados parciais, texto preservado, busca,
nomes iguais, confirmação, no-op/colisão, falha sem aplicação, backup anterior e
chaves/tema. `fretes-browser.mjs`: navegação/teclado, cotação/KG/clipboard,
seleção técnica, CRUD/duplicidade/pesquisa/recarga, falha mantendo formulário,
backup e abertura real de novas guias. Dados/SDK simulados, sem banco remoto.

Os testes de navegação/layout verificam sete ferramentas, com Fretes substituindo
o acesso independente à Cotação. Os cenários de cotação e campos inteligentes
entram por **Central → Fretes**. Há asserções explícitas para ausência de aba
principal, card e dropdown únicos, retorno à Central e foco no card correto.
Observações são verificadas no serviço, edição, recarga e backup.
O teste histórico de atalhos órfãos agora exclui a aba interna de Cotação em Fretes,
que é exigida pelo pedido revisado: continua proibindo atalhos nas outras ferramentas
e verifica que existe exatamente uma aba interna de Cotação.
Conteúdos, fórmulas, validações, clipboard, edição, persistência
e verificações de layout foram mantidos; nenhum teste foi removido. A descrição
do inventário comercial mudou para 12, com comparação exata ao registro central.

As três seções são verificadas em claro/escuro: zoom real 80/90/100/110/125/150/175%
(42 combinações) e viewports 375/768/1366/1440px (24 combinações). Grid/flex, tokens
e componentes existentes, sem `transform: scale`. Logs/matriz/capturas em `test-results/`.

O B1 original não incluiu B2–B5. A etapa final posterior implementou somente B2,
B3 e B5, conforme o contrato acima; B4 e integrações externas continuam ausentes.
Sem commit, push ou publicação.
