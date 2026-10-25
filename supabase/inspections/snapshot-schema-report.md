# Snapshot Schema Report

Inspeção automática realizada em 08/10/2026. Somente leitura remota.
Nenhuma migration, RPC, coluna, policy, grant, trigger ou dado foi criado/alterado.
Secrets, tokens, senhas e connection strings não são incluídos neste relatório.

**Resultado: acesso parcial ao projeto real via API pública. O catálogo PostgreSQL
completo não pôde ser acessado com os mecanismos atualmente disponíveis.**

### Retomada após conexão informada pelo usuário

O usuário informou que conectou a integração oficial Supabase. Na nova verificação
desta sessão, a consulta de integrações ainda retornou `installed: false` para
Supabase. Também foi conferida a lista de ferramentas efetivamente disponíveis:
nenhuma ferramenta Supabase/PostgreSQL de consulta SQL, listagem de tabelas ou
projetos está exposta. Não há mecanismo de descoberta adicional de ferramentas
disponível nesta sessão. Isso descreve o acesso do agente nesta sessão, não invalida
a conexão realizada pelo usuário em outro contexto.

**A inspeção autenticada do catálogo não foi executada nesta retomada.** As respostas
REST/Auth/Storage/GraphQL abaixo são evidências da inspeção anterior, não novas
consultas feitas pela integração. Nenhuma chamada remota ao banco foi feita nesta
retomada. É necessário que a conexão disponibilize suas ferramentas nesta sessão
do Codex; não é necessário fornecer senha ou copiar resultados do SQL Editor.

Assim, PK, tipos, índices, constraints, RLS, policies, triggers, RPCs, grants,
Realtime e mecanismos server-side de auditoria/versionamento permanecem
**AINDA DESCONHECIDOS**. Não há fundamento para declarar
"Não existe proteção server-side contra gravação obsoleta."

Classificação usada:

- **CONFIRMADO PELO BANCO/API:** resposta observada do projeto remoto;
- **INFERIDO PELO CÓDIGO:** contrato/uso da aplicação, não definição SQL confirmada;
- **AINDA DESCONHECIDO:** requer catálogo/autorização não disponíveis nesta sessão.

## 1. Acesso disponível

| Método verificado | Resultado | Erro/limite | Acesso necessário / alternativa mínima |
|---|---|---|---|
| Integração Supabase | Encontrada, ainda não instalada/conectada na última verificação | Sem ferramentas autenticadas de banco nesta sessão | Instalar e conectar a integração; então executar automaticamente consultas de catálogo somente de leitura |
| Supabase CLI | Ausente no PATH e nos pacotes local/global verificados | CLI não disponível | Integração Supabase é a alternativa mínima; não foi instalada CLI nesta etapa |
| Projeto CLI vinculado | Ausente | Sem `supabase/config.toml` ou `.temp/project-ref` | Uma vinculação autenticada não foi presumida |
| PostgreSQL/psql | Ausente | Sem cliente, connection string, PGHOST/usuário/senha/service configurados nos locais verificados | Conexão de leitura já configurada ou integração autenticada |
| Cliente Node `pg` | Ausente | Não há driver direto disponível no projeto | Não foram instaladas dependências |
| Docker/local Supabase | Ausente | Sem ambiente local identificado | Banco local não foi usado como substituto do remoto |
| REST/OpenAPI | HTTP 401 | Endpoint exige acesso privilegiado; ver detalhe abaixo | Não solicitar chave privada no chat; preferir integração autenticada |
| REST da relação de snapshots | HTTP 200 com limite zero | Confirma nomes selecionados, não o catálogo completo | Inspeção parcial utilizada |
| REST de `pg_catalog` | HTTP 406, `PGRST106` | Catálogo não é schema exposto | Conexão PostgreSQL/integração administrativa de leitura |
| GraphQL introspection | HTTP 200 com erro GraphQL | `pg_graphql extension is not enabled.` | Não habilitar extensão/configuração nesta inspeção |
| Auth/settings | HTTP 200 | Metadados públicos de configuração, não contas/sessões | Inspeção parcial utilizada |
| Storage/buckets | HTTP 200, nenhum bucket exposto | Visibilidade com acesso público não comprova inventário completo | Não inferir ausência do bucket pelo resultado |

O endpoint `/rest/v1/` retornou:

```text
HTTP 401
message: Invalid API key
hint: Only the `service_role` API key can be used for this endpoint.
```

