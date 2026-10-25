# Fase 3B — implementação local e transição

Retomada autorizada: [Fase 3C — pré-voo/ativação](phase3c-activation.md).
73 testes, build e preview/regressão revalidados. Nenhuma migration remota
aplicada nesta execução; acesso SQL e Auth real indisponíveis para certificação.
Modo legacy preservado. Inventário de escritores e rollback controlado estão
no novo relatório; o switch global não deve migrar Retornos indiretamente.

## Estado

Implementação local pronta para validação remota, ainda não ativada em produção.
O branch continua main, HEAD 36ca3fb; alterações anteriores preservadas, sem
commit/push/publicação. A integração Supabase continua retornando não instalada
nesta sessão e não há ferramenta SQL remota nem credencial PostgreSQL configurada.
Não foi executada migration ou alteração no Supabase remoto. Nenhum navegador
de produção com sessão inspecionável por CDP estava disponível; o Chrome iniciado
para testes tem perfil isolado, sem tokens reais. Não confundir sua Auth simulada
com uma sessão authenticated real.

PERSISTENCE_MODE='legacy' permanece em application/persistence-config.js. Não foi
ativado login, criado usuário, anonymous sign-in ou alterado o fluxo visual Auth.
O caminho legado continua funcional sob as permissões existentes. `rpc` é
implementado/testado, mas não deve ser ativado antes das verificações abaixo.

## Infraestrutura

Migration: ../migrations/202610080001_agenda_atomic_snapshot.sql.

- agenda_dinamica_metadata: id=1 garantido por PK/CHECK, revision BIGINT inicial
  0, updated_at, enforced=false e rpc_transaction privado. Não muda snapshots.
- agenda_dinamica_command_receipts: command_id PK global, actor_id UUID do servidor,
  session/instance/correlation/causation/event, SUCCESS, revision, timestamp,
  request canônico e resposta confirmada. Sem credenciais. Mesmo comando de outro
  autor ou outra intenção é rejeitado. Replay precede a comparação de revisão.
- agenda_snapshot_load: uma consulta coerente traz todas as rows e revisão como
  string decimal; evita associar snapshot antigo a revisão nova e truncamento por
  paginação do REST. Exige auth.uid e JWT role authenticated.
- agenda_snapshot_commit: valida 12 keys/tipos/contexto, limite de 16 MiB de
  alterações, lock global, CAS, multi-key upsert, incremento único, recibo e
  snapshot de confirmação, tudo na mesma transação. Erros PostgreSQL propagados
  fazem rollback total. CONFLICT não grava/incrementa/cria recibo.
- guard statement BEFORE INSERT/UPDATE/DELETE/TRUNCATE: antes de travar rows,
  trava metadata. Na transição, escritas diretas autorizadas continuam e avançam
  revisão; upsert legado pode avançar duas vezes pelos eventos INSERT/UPDATE.
  Isso não exige revisão sequencial por comando legado. RPC usa marcador de
  transação inacessível ao cliente, incrementando uma vez. Nenhuma GUC forjável
  pode liberar bypass. Requisição anon sem usuário não muda sequer revisão.
- enforced=true: o guard rejeita escrita direta, inclusive se houver regrant
  acidental ou acesso service_role. Não protege contra admin que desabilite
  deliberadamente guard/policies/metadados; manutenção precisa seguir protocolo.

## Segurança

