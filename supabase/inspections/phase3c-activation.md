# Fase 3C — pré-voo e ativação pendente

Pré-voo: 08/10/2026 21:18:48 America/Sao_Paulo (09/10/2026 00:18:48 UTC).
Autorização remota recebida. **Fase NÃO concluída. Migration NÃO aplicada por
esta execução; modo final legacy.** Nenhuma escrita remota ou dado comercial alterado.
Não houve commit, push, publicação, mudança visual, Auth ou Realtime.

## 1. Acesso e motivo do bloqueio

A consulta de integrações nesta etapa retornou Supabase `installed: false`.
Não há ferramenta Supabase/PostgreSQL SQL, projetos ou migrations disponível.
Supabase CLI e psql não estão no PATH. SUPABASE_ACCESS_TOKEN,
SUPABASE_DB_PASSWORD, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, PGHOST e PGPASSWORD
não estão configurados no processo. O levantamento anterior também não encontrou
credenciais/vinculação nos locais usuais. Não solicitar credenciais pelo chat nem
usar o token Vercel como conexão de banco. Integração já foi sugerida anteriormente;
não repetir instalação como se a conexão informada pelo usuário fosse inválida.

**AINDA DESCONHECIDO:** vínculo administrativo, estado de migrations no projeto
real, backup/branch remoto disponível, sessão authenticated de produção e estado
atual dos objetos. Esta limitação é do acesso exposto ao agente nesta sessão,
não da autorização do usuário. Reabrir/atualizar a sessão com as ferramentas da
integração Supabase disponíveis é o requisito mínimo para continuar automaticamente.
Não solicitar exportação manual do SQL Editor.

## 2. Classificação das evidências

| Classe | Evidência desta execução |
|---|---|
| CONFIRMADO NO SUPABASE REAL | Nenhuma nova inspeção SQL ou aplicação de migration nesta etapa |
| CONFIRMADO NO CÓDIGO | Default legacy, cliente público anon, writer único por tabela, 12 keys, RPC opcional, confirmação antes do bus |
| CONFIRMADO EM TESTE REAL | Execução local do PostgreSQL WASM com roles/RLS/transações; NÃO equivale a Supabase remoto |
| SIMULADO | SDK/Auth dos testes browser; dados sintéticos, sem sessão/token real |
| AINDA DESCONHECIDO | SQL remoto atual, Auth real, objetos instalados, integridade antes/depois, concorrência remota, backup e writers externos |

O schema fornecido pelo usuário na etapa de design é evidência histórica:
key TEXT PK, value JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
trigger set_updated_at, RLS habilitado/não forçado, policies authenticated,
nenhuma anon, tabela fora da publicação Realtime. Não tratar isso como nova
certificação do banco atual. Nenhuma linha comercial foi exportada ao repositório.

## 3. Migration revisada integralmente

Arquivo: ../migrations/202610080001_agenda_atomic_snapshot.sql.
Não contém DROP/TRUNCATE/DELETE ou UPDATE de snapshots executado na instalação.
O INSERT/UPDATE comercial dentro da RPC é código de função, não executado pelo
CREATE FUNCTION. A única linha inicial inserida é metadata id=1/revision=0.

| Categoria | Objetos/efeitos previstos |
|---|---|
| Novos objetos | Role agenda_snapshot_owner; schema agenda_dinamica_internal; metadata; command_receipts; load/commit RPCs; helper guard |
| Constraints/índices | PK id e CHECK id=1/revision>=0; PK command_id e limites/status de receipt; índices únicos implícitos das PKs |
| Defaults | Timestamps now(), enforced=false; metadata revision inicial 0 |
| Tabela existente | GRANT SELECT/INSERT/UPDATE ao owner dedicado; policy agenda_snapshot_rpc_owner; trigger statement agenda_snapshot_write_guard |
| Objetos existentes preservados | Tabela, rows, colunas, PK, trigger de updated_at, policies authenticated e publication |
| Novos privilégios | Owner dedicado mínimo; EXECUTE das RPCs apenas authenticated; RLS nos novos objetos; nenhum grant dos novos objetos aos clientes |
| Anon/service_role | Sem acesso novo às RPCs; nenhum segredo no browser; helper privado |
| Legado | DML direto autorizado mantido na migration aditiva; bridge avança revisão, sem fechar grants existentes |

