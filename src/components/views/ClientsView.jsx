export default function ClientsView({ clients, search, setSearch, filters, setFilters, onOpenModal }) {
  return (
    <div className="view active">
      <div className="card">
        <div className="card-header">
          <div className="card-title"><i className="fa-solid fa-users" /> Todos os clientes</div>
          <div className="toolbar-actions">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente" />
            <select value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })}>
              <option value="">Cidade: todas</option>
              <option value="São Paulo">São Paulo</option>
              <option value="Rio de Janeiro">Rio de Janeiro</option>
            </select>
            <select value={filters.segment} onChange={(e) => setFilters({ ...filters, segment: e.target.value })}>
              <option value="">Segmento: todos</option>
              <option value="Industrial">Industrial</option>
              <option value="Hospitalar">Hospitalar</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={() => onOpenModal('cliente')}>Novo cliente</button>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Razão social</th>
              <th>Segmento</th>
              <th>Cidade</th>
              <th>Último contato</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.name}</td>
                <td>{client.company}</td>
                <td>{client.segment}</td>
                <td>{client.city}</td>
                <td>{client.lastContact}</td>
                <td><span className="badge success">{client.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
