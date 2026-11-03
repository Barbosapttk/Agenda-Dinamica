# VERSÃO DE TESTE OFICIAL — B2, B3 e B5 (01/11/2026)

- **162 testes Node aprovados, 0 falhos**: 152 anteriores preservados + 10 novos
  (seis de mapeamento/Próxima Ação e quatro de Compras vinculadas). Nenhuma asserção
  histórica foi removida ou relaxada nesta fase.
- **20 cenários/scripts de navegador aprovados**: 12 scripts existentes, quatro
  variantes de regressão, duas instâncias com PostgreSQL local, Bloco A, Fretes e
  o novo fluxo completo de conexões. Sem regressões finais detectadas.
- B2: abre a cotação única por ID/contexto, preenche somente campos compatíveis,
  limpa ausentes, confirma substituição de rascunho, copia resultado em KG e retorna
  à Solicitação. Alterações no Frete não modificam a origem, etapa ou Próxima Ação.
- B3: formulário existente com descrição inicial; origem por `solicitacaoId`, ACK
  antes de aplicar/publicar, vínculo após reload, reaproveitamento de Compra existente,
  duas criações locais simultâneas sem duplicação, inclusive Compra já concluída.
  Navegação Solicitação ↔ Compra testada. Um ACK atrasado não substitui outro
  formulário aberto enquanto a gravação estava pendente. Sem mudança automática
  de etapa, preço, Próxima Ação ou conclusão.
- B5: criação/edição/data opcional/remoção, reload, texto longo escapado, data inválida
  rejeitada e falha de escrita mantendo ação persistida/formulário. Só reutiliza
  Retorno futuro com referência explícita à Solicitação. Nenhum Retorno é criado.
  Sem ação, não há bloco vazio ou ação inventada. Dashboard resumido preservado.
- Cenário de navegador: Cliente genérico → Solicitação → Próxima Ação → Cotação e
  cópia → retorno → Compra vinculada → reload e prevenção de repetição → edição/
  remoção de ação → Retorno pelo fluxo já existente → acompanhamento → conclusão,
  mantendo o Contato e a Compra com ID da origem. Nenhuma venda ou envio externo.
- Cards de Solicitações verificados em zoom real **80/90/100/110/125/150/175%**,
  claro/escuro, com ação longa, data brasileira e Compra vinculada. Mais viewports
  **375/768/1366px**, incluindo o editor compacto nos dois temas. Sem overflow,
  controles fora dos cards, datas ou botões sobrepostos. Capturas de 100/175%
  inspecionadas visualmente. As matrizes anteriores de Fretes e do Bloco A passaram.
- Build Vite aprovado. Preview de produção aprovado na fundação/iframe, regressão
  geral, piloto Compras e novo fluxo completo. Console sem erros inesperados; falhas
  de escrita simuladas são verificadas como cenários esperados.
- Novos cenários usam cliente/empresa genéricos, CNPJ/telefone fictícios e e-mail
  `example.invalid`. SDK interceptado e PostgreSQL de teste local; nenhum dado
  comercial foi inserido/consultado no Supabase real. Fixtures/configuração de
  remetente preexistentes foram preservadas.
- Persistência legacy e coleções existentes, sem SQL novo, RPC/CAS, revisão global,
  receipts, login ou integrações externas. Campos seguem no backup/restauração/
  exclusão existentes. Não se declara proteção de concorrência entre navegadores.
- Contratos e limites em [VERSAO-TESTE-OFICIAL.md](VERSAO-TESTE-OFICIAL.md).
  Logs `test-results/oficial-*`, matriz `sol-conexoes-matrix.json` e capturas
  `sol-conexoes-*`. Status/diff/stat conferidos; alterações anteriores e ZIP preservados.
- **Congelada para os testes oficiais de 03/11/2026**, salvo bugs críticos.
  Sem B4 ou novas melhorias. Commit: NÃO. Push: NÃO. Publicação: NÃO.

# Bloco B1 revisado — Fretes dentro da Central