SECURITY DEFINER/owner dedicado é necessário para o posterior fechamento de DML
direto sem impedir a RPC. Role NOLOGIN/NOINHERIT/NOBYPASSRLS; search_path vazio,
objetos qualificados, auth.uid/JWT autenticado, whitelist de 12 keys/tipos e nenhum
SQL arbitrário. Novas policies ao owner precisam ser confrontadas com USING/
WITH CHECK originais para não ampliar autorização além do compartilhamento atual.
Não habilitar Realtime. O arquivo ../rollout/activate_atomic_snapshot.sql **não**
é parte desta instalação e não foi executado.

Gates anteriores à aplicação: catálogo/ACLs brutos, colisões de nomes/role,
privilégios CREATE ROLE/schema/ALTER OWNER no Supabase gerenciado, trigger original,
inventário de todas as keys reais e tamanho dos payloads frente ao limite de 16 MiB.
Não afirmar compatibilidade remota apenas pelo teste PGlite.

## 4. Estado anterior, integridade e isolamento dos testes

Antes de aplicar com acesso administrativo, guardar metadados de catálogo/ACLs
em relatório sem secrets e colher comparação key/updated_at/hash de value no
servidor, sem imprimir ou exportar value. Comparar o mesmo inventário após a
migration; controlar escritas legítimas concorrentes para não confundir mudança
do usuário com efeito da instalação. Nesta execução quantidade/keys/timestamps/
hashes reais não puderam ser obtidos. Não afirmar dados remotos intactos por inspeção;
afirmar que esta execução não enviou alteração ao projeto remoto.

Nenhum mecanismo de backup/branch remoto está acessível; não afirmar ausência
de backups no Supabase. Rollback previsto é estrutural, preservando snapshot atual,
não restauração de dados antigos. Confirmar backup/branch seguro quando houver acesso.

**Não executar testes SUCCESS/Compras nos snapshots comerciais.** A whitelist
real não permite inventar test_key para isolar dados. Usar projeto/branch staging
isolado no Supabase com fixtures sintéticas e usuários já autorizados, sem criar
usuário automaticamente ou restaurar backup comercial sobre produção. Uma
transação SQL que é revertida pode validar rollback no servidor, mas não substitui
teste browser/RLS/Auth multi-transação. Sem staging disponível, não realizar
SUCCESS multi-key em produção para depois tentar desfazê-lo.

## 5. Escritores no código

L12 = as 12 keys listadas em concurrency-design.md. L11 = L12 sem
secta_cotacoes_compras quando Compras não difere do confirmedSnapshot; se difere,
saveLegacy envia L12. **Keys afetadas pela regra de negócio não são o write-set:**
um save de tema/contato pode reenviar vendas/histórico/clientes não alterados.

