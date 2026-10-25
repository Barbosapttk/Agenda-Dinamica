# Concurrency Design

Estado posterior: [Fase 3C — ativação](phase3c-activation.md). A implementação
local da Fase 3B existe, mas a ativação remota autorizada permanece bloqueada
por acesso nesta sessão. Default legacy, Auth remoto desconhecido e Retornos
não migrado. O switch rpc é global; exige validação de writers por escopo antes
de ativar. O design abaixo é o registro original, não certificação de produção.

Projeto técnico de 08/10/2026. Nenhuma implementação ou alteração remota autorizada
nesta etapa. Apenas este documento e ARQUITETURA.md foram alterados.

Classificação: **CONFIRMADO PELO BANCO** indica o resultado SQL fornecido pelo
usuário no anexo desta etapa; **CONFIRMADO PELO CÓDIGO** indica inspeção local;
**INFERIDO** indica consequência técnica; **DECISÃO PROPOSTA** não é implementação;
**AINDA DESCONHECIDO** exige evidência adicional. O relatório anterior permanece
como registro histórico de acesso limitado. Não foi localizado outro export SQL
de resultados no workspace; a fonte do schema abaixo é o anexo fornecido, não uma
nova consulta executada pelo agente. Não se inventam nomes de constraints/policies,
expressões SQL ou ACLs detalhadas que não constam desse resultado.

## 1. Schema real

**CONFIRMADO PELO BANCO — resultado fornecido:**

| Objeto | Estado |
|---|---|
| Relação | public.agenda_dinamica_storage |
| key | TEXT NOT NULL, PRIMARY KEY, índice único da PK |
| value | JSONB NOT NULL |
| updated_at | TIMESTAMPTZ NOT NULL DEFAULT now() |
| version/revision | Não existem |
| Trigger | set_agenda_dinamica_storage_updated_at, BEFORE UPDATE, chama set_updated_at() |
| RLS | Habilitado, não forçado |
| Policies | SELECT/INSERT/UPDATE/DELETE permissivas para authenticated; nenhuma para anon |
| Grants de tabela | Existem para anon, authenticated, service_role e postgres; lista de privilégios exatos não fornecida |
| Bypass RLS | anon/authenticated não; service_role/postgres sim |
| Publicação supabase_realtime | Não inclui esta tabela |
| RPC de snapshot | Nenhuma encontrada no catálogo pesquisado |

**AINDA DESCONHECIDO:** export completo, definição de set_updated_at(), outras
regras/constraints não descritas, FKs, ACLs herdadas/de coluna e funções em outros
schemas. O trigger descrito só mantém timestamp; não recebe revisão esperada.
Pelo mecanismo informado, não existe proteção server-side contra gravação obsoleta.
Essa conclusão aplica-se ao mecanismo descrito, sem ampliar o alcance da busca SQL
fornecida para outros schemas/funções não pesquisados.

## 2. Autenticação real

**CONFIRMADO PELO CÓDIGO:** App.jsx renderiza original-index.html em iframe. O
cliente ativo é criado em public/original-index.html:5047 pelo SDK CDN
@supabase/supabase-js@2 (linha 268), sem opções auth customizadas. URL fixa do
projeto sdbqqsfgfnqtofdbagdk, chave JWT pública com claim role=anon na linha 5033.
Classificação feita sem registrar seu valor; decodificar claim não verifica assinatura.
Não usa variável de ambiente para URL/chave no caminho ativo. src/lib/supabase.js
tem outro cliente com chave anon e persistSession/autoRefreshToken=true, mas não
é importado pelo caminho App/main ativo. VITE_ORIGINAL_HTML_URL pode trocar o
documento do iframe; deployment usando override requer conferir esse documento.

LOGIN_HABILITADO=false (5052) retira a exigência visual. iniciarComLogin (5139)
consulta auth.getSession(), copia session.user para usuarioLogado e inicializa
mesmo sem usuário. Não faz sign-in automático nem signInAnonymously. O login por
email/senha continua no código em fazerLogin, via signInWithPassword. Não se
criam credenciais/sessões nesta análise. sairDoSistema retorna sem signOut quando
login está desligado, portanto a sessão anterior pode permanecer.

