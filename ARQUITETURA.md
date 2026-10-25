# Arquitetura incremental da Agenda Dinâmica

## Usabilidade dos campos e navegação — estado atual (25/10/2026)

A funcionalidade cancelada foi removida: módulos, imports, seção, card, atalhos,
estado exclusivo, CSS e testes exclusivos. Os testes compartilhados de notas e
persistência foram preservados em `quick-notes.test.mjs` e
`quick-notes-browser.mjs`. `tool-state-storage.js` permanece por ser usado nas
Anotações Rápidas. O build limpa os assets antigos da funcionalidade removida.

Central e dropdown agora apresentam exatamente seis ferramentas, nesta ordem:
Valor de Venda, Valor de Serviço, Cotação de Frete, Textos Rápidos, Tabela de
Tamanhos e Anotações Rápidas. Clicar no botão principal Ferramentas ou no chevron
abre/fecha o dropdown; seu rodapé mantém link para a Central. O grupo usa fundo
único verde-petróleo, ícone/texto brancos, borda/altura alinhadas aos pares,
hover/ativo consistentes e layout compacto na lateral reduzida. Popover continua
na camada superior, alinhado abaixo, com fechamento externo/seleção/Escape.

`smart-number-input.js` centraliza a entrada numérica: foco seleciona o conteúdo,
primeiro clique preserva a seleção após o comportamento nativo do mouse/toque;
segundo clique permite posicionar cursor normalmente. Não intercepta teclas ou
reformata durante digitação. Ao sair, formata moeda/percentual/número em pt-BR,
preservando precisão, e notifica os handlers existentes. Aplicado aos campos
editáveis de Venda, Serviço, NF/peso do Frete e medidas/peso em Configurações.
Campos somente leitura não recebem esse comportamento.

Apenas o padrão da margem de Venda mudou de 30 para 40%; fórmulas intactas.
Peso Total do Frete é lido como número, tem sufixo visual KG e validação de valor
não negativo; o texto copiado acrescenta uma única unidade, como
`Peso Total: 150 KG`. Não exige digitar KG no campo. Anotações mantêm CRUD,
ordenação, busca, cópia integral e persistência local sem mudanças de regras.

Validação: 119/119 testes Node, regressão geral e testes existentes de ferramentas
aprovados. A redução dos testes exclusivos da funcionalidade cancelada foi
explicitamente solicitada; os demais cenários permanecem. Novo teste
`smart-entry-browser.mjs` usa mouse, teclado e toque reais via CDP: substituição
de zeros/valores anteriores, moeda/percentuais/quantidade/horas/km, edição parcial,
Backspace/Delete/Tab, margem inicial 40 e manual 30, peso 150 KG no clipboard.
Compara a altura do botão com seus pares em desktop. Testa 1440/900/375px,
claro/escuro e limites do dropdown/campos. Dados comerciais simulados; sem
alterações estruturais no Supabase. Build aprovado. Sem commit/push/publicação.


## Central de Ferramentas — navegação e estados iniciais (25/10/2026)

Refinamento incremental, sem novas ferramentas ou mudanças nas fórmulas. Título
principal passa a Central de Ferramentas. `tools-navigation.js` organiza os cinco
lançadores como cards grandes, com ícone, nome e descrição, na ordem fixa:
Valor de Venda, Valor de Serviço, Cotação de Frete, Textos Rápidos e Tamanhos.
IDs e seções anteriores são preservados, incluindo o atalho de frete dos textos.

Ações Rápidas usa um controle separado: Ferramentas abre a Central e restaura
os cards; a seta abre o dropdown abaixo, com cinco acessos diretos. Popover
nativo fica acima do layout, evitando recorte pela lateral. Fecha na seleção,
clique externo, Escape ou rolagem externa, com retorno de foco no Escape e acesso
por teclado. Lateral compacta mantém ícone de Ferramentas e seta acessíveis.

Tamanhos fica antes do grid de Configurações, já expandido. Mantém o catálogo
local existente, CRUD, confirmação e cópia. Usa classe própria para não desviar
o resumo comercial, cujo código legado procura a primeira `.settings-card`.
Não houve criação de coleção paralela ou alteração de pesos/dimensões existentes.

Venda inicia compra R$ 0,00 e quantidade 0, preservando os outros percentuais.
Ordem de compra: quantidade, preço, PIS/COFINS, ICMS, IPI e frete. Primeiro par
permanece alinhado também no celular. LIMPAR restaura esses padrões.
Serviço foi renomeado visualmente para Calculadora de Valor de Serviço; salário,
horas, km, pedágio e quantidades químicas iniciam zerados, alimentação/químicos
desmarcados. Interface apresenta custos/resultados zero no estado neutro;
função matemática e validações originais permanecem intactas para o cálculo.

Validação: 109/109 testes Node, regressão geral e testes de textos, serviço,
frete, cópias e CRUD persistente aprovados. Testes antigos mantêm os cenários
matemáticos de compra 10 explicitamente, além da nova asserção do padrão zero.
`tools-navigation-browser.mjs` verifica ordem, dimensões dos cards, título,
cinco acessos pelo dropdown, fechamento externo, acesso à Central, estados zero,
posição dos campos e acesso visível a Tamanhos em 1440/900/375px, claro/escuro.
Build Vite aprovado; dados comerciais remotos simulados nos testes. Sem alterações
estruturais de Supabase, commit, push ou publicação.

## Valor de Venda e gerenciamento de Tamanhos (25/10/2026)

`sale-price-math.js` contém dois estágios puros e independentes da lógica comercial:
custo real = compra × (100 + IPI − PIS/COFINS − ICMS)/100; frete unitário =
frete/quantidade (somente com quantidade positiva); custo final = real + frete
unitário. Venda = custo final / (1 − soma dos percentuais de margem e tributos).
IPI, ICMS e PIS/COFINS de venda incidem sobre venda bruta e são deduzidos do
faturamento líquido; lucro = líquido − custo, margem = lucro/venda bruta.
Zero de venda produz margem zero sem divisão por zero. Percentuais de venda
somados >=100%, entradas negativas/não finitas e custo negativo são rejeitados.
Frete sem quantidade é ignorado com aviso; frete com quantidade zero é inválido.

`sale-price.js` monta os cards de compra, venda e PDV na Central existente,
com campos editáveis, atualização imediata, custo transferido automaticamente,
LIMPAR para restaurar padrões, sem histórico ou persistência de cálculos.
Utiliza parser monetário e moedaBR existentes sem modificar seus comportamentos.
Não arredonda etapas intermediárias: padrão compra 10 → custo 8,675 → venda
20,2923976608, exibidos R$ 8,68 e R$ 20,29. PDV: ICMS R$ 3,65, PIS/COFINS
R$ 1,88, faturamento líquido R$ 14,76, lucro R$ 6,09, margem 30,00%.
Os exemplos aproximados de R$ 20,30 e R$ 14,77 não foram fixados na interface.

Quatro sacos agora têm peso de 25 KG por Saco, incluindo nome Saco de Zeólita.
`size-catalog-store.js` inicia os 12 itens com IDs estáveis e mantém catálogo
editável local na chave `agenda-tool-sizes-v1`, sem banco novo ou sincronização
Supabase. `size-settings.js` acrescenta Tamanhos ao grid de Configurações, com
novo/editar/excluir, confirmação nativa antes da exclusão, validação e prevenção
de duplicação por nome. Pesos/medidas desconhecidos podem ficar em branco.
Falha de escrita não altera estado; catálogo inválido não é sobrescrito; catálogo
intencionalmente vazio continua vazio após reload. A consulta assina alterações
do catálogo e atualiza imediatamente, mantendo o formatador de cópia existente.
Alterações são deste navegador e não entram no backup comercial atual.

Integração mínima em `quick-texts.js` e `tools-navigation.js` adiciona o quinto
lançador. Não houve alteração na lógica de Serviço, Frete, módulos comerciais,
RPC/RLS ou Supabase. CSS adicional é restrito às novas áreas.

Validação final: 108/108 testes Node (92 anteriores + 16 novos), regressão geral
Chrome e testes existentes de Textos/Serviço/Frete/Tamanhos aprovados.
`sale-size-settings-browser.mjs` verifica PDV padrão, frete/quantidade,
percentuais editáveis/IPI, erros, reset, CRUD/recarga/cópia e cancelamento/confirmação
de exclusão. Capturas em 1440/900/375px nos dois temas, sem campos/botões cortados.
Build Vite aprovado; dados remotos simulados. Sem commit, push ou publicação.

## Tabela de Tamanhos — consulta e cópia rápida (25/10/2026)

Alteração restrita à ferramenta de tamanhos e seus testes/estilos. A renderização
em `size-table.js` reutiliza os 12 dados de `size-table-data.js` em cards com
nome, categoria, dimensões L x A x C, peso quando cadastrado e COPIAR individual.
A função pura `formatarTamanhoParaCopia` centraliza a linha copiada e reutiliza os
formatadores de dimensões/peso exibidos no card. Clipboard usa o helper existente
sem modificá-lo, com feedback temporário, restauração e aviso de falha.

