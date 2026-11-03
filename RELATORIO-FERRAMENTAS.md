Atualização B1 — Fretes

Versão de Teste Oficial (01/11/2026): a Solicitação agora pode abrir a cotação
existente com preenchimento inicial e retorno à origem. Não há nova ferramenta,
cálculo ou integração externa. Compras vinculadas e Próxima Ação estão descritas
em [VERSAO-TESTE-OFICIAL.md](VERSAO-TESTE-OFICIAL.md). Escopo congelado para 03/11.

Decisão revisada: Fretes pertence à Central de Ferramentas, sem aba principal ou entrada lateral. Central e dropdown apresentam sete ferramentas, nesta ordem: Venda, Serviço, Fretes, Textos Rápidos, Tamanhos, Anotações e Tabelas de Referência. Fretes reúne Cotação, Transportadoras e os links oficiais dos Correios, com o mesmo cabeçalho/retorno das outras ferramentas. Cotação não tem card separado; implementação única, dados, cálculos e demais ferramentas preservados. Transportadoras mantém a persistência existente e inclui observações opcionais. Detalhes em [FRETES-B1.md](FRETES-B1.md). Os registros abaixo descrevem etapas anteriores.

Agenda Dinâmica — evolução das ferramentas (28/10/2026)

Tamanhos: gerenciamento migrado para a própria Tabela de Tamanhos, em uma seção recolhível e compacta antes dos resultados. A interface antiga não é mais montada em Configurações. O catálogo singleton, a chave agenda-tool-sizes-v1, as validações, os campos e a persistência foram preservados. Consulta, busca, filtros, cópia, criação, edição, exclusão e recarga foram verificados.

Nova Solicitação: destaque âmbar substituído por vermelho na borda superior, no botão principal, nos ícones, no foco e no acento da descrição. Produto e tipo de orçamento recebem mais largura; datas e seleções usam trilhas próprias. Espaçamentos, labels, anexos e ícone da busca foram revisados. O painel continua opaco, com o cabeçalho, o fechamento e o rodapé aprovados na etapa anterior. Testes verificam limites dos campos, posição dos labels e separação entre ícone e texto.

Textos Rápidos: botão Novo texto, título, mensagem, destinatários e categoria. Criação, edição, exclusão, visualização integral, busca e um único botão de cópia por modelo. A chave de overrides existente é reutilizada; modelos padrão, edições anteriores e conteúdos comerciais fornecidos são preservados. Exclusão de um modelo padrão permanece após recarregar. Falhas de armazenamento não confirmam alterações e dados corrompidos bloqueiam gravação, sem substituí-los silenciosamente.

Tabelas de Referência: sétima ferramenta da Central e do dropdown, com o mesmo cabeçalho compartilhado. Permite título, descrição opcional, imagem PNG/JPEG/WebP/GIF de até 15 MB, busca, visualização, ajuste à tela, tamanho original, zoom, edição, substituição da imagem e exclusão com confirmação. Imagens ficam no IndexedDB do navegador, sem conexão com o banco comercial. Imagens inválidas são rejeitadas; título e descrição são exibidos como texto. O zoom permite rolagem dentro do visualizador, sem alargar a página.

O anexo recebido contém apenas texto. As imagens da matriz de alíquotas e dos estados não estavam disponíveis para importação. A ferramenta está pronta para cadastrá-las; nenhum valor de alíquota foi inventado e a lista de estados não virou regra comercial. Não foram cadastradas imagens fictícias de referência. As imagens usadas nos testes existem somente no navegador isolado de testes e foram excluídas ao final.

Ortografia: aproximadamente 103 ocorrências corrigidas em placeholders e mensagens. Exemplos usam Ex.: e dados genéricos; frases começam com maiúscula, siglas como CNPJ/CEP/PDF e o símbolo R$ foram preservados. Títulos, menus, campos, mensagens, ferramentas e exemplos foram auditados. Não foi aplicada capitalização aos registros comerciais nem alterados os textos operacionais fornecidos para cópia. Nenhum exemplo realista adicional foi identificado na camada de exemplos revisada; conteúdo comercial real e dados do usuário continuam preservados.

Validação final:
- 128 testes Node executados, 128 aprovados, zero falhas.
- 16 rotinas de navegador aprovadas: regressão principal, fundação, piloto de Compras, identidade, persistência atômica, Textos Rápidos, Anotações Rápidas, ferramentas de serviço, frete/tamanhos, cópia de tamanhos, entrada numérica, navegação, cabeçalhos, venda/gerenciamento de tamanhos, formulários e bibliotecas.
- Claro: OK. Escuro: OK. Desktop 1440 px: OK. Notebook 900 px: OK. Mobile 375 px: OK.
- Novos testes de imagem incluem rejeição de arquivo inválido, persistência e verificação dos pixels da imagem substituída após recarregar.
- Build de produção aprovado. Dist atualizado.
- Os testes usaram navegador isolado, Supabase simulado e, na suíte atômica, PostgreSQL local. Nenhum banco comercial remoto foi modificado; upload ao Supabase real não foi executado.

Os testes antigos foram preservados. As expectativas de navegação passaram de seis para sete ferramentas; a edição de tamanhos passou a ser procurada dentro da ferramenta; placeholders passaram a seguir a nova orientação de capitalização. Permanecem as asserções de cópia, cálculos, CRUD, persistência e ausência de overflow. Novas asserções cobrem exclusão de textos, ausência do gerenciamento em Configurações e espaçamento da Solicitação.

Git: alterações anteriores integradas; status, diff e diff --check revisados. Commit: NÃO. Push: NÃO. Publicação: NÃO.