Esse erro foi interpretado como restrição desse endpoint de metadados, **não** como
prova de que a chave disponível é inválida para todo o projeto: os endpoints de
dados com limite zero e Auth responderam HTTP 200 com a mesma credencial pública.
Nenhuma chave privilegiada foi solicitada para colar no chat.

Credenciais/configuração verificadas, sem exibir valores:

| Item | Estado |
|---|---|
| URL/referência e chave pública no código funcional | presente |
| `SUPABASE_ACCESS_TOKEN` | ausente |
| `SUPABASE_SERVICE_ROLE_KEY` | ausente |
| `SUPABASE_DB_PASSWORD` | ausente |
| `DATABASE_URL`, `POSTGRES_URL`, variantes Prisma/non-pooling | ausente |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | ausente |
| `PGSERVICE`, `PGSERVICEFILE`, `PGPASSFILE` | ausente |
| Configurações/token de CLI nos locais usuais verificados | ausente |
| `.pgpass`, `pgpass.conf`, arquivos `pg_service.conf` verificados | ausente |
| Configuração MCP Supabase/PostgreSQL no projeto e no config Codex verificado | ausente |
| Integração Vercel em `.env.local` | presente; não é conexão de banco |

Variáveis foram verificadas nos escopos Process, User e Machine do ambiente Windows.
Ausência nesses mecanismos não afirma inexistência de credenciais em outros sistemas.
Não houve busca/exposição de senhas de navegador nem automação do SQL Editor.

## 2. Projeto Supabase identificado

- Referência pública: `sdbqqsfgfnqtofdbagdk`.
- Origem da identificação: constantes da aplicação funcional em
  `public/original-index.html`; `src/lib/supabase.js` contém configuração equivalente,
  mas está fora do fluxo ativo do iframe.
- O host identificado respondeu às consultas reais REST, Auth, Storage e GraphQL.
- Nome amigável, organização, região, owner e identidade administrativa do projeto:
  **AINDA DESCONHECIDOS**.
- Não foi assumida equivalência entre ambiente local, mock de testes e banco remoto.

## 3. Tabelas

O inventário completo do schema não está disponível. Foi confirmada uma relação
exposta no schema `public`; seu tipo físico (table/view/materialized/foreign) não foi
determinado sem `pg_class`/catálogo.

| Relação | Finalidade | PK | Versionamento |
|---|---|---|---|
| `public.agenda_dinamica_storage` | Snapshots de coleções por chave — INFERIDO PELO CÓDIGO | AINDA DESCONHECIDA | Colunas `version` e `revision` não existem com esses nomes; outros mecanismos permanecem desconhecidos |

**CONFIRMADO PELO BANCO/API:** GET com `Accept-Profile: public` e seleção
`key,value,updated_at`, limite zero, retornou HTTP 200.

O código referencia o bucket `agenda-dinamica-anexos`, mas isso não confirma tabelas
internas de Storage ou sua presença/definição física. Tabelas Auth/Storage não foram
inventariadas por catálogo.

## 4. Colunas

Consultas seletoras de coluna com limite zero não transferiram valores comerciais.

| Coluna | Existência na relação REST | Tipo SQL | Nullable | Default |
|---|---|---|---|---|
| `key` | CONFIRMADA, HTTP 200 | desconhecido | desconhecido | desconhecido |
| `value` | CONFIRMADA, HTTP 200 | desconhecido | desconhecido | desconhecido |
| `updated_at` | CONFIRMADA, HTTP 200 | desconhecido | desconhecido | desconhecido |
| `created_at` | NÃO EXISTE com esse nome, HTTP 400 / `42703` | não aplicável | não aplicável | não aplicável |
| `version` | NÃO EXISTE com esse nome, HTTP 400 / `42703` | não aplicável | não aplicável | não aplicável |
| `revision` | NÃO EXISTE com esse nome, HTTP 400 / `42703` | não aplicável | não aplicável | não aplicável |
| `id` | NÃO EXISTE com esse nome, HTTP 400 / `42703` | não aplicável | não aplicável | não aplicável |

Exemplo de erro real, sem valores de dados:

```text
code: 42703
message: column agenda_dinamica_storage.version does not exist
```

Essas verificações confirmam somente as colunas testadas. Não constituem uma lista
exaustiva de colunas. O nome `updated_at` não comprova tipo timestamp, trigger ou
atualização automática. O frontend trata `value` como arrays/objetos, mas seu tipo
físico SQL não foi inferido como jsonb sem metadados.

