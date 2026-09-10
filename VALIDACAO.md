# Revisão de 09/09/2026

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