Saco de Sal foi atualizado explicitamente para L 50, A 20, C 45, 25 KG por Saco;
os demais sacos receberam a nomenclatura “Saco de …”, preservando suas medidas.
Conj. Galão reprocessadora permanece somente em Caixas e copia exatamente
`Conj. Galão reprocessadora: L 40 x A 37 x C 50 (3 KG por unidade)`.
Pesos desconhecidos não são copiados; Pallet mantém A — sem inventar altura.
Não há seleção múltipla: a interface prioriza a cópia individual solicitada.

Busca instantânea ignora acentos, aceita palavras fora de ordem e “caixa 7” sem
confundir com “caixa 17”. O marcador Nº continua pesquisável. Filtros Todos,
Sacos, Caixas e Pallet são preservados. Cards adaptam as colunas ao espaço e
empilham no celular, eliminando a necessidade da tabela horizontal.

Testes de inventário existentes foram atualizados somente quanto aos dados
explicitamente pedidos; testes de DOM passaram de linhas/colunas para os cards
e a verificação mobile passou a exigir ausência de rolagem horizontal. Seis
testes novos verificam a formatação e a busca. `size-copy-browser.mjs` confere
as 12 cópias no clipboard real, Ctrl+V do exemplo do Sal, feedback/restauração,
filtros, busca, vazio e 1440/900/375px nos dois temas. Calculadora, Frete,
Textos Rápidos, módulos comerciais e configuração do Supabase não foram alterados.
Resultado final: 92/92 testes Node, regressão geral, testes de ferramentas e
clipboard no Chrome e build Vite aprovados. A regressão identificou inicialmente
que “Caixa Nº” passou a incluir a caixa de galão; a busca foi corrigida para
preservar o marcador pesquisável, sem relaxar essa asserção. Sem falhas finais.
Git status/diff/stat conferidos; sem commit, push ou publicação.

## Ferramentas — químicos, tamanhos e frete (25/10/2026)

Complemento incremental sobre os módulos anteriores, sem alterar módulos comerciais,
configuração de persistência ou estrutura do Supabase. `tools-navigation.js` centraliza
abertura/retorno das quatro ferramentas; Cotação de Frete também tem acesso em
Textos Rápidos, mantendo exatamente sete modelos na biblioteca. `tools-common.js`
reutiliza a cópia com fallback e a formatação monetária existente.

Cards agora exibem somente quantidade de destinatários e prévia de duas linhas;
em desktop largo usam três colunas. EDITAR abre título, destinatários e corpo.
Overrides antigos continuam válidos, e o título editado usa a mesma persistência
local da ferramenta. IDs e ordem não dependem do título editado. Não há favoritos.

Calculadora adiciona três químicos opcionais, com quantidade visível apenas quando
selecionados: hipoclorito (R$ 9/galão de 5 L), hidróxido (R$ 8/kg), peracético
(R$ 60/galão de 5 L). Quantidades não negativas e finitas são validadas no cálculo
puro. O subtotal químico entra na soma antes de imposto de 22% e margem de 30%,
ambos sobre o mesmo custo total. LIMPAR também restaura as seleções/quantidades.

Tabela de Tamanhos usa `size-table-data.js` estático, com 4 sacos, 7 caixas e
1 pallet; `size-table.js` oferece busca por nome/tipo e filtro, com rolagem
horizontal restrita à tabela no celular. Conj. Galão reprocessadora aparece uma
única vez, em Caixas, com nome exato, A 37 × L 40 × C 50 cm e 3 kg. Pesos não
informados e altura do pallet ficam como “—”. Base do pallet: 120 × 100 cm.

`freight-quote-data.js` contém os dados fixos fornecidos da Secta, extração
determinística por rótulos, conferência de CNPJ/CEP e montagem do texto completo.
Nome sem rótulo só é identificado quando há uma única linha antes do primeiro
CNPJ. Campos ausentes ficam vazios, com indicação e correção manual. Nunca
extrai mercadoria, NF, peso ou dimensões. `freight-quote.js` mantém esses campos
manuais, mostra prévia e oferece uma única cópia completa. Campos essenciais
vazios usam validação nativa; avisos de formato CNPJ/CEP não impedem a cópia.
Não há IA, consulta externa, histórico ou persistência de cotação/cálculo.

Validação: 86/86 testes Node (78 anteriores + 8 novos), regressão geral Chrome,
testes de Textos Rápidos, edição persistida do título e quatro ferramentas
aprovados. Novo teste `freight-sizes-browser.mjs` verifica busca obrigatória,
filtros, químicos, exemplo GROWN, campos de carga preservados, campos ausentes,
avisos, clipboard real e 24 capturas em 1440/900/375px nos dois temas. Dados
remotos são simulados; sem acesso ao Supabase real. Cenários adicionais de
fundação/identidade/piloto aprovados individualmente; a invocação combinada
apresentou falha de contexto do harness, sem alterar testes para contorná-la.
O cenário de duas instâncias Chrome com PostgreSQL local também passou, usando
somente a fixture existente, sem mudanças na implementação de concorrência.
Build Vite aprovado. Sem commit, push ou publicação.

## Refinamento das ferramentas (25/10/2026)

Textos Rápidos mantém IDs e corpos originais, com ordem fixa: solicitação,
condições, envio, confirmação, serviço aprovado, material aprovado e faturamento.
Cards mostram duas linhas de prévia e uma de destinatários. O controle nativo
“Visualizar / editar” abre destinatários e corpo completos, com salvar/cancelar.
Overrides são salvos somente neste navegador por `quick-texts-store.js`, na chave
`agenda-tool-text-overrides-v1`, sem participar do backup/snapshot comercial.
Falha de armazenamento mantém a edição aberta e informa o usuário. Cada modelo
mantém somente uma ação de cópia, COPIAR TUDO, usando o conteúdo editado completo.

`service-calculator.js` monta a Calculadora de Serviço na mesma Central;
`service-calculator-math.js` contém cálculo puro e validação, sem dependências
comerciais ou persistência. Técnico = salário / 22 × 1,80 / 8 × horas;
combustível = km × 2 × 7,50 / 12; veículo = 100 / 8 × horas;
alimentação opcional = 38; pedágio informado diretamente. Total soma os cinco
custos; imposto = total × 0,22, margem = total × 0,30 e final = total × 1,52.
Não há arredondamento intermediário. Valores exibidos usam moedaBR existente.
Salário/horas positivos obrigatórios; demais custos não negativos e finitos.
Entradas inválidas removem o resultado anterior. Não há histórico ou integrações.

Validação: 78/78 testes Node (73 existentes + 5 matemáticos), regressão geral
Chrome, teste existente de Textos Rápidos e novo `service-tools-browser.mjs`
aprovados. O novo teste verifica ordem, edição/recarga/clipboard, cálculo,
alimentação, entradas inválidas, horas fracionadas e limpar; captura 1440/900/375px
nos dois temas, com limites dos componentes verificados. Supabase simulado;
nenhum dado remoto real é utilizado. Build Vite aprovado. Sem commit/push/publicação.

## Textos Rápidos — ferramenta local independente (23/10/2026)

A entrada Ferramentas na barra lateral usa `showView('ferramentas')` e abre a
Central com Textos Rápidos. Não havia Central de Ferramentas nesta cópia do projeto.
`public/quick-texts.js` monta a biblioteca, busca por título/conteúdo/categoria/e-mails,
e oferece um único botão COPIAR TUDO por modelo. Quando houver destinatários,
copia os e-mails separados por ponto e vírgula, uma linha em branco e o corpo
completo; nos demais modelos, copia somente o corpo. A busca foi preservada.
`public/quick-texts.css` usa os tokens e botões existentes, com cards em duas colunas
no desktop e uma em telas menores. Em até 600px, somente enquanto Ferramentas está
ativa, a lateral é recolhida para dar espaço ao conteúdo; a navegação superior continua.

`public/quick-texts-data.js` é a fonte única dos sete modelos, com IDs estáveis,
título, categoria, destinatários e corpo. Os conteúdos vêm da transcrição explícita
do pedido, sem revisão de grafia, placeholders ou parágrafos. O arquivo
“COLA PARA EMAILS okk.docx” não estava disponível; a conferência com o DOCX original
permanece pendente. Modelos 1, 3 e 4 não possuem destinatários; o e-mail de contato
dentro do corpo do modelo 3 não é tratado como destinatário.

Os textos são assets estáticos, sem estado ou persistência adicional. Controles,
filtros, estado, handlers, listener de storage e CSS de favoritos foram removidos,
assim como a cópia separada de e-mails/texto. Os sete modelos não foram alterados.
Não entram em snapshots, backups comerciais ou sincronização externa.
Falhas de cópia são informadas; a cópia usa Clipboard API com fallback
tradicional, feedback textual e restauração do foco. Nenhuma dependência nova,
evento comercial, integração Supabase, RPC, RLS, migration ou trabalho da Fase 3C.

Validação: `node --test tests/*.test.mjs` (73/73), regressão geral existente no Chrome
e `node tests/quick-texts-browser.mjs` passaram. O teste novo reutiliza o harness
isolado da regressão e verifica sete corpos/destinatários, sete cópias completas
no clipboard real (CRLF nativo do Windows), um botão por card, feedback/restauração,
ausência de código/controles de favoritos, busca, recarga, navegação e ausência de
erros no console. O Supabase é simulado, sem acesso aos dados remotos reais.
Capturas locais em `test-results/textos-{1440,900,600,375}-{light,dark}.png`;
inspeção visual realizada nos temas claro e escuro, incluindo tela pequena.
Build Vite aprovado; `dist/` é gerado pelo build. Alterações locais preexistentes
de arquitetura/Compras foram preservadas. Sem commit, push ou publicação.

