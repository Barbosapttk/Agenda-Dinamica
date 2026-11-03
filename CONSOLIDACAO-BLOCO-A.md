# Consolidação do Bloco A — 31/10/2026

## Fontes e escopo

A aplicação em uso é `public/original-index.html`, carregada pelo iframe React.
Solicitações, clientes, contatos, retornos, recorrentes, propostas, vendas e histórico
mantêm regras no legado. Compras usa `ComprasService`, o Event Bus e seu adapter.
Todos compartilham `SnapshotRepository`, o estado lexical do legado e o mesmo
cliente Supabase. Nenhum armazenamento comercial alternativo foi criado.
O modo configurado permanece `legacy`; migrations/RPCs existentes não foram ativadas.

| Informação | Persistência atual | Backup JSON / exclusão comercial |
|---|---|---|
| Clientes | `agenda_dinamica_storage`, `secta_clientes` | Sim |
| Contatos e propostas originadas em contatos | `secta_contatos` na mesma tabela | Sim |
| Retornos | `secta_agendamentos` | Sim |
| Solicitações abertas | `secta_solicitacoes_orcamento` | Sim |
| Orçamentos recorrentes | `secta_orcamentos` | Sim |
| Conclusões e propostas provenientes de conclusões | `secta_concluidos` | Sim |
| Alterações de clientes | `secta_hist_clientes` | Sim |
| Controle de vendas | `secta_controle_vendas` | Sim |
| Compras, incluindo concluídas | `secta_cotacoes_compras` | Sim |
| IDs de alarmes exibidos | `secta_alarmed` | Sim |
| Catálogo de produtos/serviços | `secta_produtos_solicitacoes` | Sim |
| Tema | `secta_theme` na tabela | Sim, restaura dark/light; exclusão redefine dark |
| Preferências de alarmes | localStorage `agendaDinamicaAlarmSettingsV2` | Sim; exclusão redefine os padrões |
| Modelos de textos editados/criados | localStorage `agenda-tool-text-overrides-v1` | Não: ferramenta local independente |
| Anotações pessoais avulsas | localStorage `agenda-tool-notes-v1` | Não: pessoais, não são dados comerciais |
| Tamanhos e pesos editáveis | localStorage `agenda-tool-sizes-v1` | Não: catálogo local da ferramenta |
| Imagens de tabelas de referência | IndexedDB `agenda-tool-reference-tables-v1`, store `references` | Não: biblioteca local, inclui Blobs |
| Cálculos de venda, serviço e cotação de frete em edição | Memória/DOM | Não: sem persistência de cálculos |
| Identidade de instância | sessionStorage `agendaDinamica.technicalInstance.v1` | Não: identifica a aba, não o negócio |
| Sessão Auth eventualmente preexistente | Armazenamento gerenciado pelo SDK Supabase | Não: credenciais não são dados de backup; preservada |
| Anexos embutidos base64 e metadados/referências de anexos | Dentro das coleções comerciais | Sim |
| Arquivos binários externos dos anexos | Bucket Supabase Storage configurado no HTML | Não: JSON preserva as referências, não copia nem exclui objetos do bucket |
| Cópia anterior à substituição | localStorage `agenda-dinamica.recovery.v1` | Proteção separada, conservada após restauração/exclusão |

Propostas não são uma nova coleção: sua apresentação deriva de conclusões e contatos.
Histórico também agrega coleções existentes. Evita-se duplicar esses dados no backup.
Não foi encontrado outro banco IndexedDB comercial nem cache persistente de cálculos.
Antigas chaves comerciais `secta_*` no localStorage são removidas na exclusão,
com lista explícita. Chaves alheias, SDK Auth, ferramentas e IndexedDB são preservados.
Não se usa `localStorage.clear()`.

O catálogo atual tem **sete ferramentas**: Valor de Venda, Valor de Serviço,
Cotação de Frete, Textos Rápidos, Tabela de Tamanhos, Anotações Rápidas e Tabelas
de Referência. Contagens de cinco/seis nas seções históricas descrevem etapas antigas.

## Comportamentos corrigidos

Solicitações exigem telefone preenchido e válido (10–15 dígitos, DDD e sem
sequência totalmente repetida), inclusive na edição. Um cliente vinculado pode
fornecer seu telefone existente pelo fallback já utilizado. E-mail e canal continuam
opcionais. Não se mudou a regra das demais áreas.

`AgendaFormat` substitui a conversão destrutiva de caixa nos formatadores já
usados. Compacta espaços e capitaliza inícios de frases, sem converter tudo para
maiúsculas, minúsculas ou Title Case. Preserva siglas, nomes digitados, unidades,
códigos, números, e-mails e URLs. Faz apenas a correção explícita de “bomba centrifuga”
para “bomba centrífuga” e a separação inequívoca de “favor verificar”. Não é um corretor
gramatical geral e não tenta adivinhar nomes, acentos ou fronteiras de orações.
Os campos de nome recebem somente espaços e inicial maiúscula; não se converte
o restante de nomes/empresas. Produto continua sendo a opção exata do catálogo.

A fila de Solicitações apresenta apenas suas quatro etapas abertas. Foram removidos
o filtro, atalho, contador obsoleto e a coluna que reconstruía concluídas a partir
do histórico. Propostas em Acompanhamento e Histórico mantêm as fontes existentes.
Nenhum registro foi duplicado, migrado ou apagado por essa alteração.

