export default function DashboardView({ data, stats, onOpenModal, onNavigate }) {
  return (
    <div className="view active">
      <div className="daily-hero">
        <div>
          <div className="daily-eyebrow">Ações do Dia</div>
          <h2>Olá, {data.userName}.</h2>
          <p>Acompanhe pendências, retornos, solicitações e orçamentos em um único fluxo de trabalho.</p>
        </div>
        <div className="daily-date-feature">
          <span>Data de hoje</span>
          <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
        </div>
      </div>

      <div className="card daily-actions-card">
        <div className="card-header">
          <div className="card-title"><i className="fa-solid fa-list-check" /> O que preciso fazer agora?</div>
        </div>
        <div className="daily-actions-list">
          {data.requests.slice(0, 3).map((item) => (
            <div key={item.id} className="dash-card-item">
              <strong>{item.client}</strong>
              <div>{item.title}</div>
              <small>{item.deadline}</small>
            </div>
          ))}
          {data.agenda.slice(0, 3).map((item) => (
            <div key={`agenda-${item.id}`} className="dash-card-item">
              <strong>{item.client}</strong>
              <div>{item.subject}</div>
              <small>{item.date} • {item.time}</small>
            </div>
          ))}
        </div>
      </div>

      <section className="stats">
        <div className="stat-card"><div className="stat-label">Clientes</div><div className="stat-value">{stats.clients}</div></div>
        <div className="stat-card"><div className="stat-label">Contatos</div><div className="stat-value">{stats.contacts}</div></div>
        <div className="stat-card"><div className="stat-label">Retornos</div><div className="stat-value">{stats.agenda}</div></div>
        <div className="stat-card"><div className="stat-label">Solicitações</div><div className="stat-value">{stats.requests}</div></div>
      </section>

      <div className="dashboard-grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="fa-solid fa-clipboard-list" /> Solicitações pendentes</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('solicitacoes')}>Ver tudo</button>
          </div>
          <div className="list">
            {data.requests.map((item) => (
              <div key={item.id} className="list-item">
                <div className="list-item-title">{item.client}</div>
                <div>{item.title}</div>
                <div className="meta-row"><span className={`badge ${item.status}`}>{item.status}</span><span>{item.deadline}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="fa-solid fa-calendar-check" /> Atividades programadas</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('agenda')}>Ver agenda</button>
          </div>
          <div className="list">
            {data.agenda.map((item) => (
              <div key={item.id} className="list-item">
                <div className="list-item-title">{item.client}</div>
                <div>{item.subject}</div>
                <div className="meta-row"><span>{item.date}</span><span>{item.time}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