SECURITY DEFINER justificado pela separação de privilégios: a etapa final retira
DML direto do usuário, impossibilitando RPC INVOKER do mesmo usuário de escrever.
Owner dedicado agenda_snapshot_owner é NOLOGIN/NOINHERIT/NOBYPASSRLS, não é
postgres/service_role e não recebe membership aos clientes. search_path vazio,
objetos schema-qualified, keys/tipos conhecidos, parâmetros vinculados, sem SQL
dinâmico ou permissão para outras tabelas. Owner recebe privilégios mínimos e
policies específicas; policies authenticated existentes não são removidas na
migration aditiva. Novas tabelas não concedem privilégios a anon/authenticated/
service_role/PUBLIC. EXECUTE das duas RPCs apenas authenticated; helper em schema
privado sem EXECUTE dos clientes. auth.uid fornece autoria; frontend não envia
actorId como autoridade. Nenhum EXECUTE genérico ou acesso anon criado.
Referência: [Database functions](https://supabase.com/docs/guides/database/functions).

Antes de aplicar no Supabase, confirmar permissões CREATE ROLE/schema/ALTER OWNER
do executor, role sem colisão, definição/ACLs completas e quaisquer writers externos.
Migration aborta se o role já existir; não reutiliza role desconhecido. RLS
habilitado nos novos objetos. Alterações comerciais nenhuma na instalação.

Nova busca em public/src/dist/env identificou apenas chaves públicas anon;
nenhuma service_role/sb_secret identificada. O build novo também foi conferido:
20 arquivos HTML/JS/JSON, uma chave pública anon e nenhuma chave privilegiada.
Nenhum valor de chave/token foi impresso nesta etapa.

## Repository e Compras

atomic-snapshot-port reutiliza o cliente existente, confirma identidade, transmite
revisão como string e devolve SUCCESS/CONFLICT/ERROR. RPC configurada não faz
fallback para upsert se houver erro ou sessão ausente. Bootstrap seleciona o port
explicitamente; o padrão permanece legacy.

Repository mantém revisão+snapshot confirmados, mesma fila local, request original
de tentativas incertas e intenção pendente. Snapshot explícito guarda a revisão
no momento da captura: não recebe versão nova só por esperar na fila. Resposta
contém snapshot coerente; edições legadas em andamento são preservadas. Replay
de recibo antigo conserva sua revisão antiga, garantindo conflito no próximo
save se outro writer já avançou. Não promove estado obsoleto à revisão atual.

Compras prepara antes, aguarda RPC, aplica estado e só depois publica bus. Retry
usa candidato/eventId original; sucesso local repetido não escreve/publica outra
vez. Evento usa eventId e persistedAt confirmados pelo servidor. CONFLICT mantém
formulário e candidato, sem bus/sucesso/fechamento. Botão de recuperação pede
confirmação para carregar estado atual, conserva campos do formulário, descarta
tentativa rejeitada explicitamente e cria nova intenção na próxima gravação.
Não há retry cego de conflito ou merge automático de arrays.

load automático não apaga intenção pendente; reloadForRecovery é explícito.
discardPendingWrite em modo RPC exige essa recuperação. Timeout preserva request
para repetir commandId e obter recibo, sem segunda gravação. Journal em memória
não sobrevive a encerramento da aba; recuperação durável do cliente e outbox são
limitações separadas, não garantias implementadas.

## Validação

PGlite 0.5.8 foi adicionado SOMENTE como devDependency. Os testes executam SQL
PostgreSQL real em WASM com roles/RLS/trigger/transaction, em dados sintéticos.
É um backend embutido serializado; não prova contenção entre conexões PostgreSQL
remotas independentes nem Supabase Auth/PostgREST de produção.

- Testes de fundação, Compras, identidade, caracterização e SQL/Repository:
  **73 testes passaram** (58 anteriores + 15 novos),
  incluindo A/B, multi-key rollback, replay, ator, auth ausente, BIGINT, bypass,
  timeout após commit, snapshot antigo na fila e replay após commit de outro writer.
- Duas instâncias Chrome isoladas → SDK/Auth interceptados → servidor de testes
  local → PostgreSQL WASM: V10, B grava V11, A recebe CONFLICT, formulário aberto,
  recuperação explícita e V12 preservando venda. Passou em dev e preview.
  A recuperação de conflito em ações de card também é acessível fora do formulário.
  Os testes de card confirmaram conflito e reaplicação nas revisões 13/14, em dev
  e no preview do build final.
- Regressão geral de navegador: propostas, observações, vendas/XLSX, clientes,
  solicitações, agenda, histórico, navegação e temas passou com SDK simulado.
- Piloto Compras passou em dev e preview; build em node_modules/.cache, dist
  publicado anterior preservado. Nenhuma requisição mutante foi enviada ao Supabase.

Comandos reproduzíveis:

```powershell
node --test tests/architecture-foundation.test.mjs tests/compras-service.test.mjs tests/identity-context.test.mjs tests/concurrency-characterization.test.mjs tests/atomic-snapshot-db.test.mjs
node tests/atomic-browser-server.mjs
# Em outro terminal, com Chrome de teste isolado/CDP 9222 e Vite 3000:
node tests/atomic-browser-checks.mjs
node tests/browser-regression.mjs --compras-pilot
node tests/browser-regression.mjs
```

## Cutover pendente — ordem obrigatória

1. Disponibilizar acesso Supabase autenticado nesta sessão e conferir catálogo,
   todos os writers/keys/ACLs e payloads reais frente ao limite de 16 MiB.
2. Aplicar/testar migration aditiva primeiro em staging sem reescrever dados.
   Exige revisão das permissões do owner no Supabase gerenciado.
3. Verificar sessão REAL pelo diagnóstico seguro
   `AgendaApplication.repositories.auth.inspectAccess()` e getUser. Sem sessão
   authenticated, manter legacy e documentar bloqueio; não abrir policy anon.
4. Validar RPC isolada, atomicidade/idempotência e duas conexões/navegadores reais
   autenticados em staging. Depois testar Compras e regressão em modo rpc.
5. Migrar TODOS os writers, inclusive saveLegacy e qualquer cliente administrativo.
   Todos neste documento usam RPC quando o bootstrap está em modo rpc; código
   legado de upsert continua preservado para transição até fechamento.
6. Deploy coordenado de persistence-config='rpc', confirmar leitores/writers reais.
   Durante essa janela `protected=false`: legado ainda pode sobrescrever; bridge
   apenas faz seu write avançar revisão, não compara sua intenção antiga.
7. SOMENTE após esses gates executar ../rollout/activate_atomic_snapshot.sql.
   Script separado, não migration automática: lock da tabela, enforced=true,
   revoke DML direto; policies/SELECT existentes mantidos. Testar bypass depois.

Não anunciar proteção de produção antes do último passo. Código protegido não
usa fallback legado. RPC TRUE sem aplicação remota ou sem usuário não é habilitada.

## Rollback e limites

Falha transacional não deixa valores/revisão/recibo parciais. Falha no rollout
final: manter dados mais novos, preferir somente leitura e correção; não restaurar
snapshot antigo nem reabrir upsert automaticamente. Reversão de infraestrutura
exige backup, parar writers e preservar recibos/revisão antes de remover objetos.
Não existe migration destrutiva de rollback automática.

Recibos guardam a resposta completa do snapshot para replay coerente. Isso duplica
dados comerciais após comandos e requer retenção/controle de tamanho antes de
uso prolongado; nenhum segredo é incluído. Não é auditoria/outbox de eventos.
RLS atual compartilha dados entre authenticated, sem tenant; esta fase não cria
isolamento que não existe. Realtime segue inalterado/fora da publicação fornecida.

Fase 3B permanece PARCIAL: implementação/testes locais feitos; aplicação remota,
autenticação real, concorrência Supabase, deploy/migração e fechamento de legado
pendentes por indisponibilidade do acesso. Nenhuma alteração remota foi tentada.