O body começa em `auth-ok`, eliminando a tela de login antes da consulta de sessão.
`LOGIN_HABILITADO` continua false. A identidade técnica e a leitura da sessão
preexistente permanecem, sem novo login ou anonymous sign-in.

## Formato e restauração

Somente **JSON versão 1** é um backup restaurável. Contém `backupVersion`,
`createdAt` ISO, `application`, inventário em `metadata`, as onze coleções e tema
em `data`, preferências de alarmes em `settings`. O serviço valida explicitamente
coleções, tipos, IDs duplicados, tema, preferências, versão e timestamp.
Backups antigos sem versão reconhecida são rejeitados sem modificar dados.
CSV/XLSX são relatórios humanos e não são aceitos para restauração. Passaram a
incluir Vendas, Compras, produtos e configurações, além das folhas anteriores.

Selecionar o arquivo abre um resumo com contagens reais e o escopo de substituição.
Cancelar ou fechar não grava nada. Somente **Confirmar restauração** autoriza a
substituição. A edição e a sincronização desta instância são suspensas durante
a operação. O serviço escoa a gravação legada pendente, valida e protege o estado
anterior em `agenda-dinamica.recovery.v1`, verificando a leitura dessa cópia.
Quota/armazenamento indisponível cancela a operação antes da substituição.
O botão **Baixar proteção anterior** permite exportar essa cópia como JSON.
Ela é única: uma próxima operação concluída até a etapa de proteção a substitui.

O Repository serializa a substituição, envia todas as coleções em um único
upsert/RPC e relê o estado remoto antes de aplicar o resultado à interface.
A comparação ignora a ordem de propriedades de objetos JSONB e preserva a ordem
dos arrays. Não há escrita coleção por coleção. Preferências locais são aplicadas
após verificar o remoto. Em falha posterior ao ACK, tenta restaurar integralmente
o estado anterior e verifica esse rollback. Falha de rollback ou resposta remota
incerta bloqueia novas gravações e conserva a proteção; não anuncia sucesso.
Somente após confirmação e verificação a aplicação recarrega.

Limite preservado da arquitetura: no modo legacy não há CAS entre navegadores.
Outro cliente ainda pode gravar durante a operação. Perda de resposta de rede não
permite prometer que o servidor não gravou; por isso o estado fica bloqueado para
recuperação, sem retry/rollback cego quando não houve ACK. Esta fase não muda RLS,
autenticação, concorrência server-side nem faz escritas no Supabase real em testes.

## Exclusão

A ação se chama **Apagar dados da Agenda** para refletir seu escopo comercial.
As duas confirmações listam coleções, configurações e exclusões. Usa a mesma
proteção e substituição verificada da restauração, com arrays vazios, tema dark e
preferências de alarmes redefinidas. Não declara sucesso antes do ACK/leitura.
Ferramentas pessoais, biblioteca IndexedDB, credenciais do SDK, dados de outros
aplicativos e objetos do Storage permanecem. Referências a anexos nas coleções
apagadas deixam de existir; a preservação dos objetos do bucket é deliberada e
explicitamente informada, não uma promessa de apagar esses arquivos.

## Datas e layout

Datas concretas da interface e dos relatórios usam DD/MM/AAAA; data com horário
usa DD/MM/AAAA HH:mm. Helpers rejeitam datas inexistentes e não invertem dia/mês.
Timestamps técnicos do JSON permanecem ISO. Títulos/filtros de competência mensal
continuam mostrando apenas mês/ano, sem inventar um dia. Textos livres e nomes
de arquivos não são reinterpretados como datas.

Inputs de data são apresentados como texto DD/MM/AAAA com máscara, validação e
teclado numérico. Seu contrato `.value` continua ISO para os handlers existentes;
datas inválidas retornam vazio e sinalizam erro nativo. Campos criados dinamicamente
também são adaptados. Ordenação, cálculos, persistência e filtros usam ISO.

`consolidation.css` muda geometria, sem trocar cores, ícones ou identidade visual:
grids reorganizam colunas, itens flex aceitam quebra e têm min-width zero, textos
longos quebram, botões/badges ficam nos cards e colunas não têm scroll interno
arbitrário. A barra de ações em viewport estreita volta a uma linha de altura
natural; regras antigas de min-height e flex-basis deslocavam o conteúdo abaixo
da tela. Não há `transform: scale` nem redução global da aplicação.

## Validação

Os logs, matriz e capturas ficam em `test-results/` (artefatos locais ignorados).
Testes de navegador interceptam o SDK e usam dados sintéticos, nunca o banco real.
`tests/consolidation-browser.mjs` usa o zoom real do Chrome pelas preferências do
navegador, valida o devicePixelRatio e restaura 100% ao terminar. A matriz cobre
80/90/100/110/125/150/175%, claro/escuro, Dashboard (incluindo Compras), Solicitações,
Propostas, Clientes, Agenda/Retornos, Recorrentes, Vendas, Histórico e Ferramentas.
Também há viewports 375, 768 e 1366px. Valida overflow, controles dentro dos cards,
posicionamento do conteúdo, datas, formulário e restauração/exclusão com recarga.

Não houve implementação do Bloco B, novas integrações comerciais, commit, push
ou publicação. O ZIP anterior solicitado pelo usuário permanece intacto.