- **152 testes Node aprovados, 0 falhos**: 142 anteriores + 10 novos de
  transportadoras. CRUD, IDs, nomes iguais, dados parciais, pesquisa, preservação
  de texto/observações, confirmação, no-op/colisão, falha sem aplicação, backup anterior e
  mapeamento do snapshot. Suíte inclui PostgreSQL WASM isolado.
- **19 cenários/scripts de navegador aprovados**: 12 scripts históricos,
  quatro variantes (fundação, identidade, piloto Compras e observação de Propostas),
  duas instâncias Chrome + PostgreSQL local, regressão do Bloco A e novo B1.
- Testes de navegação/layout verificam sete cards/entradas, com Fretes na terceira
  posição, sem Cotação independente. O conteúdo e percurso das outras ferramentas
  permanecem. Cotação mantém extração/validação/clipboard, entrando por Central →
  Fretes. Asserções verificam ausência de aba/entrada lateral, seção única, retorno
  à Central e foco no card Fretes. Nenhum teste removido ou asserção comercial relaxada.
- B1 verifica navegação/teclado, montagem única da cotação e ausência de atalhos
  órfãos, KG, cópia integral, seleção por foco/clique real de CNPJ/CEP/dimensões,
  cadastro/edição/pesquisa/exclusão/recarga, submissão repetida, confirmação de nomes
  iguais, falha com formulário preservado e inclusão no backup. Links oficiais dos
  Correios abriram targets reais em novas guias; a Agenda permaneceu aberta.
- Fretes: 42 combinações de zoom real do Chrome (80%, 90%, 100%, 110%, 125%, 150%,
  175%) com três seções e dois temas. Mais 24 combinações de viewport
  (375/768/1366/1440px), seção e tema. Sem overflow global, campos/botões fora da
  tela ou conteúdo deslocado abaixo da área útil. Capturas claro/escuro em
  100/175% inspecionadas visualmente. Inputs mantêm rolagem nativa de texto longo;
  barra principal/de ações mantém sua rolagem própria em telas estreitas.
- Build Vite aprovado; preview de produção aprovado com entrada React → iframe →
  bootstrap e cenário B1 completo, incluindo a matriz de zoom e CRUD. Console sem
  exceções ou erros inesperados; a falha de escrita simulada é esperada e verificada.
- Transportadoras usa `secta_transportadoras` na tabela existente, pelo Repository,
  sem armazenamento paralelo. Modo continua legacy. Port e fonte SQL inativos
  reconhecem a chave adicional, sem ativação RPC/CAS ou aplicação remota.
- Backup/restauração/exclusão cobrem 12 coleções + tema. JSON v1 pré-B1 continua
  legível, mostrando zero transportadoras antes de confirmar a substituição.
- Detalhes em [FRETES-B1.md](FRETES-B1.md). Logs, matrizes e capturas em
  `test-results/b1-*`. Supabase remoto não utilizado; dados e SDK simulados.
- Alterações locais anteriores e ZIP preservados. B2–B5: não implementados.
  Commit: NÃO. Push: NÃO. Publicação: NÃO.

# Consolidação do Bloco A — 31/10/2026

- Suíte Node completa: **142 aprovados, 0 falhos** (128 anteriores preservados +
  14 novos em `tests/consolidation.test.mjs`). Inclui integração com PostgreSQL
  WASM isolado, sem uso do Supabase real. Nenhum teste anterior foi removido ou
  teve asserção relaxada.
- Doze scripts existentes de navegador aprovados: regressão geral, formulários,
  frete/tamanhos, notas, textos, venda/tamanhos, serviço, cópias, entrada inteligente,
  biblioteca, layout de ferramentas e navegação.
- Quatro variantes adicionais de regressão aprovadas: `--foundation`, `--identity`,
  `--compras-pilot`, `--propostas-observacao`.
- `atomic-browser-checks.mjs`: aprovado com duas instâncias Chrome e PostgreSQL
  local. Não houve alteração/ativação remota de migrations ou do modo legacy.
- Novo `consolidation-browser.mjs`: aprovado no desenvolvimento e no preview de
  produção. Cobre telefone, e-mail/canal opcionais, texto/códigos, edição de datas,
  datas inválidas, seleção/resumo/cancelamento e confirmação real da restauração,
  proteção anterior, recarga, cancelamento/exclusão e preservação de chaves alheias.
  Amostra frames durante consulta de sessão atrasada em 1,2 segundo: sem flash de login.