## 5. Índices

**AINDA DESCONHECIDOS:** nomes, colunas, unicidade, método, predicados e definições.
O uso client-side de `onConflict:'key'` não confirma por si só um índice real.

## 6. Constraints

**AINDA DESCONHECIDAS:** PK, FKs, UNIQUE, CHECK, NOT NULL e constraints de exclusão.
A inexistência da coluna `id` não implica ausência de PK; `key` não foi declarado
PK neste relatório apenas por ser usado como identificador lógico.

## 7. RLS

**AINDA DESCONHECIDO:** RLS habilitado, obrigatório/forced, bypass por owner e efeitos
de policies. HTTP 200 em uma seleção com limite zero não comprova RLS desligado.
Uma contagem/visibilidade vazia também não comprova que o banco físico esteja vazio.

## 8. Policies

**AINDA DESCONHECIDOS:** policyname, permissive/restrictive, roles, cmd, USING,
WITH CHECK e uso de `auth.uid()`.

Nenhuma policy foi criada, removida ou alterada. Não foram executadas tentativas
de INSERT/UPDATE/DELETE para descobrir permissões.

## 9. Roles e Grants

As roles `anon`, `authenticated` e `service_role` são relevantes ao ecossistema
Supabase, mas seus grants efetivos neste banco não foram obtidos.

- Credencial usada: chave pública declarada no código, sem valor reproduzido.
- Metadados REST exigiram acesso privilegiado específico daquele endpoint.
- SELECT de coluna com limite zero foi aceito.
- DML, EXECUTE de functions, privilégios de schema, memberships, superuser e
  bypassrls: **AINDA DESCONHECIDOS**.

O único acesso de catálogo tentado retornou:

```text
HTTP 406 / PGRST106
Invalid schema: pg_catalog
Only the following schemas are exposed: public, graphql_public
```

Essa lista é de schemas expostos pelo REST, não de todos os schemas do banco.

## 10. Auth

**CONFIRMADO PELA API:**

- `/auth/v1/settings` disponível;
- provider e-mail: habilitado;
- `disable_signup`: false;
- `anonymous_users`: false.

Não foram criados usuários, iniciadas sessões ou alterados providers/configuração.
`anonymous_users=false` refere-se à criação de usuários anônimos de Auth, não à
role PostgreSQL `anon` nem às suas permissões na tabela.

**INFERIDO PELO CÓDIGO:** login da aplicação está desabilitado. Uma sessão existente
pode ser obtida por `auth.getSession()`, com ID em `session.user.id`; a fachada de
Auth acompanha mudanças e verifica um candidato por `auth.getUser()` para contexto.
Sem usuário, actorId é null. O nome fixo de exportação não é identidade autenticada.

**AINDA DESCONHECIDO:** existência de sessão administrativa utilizável por esta
inspeção e policies SQL que empreguem `auth.uid()`. Nenhuma tabela de usuários ou
informação pessoal foi consultada.

## 11. Functions / RPC

Inventário de functions/RPCs relacionadas à Agenda: **AINDA DESCONHECIDO**.
Argumentos, retorno, owner, invoker/definer, search_path e grants não foram obtidos.

- Não há chamada `.rpc()` no caminho de persistência funcional pesquisado.
- Isso não comprova ausência de RPCs no banco remoto.
- Nenhuma function de negócio foi executada nesta inspeção.
- A alternativa GraphQL foi uma consulta `query ... __schema`, sem mutation,
  retornando `pg_graphql extension is not enabled.`; nenhum schema GraphQL foi obtido.

