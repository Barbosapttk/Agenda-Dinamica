export const initialData = {
  userName: 'usuário de exemplo',
  theme: 'dark',
  clients: [
    { id: 1, name: 'cliente de exemplo 1', company: 'empresa de exemplo 1', phone: '(00) 00000-0000', segment: 'Industrial', city: 'cidade de exemplo', state: 'SP', cnpj: '00.000.000/0000-00', lastContact: '31/07', status: 'Ativo', nextAction: 'Enviar proposta revisada' },
    { id: 2, name: 'cliente de exemplo 2', company: 'empresa de exemplo 2', phone: '(00) 00000-0000', segment: 'Hospitalar', city: 'cidade de exemplo', state: 'RJ', cnpj: '00.000.000/0000-00', lastContact: '29/07', status: 'Em atenção', nextAction: 'Confirmar retorno para amanhã' },
    { id: 3, name: 'cliente de exemplo 3', company: 'empresa de exemplo 3', phone: '(00) 00000-0000', segment: 'Industrial', city: 'cidade de exemplo', state: 'SP', cnpj: '00.000.000/0000-00', lastContact: '01/08', status: 'Ativo', nextAction: 'Atualizar orçamento recorrente' }
  ],
  contacts: [
    { id: 1, client: 'cliente de exemplo 1', channel: 'WhatsApp', note: 'Proposta enviada com ajustes solicitados', status: 'Aguardando retorno' },
    { id: 2, client: 'cliente de exemplo 2', channel: 'Telefone', note: 'Retorno agendado para 03/08', status: 'Em andamento' },
    { id: 3, client: 'cliente de exemplo 3', channel: 'E-mail', note: 'Orçamento recorrente em revisão', status: 'Aguardando resposta' }
  ],
  requests: [
    { id: 1, client: 'cliente de exemplo 1', title: 'Solicitação de orçamento para nova linha', status: 'pendente', priority: 'alta', deadline: 'Hoje' },
    { id: 2, client: 'cliente de exemplo 3', title: 'Atualização de proposta recorrente', status: 'em-andamento', priority: 'media', deadline: '3 dias' },
    { id: 3, client: 'cliente de exemplo 2', title: 'Acompanhamento de orçamento', status: 'pendente', priority: 'alta', deadline: 'Amanhã' },
    { id: 4, client: 'cliente de exemplo 4', title: 'Nova solicitação para peças especiais', status: 'concluido', priority: 'normal', deadline: 'Concluída' }
  ],
  budgets: [
    { id: 1, title: 'Orçamento recorrente', client: 'cliente de exemplo 1', status: 'em-andamento', dueDate: '03/08', amount: 'R$ 4.800' },
    { id: 2, title: 'Orçamento especial', client: 'cliente de exemplo 3', status: 'pendente', dueDate: '05/08', amount: 'R$ 1.250' },
    { id: 3, title: 'Orçamento de peças', client: 'cliente de exemplo 2', status: 'concluido', dueDate: '01/08', amount: 'R$ 7.100' }
  ],
  agenda: [
    { id: 1, client: 'cliente de exemplo 1', date: '02/08/2026', time: '09:00', subject: 'Acompanhar proposta' },
    { id: 2, client: 'cliente de exemplo 2', date: '03/08/2026', time: '14:30', subject: 'Retorno de orçamento' },
    { id: 3, client: 'cliente de exemplo 3', date: '04/08/2026', time: '16:00', subject: 'Atualizar previsão' }
  ],
  history: [
    { id: 1, title: 'Proposta enviada', description: 'Cliente recebeu a proposta revisada e respondeu com ajustes.', date: '01/08' },
    { id: 2, title: 'Retorno concluído', description: 'Acompanhamento finalizado com confirmação de aceite.', date: '31/07' },
    { id: 3, title: 'Novo contato registrado', description: 'Canal de WhatsApp usado para alinhar próximos passos.', date: '30/07' }
  ]
};
