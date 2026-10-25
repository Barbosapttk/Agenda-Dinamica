// Fonte: transcrição fornecida no pedido; DOCX original indisponível.
export const QUICK_TEXTS = [
  {
    "id": "texto-1",
    "title": "CONDIÇÕES COMERCIAIS",
    "category": "E-mails",
    "recipients": [],
    "body": "Prazo de entrega de xx dias.\n\nValores com IPI e DIFAL já inclusos.\n\nProposta válida por 15 dias."
  },
  {
    "id": "texto-2",
    "title": "SOLICITAÇÃO DE COTAÇÃO",
    "category": "E-mails",
    "recipients": [
      "compras@sectasystem.com.br",
      "compras02@sectasystem.com.br",
      "suprimentos@sectasystem.com.br"
    ],
    "body": "Box xxxx Prezados,\n\nSolicito cotação para o material xxxxx conforme requisição em anexo."
  },
  {
    "id": "texto-3",
    "title": "ENVIO DE ORÇAMENTO / PROPOSTA COMERCIAL",
    "category": "E-mails",
    "recipients": [],
    "body": "Bxx xxxxx xxxxx !\n\nConforme solicitado, segue em anexo Orçamento de Serviço/Proposta Comercial XXXX referente xxxxxxxxxxx.\n\nCondições Comerciais:\nModelo de Frete: CIF / FOB – Transportadora XXXXX – XX dias uteis/útil\nForma de pagamento: xx Parcelas xx / xx dias via Boleto Bancário (sujeito a análise de credito)\nOrçamento/Proposta vigente por 15 dias ou conforme disponibilidade de estoque.\n\nCaso as propostas estejam de acordo, sinalize o quanto antes para xxxx reservarmos os itens e solicitarmos\nexpedição xxxx reservarmos os itens e agendarmos atendimento. Caso necessário peças excedentes, informaremos\nno momento o atendimento, após avaliação dos equipamentos xxxx. Havendo necessidade de qualquer ajuste, estou\nà inteira disposição para negociarmos.\n\nGostaria de comunicar que o meu e-mail oficial de contato mudou para comercial01@sectasystem.com.br\n\nPara que a nossa comunicação continue fluindo da melhor forma, peço que atualize os seus registros e priorize este\nnovo endereço em nossas próximas mensagens."
  },
  {
    "id": "texto-4",
    "title": "CONFIRMAÇÃO DE APROVAÇÃO",
    "category": "E-mails",
    "recipients": [],
    "body": "Bxx xxxxx Prezados!\n\nConfirmo o recebimento da aprovação referente à Orçamento de Serviço/Proposta Comercial XXXX\n\nJá solicitei a reserva dos itens, agendamento do serviço e liberação do faturamento.\n\nA nota fiscal e o boleto serão enviados diretamente pelo nosso setor de faturamento.\nA expedição do material ou O agendamento do serviço será realizado assim que disponível.\nQualquer dúvida, favor entrar em contato comigo."
  },
  {
    "id": "texto-5",
    "title": "PROPOSTAS APROVADAS PELO CLIENTE",
    "category": "E-mails",
    "recipients": [
      "compras@sectasystem.com.br",
      "compras02@sectasystem.com.br",
      "suprimentos@sectasystem.com.br",
      "suprimentos01@sectasystem.com.br",
      "suprimentos02@sectasystem.com.br",
      "faturamento@sectasystem.com.br",
      "financeiro@sectasystem.com.br",
      "financeiro01@sectasystem.com.br",
      "assistencia@sectasystem.com.br",
      "assistencia01@sectasystem.com.br",
      "cristiano@sectasystem.com.br",
      "assistenciahd@sectasystem.com.br"
    ],
    "body": "BoX XXXXX Prezados,\n\nPropostas aprovadas pelo Cliente.\n\nFabio Morelli/Valdeir, Favor avaliar liberação do pedido.\n\nCristiano / Ailton // Alexandre, Favor incluir na agenda de atendimentos da Assistência e informar uma previsão de\natendimento ao cliente quando possível\n\nFabio Freitas, Favor separar material e disponibilizar para a Assistência Tecnica.\n\nFabio Morelli/Valdeir, Faturar Material assim que liberado, e Serviço após realizado."
  },
  {
    "id": "texto-6",
    "title": "PROPOSTA APROVADA / MATERIAL",
    "category": "E-mails",
    "recipients": [
      "compras@sectasystem.com.br",
      "compras02@sectasystem.com.br",
      "suprimentos@sectasystem.com.br",
      "suprimentos01@sectasystem.com.br",
      "suprimentos02@sectasystem.com.br",
      "faturamento@sectasystem.com.br",
      "financeiro@sectasystem.com.br",
      "financeiro01@sectasystem.com.br"
    ],
    "body": "BoX XXXXX Prezados,\n\nProposta aprovada pelo Cliente.\n\nFabio Morelli/Valdeir, Favor avaliar liberação do pedido.\n\nFabio Freitas, Favor separar o Material e Liberar Faturamento.\n\nFabio Morelli/Valdeir, Favor Faturar quando liberado."
  },
  {
    "id": "texto-7",
    "title": "SERVIÇO EFETUADO / FATURAMENTO",
    "category": "E-mails",
    "recipients": [
      "faturamento@sectasystem.com.br",
      "financeiro@sectasystem.com.br",
      "financeiro01@sectasystem.com.br"
    ],
    "body": "Box xxxx Prezados,\n\nServiço efetuado, favor prosseguir com faturamento do Orçamento de Serviço xxxx"
  }
];
// Ordem comercial fixa; os IDs e conteúdos originais permanecem estáveis.
QUICK_TEXTS.splice(0, 2, QUICK_TEXTS[1], QUICK_TEXTS[0]);
QUICK_TEXTS.find(model => model.id === 'texto-5').title = 'PROPOSTAS COM SERVIÇO APROVADAS';
QUICK_TEXTS.find(model => model.id === 'texto-6').title = 'PROPOSTA MATERIAL APROVADA';