A [documentação oficial de GraphQL](https://supabase.com/docs/guides/graphql) foi
consultada para escolher a rota de introspecção. Não foi habilitada extensão ou
introspecção, e nenhuma instrução de mudança de configuração foi executada.

## 12. Triggers

**AINDA DESCONHECIDOS:** nome, tabela, eventos, timing, enabled e function executada.
Em especial, não foi confirmado se `updated_at` é mantido por trigger, default,
regra de view ou outro caminho. Auditoria, versionamento e sincronização por trigger
também não foram confirmados ou negados.

## 13. Realtime

**INFERIDO PELO CÓDIGO:** subscription `postgres_changes`, evento `*`, schema
`public`, relação `agenda_dinamica_storage`. O app recarrega snapshots, mantém
polling de 10 segundos e listeners de foco/visibilidade.

**AINDA DESCONHECIDO:** publicação efetiva da relação em `supabase_realtime`,
replica identity, filtros de permissão e grants necessários. Não foi alterada
publicação ou configuração, e não foram coletados eventos de dados reais.

## 14. Snapshot atual

**INFERIDO PELO CÓDIGO:**

- Relação: `agenda_dinamica_storage`.
- Coluna de identificação: `key`.
- Coluna de dados: `value`.
- Doze chaves lógicas conhecidas no frontend, uma por coleção/preferência.
- Leitura: `.select('key,value')`.
- Escrita: `.upsert(rows, {onConflict:'key'})`.
- Exclusões de entidades removem itens do array; não usam DELETE SQL de linha.

**CONFIRMADO PELA API:** `key`, `value`, `updated_at` reconhecidos no schema public.

Quantidade física total de linhas/tamanho em bytes: **AINDA DESCONHECIDOS**.
GET com limite zero e `Prefer: count=exact` retornou `Content-Range: */0`.
HEAD de contagem retornou HTTP 200 sem Content-Range utilizável. Esses resultados
não permitem inventariar linhas ocultas por permissões nem comprovam tabela física vazia.
Não foram transferidos conteúdos de snapshots.

No frontend, `criadoEm`/`atualizadoEm` dentro dos objetos são diferentes de colunas
SQL `created_at`/`updated_at`. O carregador não lê `updated_at` da relação.

## 15. Fluxo de persistência

Mapa client-side; todos os módulos abaixo utilizam a mesma relação, não tabelas
individuais presumidas:

| Módulo | Coleção / key lógica | Leitura | Escrita | Responsável |
|---|---|---|---|---|
| Compras | `cotacoesCompras` / `secta_cotacoes_compras` | Snapshot carregado + leitores da UI | Upsert somente dessa key em alteração efetiva | ComprasService → SnapshotRepository.commitCollection |
| Clientes | `clientes` / `secta_clientes` | Snapshot + filtros/ficha | Array no snapshot legado | salvarCliente → save → adapter → saveLegacy |
| Contatos | `contatos` / `secta_contatos` | Snapshot + Histórico | Array no snapshot legado | salvarContato/salvarEdicao/apagarContato |
| Solicitações | `solicitacoesOrcamento` / `secta_solicitacoes_orcamento` | Snapshot + Kanban | Array e efeitos da conclusão | Comandos legados → saveLegacy |
| Propostas | Derivadas de contatos/concluídos | listaPropostasHistorico | Campos nas origens e nas vendas | aplicarStatusProposta; edição em requests-revision.js |
| Vendas | `controleVendas` / `secta_controle_vendas` | Snapshot + tabela | Array no snapshot legado | Registradores/status legados |
| Retornos | `agendamentos` / `secta_agendamentos` | Snapshot + Agenda | Array; conclusão altera também concluidos | salvarAgendamento/confirmarConclusao |
| Recorrentes | `orcamentos` / `secta_orcamentos` | Snapshot + Agenda | Array e nova ocorrência/conclusão | salvarOrcamento/confirmarConclusao |
| Histórico | `concluidos`, `historicoClientes` / `secta_concluidos`, `secta_hist_clientes` | Projeção de várias fontes | Fontes/logs persistidos; projeção sem tabela própria | Legado + eventosHistoricoUnificados |
| Alarmes | `alarmedIds` / `secta_alarmed` | Estado compartilhado | Marcação no snapshot | Scheduler legado → saveLegacy |
| Produtos | `produtosSolicitacoes` / `secta_produtos_solicitacoes` | Snapshot + select | Array de nomes | Configuração em requests-revision.js |
| Tema | `appTheme` / `secta_theme` | Snapshot | Preferência no snapshot | applyTheme/saveLegacy |
| Anexos | Metadados dentro de clientes/solicitações | URL/base64/Storage | Upload no bucket + metadados no snapshot | AttachmentRepository e helpers legados |

```text
Compras: UI → adapter → Service → Repository → escritor Supabase
         → relação agenda_dinamica_storage → key/value

Demais comandos: UI → função legada → save/debounce → adapter
                → Repository.saveLegacy → escritor → key/value
```

Referências locais: `public/original-index.html` (carregarDadosSupabase,
persistirDadosSupabase, STORAGE_KEYS, iniciarSincronizacaoAutomatica),
`public/application/adapters/legacy-ui-adapter.js`,
`public/application/repositories/snapshot-repository.js`,
`public/application/services/compras-service.js`.

### Rastreamento exato do snapshot no código atual

**INFERIDO PELO CÓDIGO**, conferido novamente nesta retomada. `src/App.jsx` abre
`public/original-index.html` em iframe; é esse documento que inicializa
`public/application/bootstrap.js` e o cliente Supabase funcional.

| Camada | Compras (fluxo migrado) | Contatos/vendas (fluxo legado) |
|---|---|---|
| UI | Botão `onclick="salvarCotacaoCompras()"`, HTML:14132; wrapper:14185 | `salvarEdicao()`, HTML:6408, modifica `contatos` e chama `save()`; comandos de vendas modificam `controleVendas` e chamam `save()` |
| Adapter de UI | `AgendaApplication.adapters.compras.save()`, compras-ui-adapter.js:10 | Não existe adapter de formulário separado; `save()`, HTML:5529, chama `persistirDadosSupabase` após debounce de 250 ms |
| Service | `createComprasService`: `criar`/`editar` → `run` → `repository.commitCollection('cotacoesCompras', ...)`, compras-service.js:48 | Não há Service migrado para esses comandos; regra de negócio permanece nas funções legadas |
| Adapter de persistência (entrada) | Repository é injetado pelo bootstrap | `connectRepository`, legacy-ui-adapter.js:39, substitui `persistirDadosSupabase` por `repository.saveLegacy` |
| Repository | `commitCollection` → `write(candidate, [name])` | `saveLegacy` → `write(candidate, collections)`; grava as coleções legadas, mesmo sem alteração individual |
| Port/adapter de saída | `writeSnapshot` → `originalPersist(snapshot, options)`, legacy-ui-adapter.js:34 | Mesmo port, utilizando a referência ao escritor original capturada antes da substituição |
| Supabase | `persistirDadosSupabase` original, HTML:5489 → `.from(SUPABASE_TABLE).upsert(rows, {onConflict:'key'})`, HTML:5515 | Mesmo escritor/cliente SDK |
| Relação | `public.agenda_dinamica_storage` | `public.agenda_dinamica_storage` |
| Coluna `key` | `secta_cotacoes_compras` | `secta_contatos`, `secta_controle_vendas` e demais keys incluídas no snapshot |
| Coluna `value` | Array completo `estado.cotacoesCompras` | Arrays completos `estado.contatos`, `estado.controleVendas`, etc. |
| Coluna `updated_at` | Não selecionada pelo leitor nem enviada pelo escritor | Não selecionada pelo leitor nem enviada pelo escritor |

Leitura: `SnapshotRepository.load()` → `legacy.loadSnapshot()` → `originalLoad()`
→ SDK `.from(SUPABASE_TABLE).select('key,value')` → `Object.fromEntries` por `key`
→ bindings dos arrays compartilhados → estado/UI. O bootstrap liga os mesmos
ports para polling e Realtime. Não há outra tabela de snapshot no caminho ativo.

O contexto `actorId/sessionId/instanceId/commandId` chega ao Repository e ao port,
mas o escritor original só usa `collections` e `silent`: esse contexto não é
enviado como coluna nem como argumento de RPC. A auditoria técnica adicionada
na Fase 3 fica em memória local. `edicoes`, `criadoEm` e `atualizadoEm` em objetos
são conteúdo do snapshot, não prova de auditoria PostgreSQL.

No cenário A/B, V10/V11 são rótulos ilustrativos: o leitor não obtém versão do
banco. Se A não recarregou após B, editar um contato pode reenviar a coleção de
vendas antiga por `saveLegacy`. Fila e trava locais não coordenam os navegadores.
**A possibilidade de o banco aceitar/rejeitar essa gravação permanece desconhecida**
até inspecionar triggers, regras, policies, constraints e funções pertinentes.

## 16. Problemas de concorrência

**CONFIRMADO NO CÓDIGO / TESTES SIMULADOS, NÃO NA ESCRITA DO BANCO REAL:**

- O escritor atual não envia revisão esperada nem usa predicado de versão/RPC CAS.
- saveLegacy pode regravar várias coleções a partir de estado local antigo.
- Compras regrava um array inteiro por key; registros diferentes podem disputar
  essa mesma coleção entre navegadores.
- Fila, auditoria e memória de comandos pertencem ao iframe.
- Realtime/polling não tornam comparação e gravação atômicas.
- Repository declara modo `UNVERSIONED`, `protected:false`.

**CONFIRMADO PELA API:** colunas `version`/`revision` não existem com esses nomes.

**PROTEÇÃO SERVER-SIDE: AINDA DESCONHECIDA.** Não é tecnicamente correto declarar
“Não existe proteção server-side contra gravação obsoleta” sem verificar triggers,
functions, grants/policies e todas as colunas. Tampouco há evidência suficiente
para declarar que existe proteção. O contrato client-side atual não comprova
segurança para o cenário A/V10 → B/V11 → A/snapshot antigo.

Não foi feita nenhuma gravação A/B no banco real para testar esse cenário, pois
esta etapa proíbe alterar dados. Os testes de caracterização existentes usam mocks.

## 17. Opções técnicas possíveis

Opções condicionadas à inspeção administrativa; nenhuma foi implementada:

1. Revisão global do snapshot, com comparação/incremento no servidor: conservadora
   para snapshots multicoleção, mas exige verificar como integrar a estrutura real.
2. Revisões por key/coleção, com verificação e escrita do conjunto em transação:
   combina com o contrato lógico atual, desde que unicidade e modelo físico sejam confirmados.
3. Operações por entidade: possível fase posterior, mas exigiria mais refatoração
   e não foi proposta como normalização imediata do banco nesta inspeção.

updated_at sozinho não é proteção atômica de concorrência. Triggers/RPCs existentes,
se houver, devem ser compreendidos antes de criar outro mecanismo. É necessário
incluir todos os escritores e impedir bypass por upsert direto antigo.

## 18. Recomendação

**Completar automaticamente a leitura de catálogo pela integração Supabase
autenticada.** O usuário informou a conexão, mas as ferramentas autenticadas ainda não foram disponibilizadas nesta sessão.
Essa é a alternativa mínima para evitar copiar resultados manualmente do SQL Editor.
Não solicitar senha, service role key ou token no chat.

Depois da conexão, o agente pode consultar pg_catalog/information_schema e o script
readonly já existente, registrar tipos/constraints/policies/triggers/functions e
recomendar o mecanismo específico. Não habilitar GraphQL, ampliar schemas expostos,
alterar RLS ou criar RPC apenas para facilitar a inspeção.

Até obter esse acesso, não escolher migration definitiva nem afirmar proteção.
O próximo passo de implementação deverá preservar key/value se compatível, comparar
versões atomicamente no servidor e proteger transações multicoleção. A escolha
global versus coleção depende do catálogo e das permissões efetivas, ainda desconhecidos.

**Recomendação provisória pelo código, não validada no schema real:** dado que
`saveLegacy` reenvia múltiplas coleções, uma revisão global com CAS e persistência
atômica do conjunto oferece o contrato inicial mais conservador. O servidor deve
comparar a revisão esperada com a atual, rejeitar a divergência sem nenhuma escrita
e incrementar a revisão somente junto à confirmação da transação. Compras e todos
os escritores legados devem participar desse contrato; upsert direto não pode
permitir contorná-lo. Se o catálogo revelar revisão/auditoria existente, avaliar
sua reutilização antes de propor outra estrutura. Não é possível indicar a
migration ou função exata para o schema REAL sem os metadados pendentes. Nenhuma
dessas estruturas foi criada ou implementada.

## 19. Informações ainda desconhecidas

- inventário completo de tabelas, views e schemas físicos;
- tipo físico, owner e tamanho de `public.agenda_dinamica_storage`;
- lista completa de colunas, tipos, nullability e defaults;
- PK, FKs, UNIQUE, CHECK, índices e predicados;
- configuração RLS/forced e todas as policies;
- grants de tabela/schema/functions para roles relevantes;
- functions/RPCs, argumentos, retorno, owner, invoker/definer e search_path;
- triggers, timing, eventos e código das functions referenciadas;
- publicação Realtime e replica identity;
- total de linhas do banco físico, sem limitação da credencial pública;
- qualquer mecanismo de versão com outro nome ou implementação;
- existência/eficácia de proteção server-side contra snapshots obsoletos.

Não se tratam de campos “ausentes”: são metadados que a autorização disponível não
permite determinar. A aplicação e o SQL readonly anteriores foram preservados.

Verificação local da inspeção anterior: compilação Vite concluída em pasta temporária;
hashes SHA-256 dos 43 arquivos de aplicação/configuração/testes conferidos sem
alteração, assim como o script SQL readonly existente. Apenas este relatório e
a documentação arquitetural foram adicionados/atualizados nesta etapa.
Não houve publicação, commit ou push.
