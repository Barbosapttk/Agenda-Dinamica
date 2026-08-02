export default function BudgetsView({ budgets }) {
  return (
    <div className="view active">
      <div className="card">
        <div className="card-header">
          <div className="card-title"><i className="fa-solid fa-file-invoice-dollar" /> Orçamentos recorrentes</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Próximo envio</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((budget) => (
              <tr key={budget.id}>
                <td>{budget.title}</td>
                <td>{budget.client}</td>
                <td><span className={`badge ${budget.status}`}>{budget.status}</span></td>
                <td>{budget.dueDate}</td>
                <td>{budget.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
