export default function HistoryView({ contacts, history }) {
  return (
    <div className="view active">
      <div className="card">
        <div className="card-header">
          <div className="card-title"><i className="fa-solid fa-clock-rotate-left" /> Histórico de contatos</div>
        </div>
        <div className="list">
          {contacts.map((item) => (
            <div key={item.id} className="list-item">
              <div className="list-item-title">{item.client}</div>
              <div>{item.note}</div>
              <div className="meta-row"><span>{item.channel}</span><span>{item.status}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><i className="fa-solid fa-file-signature" /> Propostas e retornos</div>
        </div>
        <div className="list">
          {history.map((item) => (
            <div key={item.id} className="list-item">
              <div className="list-item-title">{item.title}</div>
              <div>{item.description}</div>
              <div className="meta-row"><span>{item.date}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