AuthRepository inicia uma subscription onAuthStateChange pelo bootstrap, acompanha
session.user e usa getUser() para validar o candidato antes do contexto de escrita.
Sem candidato retorna actorId=null; no fluxo legado usuarioLogado pode ficar
desatualizado após mudança da sessão, mas o repository acompanha sua própria sessão.
O listener legado que bloqueia SIGNED_OUT só é registrado no ramo com login ligado.

**INFERIDO:** a sessão anterior persistida pelo SDK pode explicar acesso real com
UI sem login. O SDK persiste sessão por padrão em localStorage e renova tokens;
isso não é uma criação automática de usuário. Origem do iframe e restrições de
storage do navegador importam. Nenhum token de usuário foi lido/exibido aqui.
Referência: [inicialização do cliente](https://supabase.com/docs/reference/javascript/initializing).

**AINDA DESCONHECIDO:** existência/validade da sessão no navegador de produção,
claims do token efetivamente enviado e eventual usuário is_anonymous. O resultado
Auth público anterior indicou anonymous_users=false; isso não identifica o usuário atual.

## 3. Role efetivo

| Condição da requisição | Role esperado | Evidência/limite |
|---|---|---|
| Chave pública, nenhum access token de usuário | anon | Código permite inicializar assim; RLS fornecido não autoriza escrita |
| Sessão válida de usuário comum | authenticated | SDK envia o JWT da sessão; sessão real não observada nesta etapa |
| Usuário anônimo autenticado | authenticated com identidade anônima | Não há signInAnonymously no código; não demonstrado |
| service_role | Não encontrado no frontend inspecionado | Nenhuma chave privilegiada identificada |

**CONFIRMADO PELO CÓDIGO:** busca em arquivos locais do projeto, incluindo arquivos
ocultos de texto, excluindo dependências e .git, por service_role,
SUPABASE_SERVICE_ROLE, sb_secret, service key, SUPABASE_KEY e createClient. As
referências a service_role encontradas são documentação/SQL de inspeção; os dois
JWTs de configuração identificados são anon. Não há evidência de service_role
enviada ao navegador nos fontes atuais. Os quatro artefatos HTML/JS/JSON do dist
local também foram pesquisados: a chave identificada em dist/original-index.html
é anon, sem marcador de chave privilegiada encontrado. Artefatos do deploy remoto,
ambientes externos e storage de um navegador real não foram certificados.

**AINDA DESCONHECIDO:** role efetivo de uma requisição de produção. Os testes
browser-regression interceptam o CDN/host Supabase: getSession retorna null e o
mock aceita select/upsert sem RLS. Identity-browser usa o mesmo isolamento. Eles
não provam acesso remoto nem policies. Grants anon não vencem RLS. Sem sessão
authenticated válida, acesso aos dados é bloqueio arquitetural antes de implementar.
Uma leitura anon pode retornar lista vazia sem erro; a aplicação não deve confundir
isso com um snapshot autorizado vazio no futuro contrato.

## 4. Snapshot atual

**CONFIRMADO PELO CÓDIGO:** STORAGE_KEYS, HTML:5190, leitor:5462, escritor:5489.

| key | Estado/coleção |
|---|---|
| secta_clientes | clientes |
| secta_contatos | contatos |
| secta_agendamentos | agendamentos |
| secta_solicitacoes_orcamento | solicitacoesOrcamento |
| secta_orcamentos | orcamentos |
| secta_concluidos | concluidos |
| secta_hist_clientes | historicoClientes |
| secta_controle_vendas | controleVendas |
| secta_cotacoes_compras | cotacoesCompras |
| secta_alarmed | alarmedIds |
| secta_produtos_solicitacoes | produtosSolicitacoes |
| secta_theme | appTheme |

São 12 keys no escritor remoto ativo; não foi encontrado outro escritor de rows
nessa tabela no código. Outras chaves de localStorage/preferências não equivalem a
linhas remotas. secta_historico é exemplo do pedido, não key ativa; histórico usa
secta_concluidos/secta_hist_clientes. Quantidade de rows reais/outros clientes é desconhecida.

UI Compras → salvarCotacaoCompras → ComprasUiAdapter.save → ComprasService.run
→ SnapshotRepository.commitCollection → write → LegacyUiAdapter.writeSnapshot
→ originalPersist → SDK .from('agenda_dinamica_storage').upsert → key/value.

UI legada → regra local (p.ex. salvarEdicao) → save/debounce 250 ms →
persistirDadosSupabase substituída pelo adapter → Repository.saveLegacy → write
→ writer original capturado pelo adapter → mesmo SDK/tabela/key/value. Não há
Service migrado para contatos/vendas. Repository.load → originalLoad → select
key,value → bindings locais. updated_at não é lido nem enviado como precondição.

saveLegacy normalmente envia 11 keys: todas exceto Compras, quando ela é igual
ao confirmedSnapshot. Pode enviar 12 se Compras diferir. Não é diff das demais
coleções. Repository.save envia 12; commitCollection de Compras envia uma key,
ou zero no-op. O escritor original aceita filtro collections, mas não há port
remoto separado para essas operações. Writers diferentes geram conjuntos diferentes.

Repository serializa carga/escrita por saveQueue dentro do documento. Não é fila
entre navegadores. Confirma SUCCESS só após SDK sem erro, aplica Compras e depois
publica evento no bus; isso não comprova versão. Não há retry automático de save,
abort de requisição ou cancelamento de comando enviado. Novo save cancela apenas
o timer anterior. Falhas mantêm candidatos em memória; discardPendingWrite remove
esse registro, sem abortar/reverter banco. Repetição manual de Compras usa commandId
e mapa local; timeout é resultado incerto que exige verificação, não retry cego.

**Realtime:** canal agenda-dinamica-atualizacoes, postgres_changes event='*',
schema public, tabela agenda_dinamica_storage (HTML:5579). A tabela ausente da
publicação não pode fornecer esse fluxo de mudanças no estado SQL informado.
SUBSCRIBED não provaria entrega. Polling de 10 s e focus/visibility (100 ms)
são os caminhos operacionais de recarga, desde que autenticados. Mudanças agendam
350 ms; gravação pendente posterga 700 ms; aba oculta não sincroniza. Os mocks
contam subscribe e não entregam WAL real. Não foi habilitado Realtime.
Referência: [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

## 5. Problema atual

**INFERIDO do schema e escritor:** se dois usuários authorized leem os mesmos
arrays, o upsert por key substitui value sem comparar versão. PK assegura
unicidade, RLS controla quem escreve e updated_at marca atualização; nenhum desses
compara o estado observado. A edição de contato em A pode reenviar venda antiga
após B salvá-la. Mesmo uma transação que escreve todas as rows atomicamente ainda
pode confirmar um snapshot obsoleto. Polling diminui a janela, não fecha a corrida.

Compras evita duplicação local: commitCollection confirma e atualiza
confirmedSnapshot; saveLegacy omite a coleção migrada igual à confirmada. No-op
não persiste; sucesso replayed não publica novamente. Isso não é CAS distribuído.

## 6. Estratégias avaliadas

| Critério | A: BIGINT por key | B: revisão global | C: entidades/comandos e versões específicas |
|---|---|---|---|
| Atomicidade/rollback | RPC deve validar vetor completo de dependências e gravar tudo numa transação | Uma revisão e todo write-set numa transação | Transação por operação de domínio |
| Multi-key | Inclui versões das keys lidas, mesmo não escritas; ordem de locks estável | Inclui toda alteração de qualquer key compartilhada | Define invariantes entre entidades/tabelas |
| Concorrência | Menos conflitos entre operações independentes; legado escreve quase tudo | Serializa commits e gera conflitos conservadores | Maior paralelismo se dependências bem modeladas |
| Complexidade | Vetor de versões, ausência/insert, read-set, locks | Metadado singleton, contrato único, CAS | Refatoração/normalização extensa |
| Repository | Trocar leitor/writer e rastrear dependências | Trocar ports, guardar revisão global junto ao estado | Migrar todos os Services e comandos |
| Supabase | RPC; não fazer vários updates REST separados | RPC transacional + leitura coerente | RPCs de domínio |
| Futuro/testes | Bom estágio intermediário, testes de write-skew | Fácil provar A/B, adaptação posterior explícita | Maior investimento/testes de domínio |

CAS com updated_at não é recomendado: timestamp não é contador monotônico,
now() é ligado à transação, e igualdade temporal não define revisão única do
snapshot. Atualizações por key feitas em requisições distintas não atendem multi-key.

## 7. Estratégia escolhida

**DECISÃO PROPOSTA:** B, revisão global BIGINT em metadado separado, mantendo
key/value/updated_at e as 12 keys atuais. Escopo inicial é a Agenda compartilhada
atual; não há tenant/owner no schema fornecido. Não simular isolamento por usuário.
Se surgirem tenants, revisão deve ser por agregado/tenant em outro projeto.

## 8. Por que foi escolhida

O legado substitui 11/12 coleções e operações têm efeitos cruzados. Um contador
global protege tudo sem inventar read-sets ausentes. Compras com uma key também
participa do contador; nenhum writer paralelo fica fora. Mais conflitos são
aceitos para impedir perda silenciosa enquanto a migração de Services continua.

## 9. Atomicidade

RPC bloqueia a linha singleton de revisão; compara expected com actual sob o
lock. Divergência retorna CONFLICT antes de escrever. Igualdade valida o conjunto,
grava todas as keys, registra recibo de comando e incrementa revisão uma vez,
na mesma transação. Qualquer erro desfaz todas essas alterações; não capturar
erro e retornar sucesso após escrita parcial. Um conflito não incrementa revisão.

Leitura futura deve retornar rows+revisão em UMA visão MVCC coerente, por uma
consulta agregada única/port de leitura. Ler rows por REST e revisão depois
pode associar dados antigos à versão nova e quebrar CAS. Paginação truncada não
pode ser aceita como snapshot completo. Locks sozinhos não substituem expected.
Referência: [isolamento PostgreSQL](https://www.postgresql.org/docs/current/transaction-iso.html).

## 10. Multi-key

Um comando com clientes+contatos+histórico+vendas faz uma chamada e um commit.
Não há loop de CAS por key com commits independentes. A altera key A e B altera
key B a partir de revisão 10: B confirma 11; A recebe conflito mesmo sendo outra
key. A preserva a intenção local, recarrega snapshot coerente 11 e reaplica a
operação após revisão do usuário/regra de domínio. Não atualizar só expected para
11 e reenviar o snapshot inteiro antigo: isso legitimaria sobrescrita silenciosa.

## 11. RLS

**DECISÃO PROPOSTA:** sessão authenticated válida, autor obtido de auth.uid().
Nenhum acesso anon, nenhuma chave service_role no browser. Sem sessão comprovada,
a implementação fica bloqueada até definir a identidade do fluxo real. Não abrir
policy anon para contornar o login desligado.

A RPC isoladamente não basta: authenticated ainda pode gravar diretamente pelas
policies atuais. O rollout futuro precisa retirar DML direto efetivo (inclusive
grants herdados/PUBLIC/colunas), manter leitura autorizada e revisar TODOS os
outros escritores. Apenas remover botão/usar RPC no frontend não é proteção.

## 12. RPC

Contrato conceitual, nomes/DDL ainda não criados:

- Entrada: expectedRevision como string decimal (evita perda de precisão JS de
  BIGINT), changes como lista única de {key,value}, commandId, sessionId,
  instanceId, correlationId/causationId/origin. Key allowlist das 12 keys;
  valores validados (arrays, theme string), limites de payload e sem SQL dinâmico.
- Saída SUCCESS: committedRevision, commandId, recibo/replayed e write-set
  confirmado. SUCCESS no-op não incrementa revisão. CONFLICT: expectedRevision,
  actualRevision, commandId, zero escrita, indicação para reload; não expor dados
  fora da autorização. ERROR: código estável, sem secrets; transporte pode ficar
  UNKNOWN quanto ao commit e deve consultar recibo antes de repetir.
- Recibo idempotente durável técnico, não tabela de histórico de autoria:
  unicidade por actorId+commandId, payload validado/fingerprint e resultado.
  Replay idêntico devolve recibo ANTES do CAS; comando reutilizado com payload
  distinto é erro. Recibo e gravação são atômicos. Nova intenção após conflito
  recebe novo commandId; não reciclar sucesso para conteúdo modificado.

**Segurança:** SECURITY INVOKER é a preferência padrão. Entretanto, revogar DML
direto de authenticated também impede uma RPC INVOKER do mesmo usuário de gravar.
Manter os grants apenas para facilitar INVOKER deixaria o bypass aberto.
Para a rota direta browser→RPC escolhida, propõe-se a exceção SECURITY DEFINER
por essa necessidade de separação de privilégios, não por conveniência. Usar
owner dedicado não-login e privilégios mínimos, sem postgres/service_role e sem
BYPASSRLS; policies específicas ao owner devem preservar o limite de autorização
equivalente ao acesso compartilhado authenticated atual. auth.uid() obrigatório,
role/claims autorizados verificados, actorId nunca confiado a um parâmetro.
search_path vazio, objetos schema-qualified, EXECUTE somente authenticated,
revogado de PUBLIC/anon, helpers não expostos. Futuro ajuste de grants/policies
precisa ser explícito e aprovado, não é feito agora.

Alternativa INVOKER: gateway server-side controlado com role dedicado exclusivo
de escrita e autenticação de usuário verificada, deixando browser sem DML. Exige
novo backend, privacidade de credenciais e vínculo de autor comprovado; não há
tal componente no projeto atual. Não escolher service_role automaticamente.
Se a exceção DEFINER não for aceita, essa alternativa deve ser projetada antes
de implementar; não entregar um INVOKER contornável.
Referência: [segurança de database functions](https://supabase.com/docs/guides/database/functions).

## 13. Identidade

actorId server-side = auth.uid() da sessão validada, não valor vindo do formulário.
sessionId atual é run_UUID técnico por documento, não identificador de sessão
Supabase. instanceId é técnico por aba/reload. commandId é identificador de intenção;
esses três metadados são não confiáveis para autorização. Validação de formato e
limites no servidor; eventId identifica fato após confirmação e não deve ser
commandId. Prealocar eventId da operação se for necessário preservá-lo no recibo;
publicar apenas com SUCCESS. Retry devolve o mesmo resultado, sem novo fato.
Não criar tabela de auditoria nesta etapa. Recibo futuro suporta recuperação;
histórico de autoria/eventos duráveis é projeto posterior separado. Não confundir
bus local com entrega exatamente uma vez distribuída.

## 14. Conflito

Repository mantém snapshot/revisão base, intenção pendente e erro distinto de
CONFLICT. Nenhum state commit ou evento de sucesso em conflito. UI conserva a
edição, informa mudança remota e oferece recarregar/comparar/reaplicar intenção.
Reaplicar precisa de transformação de domínio, não merge genérico dos arrays.
Uma revisão de SUCCESS com changes de uma key não permite promover todo o estado
local para essa revisão: após confirmar, recarregar coerentemente antes do próximo
save legado, ou retornar snapshot completo e preservar separadamente edições
locais em andamento. Caso contrário, uma coleção antiga pode ganhar revisão nova.
Polling também não deve descartar intenção pendente. Nunca retry cego de conflito.

## 15. Testes

Plano futuro em ambiente isolado, nenhum teste remoto mutante executado agora:

1. A/B reais authenticated leem snapshot+revision 10; B confirma 11; A usa 10 e
   recebe CONFLICT. Comparar todas as keys/revisão/recibo antes e depois: B intacto.
2. A modifica key A e B key B com base global 10: um sucesso e outro conflito;
   reaplicação em snapshot 11 produz 12 preservando ambos. Sem promoção de base antiga.
3. Multi-key: provocar erro numa key após preparações; nenhum valor, recibo ou
   incremento parcial. Revisão e conteúdo permanecem anteriores.
4. Dois commits simultâneos com expected igual: exatamente um sucesso. Rollback,
   deadlock/timeout e exceções não deixam revisão sem dados correspondentes.
5. SDK com JWT anon, sessão expirada e authenticated: direitos esperados. Tentar
   upsert direto authenticated, helpers e RPC anon: não podem contornar o protocolo.
6. Timeout depois do commit: replay mesmo comando devolve recibo, não incrementa
   duas vezes. Payload diferente com commandId antigo é rejeitado.
7. Leitura simultânea com gravação fornece conjunto e revisão coerentes; BIGINT
   além de MAX_SAFE_INTEGER via string; no-op, key desconhecida/duplicada, limites.
8. Piloto Compras: falha/conflito não aplica array nem publica bus; sucesso confirma
   antes de publicar, saveLegacy não duplica; edição local durante await preservada.
9. Refresh/polling sob intenção pendente, mudança de usuário, evento duplicado,
   reinício do documento e retry após recarga. Mock não substitui prova de RLS/CAS.

Verificação desta etapa documental: fontes/testes preservados por hashes e revisão
de diff. Não executar novamente testes de browser que só confirmam mocks; não
precisa recompilar por mudança exclusivamente Markdown.

## 16. Migration futura

Plano, não arquivo SQL: metadado singleton com BIGINT e recibos técnicos mínimos;
RPC leitura coerente e RPC commit; ACLs, owner/policies de menor privilégio e remoção
dos caminhos diretos de escrita. Não exige version em cada row nem normalizar
coleções. updated_at/trigger atual preservados após conferir definição completa.
Revisão inicial não deve fingir que o banco já possui V10.

Cutover requer backup, inventário de TODOS os writers e bloqueio controlado de
escrita enquanto instala protocolo e atualiza ports. Clientes antigos falham ao
escrever depois do fechamento de DML; não manter fallback upsert para fazê-los
funcionar. App, permissões e metadados devem entrar coordenadamente. Primeiro
resolver autenticação, validar ACLs/trigger bruto e aprovar projeto de segurança.
Nada disso foi aplicado.

## 17. Rollback

Erro de operação: rollback transacional total. Rollback de release: parar novas
escritas, preservar dados mais recentes e recibos/revisão; preferir modo somente
leitura e correção da RPC a restaurar snapshot antigo. Downgrade para upsert antigo
reabre perda silenciosa, portanto não é fallback automático. Só remover metadados
após nenhum writer depender deles e backup validado; reabrir grants antigos exige
decisão explícita de aceitar o risco. Não alterar Auth/Realtime como rollback.

## 18. Riscos

- Sessão/role efetivo em produção não demonstrados; mocks escondem restrições RLS.
- Export SQL detalhado ausente localmente; confirmar ACLs exatas, definição do
  trigger, writers externos e funções em todos os schemas antes de implementar.
- Revisão global gera contenção e conflitos entre keys independentes; payloads
  grandes aumentam latência/locks. Isso é tradeoff aceito, não perda silenciosa.
- DEFINER exige avaliação de owner/policies/autorização, sem privilegiar browser.
- Outro writer administrativo que ignore protocolo invalida CAS; procedimentos de
  manutenção precisam participar ou bloquear o serviço/incrementar revisão atomicamente.
- Recibos têm retenção e fingerprint a definir; expirar recibo limita idempotência.
- Auditoria durável completa/event delivery não resolvidos por bus em memória.
- Realtime não funciona para esta tabela no catálogo informado; polling não é CAS.
- Usuário com DML autorizado ainda pode enviar dados semanticamente errados;
  optimistic locking evita base obsoleta, não substitui validação de domínio.