## Fase 3C — pré-voo concluído, ativação bloqueada por acesso

Relatório atual: [Fase 3C — ativação](supabase/inspections/phase3c-activation.md).
Alterações remotas foram autorizadas, mas esta sessão não dispõe de ferramentas
Supabase SQL, CLI/psql ou conexão de banco. Nenhuma migration remota foi aplicada.
Default permanece legacy; login, RLS, Realtime e dados comerciais inalterados por
esta execução. Auth real e Chrome A/B no Supabase não foram comprovados.
73 testes locais, build e preview/regressão passaram novamente, sem relaxamento
de testes. Inventário de writers e rollback estrutural/controlado estão no relatório.
O switch rpc atual é global no Repository: não ativá-lo apenas para Compras sem
validar o impacto nos outros writers. Retornos não foi migrado. Não fechar legado
nem anunciar Fase 3C concluída com evidência local/simulada. Sem commit/push.

## Fase 3B — implementação local, ativação remota pendente

Estado atual e roteiro: [Fase 3B — implementação e transição](supabase/inspections/phase3b-implementation.md).
As seções das fases anteriores abaixo permanecem como histórico. A Fase 3B criou
migration aditiva, RPCs de load/commit, recibos e integração opcional; nenhuma
migration foi aplicada no Supabase remoto e a persistência padrão permanece legacy.
Não houve commit/push/publicação, ativação de login, mudança de Auth ou Realtime.

- `supabase/migrations/202610080001_agenda_atomic_snapshot.sql`: metadata singleton
  BIGINT, receipts por commandId, owner dedicado, RPC transacional multi-key e
  guard statement. Sem reescrever snapshots existentes. Authenticated obrigatório,
  actorId por auth.uid, whitelist de 12 keys, rollback total e replay antes do CAS.
- Bridge durante transição: upsert legado autorizado continua, mas avança revisão.
  Sua base antiga ainda não é comparada, por isso não há proteção completa nessa
  etapa; metadata.enforced=false sinaliza isso aos clientes RPC.
- `supabase/rollout/activate_atomic_snapshot.sql`: passo final separado, somente
  após autenticação real, regressão, teste remoto A/B e migração de TODOS os writers.
  Liga enforced e bloqueia escrita direta. Não foi executado.
- `atomic-snapshot-port.js` usa o cliente canônico existente, sem fallback de RPC
  para upsert. `persistence-config.js` continua `'legacy'`. Mode rpc está integrado
  ao Repository e saveLegacy, mas não habilitado em produção.
- Repository conserva revisão/snapshot coerentes, candidato/request/eventId de
  retry, CONFLICT explícito e confirmação RPC. Não promove snapshot antigo à versão
  nova ao esperar na fila ou obter replay de recibo antigo. Recover é explícito;
  polling não apaga intenção pendente. Compras aplica estado antes do bus apenas
  após SUCCESS. Formulário permanece aberto no conflito e permite recuperar base
  sem descartar seus campos. Journal do cliente ainda é somente memória.
- SECURITY DEFINER foi implementado com owner NOLOGIN/NOBYPASSRLS de privilégio
  mínimo, search_path vazio, objetos qualificados e EXECUTE apenas authenticated.
  É necessário para retirar DML direto no cutover sem impedir a RPC de gravar;
  INVOKER do mesmo usuário manteria esse impasse de privilégios. Policies anteriores
  não são removidas pela migration aditiva. Novos objetos não abrem acesso anon.
- Auth expõe `inspectAccess()` para getSession/getUser e classificação segura sem
  retornar tokens. Sessão/role de produção não puderam ser comprovados nesta sessão;
  integração Supabase não está disponível ao agente. Não confundir Auth simulada
  dos testes com autenticação real. Busca em código/env/dist não encontrou chave
  privilegiada no frontend.

Validação: SQL PostgreSQL em WASM/PGlite com roles/RLS/transações; cenários de
idempotência, A/B, multi-key rollback, bypass e Repository/Compras; duas instâncias
Chrome isoladas com Auth/CDN simulados e banco local; regressão geral e piloto;
build e preview locais. Detalhes e comandos estão no relatório da implementação.
Essa evidência não substitui prova com duas conexões remotas Supabase reais.
Fase 3B parcial: infraestrutura e integração testadas localmente; aplicação remota,
autenticação real, concorrência Supabase, deploy e fechamento de legado pendentes.

## Escopo desta fase

A infraestrutura roda dentro do iframe, em `public/application/`. O React continua
como container. A Fase 1 criou a fundação; a Fase 2 migrou somente Solicitações
enviadas para compras. Os demais comandos, aparência e timers continuam legados.
Não há alteração de banco, tabela, chave, bucket ou IDs existentes.

O cliente canônico continua sendo `supabaseClient`, criado pelo SDK CDN em
`public/original-index.html`. Nenhum módulo novo chama `createClient`.
`src/lib/supabase.js` permanece fora do fluxo ativo.

## Entrada e compatibilidade

`original-index.html` carrega `application/bootstrap.js` como módulo, depois de
`requests-revision.js`. O módulo cria `window.AgendaApplication` antes de iniciar
`iniciarComLogin()` no `DOMContentLoaded`. Os scripts clássicos já foram avaliados
nesse momento. Os listeners de UI e timers existentes permanecem onde estavam.

`bootstrapApplication()` é idempotente no mesmo iframe. `application.start()`
reutiliza uma única Promise: não repete login, carga, subscriptions ou timers.
`application.ready` significa que a inicialização legada terminou; para verificar
carga de dados bem-sucedida, consultar `repositories.snapshot.getStatus().status`.
O legado captura internamente erros de carga, portanto `ready` sozinho não prova
que o Repository está `READY`.

O adapter captura o leitor e o escritor existentes. `carregarDadosSupabase()` passa
a delegar ao Repository, que utiliza o leitor capturado, sem recursão e sem uma
segunda consulta. Realtime, polling e foco/visibilidade continuam usando esse
caminho. Nenhuma reconciliação publica evento de domínio. Na Fase 2,
`persistirDadosSupabase()` também passou a delegar à fila comum do Repository.

O escritor original capturado pelo adapter continua sendo o único acesso ao
upsert. Aceita snapshot explícito e opções de coleções/aviso. O Repository filtra
as chaves quando necessário, mantendo `secta_cotacoes_compras` para o piloto.
Agora retorna `{ ok: true }`
apenas após o upsert sem erro, ou `{ ok: false, error }` quando indisponível ou
quando o Supabase responde com erro. Exceções de transporte continuam propagando
na função original; o Repository as converte em resultado explícito.

## Estado

`application.state` oferece:

- `getState()`: objeto com referências atuais das coleções legadas;
- `getCollection(name)`: referência da coleção lexical correta;
- `getSnapshot()`: cópia independente, adequada para preparação e persistência;
- `setState(patch)`: patch validado; não renderiza, grava ou publica;
- `updateState(updater)`: calcula patch sobre uma cópia do estado;
- `getLoadStatus()`: `IDLE`, `LOADING`, `READY` ou `ERROR`;
- `setLoadStatus(status, error)`: usado pela infraestrutura de carga.

Não há segundo banco em memória. Os getters/setters acessam diretamente os
bindings `let clientes`, `let controleVendas` e demais variáveis clássicas.
`window.controleVendas` não é utilizado: pode ser um array diferente.
Substituições de arrays pelo legado ficam imediatamente visíveis nessa API.
`appTheme` é string; os outros onze campos são arrays. Campos desconhecidos e
snapshots incompletos são rejeitados. IDs e nomes legados são preservados.

As referências de `getState`/`getCollection` são mutáveis por compatibilidade.
Services futuros devem preparar mudanças em `getSnapshot()`, não alterar essas
referências antes de confirmação.

## Repository de snapshot

`application.repositories.snapshot` oferece:

- `load()`: retorna `{ ok: true, operation: 'load', snapshot }` ou
  `{ ok: false, operation: 'load', error }`;
- `save(snapshot?)`: aguarda confirmação e retorna resultado com `ok`,
  `operation`, `snapshot` e `persistedAt`, ou resultado de falha;
- `getStatus()`: estado da carga, configuração, escritas pendentes e último resultado;
- `getConfirmedSnapshot()`: cópia do último snapshot confirmado por esta API.
- `saveLegacy(snapshot?)`: mantém o debounce existente, captura estado na execução
  e compartilha a mesma fila/trava;
- `commitCollection(name, prepare)`: prepara uma alteração de coleção migrada dentro
  da fila, persiste somente sua chave e aplica somente essa coleção após sucesso.

Chamadas simultâneas de `load()` compartilham a carga em andamento. A nova API
`save()` rejeita gravações em `IDLE`, `LOADING` ou `ERROR`, sem chamar o escritor.
O candidato é copiado no momento da chamada. As escritas feitas por essa API são
serializadas, inclusive após uma falha, e o status é revalidado na execução.
Uma falha de escrita mantém o último snapshot confirmado e permite nova tentativa.
Uma falha de carga exige nova carga bem-sucedida.

O método genérico `save()` não aplica o candidato ao estado visual após gravar.
`commitCollection()` aplica somente a coleção migrada depois da confirmação.
Services futuros que utilizarem `save()` precisam coordenar esse commit. Exemplo:

