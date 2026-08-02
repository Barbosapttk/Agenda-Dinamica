import { useMemo, useState } from 'react';

export default function AgendaView({ agenda, onOpenModal }) {
  const [month, setMonth] = useState(new Date(2026, 7, 1));

  const days = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const weeks = [];
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const cells = Array.from({ length: startDay + totalDays }, (_, index) => {
      const dayNumber = index - startDay + 1;
      const date = new Date(month.getFullYear(), month.getMonth(), dayNumber);
      const hasActivity = agenda.some((item) => item.date === date.toLocaleDateString('pt-BR'));
      return { dayNumber, date, hasActivity };
    });
    while (cells.length) weeks.push(cells.splice(0, 7));
    return weeks;
  }, [agenda, month]);

  return (
    <div className="view active">
      <div className="agenda-helper-card">
        <div>
          <div className="daily-eyebrow">Agenda operacional</div>
          <h2>Calendário de compromissos e prazos</h2>
          <p>Visualize retornos, solicitações e orçamentos recorrentes por data.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => onOpenModal('retorno')}>Novo retorno</button>
      </div>

      <div className="agenda-layout">
        <div className="card">
          <div className="card-header">
            <div className="card-title">{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>
            <div className="toolbar-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button>
            </div>
          </div>
          <div className="cal-grid">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="cal-cell cal-head">{day}</div>
            ))}
            {days.flat().map((cell, idx) => (
              <div key={`${cell.dayNumber}-${idx}`} className={`cal-cell ${cell.dayNumber > 0 ? '' : 'cal-empty'}`}>
                {cell.dayNumber > 0 ? <>
                  <strong>{cell.dayNumber}</strong>
                  {cell.hasActivity && <span className="cal-dot" />}
                </> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="fa-solid fa-layer-group" /> Atividades programadas</div>
          </div>
          <div className="list">
            {agenda.map((item) => (
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
