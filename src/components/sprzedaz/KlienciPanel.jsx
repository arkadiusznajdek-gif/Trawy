import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { money } from "../../utils/helpers";

export function emptyClientForm() { return { nazwa: "", telefon: "", notatki: "" }; }

export function KlienciPanel({ clients, orders, onAdd, onDelete }) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyClientForm());
  const [expandedId, setExpandedId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  function submit() {
    if (!form.nazwa.trim()) return;
    onAdd(form);
    setForm(emptyClientForm());
    setFormOpen(false);
  }
  function ordersFor(client) {
    return orders.filter((o) => o.klientId === client.id || (o.klient || "").trim().toLowerCase() === client.nazwa.trim().toLowerCase());
  }

  return (
    <div>
      {!formOpen ? (
        <button className="primary-btn" style={{ marginTop: 12 }} onClick={() => setFormOpen(true)}><Plus size={17} /> Nowy klient</button>
      ) : (
        <div className="order-form">
          <label className="field"><span>Imię / nazwa</span><input value={form.nazwa} onChange={(e) => setForm((f) => ({ ...f, nazwa: e.target.value }))} placeholder="Jan Kowalski" /></label>
          <label className="field"><span>Telefon (opcjonalnie)</span><input value={form.telefon} onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))} placeholder="600 000 000" /></label>
          <label className="field"><span>Notatki (opcjonalnie)</span><input value={form.notatki} onChange={(e) => setForm((f) => ({ ...f, notatki: e.target.value }))} placeholder="np. stały klient, hurt" /></label>
          <div className="form-actions">
            <button className="secondary-btn" onClick={() => { setFormOpen(false); setForm(emptyClientForm()); }}>Anuluj</button>
            <button className="primary-btn" disabled={!form.nazwa.trim()} onClick={submit}>Zapisz</button>
          </div>
        </div>
      )}
      <div className="order-list">
        {clients.length === 0 && !formOpen && <div className="empty-state">Brak klientów. Dodaj pierwszego powyżej.</div>}
        {clients.map((c) => {
          const co = ordersFor(c);
          const total = co.reduce((s, o) => s + Number(o.suma || 0), 0);
          const isOpen = expandedId === c.id;
          return (
            <div key={c.id} className="order-card">
              <button className="order-card-head" onClick={() => setExpandedId(isOpen ? null : c.id)}>
                <div>
                  <div className="order-client">{c.nazwa}</div>
                  <div className="order-date">{c.telefon || "brak telefonu"} · {co.length} zamówień</div>
                </div>
                <div className="order-card-right"><span className="order-sum">{money(total)} zł</span></div>
              </button>
              {isOpen && (
                <div className="order-card-body">
                  {c.notatki && <div className="order-line"><span>{c.notatki}</span></div>}
                  {co.length === 0 ? (
                    <div className="empty-state" style={{ padding: "8px 0" }}>Brak zamówień tego klienta.</div>
                  ) : co.map((o) => (
                    <div key={o.id} className="order-line"><span>{o.data}</span><span>{money(o.suma)} zł</span></div>
                  ))}
                  <div className="order-card-actions">
                    {confirmingId !== c.id ? (
                      <button className="icon-btn danger" onClick={() => setConfirmingId(c.id)}><Trash2 size={15} /></button>
                    ) : (
                      <div className="confirm-box">
                        <span>Usunąć klienta?</span>
                        <div className="confirm-actions">
                          <button className="danger-btn small" onClick={() => { onDelete(c.id); setConfirmingId(null); }}>Usuń</button>
                          <button className="ghost-btn small" onClick={() => setConfirmingId(null)}>Anuluj</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Raporty ---- */