```js
const result = await application.repositories.snapshot.save(candidate);
if (!result.ok) return result;
application.state.setState(result.snapshot);
await application.events.bus.publish(confirmedEvent);
```

Compras utiliza `commitCollection()`, e não esse exemplo de snapshot completo.

### Limites deliberados

Os comandos dos outros domínios ainda não aguardam confirmação e continuam
chamando o `save()` com debounce. Agora seu escritor é encaminhado a `saveLegacy()`:
a fila e a proteção contra carga falha se aplicam também a essas gravações.
Suas mensagens de sucesso ainda são emitidas pelos comandos antigos antes do await.
O `initApp` antigo ainda define `appLoaded = true` quando a carga falha, mas esse
flag sozinho já não libera o escritor encaminhado. Migrar a confirmação da UI
desses comandos exige suas fases específicas.

A fila serializa chamadas do Repository e do escritor legado encaminhado neste
iframe. Não coordena outro navegador. Não há transação no servidor, rollback,
controle de versão no servidor, outbox ou garantia de entrega durável.
O port interno `legacy.writeSnapshot` é infraestrutura, não API para comandos;
chamá-lo diretamente contornaria a coordenação. Não iniciar migração comercial
sem tratar identidade, concorrência remota e entrega durável.

Não existe `clear()`. O piloto utiliza `commitCollection()` restrito às coleções
explicitamente migradas, enquanto `save()` conserva o contrato de snapshot completo.

## Auth e anexos

As fachadas são passivas e reutilizam os ports legados:

- `repositories.auth.getSession()`: resultado explícito da sessão;
- `repositories.auth.getActorId()`: ID de `usuarioLogado`, ou `null`;
- `repositories.attachments.prepare(attachments, context)`;
- `repositories.attachments.getUrl(attachment)`.

Não criam listeners, login, upload automático ou novos clientes. O fallback base64
e as políticas de anexos permanecem iguais. O nome fixo de exportação não vira ator.

## Eventos

`events/event-types.js` contém os 37 nomes do catálogo V1 solicitado.
`events.createEnvelope()` valida e cria o envelope com:

`eventId`, `eventType`, `schemaVersion`, `occurredAt`, `entityType`, `entityId`,
`commandId`, `correlationId`, `causationId`, `actorId`, `origin`, `payload`.

O payload aceita dados JSON simples, sem ciclos, Map ou Date. Ele é copiado;
objetos e arrays são congelados recursivamente.
`actorId` é `null` por padrão, e `entityId` preserva número/string legado.

O Event Bus oferece:

- `subscribe(type, handler, { subscriptionId }?)`: retorna unsubscribe;
- `unsubscribe(type, handlerOrId)`;
- `publish(event)` / `emit(event)`: Promise com `delivered` e `errors`;
- `getSubscriptions()`: identificadores e tipos inscritos.

O mesmo handler no mesmo tipo não é inscrito duas vezes. Um ID já utilizado por
outro handler é rejeitado. Tipos ficam isolados. Handlers são aguardados em ordem
de inscrição; falhas síncronas/assíncronas não interrompem os demais. O observador
opcional de erros também é isolado.

Existem somente cinco handlers do piloto de Compras, destinados à renderização.
Não há handlers dos outros domínios nem eventos emitidos por reconciliação. O Bus não é
event sourcing, fila persistente ou mecanismo de deduplicação de publicações.
Publicar o mesmo evento duas vezes entrega duas vezes: idempotência por comando
e handler será responsabilidade da migração seguinte.

## Validação histórica da Fase 1

`node --test tests/architecture-foundation.test.mjs` verifica catálogo, envelope,
subscriptions, isolamento, estado, bloqueios, erros, confirmação e fila de escrita.

`node tests/browser-regression.mjs --foundation` usa somente Supabase simulado,
verifica compras, todos os destinos de navegação, singleton, bindings lexicais,
falhas/recuperação, ausência de eventos automáticos e entrada React/iframe.
O modo não gera screenshots. Na Fase 1, o teste original completo falhava na
exibição de observação do card de proposta, registrada também em `VALIDACAO.md`.
A correção está documentada na etapa de observação abaixo.

Resultados desta implementação:

| Verificação | Resultado |
|---|---|
| `node --test tests/architecture-foundation.test.mjs` | 15 testes passaram |
| `node tests/browser-regression.mjs --compras` | Passou após a integração inicial |
| `node tests/browser-regression.mjs --foundation` | Passou no Vite local |
| Mesmo modo com `AGENDA_TEST_BASE_URL=http://127.0.0.1:3001` | Passou no preview do build final |
| `npm run build -- --outDir <pasta temporária>` | Passou; `dist` rastreado preservado |
| Regressão original completa antes/depois | Mesma asserção de observação de proposta falha |
| Console no cenário da fundação | Nenhuma exceção ou erro inesperado; erro de escrita simulado era esperado |

Os testes de navegador interceptam o SDK e bloqueiam requisições ao projeto
Supabase; dados são fictícios. Não validam permissões/RLS ou concorrência reais.
O aviso do Vite de que a pasta temporária externa não seria esvaziada era esperado.

## Fase 2 — domínio piloto de Compras

### Arquivos e fluxo

- `services/compras-service.js`: comandos `criar`, `editar`, `alterarStatus`,
  `concluir` e `excluir`;
- `adapters/compras-ui-adapter.js`: formulário, confirmações e mensagens existentes;
- `handlers/compras-handlers.js`: um handler de renderização por tipo de evento.

As funções globais `salvarCotacaoCompras`, `alterarStatusCotacaoCompras`,
`concluirCotacaoCompras` e `excluirCotacaoCompras` delegam ao adapter. Não existe
uma segunda implementação de negócio nessas funções. Leitores, cards, Kanban,
modais e strings visíveis foram preservados. `atualizarCotacoesCompras` não grava.

```text
UI legada → adapter → ComprasService
  → Repository.commitCollection('cotacoesCompras', preparação)
  → upsert de secta_cotacoes_compras
  → confirmação → aplicação de cotacoesCompras ao estado
  → Event Bus → handler → renderCotacoesComprasPainel
```

A preparação ocorre na fila, sobre uma cópia da coleção atual. Não há alteração
otimista: enquanto o servidor não confirma, o estado/card permanecem anteriores.
Na falha o formulário continua aberto, não há toast de sucesso, evento ou render
de conclusão; a tentativa pode ser repetida.

### Persistência única e coexistência

O piloto não chama `save()` nem persiste em seus handlers. Cada alteração efetiva
faz um upsert com uma única chave. A fila comum coordena comandos, chamadas
genéricas ao Repository e o escritor legado. Polling aguarda escritas pendentes.

Um debounce legado posterior lê o estado na execução. Se Compras coincide com
o snapshot confirmado, essa chave é omitida daquela gravação legada. Isso evita
regravar a alteração do piloto e impede que uma coleção antiga a sobrescreva.
Se uma operação geral legada realmente mudar compras (por exemplo, reset), a
diferença é persistida; o reset não foi transformado em comando/evento de domínio.

Uma edição de cliente ocorrida enquanto Compras aguarda persistência não é
substituída no commit, pois apenas a coleção de compras é aplicada. Gravações de
outras entidades continuam sendo responsabilidade de seus comandos legados.

### Eventos e payload

| Operação | Evento | Payload |
|---|---|---|
| Criar | `SOLICITACAO_COMPRA_CRIADA` | ID, descrição, status, conclusão e datas |
| Editar | `SOLICITACAO_COMPRA_EDITADA` | ID, campos alterados, anterior/atual |
| Mudar status | `SOLICITACAO_COMPRA_STATUS_ALTERADO` | ID, anterior, novo, timestamp |
| Concluir | `SOLICITACAO_COMPRA_CONCLUIDA` | ID, status anterior/atual, data de conclusão |
| Excluir | `SOLICITACAO_COMPRA_EXCLUIDA` | Campos mínimos do registro removido |

O fato é validado na preparação; só é publicado após o retorno confirmado do
Repository. O envelope final utiliza o timestamp de confirmação. O ator é o ID
autenticado existente ou `null`. A edição pelo formulário emite um único evento
EDITADA, incluindo eventual mudança de status em `camposAlterados`. A conclusão
emite somente CONCLUIDA, sem duplicar um evento de status para o mesmo comando.

Os handlers apenas renderizam a coleção atual; não criam Histórico, Cliente,
Proposta, Venda ou Retorno. Suas inscrições são idempotentes. Erros de handler são
retornados como erros de entrega, sem transformar uma gravação confirmada em falha.

### Identidade e idempotência

IDs numéricos existentes e IDs string legados são mantidos. Novos IDs continuam
numéricos por timestamp, com proteção contra colisão dentro da coleção local.
O campo técnico `creationCommandId` é adicionado aos novos registros e preservado
na edição, sem vínculo com qualquer entidade comercial.

No Service, a mesma combinação de commandId/operação compartilha a Promise em
andamento e reaproveita um sucesso, sem novo upsert ou publicação. Uma falha pode
ser repetida com o mesmo commandId e o mesmo ID reservado. Reutilizar commandId
para outra operação/dados é rejeitado dentro da instância. Na criação, um registro
com o mesmo `creationCommandId` é reconhecido também após recarga.

