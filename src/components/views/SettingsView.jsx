export default function SettingsView() {
  return (
    <div className="view active">
      <div className="card">
        <div className="card-header">
          <div className="card-title"><i className="fa-solid fa-gear" /> Configurações</div>
        </div>
        <div className="list">
          <div className="list-item">
            <div className="list-item-title">Sincronização</div>
            <div>Os dados são salvos automaticamente no Supabase e reabertos na próxima sessão.</div>
          </div>
          <div className="list-item">
            <div className="list-item-title">Tema</div>
            <div>O tema pode ser alternado pelo botão no canto superior direito.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
