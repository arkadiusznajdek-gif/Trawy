import { formatLogTime } from "../../utils/helpers";

export function HistoriaPanel({ log }) {
  if (log.length === 0) {
    return <div className="empty-state" style={{ marginTop: 12 }}>Brak zarejestrowanych zmian. Historia zacznie się wypełniać, gdy zmienisz stan magazynu, zrealizujesz zamówienie, zgłosisz stratę albo dodasz odmianę czy klienta.</div>;
  }
  return (
    <div className="log-list" style={{ marginTop: 12 }}>
      {log.map((entry) => (
        <div key={entry.id} className="log-row">
          <span className="log-time">{formatLogTime(entry.ts)}</span>
          <span className="log-text">{entry.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Tab: HARMONOGRAM                                                       */
/* ---------------------------------------------------------------------- */