Status, edição idêntica, conclusão e exclusão de registro já removido são no-ops:
não persistem nem emitem. Editar um ID que desapareceu retorna falha em vez de
criar acidentalmente outro registro. Dois cliques simultâneos no formulário
compartilham uma tentativa. As ações de card também têm proteção em andamento.

A memória de comandos pertence ao iframe. Não há journal durável de exclusões,
nem garantia de deduplicação após apagar um registro e recarregar, ou entre dois
navegadores. Uma queda entre a gravação e a publicação pode perder a entrega:
outbox e concorrência remota permanecem decisões de uma fase posterior.

### Validação da Fase 2

- `node --test tests/architecture-foundation.test.mjs tests/compras-service.test.mjs`:
  40 testes passaram (15 da fundação e 25 do piloto);
- `node tests/browser-regression.mjs --foundation`: passou;
- `node tests/browser-regression.mjs --compras-pilot`: passou no desenvolvimento e
  no preview do build de produção, com SDK simulado;
- o piloto de navegador conta um upsert/um evento por cada uma das cinco operações,
  verifica espera, falha/retry, IDs, fila com o legado, independência e reconciliação;
- o mock de upsert agora mescla linhas por chave, como exige a gravação parcial;
- `npm run build -- --outDir <pasta temporária>`: passou sem modificar `dist`;
- comparação de HTML/CSS fora dos scripts com a versão publicada: iguais;
- regressão geral: mesma falha anterior na exibição de observação de proposta,
  antes e depois desta fase; testes e card não foram relaxados/corrigidos para ocultá-la.

Os testes antigos de Compras passaram a aguardar as operações assíncronas, mantendo
as asserções de comportamento. O teste da fundação agora exige as cinco inscrições
específicas do piloto e verifica que bootstrap/reconciliação não as duplicam.
`tests/compras-browser-checks.mjs` reutiliza o isolamento do teste existente e não
gera screenshots. Nenhum teste utilizou dados reais do Supabase.

### Encaminhamento ao final da Fase 2

Manter a migração de outros domínios separada. Antes de ativar seus eventos,
definir identidade, origem, exclusão/reabertura e concorrência, e escolher o
próximo Service com validações próprias. A regressão preexistente de propostas
precisava de uma correção autorizada separadamente; a Fase 2 não a implementou.

## Etapa de observação de propostas e preparação técnica

### Estado inicial e escopo

O Git estava em `main`, commit `36ca3fb`, com alterações locais das Fases 1/2 ainda
sem commit. Elas foram preservadas. A alteração de produção desta etapa foi somente
uma linha no renderizador efetivo do card de proposta. Não foram criados Services
comerciais nem alterados Repository, Event Bus, Auth, Compras, schema ou políticas.

### Regressão: evidência e caminho do dado

`tests/browser-regression.mjs` falhava na asserção que procura
`Observação após concluir` em `#propostas-acompanhamento-kanban.textContent`.
As asserções imediatamente anteriores já confirmavam a observação em
`concluidos[0].observacaoAtualizacao` e `controleVendas[0].observacao` após recarga.

| Etapa | Arquivo/função | Responsabilidade |
|---|---|---|
| Entrada | `original-index.html`, `abrirAtualizarStatusProposta` e `modalStatusProposta` | Campo `status-proposta-obs` |
| Leitura/validação | Mesmo arquivo, `salvarStatusPropostaAcompanhamento` | Normaliza texto e chama atualização |
| Origem | Mesmo arquivo, `propostaSourceFromRef` | Resolve `cc-{id}` para conclusão ou `ct-{id}` para contato |
| Estado | Mesmo arquivo, `aplicarStatusProposta` | Guarda `observacaoAtualizacao` e acrescenta `alteracoesStatusProposta[].obs` |
| Vendas | Mesmo arquivo, wrapper de `aplicarStatusProposta` no módulo de vendas | Copia observação para linhas vinculadas por `refProposta` |
| Persistência | `save` → adapter legado → `SnapshotRepository.saveLegacy` → escritor original | Upsert das coleções sob `key,value` |
| Leitura | `carregarDadosSupabase` encaminhado ao Repository | Select e substituição dos arrays |
| Projeção | Última `listaPropostasHistorico` no bloco `fix-fluxo-conclusao-propostas-final` | Recupera campo direto ou última observação do log |
| Card/DOM | Última `renderPropostaKanbanCard`, chamada por `renderPropostasAcompanhamentoKanban` | Monta conteúdo do card |

Diagnóstico do cenário reproduzido: **A e F**. O dado existia e a implementação
efetiva do card estava desatualizada. Não era perda na gravação, leitura ou projeção,
nem um seletor incorreto. Há renderizadores anteriores substituídos por atribuições
posteriores em `window.renderPropostaKanbanCard`; corrigir só um anterior não resolveria.

Correção: o último renderizador passou a incluir `p.observacaoAtualizacao`, quando
presente, com o helper `escFinal` e a classe `mini-requester` já existente. Não mudou
status, criação, número, valor, cliente ou persistência. Não houve alteração de CSS,
cores, botões, navegação ou layout geral: somente a informação ausente foi restaurada.

### Validação da observação e ajuste legítimo de fixture

A asserção original foi mantida literalmente e passou. Depois dela, a regressão
avançou até um cenário que selecionava `Rolamento` sem cadastrá-lo no catálogo.
O formulário exige produto cadastrado; `atualizarSelectProdutosSolicitacoes` constrói
as opções a partir de `produtosSolicitacoes`. A fixture agora cadastra esse produto
antes da renderização. Nenhuma validação ou asserção foi removida/relaxada.

`tests/proposta-observacao-browser-checks.mjs` reutiliza o SDK simulado e os métodos
existentes para verificar edição de número/valor sem perder observação, atualização
de observação, recarga, origem por contato, fallback pelo log e escape de texto com
`<img ...>`. `--propostas-observacao` executa a asserção original e esses cenários
sem screenshots. O modo completo continua executando todos os testes posteriores.

### Identidade atual

| Ponto | Comportamento confirmado |
|---|---|
| Cliente SDK | `supabaseClient`, criado no HTML pelo SDK CDN; não foi duplicado |
| Configuração | `LOGIN_HABILITADO = false`; abrir a aplicação não exige login |
| Sessão existente | `iniciarComLogin` chama `auth.getSession()` e preserva `data.session.user` |
| Usuário em memória | `liberarSistema(user)` atribui `usuarioLogado` |
| Identificador disponível | `usuarioLogado.id`, quando houver usuário de uma sessão existente |
| Actor no piloto | `AuthRepository.getActorId()` → Service de Compras → envelope; string válida ou `null` |
| Nome fixo | `usuarioAtivo = 'Patrick Barbosa'` é metadado de interface/exportação, não prova de autoria |
| Legado comercial | Registros/logs não têm autoria autenticada padronizada |
| Origem atual dos eventos | `agenda-dinamica/iframe`, constante; não diferencia navegador A/B |

Fluxo atual: Auth → sessão/user → `usuarioLogado.id` → `getActorId` → envelope local.
O `actorId` não é persistido como trilha durável: o Event Bus é em memória. A ação
de Compras persiste a coleção, não um journal de eventos/autoria.

Sem sessão, há operações sem identidade e `actorId = null`; isso é correto e não
deve ser substituído por nome/e-mail fixo. Com sessão, o ID representa a identidade
obtida pelo cliente na inicialização, mas não é validação de autoria no servidor.
O ramo sem login retorna antes de registrar `onAuthStateChange`; a fachada de Auth
é passiva e não mantém `usuarioLogado` sincronizado a cada mudança de sessão.
Sessões expiradas/trocadas durante a execução exigem verificação futura explícita.
Compras consulta o ator na preparação dentro da fila, não fixa um contexto de sessão
na entrada da ação; isso também precisa de contrato explícito na próxima fundação.

O código chama `.select('key,value')` e `.upsert(..., {onConflict:'key'})` sem filtro
de usuário/organização. Não há modelo de workspace/tenant identificado nesse contrato.
Existência/permissões reais de RLS, triggers, colunas adicionais e isolamento de
usuário **não foi possível determinar com segurança pelo código analisado**. Não
foi acessado o catálogo administrativo do Supabase nesta etapa.

### Sincronização e concorrência atuais

`iniciarSincronizacaoAutomatica` registra:

- Realtime `postgres_changes`, evento `*`, schema `public`, tabela configurada;
- debounce de recarga de 350 ms;
- polling a cada 10 segundos;
- foco e retorno à visibilidade com recarga agendada em 100 ms;
- nova tentativa em 700 ms quando há debounce/escritor/Repository pendentes.

A sincronização é ignorada quando `document.hidden`, quando a aplicação não está
carregada e, se login habilitado, quando não há usuário. A comparação é por JSON
do estado antes/depois; diferenças provocam renderização. O payload de Realtime
não é usado para identificar comando, autor, versão ou mudança de domínio.
O carregamento substitui arrays; não faz merge de edições.

Cada iframe possui sua própria fila, memória de comandos e snapshot confirmado.
Isso evita concorrência local, mas não coordena outro navegador, aba ou dispositivo.
Realtime/polling promovem convergência posterior, não evitam uma sobrescrita anterior.