- Zoom **real** do Chrome em 80%, 90%, 100%, 110%, 125%, 150%, 175%, nos dois temas:
  112 combinações dos oito caminhos testados. Dashboard inclui Compras;
  Solicitações inclui Propostas; Agenda inclui Retornos; Clientes inclui contatos
  e histórico vinculado. Também cobre Recorrentes, Vendas, Histórico e Ferramentas.
  Mais 48 combinações de viewport (375/768/1366px), módulo e tema. Sem overflow
  horizontal da página, controles fora dos cards ou conteúdo deslocado abaixo
  da tela; datas estruturadas sem ISO visível. Barra de ações e tabelas mantêm
  rolagem horizontal própria quando necessária, sem rolagem global da página.
- O teste ampliado identificou e corrigiu conflito antigo da barra de ações:
  min-height da lateral e flex-basis de 190px empurravam o conteúdo em zoom alto.
  Capturas dos temas claro/escuro em 100/175% foram inspecionadas visualmente.
- Build Vite aprovado; preview de produção também passou pela fundação completa,
  incluindo entrada React → iframe → bootstrap, e pela consolidação. Sem exceções
  ou erros inesperados de console nesses cenários. Artefatos em `test-results/`.
- Datas concretas estruturadas: DD/MM/AAAA; com horário: DD/MM/AAAA HH:mm.
  Competência mensal permanece mês/ano; timestamps técnicos do JSON continuam ISO;
  textos livres não são reescritos para interpretar datas inseridas pelo usuário.
- Escopo, formato JSON v1, restauração, proteção, exclusão e inventário de todas as
  persistências em [CONSOLIDACAO-BLOCO-A.md](CONSOLIDACAO-BLOCO-A.md).
- Limite preservado: modo legacy não possui CAS entre navegadores. Escrita remota
  sem resposta/rollback não confirmado exige recuperação; não se anuncia sucesso.
- Bloco B: não implementado. Commit: NÃO. Push: NÃO. Publicação: NÃO.
  O histórico de publicação abaixo é de fases anteriores.

# Revisão de 08/10/2026

- Corrigido o acesso ao bloco removido `dash-historico`, que interrompia a atualização do Painel e das compras.
- Atualizações de compras renderizam diretamente sua própria lista, sem depender da renderização completa do Painel.
- Interface renomeada para “Solicitações enviadas para compras”; chaves e registros existentes foram preservados.
- Login temporariamente desabilitado por `LOGIN_HABILITADO = false`. Sessões existentes são preservadas; acesso sem sessão não altera permissões no Supabase. Botão Sair oculto e sincronização automática permitida sem login na interface.
- Inicialização adiada até `DOMContentLoaded` para garantir disponibilidade dos scripts complementares.
- `node tests/browser-regression.mjs --compras`: passou, com inclusão, edição, mudança de status, recarga, conclusão, exclusão, acesso automático sem login e nenhuma exceção JavaScript. SDK Supabase simulado; não valida permissões reais do servidor.
- `npm.cmd run build`: passou.
- Regressão geral: compras passaram; interrompida na asserção de exibição da observação após conclusão de proposta, fora do fluxo alterado.
- Publicação autorizada pelo usuário em 08/10/2026 após confirmar o funcionamento. Build final passou antes do envio à branch `main` para deploy automático na Vercel.

# Revisão de 09/09/2026

## Correção da publicação em 10/09/2026

O deploy de `7eba561` falhou com `node_modules/.bin/vite: Permission denied` (código 126). O site público continuou servindo o HTML de `793cf49`, confirmado por comparação de conteúdo. A confirmação de push anterior não comprovava publicação na Vercel.

As dependências geradas foram retiradas do índice Git e incluídas no `.gitignore`, preservando a instalação local. `vercel.json` estabelece instalação limpa com `npm ci`, build Vite e saída `dist`. Instalação limpa em diretório temporário e build passaram; o aviso de allow-scripts do esbuild não impediu esse build.