| Escritor → função | Módulo | Dados diretamente afetados | Write-set atual | Estado |
|---|---|---|---|---|
| salvarCotacaoCompras → adapter.save → ComprasService.criar/editar → commitCollection | Compras | secta_cotacoes_compras | 1 key ou zero no-op | Repository; port legado por default, RPC preparado/inativo |
| alterarStatusCotacaoCompras/concluirCotacaoCompras/excluirCotacaoCompras → Service | Compras | secta_cotacoes_compras | 1 key ou zero | Mesmo piloto preparado/inativo |
| salvarCliente/excluirCliente/criarClienteFromSolicitacao/usarClienteExistenteSolicitacao | Clientes/vínculo de solicitações | clientes, vínculos de solicitações e históricos | L11/L12 via saveLegacy | Legado |
| salvarContato/apagarContato/salvarEdicao | Contatos/histórico | contatos, histórico/vínculos conforme comando | L11/L12 | Legado |
| salvarSolicitacaoOrcamento/excluirSolicitacaoOrcamento/excluirSolicitacaoEditandoAtual/moverSolicitacaoEtapa/toggleFixarSolicitacao | Solicitações | solicitacoesOrcamento | L11/L12 | Legado |
| marcarSolicitacaoFeita/reabrirSolicitacaoConcluida/confirmarConclusao | Solicitações/conclusões | solicitações, concluidos, histórico, vendas, conforme branch | L11/L12 | Legado |
| aplicarStatusProposta/excluirPropostaAcompanhamento/salvarEdicaoProposta | Propostas, HTML + requests-revision.js | fontes contatos/concluídos, propostas e vendas | L11/L12 | Legado |
| registrarLinhasControleVendas/atualizarStatusPedidoControle/excluirLinhaControleVendas/deduplicarControleVendasPorProposta | Vendas | controleVendas e vínculos nas fontes | L11/L12 | Legado |
| salvarAgendamento/excluirAgendamento/confirmarConclusao/adiarAlarme | Retornos | agendamentos e efeitos da conclusão/histórico/vendas | L11/L12 | Legado; NÃO migrado nesta fase |
| salvarOrcamento/excluirOrcamento/confirmarConclusao | Recorrentes | orcamentos/concluidos/efeitos relacionados | L11/L12 | Legado |
| dispararProximoAlarme/registrarAlarmeTratado/limparAlarmesAntigos/adiarAlarme | Alarmes | alarmedIds e possíveis agendamentos | L11/L12 | Legado |
| salvarOpcaoProduto/excluirOpcaoProduto | Catálogo, requests-revision.js | produtosSolicitacoes | L11/L12 | Legado |
| applyTheme(shouldSave=true) | Preferência | secta_theme | L11/L12 | Legado |
| resetarTodosDados | Administração | múltiplas coleções | L11/L12 | Legado; nunca executar como teste de integridade |
| Repository.save(snapshot) | API genérica de infraestrutura | snapshot explícito | L12 | Port legado; RPC opcional |
| LegacyUiAdapter.writeSnapshot/originalPersist/persistirDadosSupabase original | Port interno | rows filtradas por collections ou todas | Único upsert SDK da tabela | Mantido para transição; chamada direta contorna fila |
| atomic-snapshot-port.write → agenda_snapshot_commit | Port novo | collections do Repository | 1..12 keys | Preparado, inativo por default |
| prepararAnexosParaSalvar/uploadAnexo + AttachmentRepository.prepare | Storage/anexos | bucket agenda-dinamica-anexos + referências no snapshot | Storage fora do CAS; metadados pelas coleções acima | Não migrado; não é writer independente dessa tabela |

Referências: HTML writer:5489, debounce:5529, saveLegacy no adapter:48,
bootstrap:28-33, STORAGE_KEYS:5190, requests-revision.js:74/80/178.
Há múltiplas definições/wrappers de algumas funções no HTML: a tabela agrupa por
nome e todos convergem para save. Chamadas doc.save de PDF não escrevem Supabase.
Não foi encontrado segundo upsert/RPC de snapshot nos fontes. src/lib/supabase.js
não é importado pelo caminho ativo. Workers/apps/admin SQL externos permanecem
desconhecidos sem inspeção remota; não declarar inventário global completo.

**Atenção ao switch:** persistenceMode='rpc' no bootstrap afeta o Repository
inteiro, incluindo saveLegacy dos demais módulos. Não é um switch exclusivo de
Compras. Isso requer testes específicos/escopo antes da ativação global; não
ligar esse switch para migrar Retornos indiretamente nesta fase. Nenhum desses
writers foi migrado ou alterado por esta execução. Não fechar o legado enquanto
existirem writers legítimos não validados, inclusive externos.

## 6. Revalidação local nesta etapa

- 73/73 testes passaram novamente: fundação, Compras, identidade, Repository,
  CAS PostgreSQL WASM, idempotência, multi-key e rollback. Nenhuma asserção alterada.
- Build passou em node_modules/.cache/agenda-phase3c-build, dist preservado.
- Preview 3001: piloto Compras e regressão geral passaram com SDK/Auth simulados.
- Busca em 55 arquivos de código/build/dist/env: apenas JWTs públicos anon;
  nenhuma credencial service_role/sb_secret identificada, valores não impressos.
- Teste Chrome A/B remoto nesta etapa: **NÃO EXECUTADO**. A prova Chrome/PGlite
  anterior continua local/simulada, não atende esse critério remoto.