Não foi encontrado CAS/optimistic locking, comparação de versão esperada, RPC de
comando ou predicado de escrita sobre versão. `schemaVersion` do evento e
`application.version` não versionam registros. `atualizadoEm` usa data do cliente,
normalmente `YYYY-MM-DD`, e não serve como versão: alterações do mesmo dia coincidem.
`persistedAt`/`occurredAt` são timestamps do navegador, não timestamps confirmados
pelo banco. Uma coluna server-side `updated_at` pode existir, mas não é lida nem
comparada pelo contrato atual; sua existência não foi determinada.

### Snapshot versus operação: exemplos concretos

| Cenário | Sequência | Resultado permitido pelo cliente atual |
|---|---|---|
| Mesmo valor comercial | A/B carregam 1000; B grava 1200; A grava contato com seu snapshot antigo | A pode regravar vendas como 1000, mesmo sem editar vendas |
| Dois contatos distintos | A/B carregam mesma lista; cada um acrescenta seu contato; A grava por último | Lista de A pode remover o contato novo de B |
| Duas compras distintas | B muda compra 2 para sem retorno; A edita descrição da compra 1 sobre lista antiga | A grava toda `cotacoesCompras`, restaurando status antigo da compra 2 |
| Outra coleção com compras locais inalteradas | B atualiza compras; A grava contato | `saveLegacy` omite compras se iguais ao confirmado local; esse caso preserva a compra remota |
| Mesmo registro com datas iguais | Duas edições no mesmo dia | `atualizadoEm` não identifica conflito |
| No-op sobre estado antigo | B altera status remoto; A solicita o status que ainda vê localmente | A pode retornar `ok: true, changed: false` sem request, embora o servidor tenha outro status |
| Falha após request | Banco pode ter aplicado a escrita, mas resposta não chega ao cliente | Resultado é ambíguo; replay local não prova qual revisão global está no servidor |

As onze coleções são clientes, contatos, agendamentos, solicitações comerciais,
recorrentes, conclusões, alterações de cliente, vendas, compras, alarmes tratados
e produtos. Há também tema. `save()` genérico pode regravar os doze valores.
`saveLegacy()` grava os valores não migrados juntos e omite compras somente quando
inalteradas frente ao confirmado local. `commitCollection` do piloto grava uma única
chave, porém ainda grava o array inteiro dessa coleção.

`tests/concurrency-characterization.test.mjs` executa duas instâncias reais de
Repository/Service com um servidor simulado compartilhado. Cinco casos demonstram
sobrescrita legado/vendas, conflito entre compras diferentes, proteção da omissão
de compras, reconciliação sem eventos e limite do no-op local. São evidências do comportamento do cliente
sob upsert permitido, não validação de RLS ou concorrência do banco real.
Nenhuma solução de concorrência foi implementada nesta etapa.

### O que significa salvo

| Marco | Legado comercial | Compras |
|---|---|---|
| Alteração local | Arrays são modificados imediatamente | Candidato separado, preparado na fila |
| Chamada de persistência | `save()` agenda debounce de 250 ms | Service aguarda `commitCollection()` |
| Request | Snapshot passa pela fila e pelo escritor | Upsert somente da chave de compras |
| Resposta | Escritor confirma quando `error` não está presente | Mesmo contrato de confirmação |
| Commit visual | Já ocorreu antes do request | Coleção aplicada após confirmação |
| Mensagem de sucesso | Frequentemente emitida antes do await | Após confirmação e entrega aos handlers |
| Evento de domínio | Não há publicação padronizada | Publicado somente após sucesso |

A confirmação atual significa que o SDK respondeu sem erro à operação solicitada.
Não prova que outra sessão não a sobrescreveu depois, nem fornece versão de banco,
autoria validada, readback, recibo durável de comando ou entrega durável de evento.

No piloto, falha antes da confirmação não aplica o candidato nem publica. Erro de
handler não provoca regravação de uma operação já confirmada. Ainda há uma janela
entre confirmar no banco e publicar em memória: fechar/recarregar o iframe pode
perder a entrega. O cache de commandId é local; `creationCommandId` ajuda na criação,
mas não é um journal geral de edições/exclusões. Retry sem confirmar o resultado de
um timeout continua sujeito a divergência remota.

O Repository bloqueia escrita sem carga bem-sucedida, mas uma falha de carga não
zera necessariamente um estado antigo. Comandos legados ainda podem apresentar
sucesso local antes de a gravação falhar; uma recarga posterior pode apagar esse
estado local não confirmado. O guard de sincronização evita recarga durante trabalho
pendente, não é proteção de conflito entre clientes.

### Especificação da próxima fundação — somente proposta

**Identidade e sessão**

1. Definir se ações continuarão podendo ser anônimas ou exigirão autenticação;
   manter desconhecido como `null` até essa decisão, sem ativar login por inferência.
2. Capturar contexto da ação no início do comando e manter mudanças de sessão por
   uma única subscription; diferenciar nome de exibição, e-mail e ID autenticado.
3. Validar autorização/autoria no servidor e derivar actorId da sessão aceita,
   sem confiar em um campo enviado pelo JavaScript.
4. Definir escopo dos dados (instância/workspace/organização) e verificar RLS/keys
   por leitura administrativa antes de propor schema.
5. Separar actorId de identificador técnico da instância do navegador e da origem.
   Registrar somente o contexto necessário, sem guardar tokens em logs/eventos.

**Concorrência**

1. Enquanto existirem arrays por chave, carregar uma revisão server-side de cada
   chave e enviar a revisão esperada das chaves alteradas.
2. Comparar e incrementar revisão atomicamente no servidor. Todos os escritores,
   inclusive legado e clientes antigos, precisam participar ou ter acesso de escrita
   direta bloqueado na transição; CAS somente no cliente novo seria insuficiente.
3. Para comandos multicoleção, comparar/gravar o conjunto afetado em uma transação;
   definir se a transição inicial usará revisão por coleção ou por entidade.
4. Separar `updatedAt` server-side para auditoria da revisão usada pelo lock otimista.
5. Retornar conflito explícito, com revisão atual e dados necessários à decisão;
   não mostrar sucesso, não publicar evento e não repetir automaticamente uma escrita
   obsoleta como se fosse um erro de rede.
6. Manter candidato local para resolução. Campos independentes podem ter merge
   apenas com regra definida; valor, status, exclusão e reabertura exigem decisão
   explícita. Não usar last-write-wins silencioso como resolução padrão.
7. Reconciliar por revisão/dirty state, preservando operações pendentes e rejeitando
   aplicação fora de ordem. Realtime continua invalidação, sem inferir fatos locais.

**Persistência, falha e recuperação**

1. Distinguir validado, em envio, confirmado, conflito, falha e resultado desconhecido.
2. Retornar recibo com commandId, actorId validado, chaves/entidades afetadas, revisões
   confirmadas e timestamp do servidor. Readback é diagnóstico, não substitui CAS.
3. Registrar idempotência no servidor por escopo + commandId + fingerprint. Repetir
   o mesmo comando retorna o mesmo recibo; outro payload para o mesmo ID é rejeitado.
4. Após timeout, consultar recibo/revisão antes de repetir. Retry de erro transitório
   preserva commandId e intenção; conflito/validação/permissão não são retries cegos.
5. Não aplicar estado ou mensagem de sucesso antes da confirmação; preservar candidato
   e permitir recuperação explícita. Diferenciar confirmação de escrita de entrega.

**Eventos e rastreabilidade**

1. `commandId`: identidade estável da intenção, inclusive durante retries.
2. `eventId`: identidade estável do fato confirmado; não gerar outro para reenviar.
3. `correlationId`: cadeia operacional; inicialmente pode acompanhar commandId.
4. `causationId`: evento/comando que causou a reação, sem inventar origem para legado.
5. Persistir fato/recibo/outbox na mesma transação quando entrega durável for requisito;
   handlers precisam de idempotência de consumo. Não prometer exatamente uma entrega
   com o Bus atual em memória.

Nenhum desses mecanismos, schemas, RPCs, locks ou campos novos foi implementado.

### Comparação dos próximos domínios

As quantidades abaixo descrevem áreas de negócio relacionadas, não contam todas
as chamadas de renderização. Risco/acoplamento são avaliações qualitativas do código.

| Domínio | Acoplamento / dependências | Duplicações e teste | Importância / impacto / risco |
|---|---|---|---|
| Clientes | Alto; cadastro é referência de quase todos, exclusão afeta 4 coleções dependentes | Duas bases de salvar + wrapper de deduplicação; testar cascatas é amplo | Central; alto risco de integridade |
| Contatos | Alto; cliente, retorno opcional e proposta derivada | Duas bases de salvar; casos simples e proposta misturados | Alto uso; risco de alterar acompanhamento |
| Retornos | Médio; cliente, conclusão/Histórico, Agenda/Painel e alarmes | CRUD concentrado; conclusão é ramo compartilhado, com próximo retorno opcional | Alto uso; impacto delimitável, risco médio |
| Solicitações | Alto; cliente/catálogo/anexos, proposta, contato, retorno e vendas | Wrappers de vínculo/deduplicação e conclusões alternativas | Alto impacto; risco alto |
| Propostas | Muito alto; fontes contato/conclusão, vendas, Histórico, retorno | Projeções/renderizadores/status sobrepostos; identidade composta | Alto impacto comercial; risco alto |
| Vendas | Alto; conclusões/propostas e status comerciais | Dois registradores e deduplicação com acesso divergente ao estado | Alto impacto de valores/status; risco alto |
| Histórico | Alto como projeção; fontes de quase todos os domínios | Várias versões de renderização; passado derivado e incompleto | Alto para auditoria; precisa contrato durável antes |

