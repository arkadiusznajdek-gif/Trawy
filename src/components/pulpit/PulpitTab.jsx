import { useState } from "react";
import { AlertTriangle, Clock, Shield, Download, Upload, X, Copy, ClipboardPaste, Search } from "lucide-react";
import { MONTHS } from "../../constants";
import { money, monthKey, taskKey, computeMonthlySales, formatLogTime } from "../../utils/helpers";
import { buildMonthTasks } from "../harmonogram/helpers";
import { TasksSection } from "./TasksSection";
import { plantName, batchLabel, sourceLabel } from "../magazyn/PartiePanel";
import { daysSince } from "../magazyn/ZaleglosciPanel";

/*
 * FUNKCJA DODATKOWA: Centrum uwagi — spina cztery już gotowe moduły w jeden
 * poranny rzut oka: plany produkcji na TEN miesiąc, mocno zaległe segmenty
 * (>60 dni bez ruchu — ten sam `daysSince` co w Zaległościach), niski stan
 * zaopatrzenia (ta sama reguła co w Zaopatrzeniu: prog!=null && ilosc<=prog)
 * i niezrealizowane zamówienia. Czysta funkcja, nic nie mutuje.
 */
export function buildAttentionCenter(now, productionPlans, batchSegments, supplies, orders) {
  const nowMs = now.getTime();
  const plansDue = (productionPlans || []).filter(
    (p) => p.status === "planowane" && p.plannedYear === now.getFullYear() && p.plannedMonth === now.getMonth() + 1
  );
  const staleSegments = (batchSegments || [])
    .filter((s) => s.status === "aktywny" && Number(s.ilosc || 0) > 0)
    .map((s) => ({ ...s, daysIdle: daysSince(s.updatedAt, nowMs) }))
    .filter((s) => (s.daysIdle ?? 0) > 60)
    .sort((a, b) => (b.daysIdle || 0) - (a.daysIdle || 0));
  const lowSupplies = (supplies || []).filter((s) => s.prog != null && Number(s.ilosc) <= Number(s.prog));
  const pendingOrders = (orders || []).filter((o) => o.status !== "zrealizowane");
  return { plansDue, staleSegments, lowSupplies, pendingOrders };
}

/*
 * FUNKCJA DODATKOWA: szybkie wyszukiwanie partii z Pulpitu — po numerze
 * (#7 albo samo 7) lub po nazwie/odmianie. Czysta funkcja, testowalna wprost.
 */
