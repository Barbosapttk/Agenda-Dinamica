export const initialData = {
  userName: 'Patrick Barbosa',
  theme: 'dark',
  clients: [
    { id: 1, name: 'Maria Helena', company: 'M.H. Engenharia', phone: '(11) 98541-1234', segment: 'Industrial', city: 'São Paulo', state: 'SP', cnpj: '12.345.678/0001-90', lastContact: '31/07', status: 'Ativo', nextAction: 'Enviar proposta revisada' },
    { id: 2, name: 'Carlos Mendes', company: 'CM Logística', phone: '(11) 97412-8899', segment: 'Hospitalar', city: 'Rio de Janeiro', state: 'RJ', cnpj: '11.223.334/0001-50', lastContact: '29/07', status: 'Em atenção', nextAction: 'Confirmar retorno para amanhã' },
    { id: 3, name: 'Ana Souza', company: 'A. Design', phone: '(11) 91234-5566', segment: 'Industrial', city: 'São Paulo', state: 'SP', cnpj: '77.890.123/0001-09', lastContact: '01/08', status: 'Ativo', nextAction: 'Atualizar orçamento recorrente' }
  ],
  contacts: [
    { id: 1, client: 'Maria Helena', channel: 'WhatsApp', note: 'Proposta enviada com ajustes solicitados', status: 'Aguardando retorno' },
    { id: 2, client: 'Carlos Mendes', channel: 'Telefone', note: 'Retorno agendado para 03/08', status: 'Em andamento' },
    { id: 3, client: 'Ana Souza', channel: 'E-mail', note: 'Orçamento recorrente em revisão', status: 'Aguardando resposta' }
  ],
  requests: [
    { id: 1, client: 'Maria Helena', title: 'Solicitação de orçamento para nova linha', status: 'pendente', priority: 'alta', deadline: 'Hoje' },
    { id: 2, client: 'Ana Souza', title: 'Atualização de proposta recorrente', status: 'em-andamento', priority: 'media', deadline: '3 dias' },
    { id: 3, client: 'Carlos Mendes', title: 'Acompanhamento de orçamento', status: 'pendente', priority: 'alta', deadline: 'Amanhã' },
    { id: 4, client: 'Fernanda Lima', title: 'Nova solicitação para peças especiais', status: 'concluido', priority: 'normal', deadline: 'Concluída' }
  ],
  budgets: [
    { id: 1, title: 'Orçamento recorrente', client: 'Maria Helena', status: 'em-andamento', dueDate: '03/08', amount: 'R$ 4.800' },
    { id: 2, title: 'Orçamento especial', client: 'Ana Souza', status: 'pendente', dueDate: '05/08', amount: 'R$ 1.250' },
    { id: 3, title: 'Orçamento de peças', client: 'Carlos Mendes', status: 'concluido', dueDate: '01/08', amount: 'R$ 7.100' }
  ],
  agenda: [
    { id: 1, client: 'Maria Helena', date: '02/08/2026', time: '09:00', subject: 'Acompanhar proposta' },
    { id: 2, client: 'Carlos Mendes', date: '03/08/2026', time: '14:30', subject: 'Retorno de orçamento' },
    { id: 3, client: 'Ana Souza', date: '04/08/2026', time: '16:00', subject: 'Atualizar previsão' }
  ],
  history: [
    { id: 1, title: 'Proposta enviada', description: 'Cliente recebeu a proposta revisada e respondeu com ajustes.', date: '01/08' },
    { id: 2, title: 'Retorno concluído', description: 'Acompanhamento finalizado com confirmação de aceite.', date: '31/07' },
    { id: 3, title: 'Novo contato registrado', description: 'Canal de WhatsApp usado para alinhar próximos passos.', date: '30/07' }
  ]
};