**Próximo domínio recomendado: Retornos.** Possui uma coleção principal explícita,
CRUD localizado e cenários já exercitados pela regressão. Não carrega a identidade
ambígua de Propostas nem o registro duplicado de Vendas. É útil para provar um
comando composto delimitado (remover agendamento, criar conclusão e, opcionalmente,
criar próximo retorno), depois de preparar a confirmação multicoleção e conflitos.

Antes dessa migração, definir autoria/escopo e implementar a proteção server-side
especificada em etapa própria. Na migração futura de Retornos, preservar IDs e slots,
documentar o vínculo entre agendamento/conclusão, manter os alarmes atuais lendo a
coleção e evitar alterar os ramos comerciais de `confirmarConclusao`. Nenhum Service
de Retornos ou outro domínio foi criado nesta revisão.

### Resultados desta etapa

- Asserção original da observação: reproduzida antes e passou após uma linha no card.
- 40 testes anteriores de Fundação/Compras: passaram sem alteração dessas suites.
- 5 caracterizações de concorrência simulada: passaram, documentando os riscos atuais.
- Regressão de observação ampliada e regressão geral: passaram com SDK simulado.
- Capturas em 1440, 900 e 600 px, ambos os temas; observação inspecionada sem redesign.
- Testes de iframe/fundação e do piloto de Compras: passaram.
- Build em pasta temporária: passou; `dist` preservado.
- Preview de produção: regressão geral, fundação/iframe e piloto de Compras passaram.
- Nenhuma migração comercial, alteração de Auth/RLS ou solução de concorrência aplicada.

## IDENTIDADE E CONCORRÊNCIA — Fase 3 parcial

### Projeto técnico após resultado SQL fornecido

Documento atual: [Concurrency Design](supabase/inspections/concurrency-design.md).
Os parágrafos de inspeção limitada abaixo são histórico, não o estado mais recente
do conhecimento. O projeto técnico usa o resultado SQL fornecido no anexo do usuário;
não foi executada nova consulta remota nem localizada uma exportação SQL completa.

**CONFIRMADO PELO BANCO (resultado fornecido):** public.agenda_dinamica_storage
tem key TEXT PRIMARY KEY, value JSONB NOT NULL e updated_at TIMESTAMPTZ NOT NULL
DEFAULT now(); trigger BEFORE UPDATE set_agenda_dinamica_storage_updated_at chama
set_updated_at(). Não há version/revision nem RPC de snapshot encontrada na busca
informada. RLS habilitado, não forçado; policies permissivas CRUD authenticated,
nenhuma anon; grants existem para anon/authenticated/service_role/postgres.
Somente service_role/postgres bypassam RLS entre essas roles. A tabela não está
na publicação supabase_realtime. A definição bruta do trigger/ACLs não foi fornecida.

**CONFIRMADO PELO CÓDIGO:** cliente ativo no HTML usa chave pública anon, sem
service_role identificada nos fontes. Login desligado preserva getSession() e não
cria usuário automático/anônimo. AuthRepository acompanha onAuthStateChange e
valida candidato por getUser. Testes de browser simulam sessão nula com escrita
permitida, sem reproduzir RLS. Escritor remoto tem 12 keys; saveLegacy normalmente
envia 11 e pode enviar 12, Compras envia uma ou zero em no-op. Fila é local,
confirmação é SDK_ACKNOWLEDGED, não CAS. O contexto técnico não chega ao banco.

**INFERIDO:** uma sessão anterior authenticated pode explicar o acesso com login
visual desligado; sem sessão, anon não escreve pelas policies fornecidas.
Realtime postgres_changes para esse canal/tabela não recebe as alterações pela
publicação informada; polling/focus/visibility fazem recarga. O timestamp não
protege base obsoleta: no mecanismo descrito não existe proteção server-side
contra gravação obsoleta. A conclusão é limitada ao resultado SQL fornecido.

**DECISÃO PROPOSTA:** revisão global BIGINT em metadado separado, leitura única
coerente de snapshot+revisão, commit multi-key por RPC transacional, comparação
esperada sob lock, incremento único e recibo idempotente por autor/comando.
Conflito preserva intenção local, não aplica estado nem publica sucesso. Após
commit parcial não promover coleções antigas à revisão nova; recarregar base
coerente antes do próximo save legado. Todos os escritores devem participar.

SECURITY INVOKER é a preferência, mas sozinho não impede o upsert direto com os
grants atuais. Para browser authenticated com DML direto fechado, a proposta
justifica SECURITY DEFINER restrito, owner dedicado de privilégio mínimo,
auth.uid obrigatório, search_path vazio e EXECUTE apenas authenticated. Alternativa:
backend controlado com RPC INVOKER e role dedicado. Nenhum mecanismo/permissão
foi criado ou alterado. Essa decisão de segurança precisa de revisão antes do DDL.

**AINDA DESCONHECIDO:** sessão/role efetivo em produção, ACLs exatas/herdadas,
definições SQL completas, outros writers e objetos não cobertos pelo catálogo
fornecido. Autenticação válida é pré-requisito da implementação. O design contém
testes futuros A/B, multi-key, bypass e retry incerto, cutover e rollback sem
restaurar dados antigos. Nenhuma migration, RPC, alteração de frontend, Compras,
RLS/policies/Realtime, dados, commit ou push foi realizado nesta etapa.

Inspeção automática posterior: [Snapshot Schema Report](supabase/inspections/snapshot-schema-report.md).
O relatório separa respostas confirmadas do projeto real, uso inferido pelo código
e metadados ainda desconhecidos. Foram confirmados key/value/updated_at no schema
public e erros 42703 para version/revision/id/created_at. RLS, constraints, triggers
e proteção server-side permanecem não determinados. Na retomada, o usuário informou
que conectou a integração oficial; contudo, a consulta de integrações desta sessão
ainda retornou `installed: false` e nenhuma ferramenta Supabase/PostgreSQL está
exposta ao agente. A leitura autenticada do catálogo não pôde ser executada.
Isso é uma divergência de disponibilidade nesta sessão, não prova sobre a conexão
feita pelo usuário. Nenhuma solução foi implementada
nessa inspeção, e não se pede cópia manual de resultados do SQL Editor.

O relatório contém o rastreamento exato de Compras e dos comandos legados até
`key`/`value`, incluindo os ports capturados antes da substituição das funções.
Compras passa pelo Service; contatos e vendas ainda executam regras nas funções
legadas. Ambos chegam ao mesmo `upsert(..., {onConflict:'key'})`, sem revisão
esperada. O contexto técnico de identidade não é enviado ao Supabase pelo escritor.
O cenário de snapshot obsoleto é possível no cliente, mas sua aceitação no banco
ainda requer catálogo: não se declara ausência de proteção server-side sem ele.
A recomendação de CAS continua condicional, sem migration/RPC/coluna/trigger,
e nenhuma chamada remota foi executada nesta retomada.

**O controle server-side está bloqueado pela ausência de metadados administrativos.
Esta revisão não resolve a sobrescrita entre navegadores e não conclui a Fase 3.**
O Repository expõe `getStatus().concurrency = {mode:'UNVERSIONED',
serverVersionKnown:false, protected:false}` para não representar a fila local como CAS.

### Inspeção remota realizada antes de alterar código

Consultas GET com a chave pública já presente no projeto, sem leitura de registros
comerciais nem qualquer escrita remota:

| Consulta | Resultado | O que permite concluir |
|---|---|---|
| `/rest/v1/` | HTTP 401 | OpenAPI/metadados de relações/RPCs não disponíveis com esse acesso |
| `/rest/v1/agenda_dinamica_storage?select=key,value&limit=0` | HTTP 200, lista vazia por limite zero | A relação REST aceita os seletores key/value; não informa tipo físico, PK, RLS ou dados |
| `/auth/v1/settings` | HTTP 200 | Provider e-mail disponível, `disable_signup=false`, criação de usuários anônimos desabilitada |
| `/storage/v1/bucket` | HTTP 200, nenhum bucket exposto | Não prova ausência do bucket esperado: acesso público não comprova catálogo completo |

O login da aplicação segue desabilitado. Auth do projeto remoto oferece e-mail,
mas nenhuma conta foi criada, sessão iniciada ou configuração alterada.
`anonymous_users=false` é uma configuração de Auth, não uma prova sobre a role
`anon` ou suas policies de acesso aos dados.

Não foram encontrados migrations/schema SQL anteriores, Supabase CLI, psql,
Docker ou conexão administrativa configurada no ambiente. `.env.local` contém
integração Vercel, não conexão de banco. Não foram utilizadas credenciais privadas.

Permanecem desconhecidos: tipos/defaults/constraints reais, natureza física da
relação, chave primária e índices, triggers, functions/RPCs, owner/grants, RLS e
policies, publicação Realtime e eventual coluna de versão. O banco remoto não foi
inferido a partir de nomes constantes no frontend ou do servidor simulado dos testes.

`supabase/inspections/snapshot-schema-readonly.sql` é uma consulta de metadados,
**não uma migration**. Solicita essas definições em uma transação READ ONLY, sem
alterar objetos/dados. Pode ser executada por uma conexão de leitura apropriada;
no editor SQL, preservar os resultados de cada consulta. Não foi executada remotamente.

