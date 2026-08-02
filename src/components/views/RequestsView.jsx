export default function RequestsView({ requests, requestFilter, setRequestFilter, requestSearch, setRequestSearch, onOpenModal }) {
  const grouped = {
    pendente: requests.filter((item) => item.status === 'pendente'),
    'em-andamento': requests.filter((item) => item.status === 'em-andamento'),
    concluido: requests.filter((item) => item.status === 'concluido')
  };

  return (
    <div className="view active">
      <div className="card">
        <div className="card-header">
          <div className="card-title"><i className="fa-solid fa-clipboard-list" /> Solicitações de orçamento</div>
          <div className="toolbar-actions">
            <select value={requestFilter} onChange={(e) => setRequestFilter(e.target.value)}>
              <option value="pendentes">Pendentes</option>
              <option value="em-andamento">Em andamento</option>
              <option value="concluido">Concluídas</option>
            </select>
            <input value={requestSearch} onChange={(e) => setRequestSearch(e.target.value)} placeholder="Buscar solicitação" />
            <button className="btn btn-primary btn-sm" onClick={() => onOpenModal('solicitacao')}>Nova solicitação</button>
          </div>
        </div>
        <div className="orcamento-kanban-board">
          {Object.entries(grouped).map(([key, items]) => (
            <div key={key} className="orcamento-kanban-col">
              <div className="orcamento-kanban-head">
                <div className="orcamento-kanban-title">
                  <i className="fa-solid fa-layer-group" /> {key === 'pendente' ? 'Pendentes' : key === 'em-andamento' ? 'Em andamento' : 'Concluídas'}
                </div>
                <span className="kanban-count-pill">{items.length}</span>
              </div>
              <div className="orcamento-kanban-body">
                {items.map((item) => (
                  <div key={item.id} className={`orcamento-card ${item.priority}`}>
                    <div className="orcamento-card-title">{item.client}</div>
                    <div className="orcamento-card-meta">{item.title}</div>
                    <div className="orcamento-card-desc">Prazo: {item.deadline}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