- Produção real: leitura/navegação/criação/edição/console **NÃO VERIFICADOS**;
  os testes acima são preview isolado. Nenhuma criação de dados em produção.

## 7. Estado dos critérios remotos

| Critério | Resultado remoto desta execução |
|---|---|
| Migration aplicada/data/hora de aplicação | NÃO aplicada por esta execução; sem timestamp de aplicação |
| Metadata, receipts, RPCs e owners/ACLs | NÃO validados remotamente; estado atual desconhecido |
| Revision inicial | 0 previsto no código; não confirmado no projeto real |
| Auth authenticated real/actorId | NÃO confirmado; não afirmar que não há sessão |
| RLS/policies | Evidência SQL histórica; não recertificadas nem alteradas nesta etapa |
| SUCCESS/CONFLICT/ERROR | NÃO testados remotamente |
| Idempotência/multi-key/rollback | Validados localmente; NÃO no Supabase real |
| Compras protegida | NÃO ativada em produção |
| Dois navegadores remotos/última alteração preservada | NÃO testados |
| Repository/estado final | LEGACY |
| Retornos | NÃO migrado |
| Realtime | Inalterado; polling/foco mantidos |
| Bloqueio final do legado | NÃO executado |

## 8. Rollback controlado

Nada remoto foi aplicado nesta execução, portanto não há rollback remoto a
executar agora. O roteiro abaixo serve apenas para eventual instalação futura.

**Antes do bloqueio final:** default já é legacy e enforced=false. Desativar piloto
RPC mantendo instalação aditiva não muda dados; porém legacy continua sem CAS.
Se a causa for risco de consistência, impor janela de manutenção/somente leitura
na entrega da aplicação, não simplesmente liberar last-write-wins. Não automatizar
fallback após erro/conflito; preservar candidatos e recibos.

**Depois do bloqueio final:** manter enforced=true e revokes. Suspender escritores
na entrega/serviço; corrigir RPC ou servir aplicação em manutenção. Alterar o
bootstrap para legacy sozinho NÃO reabre DML, e não constitui rollback funcional
de escrita: requests serão rejeitadas pelo guard, e UI legada pode avisar sucesso
antes do await. Não apresentá-la como modo somente leitura sem bloquear ações.
Para voltar a escrita legacy seria necessária decisão explícita de aceitar perda
da proteção ou outro protocolo equivalente; não faz parte do rollback automático.

**Remoção estrutural, se necessária:** impedir TODAS as escritas e ter backup
seguro fora do repositório de metadata/receipts; preservar snapshot comercial mais
recente. Remover apenas RPCs criadas, trigger agenda_snapshot_write_guard, policy
agenda_snapshot_rpc_owner, helper privado, metadata/receipts, schema privado e
privilégios do owner dedicado, nessa ordem de dependências e numa transação revisada.
Remover role por último, somente sem dependências/memberships. Não usar CASCADE,
DROP OWNED genérico ou DROP da agenda_dinamica_storage; não remover trigger de
updated_at nem policies anteriores. Restaurar somente ACLs estruturais que tenham
sido capturadas antes da instalação, nunca inventar GRANT ALL para anon.
Sem ACLs/backup brutos, não gerar/executar reversão destrutiva. Não apagar recibos
enquanto houver retry em andamento; eles contêm respostas comerciais para replay.
Após remover guard, manter manutenção/leitura até haver persistência consistente
alternativa. Não restaurar snapshot antigo sobre atual.

## 9. Próximo passo e limites

Disponibilizar ferramentas autenticadas Supabase nesta sessão. Depois: catálogo,
backup/branch e isolamento → migration aditiva → inventário pós-instalação e
integridade → Auth real → RPC de teste em staging → Repository/Compras por escopo
→ dois browsers authenticated reais e multi-key → validação de todos os writers
→ somente então default protegido/bloqueio final. Nenhum segredo no chat.

Riscos pendentes: owner/grants no Supabase gerenciado; definições RLS completas;
keys/payloads reais; writers externos; switch global; retenção de recibos completos;
Auth; staging isolado; concorrência de conexões reais e integridade remota.
Retornos é candidato à fase posterior **após** esses gates; não iniciar sua migração
como substituto da Fase 3C bloqueada. Esta fase continua não concluída.