### Contexto técnico implementado

`public/application/context/execution-context.js` é a fonte central de contexto.
O bootstrap cria somente uma instância e a reutiliza no Repository e Compras.

| Campo | Origem/semântica atual |
|---|---|
| actorId | ID existente verificado via `auth.getUser()` quando há usuário de sessão; sem usuário, null |
| instanceId | `inst_` + UUID criptográfico, armazenado em `sessionStorage` |
| sessionId | `run_` + UUID de execução do documento; não representa sessão autenticada |
| commandId | `cmd_` + UUID para nova intenção; um ID fornecido é preservado em retries |
| eventId | UUID distinto do comando, gerado para um novo fato; sucesso reaproveitado não republica |
| correlationId | Aceita cadeia fornecida; por padrão acompanha commandId |
| causationId | Aceita origem fornecida; por padrão null, sem inventar causalidade legada |
| origin | `agenda-dinamica/iframe`, ou origem técnica explícita |

`capture({commandId, correlationId, causationId, origin})` retorna contexto imutável.
Não aceita override de actorId, instanceId ou sessionId. Nome/e-mail fixos não são
substitutos de usuário. Contexto não autentica nem autoriza a gravação no banco.

InstanceId identifica o contexto de aba/origem e persiste nos reloads dessa aba;
uma execução nova gera outro sessionId. Fechar o contexto encerra esse armazenamento.
Janelas que copiam o sessionStorage do opener recebem outro instanceId. Contextos
independentes foram testados no Chrome. Duplicação de aba sem opener pode copiar
sessionStorage: esse caso não tem garantia universal de instanceId distinto;
o run/sessionId continua diferente. Nenhum ID técnico deve ser usado para permissão
ou como prova de autoria. Armazenamento indisponível resulta em falha explícita,
não em uma falsa promessa de persistência.

### Auth sem ativação de login

A fachada `auth-repository.js` utiliza o mesmo cliente Supabase. Uma subscription
idempotente acompanha a sessão; não chama sign-in, cria conta ou abre login.
`getExecutionIdentity()` usa o candidato da sessão existente e confirma seu ID
com `getUser`. Uma sessão não verificável ou alterada durante a verificação retorna
erro, não nome/e-mail substituto. Sem candidato de sessão retorna actorId null.

Isso melhora o contexto do cliente, mas não é autoria server-side de um comando:
o escritor remoto atual não recebe/valida um recibo de autoria ligado à transação.
Validação/derivação definitiva no banco continua pendente. SDK e sessionId técnico
possuem responsabilidades diferentes; sessionId não copia access_token, refresh_token
ou ID pessoal e não se apresenta como ID da sessão Auth.

### Compatibilidade dos eventos e Compras

O envelope evoluiu para schemaVersion 2 com `instanceId` e `sessionId` opcionais.
Validação continua aceitando envelopes V1 sem esses campos. eventId igual a
commandId é rejeitado. SchemaVersion é versão do envelope, não versão dos dados.

Compras captura contexto antes de preparar/gravar, mantém commandId e propaga
correlation/causation/origin ao evento. A mesma Promise de comando continua sendo
reutilizada; um sucesso não é aplicado/publicado novamente. Mudar de ator entre
tentativas do mesmo comando retorna erro. Nenhum status, valor, ID de entidade,
layout ou regra comercial foi migrado incidentalmente.

O Repository recebe o contexto do Service sem criar outro comando; gravações
legadas futuras podem ter contexto gerado no ponto central. O SDK ainda faz o
upsert existente: metadados técnicos não foram transformados em novas colunas
sem schema. Não há segundo cliente, Event Bus, Repository ou bootstrap.

### Resultados e candidatos pendentes

`repositories/persistence-result.js` define `SUCCESS`, `CONFLICT`, `ERROR`.
Sucesso de escrita permanece condicionado ao ack do SDK. Um no-op é marcado
`confirmation:'LOCAL_NO_OP'`, sem alegar confirmação remota desse status.

Se um port futuro retornar um conflito do servidor, o Repository preserva
`reason:'CONFLICT'`, expectedVersion e actualVersion, sem comparar/incrementar
versões no frontend. Compras não aplica candidato nem publica evento nessa resposta.
**O port Supabase atual não fornece esse conflito: nenhuma RPC/CAS foi criada.**

Timeout/abort produzem `ERROR`, `uncertain:true`, `retryRequiresVerification:true`.
Não há sucesso ou evento automático quando a resposta é ambígua, mesmo que o
servidor simulado tenha aceitado o request. A recuperação recomendada é consultar
um recibo/versão confiável antes de reenviar; essa consulta server-side está bloqueada.

`getPendingWrites()` conserva candidatos locais com contexto/resultados em memória;
sucesso de outro comando não os remove. `discardPendingWrite(attemptId)` é descarte
explícito para uma futura resolução. Não há merge, force-save, retry automático
ou recarga que apague essa cópia em memória. Ela não é durável entre reloads.
O cache de comandos existente também não é um journal de idempotência no servidor.

### Auditoria técnica preparada

`executionContext.getAuditRecords()` retorna até 100 resultados em memória:
ator conhecido/null, instância, execução, comando, correlação, causa, origem,
operação, entidade quando identificada, timestamp, resultado, confirmação e
versões quando fornecidas pelo port. Nenhum payload comercial, e-mail, senha,
token ou stack é copiado para esses registros. Não foi criado módulo visual,
auditoria durável, journal de eventos ou outbox.

As versões são null no writer atual. A auditoria marca `concurrencyProtected:false`.
Preservar campos de um CONFLICT de teste não significa possuir detecção no banco.

### Bloqueio do versionamento e estratégia condicionada ao schema

Não há informação suficiente para criar uma migration segura: key/value expostos
pelo REST não definem tipos, constraints, owner, triggers ou policies. Modificar
essa relação ou escolher RPC/privilégios sem essas definições poderia romper
dados, RLS e clientes existentes. Por isso não foram criadas/aplicadas migrations,
RPCs, policies ou colunas de versão.

Após obter os metadados, a solução recomendada precisa:

1. Usar revisão inteira server-side, com comparação e incremento atômicos; timestamp
   serve somente para auditoria. Definir escopo global ou vetor por coleção conforme
   o schema e o contrato legado confirmado.
2. Rejeitar uma gravação V10 depois de V11, preservando todos os dados de V11.
   Snapshots multicoleção exigem verificação do conjunto e transação sem commit parcial.
3. Tratar registros diferentes da mesma coleção como conflito conservador se não
   existir merge seguro. Não mesclar arrays apenas por posição ou status.
4. Impedir que A/Contato grave uma Venda obsoleta de B. Uma revisão por coleção só
   funciona se todas as coleções regravadas tiverem suas revisões esperadas verificadas.
5. Incluir todos os escritores. Uma RPC protegida não resolve o problema se o
   upsert direto antigo ainda puder ignorar versões.
6. Verificar grants/RLS/roles antes de decidir invoker/definer. Não usar SECURITY
   DEFINER por conveniência; eventual necessidade exige justificativa, papel mínimo,
   search_path seguro e validação explícita de autorização/escopo. Não remover RLS.
7. Definir recibo/idempotência de commandId para timeout. Não confundir essa decisão
   com outbox/eventos duráveis, excluídos desta fase.

Nenhum desses mecanismos server-side foi substituído por comparação client-side.

### Como um conflito deve ser resolvido

O cliente deve manter candidato, revisão esperada e resposta atual; informar
conflito; permitir buscar a versão atual sem substituir automaticamente o candidato;
e exigir decisão explícita sobre rebase/merge/descarte. Uma nova intenção de resolução
utiliza commandId novo e revisão atual; não muda silenciosamente expectedVersion
para forçar o mesmo snapshot antigo. Não publica evento de sucesso no conflito.
A interface definitiva não foi criada; o contrato e a cópia local foram preparados.

### Validação parcial e requisitos ainda não atendidos

- 45 testes anteriores preservados: passaram, incluindo as caracterizações que
  ainda demonstram sobrescrita no modo UNVERSIONED;
- 13 testes novos de contexto/identidade/contrato: passaram;
- duas instâncias reais isoladas de navegador, com SDK interceptado: IDs distintos;
  reload da aba mantém instanceId e altera run/sessionId;
- Compras, observação de Propostas, fundação, regressão geral e console: passaram;
- build em pasta temporária passou sem alterar dist;
- nenhum teste acessou dados comerciais reais do Supabase.

Não foram executados/validados os testes server-side V10→V11 para mesmo registro,
registros diferentes ou Contatos×Vendas, nem idempotência durável de comando.
O teste do port que informa CONFLICT verifica apenas comportamento do cliente.
Os dois contextos de navegador validam identidade, não uma proteção remota ausente.

**Para concluir a Fase 3:** fornecer o resultado da inspeção SQL ou acesso de leitura
administrativa. Então escolher, criar e testar migration/RPC contra o schema real;
avaliar a transição de todos os escritores; solicitar a confirmação remota necessária
antes de aplicar alterações; e repetir os oito cenários obrigatórios. Até lá, o
risco original de sobrescrita continua presente. Retornos continua como próximo
domínio recomendado, mas não foi migrado e depende dessa fundação concluída.