## Estado anterior

- Executados `git status`, `git diff` e `git log --oneline -5` antes de editar.
- Branch `main`, inicialmente sincronizada com `origin/main`.
- Nenhuma alteração rastreada pendente. O `.gitignore` local não rastreado foi preservado integralmente.
- Últimos trabalhos: `793cf49` (cores) e `7a70484` (kanban de compras e sincronização). Não havia registro explícito de tarefa em execução ou de validação desses trabalhos.
- A aplicação ativa é `public/original-index.html`, exibida pelo iframe React/Vite. A estrutura foi mantida.

## Correções

- Declarada a variável de produto usada nos cards do Painel. Sua ausência interrompia o dashboard quando havia solicitações pendentes.
- Protegida a atualização dos contadores antigos de concluídos, removidos pela reformulação do Histórico. A segunda renderização do Painel deixava de chegar ao kanban de compras.
- Cotações legadas sem status aparecem em Enviado. Conclusão mantém `concluido`, `concluida=true` e a data de atualização; não cria histórico.
- Recusas na conclusão e nas atualizações de propostas atualizam vendas para REPROVADO. Aprovações preservam etapas administrativas avançadas, como faturamento.
- Observações após conclusão são persistidas, reapresentadas no modal e exibidas no card; linhas vinculadas de vendas recebem a observação.
- Filtro administrativo inicia em Todos, sem selecionar silenciosamente Aguardando aprovação.
- Nomes administrativos completos em opções, filtros, badges, tabela e XLSX.
- Cores e ícones por etapa das solicitações; cliente e solicitante destacados; blocos próprios para valor, itens e observações; botões com quebra dentro dos cards.
- Nenhuma alteração de autenticação, configuração/API de persistência, SQL ou Supabase remoto.

## Validações executadas

- `npm.cmd run dev -- --host 127.0.0.1`: Vite disponível em http://127.0.0.1:3000/.
- `npm.cmd run build`: passou; saída rastreada em `dist` atualizada.
- `node tests/browser-regression.mjs`: passou no Chrome, com 14 scripts internos analisados sintaticamente.
- Compras: criar, editar, alternar status, recarregar, concluir e excluir.
- Solicitação: registrar proposta recusada, sair da fila, aparecer em Concluídos, atualizar observação após conclusão e recarregar.
- Vendas: integração, preservação de faturamento, ausência de linha duplicada no fluxo testado e seis rótulos no conteúdo XLSX.
- Clientes: criar, editar, abrir ficha, vincular cliente existente sem duplicação.
- Solicitações: criar pelo formulário e mover nas quatro etapas.
- Agenda: criar e concluir retorno; verificar limites horizontais dos botões dos cards.
- Navegação: Painel, Clientes, Agenda, Recorrentes, Vendas, Histórico e Solicitações.
- Capturas e inspeção visual em 1440, 900 e 600 px, nos temas claro e escuro. Evidências locais em `test-results/`.
- Sem exceções JavaScript nos cenários automatizados.

## Limites e publicação

Os testes usam dados fictícios, com o SDK Supabase interceptado e armazenamento de teste em sessionStorage. Recarregar valida o caminho de serialização/leitura da aplicação, mas não comprova acesso, permissões ou sincronização entre sessões no servidor real. O teste não modifica a autenticação da aplicação; libera apenas a interface na página isolada do Chrome.

Não foi executado o checklist manual completo em sessão autenticada real. Em 10/09/2026, após receber esse resultado e suas limitações, o usuário autorizou prosseguir com a publicação no GitHub. O build de produção foi repetido com sucesso antes do commit. A validação em sessão real continua pendente, principalmente recarga e sincronização. As capturas ficam locais em `test-results/`, ignoradas pelo Git; o código de regressão acompanha a publicação.

Para repetir a regressão, iniciar Vite e Chrome com porta de depuração 9222 em perfil temporário exclusivo, e executar `node tests/browser-regression.mjs`. O teste não requer instalação de dependências adicionais. O ambiente Windows precisou de execução fora do sandbox para iniciar Vite/build por restrição de leitura do esbuild.