export function searchBatches(batches, plants, rawQuery) {
  const query = (rawQuery || "").trim();
  if (!query) return [];
  const numericQuery = query.replace(/^#/, "");
  const isNumeric = /^\d+$/.test(numericQuery);
  const lowerQuery = query.toLowerCase();
  const results = batches.filter((b) => {
    if (isNumeric && b.numer === Number(numericQuery)) return true;
    const p = plants.find((pp) => pp.id === b.plantId);
    if (p && (p.nazwa_pl.toLowerCase().includes(lowerQuery) || p.odmiana.toLowerCase().includes(lowerQuery))) return true;
    return false;
  });
  return results
    .sort((a, b) => {
      const aExact = isNumeric && a.numer === Number(numericQuery) ? 0 : 1;
      const bExact = isNumeric && b.numer === Number(numericQuery) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return (b.numer || 0) - (a.numer || 0);
    })
    .slice(0, 8);
}

function BackupModal({ onClose, getBackupText, onImportText }) {
  const [mode, setMode] = useState("export");
  const [pasteValue, setPasteValue] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const backupText = mode === "export" ? getBackupText() : "";

  function copyToClipboard(text, onDone, target) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onDone).catch(() => fallbackCopy(target, onDone));
    } else {
      fallbackCopy(target, onDone);
    }
  }
  function fallbackCopy(target, onDone) {
    try {
      if (target) { target.select(); document.execCommand("copy"); onDone(); }
    } catch (e) {
      setCopyStatus("Nie udało się skopiować — zaznacz tekst ręcznie i skopiuj.");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Kopia zapasowa</span>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-actions" style={{ marginBottom: 10 }}>
          <button className={`chip-btn ${mode === "export" ? "chip-active" : ""}`} onClick={() => setMode("export")}>Eksportuj</button>
          <button className={`chip-btn ${mode === "import" ? "chip-active" : ""}`} onClick={() => setMode("import")}>Importuj</button>
        </div>
        {mode === "export" ? (
          <>
            <p className="hint-text">Zaznacz i skopiuj poniższy tekst (albo dotknij „Kopiuj do schowka”) i zapisz go u siebie, np. w notatkach.</p>
            <textarea
              readOnly
              className="backup-textarea"
              value={backupText}
              onFocus={(e) => e.target.select()}
              id="backup-export-textarea"
            />
            <div className="form-actions" style={{ marginTop: 10 }}>
              <button
                className="primary-btn"
                onClick={() => {
                  const ta = document.getElementById("backup-export-textarea");
                  copyToClipboard(backupText, () => setCopyStatus("Skopiowano do schowka."), ta);
                }}
              >
                <Copy size={15} /> Kopiuj do schowka
              </button>
            </div>
            {copyStatus && <p className="hint-text">{copyStatus}</p>}
          </>
        ) : (
          <>
            <p className="hint-text">Wklej tutaj wcześniej skopiowany tekst kopii zapasowej i dotknij „Wczytaj”.</p>
            <textarea
              className="backup-textarea"
              placeholder="Wklej tekst kopii zapasowej…"
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
            />
            <div className="form-actions" style={{ marginTop: 10 }}>
              <button
                className="primary-btn"
                disabled={!pasteValue.trim()}
                onClick={() => { const ok = onImportText(pasteValue); if (ok) onClose(); }}
              >
                <ClipboardPaste size={15} /> Wczytaj
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function PulpitTab({ plants, inventory, potsTotal, magazynValue, salesValue, orders, done, customTasks, log, supplies, tasks, onAddTask, onCycleTask, onDeleteTask, onNavigate, onExport, onImport, onGetBackupText, onImportText, batches, onJumpToBatch, batchSegments, productionPlans }) {
  const [backupOpen, setBackupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchResults = searchBatches(batches || [], plants, searchQuery);
  const attention = buildAttentionCenter(new Date(), productionPlans, batchSegments, supplies, orders);
  const attentionTotal = attention.plansDue.length + attention.staleSegments.length + attention.lowSupplies.length + attention.pendingOrders.length;
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  const monthTasks = buildMonthTasks(plants, curMonth);
  const doneCount = monthTasks.filter((t) => done[taskKey(curYear, curMonth, t.plant.id, t.type)]).length;
  const custom = customTasks[monthKey(curYear, curMonth)] || [];
  const customDoneCount = custom.filter((t) => t.done).length;
  const pendingCount = (monthTasks.length - doneCount) + (custom.length - customDoneCount);

  const sales = computeMonthlySales(orders);
  const thisMonthSales = sales.find((s) => s.year === curYear && s.month === curMonth) || { count: 0, sum: 0, countDone: 0, sumDone: 0 };
  const lowSupplies = supplies.filter((s) => s.prog != null && s.prog !== "" && Number(s.ilosc) <= Number(s.prog));

  return (
    <div className="tab-pad">
      <label className="field" style={{ marginTop: 4 }}>
        <span>Szybkie wyszukiwanie partii (numer albo nazwa odmiany)</span>
        <input type="text" placeholder="np. #7 albo Ice Dance" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </label>
      {searchQuery.trim() && (
        <div className="order-list" style={{ marginTop: 4, marginBottom: 8 }}>
          {searchResults.length === 0 && <div className="empty-state">Brak partii pasujących do „{searchQuery}”.</div>}
          {searchResults.map((b) => (
            <div key={b.id} className="order-card">
              <button className="order-card-head" onClick={() => onJumpToBatch(b.id)}>
                <div>
                  <div className="order-client">{plantName(plants, b.plantId)} <span className="order-date">· Partia {batchLabel(b)}</span></div>
                  <div className="order-date">{sourceLabel(b)} · {b.status === "aktywna" ? "aktywna" : "zamknięta"}</div>
                </div>
                <Search size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {attentionTotal > 0 && (
        <div className="order-card" style={{ marginBottom: 12 }}>
          <div className="order-card-body">
            <div className="section-title small-title" style={{ marginTop: 0 }}>Centrum uwagi ({attentionTotal})</div>
            {attention.pendingOrders.length > 0 && (
              <button className="order-card-head" style={{ padding: "6px 0" }} onClick={() => onNavigate("sprzedaz")}>
                <span>Niezrealizowane zamówienia</span>
                <span className="status-badge new">{attention.pendingOrders.length}</span>
              </button>
            )}
            {attention.plansDue.length > 0 && (
              <button className="order-card-head" style={{ padding: "6px 0" }} onClick={() => onNavigate("magazyn")}>
                <span>Plany produkcji na ten miesiąc</span>
                <span className="status-badge new">{attention.plansDue.length}</span>
              </button>
            )}
            {attention.staleSegments.length > 0 && (
              <button className="order-card-head" style={{ padding: "6px 0" }} onClick={() => onNavigate("magazyn")}>
                <span>Segmenty bez ruchu ponad 60 dni</span>
                <span className="status-badge new">{attention.staleSegments.length}</span>
              </button>
            )}
            {attention.lowSupplies.length > 0 && (
              <button className="order-card-head" style={{ padding: "6px 0" }} onClick={() => onNavigate("magazyn")}>
                <span>Niski stan zaopatrzenia</span>
                <span className="status-badge new">{attention.lowSupplies.length}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="dash-grid">
        <button className="dash-card" onClick={() => onNavigate("harmonogram")}>
          <span className="dash-num">{pendingCount}</span>
          <span className="dash-label">zadań do zrobienia w {MONTHS[curMonth].toLowerCase()}</span>
        </button>
        <button className="dash-card" onClick={() => onNavigate("sprzedaz")}>
          <span className="dash-num">{money(thisMonthSales.sumDone)} zł</span>
          <span className="dash-label">sprzedaż zrealizowana w {MONTHS[curMonth].toLowerCase()}</span>
        </button>
        <button className="dash-card" onClick={() => onNavigate("magazyn")}>
          <span className="dash-num">{potsTotal}</span>
          <span className="dash-label">roślin w donicach łącznie</span>
        </button>
        <button className="dash-card" onClick={() => onNavigate("magazyn")}>
          <span className="dash-num">{lowSupplies.length}</span>
          <span className="dash-label">materiałów na wyczerpaniu</span>
        </button>
        <button className="dash-card dash-card-wide dash-card-split" onClick={() => onNavigate("sprzedaz")}>
          <div className="dash-split-item">
            <span className="dash-num-sm">{money(magazynValue)} zł</span>
            <span className="dash-label">koszt zakupu (magazyn)</span>
          </div>
          <div className="dash-split-item">
            <span className="dash-num-sm">{money(salesValue)} zł</span>
            <span className="dash-label">potencjalna wartość sprzedaży</span>
          </div>
          <div className="dash-split-item">
            <span className="dash-num-sm">{money(salesValue - magazynValue)} zł</span>
            <span className="dash-label">potencjalny zysk</span>
          </div>
        </button>
      </div>
      <p className="hint-text" style={{ marginTop: -6 }}>Koszt i zysk liczą się tylko tam, gdzie masz wpisany koszt/szt. w Cenniku — brakujące pozycje liczą się jako 0 zł.</p>

      {lowSupplies.length > 0 && (
        <div className="alert-box">
          <AlertTriangle size={15} />
          <span>Kończy się: {lowSupplies.map((s) => s.nazwa).join(", ")}</span>
        </div>
      )}

      <TasksSection tasks={tasks} onAdd={onAddTask} onCycle={onCycleTask} onDelete={onDeleteTask} />

      <div className="section-title" style={{ marginTop: 18 }}>
        <Clock size={17} />
        <span>Ostatnia aktywność</span>
      </div>
      {log.length === 0 ? (
        <div className="empty-state">Brak zarejestrowanych zmian — historia zacznie się wypełniać, gdy zaczniesz korzystać z aplikacji.</div>
      ) : (
        <div className="log-list">
          {log.slice(0, 8).map((entry) => (
            <div key={entry.id} className="log-row">
              <span className="log-time">{formatLogTime(entry.ts)}</span>
              <span className="log-text">{entry.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="section-title" style={{ marginTop: 20 }}>
        <Shield size={17} />
        <span>Kopia zapasowa</span>
      </div>
      <p className="hint-text">Wszystkie dane (magazyn, zamówienia, klienci, historia) trzymane są tylko na Twoim koncie w tej aplikacji. Warto od czasu do czasu zrobić kopię na wszelki wypadek.</p>
      <div className="form-actions">
        <button className="secondary-btn" onClick={() => setBackupOpen(true)}><Shield size={15} /> Kopia zapasowa (kopiuj/wklej)</button>
      </div>
      <p className="hint-text" style={{ marginTop: 6 }}>Ewentualnie, jeśli Twoja przeglądarka na to pozwala:</p>
      <div className="form-actions">
        <button className="secondary-btn" onClick={onExport}><Download size={15} /> Pobierz plik</button>
        <label className="secondary-btn file-label">
          <Upload size={15} /> Wczytaj z pliku
          <input type="file" accept="application/json" className="visually-hidden-input" onChange={onImport} />
        </label>
      </div>
      {backupOpen && <BackupModal onClose={() => setBackupOpen(false)} getBackupText={onGetBackupText} onImportText={onImportText} />}
    </div>
  );
}
