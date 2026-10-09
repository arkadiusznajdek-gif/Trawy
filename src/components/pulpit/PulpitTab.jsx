import { useState } from "react";
import { AlertTriangle, MapPin, Shield, Download, Upload, X, Copy, ClipboardPaste, Search, Sprout, Plus } from "lucide-react";
import { MONTHS } from "../../constants";
import { TasksSection } from "./TasksSection";
import { plantName, batchLabel, sourceLabel } from "../magazyn/PartiePanel";
import { daysSince } from "../magazyn/ZaleglosciPanel";
import { findOrderShortages } from "../../utils/orderAvailability";
import { buildLocationStockSummary } from "../../utils/locationInventory";

const SEASONAL_TIPS = {
  1: [
    "Sprawdź osłony i stan przezimowania roślin w pojemnikach.",
    "Zaplanuj podziały, przesadzenia i zakupy materiałów na nowy sezon.",
  ],
  2: [
    "Przygotuj donice, etykiety i podłoże do wiosennych prac.",
    "Po odwilży sprawdź, czy pojemniki nie stoją w wodzie.",
  ],
  3: [
    "Przytnij zaschnięte liście traw przed ruszeniem nowych przyrostów; zimozielone gatunki potraktuj osobno.",
    "Usuń chwasty z pojemników i sprawdź drożność odpływów.",
  ],
  4: [
    "Przygotuj podział starszych kęp, gdy gleba rozmarznie i da się uprawiać.",
    "Sprawdź stan zapasu donic i podłoża przed intensywną produkcją.",
  ],
  5: [
    "Kontroluj wilgotność świeżo podzielonych i przesadzonych roślin.",
    "Oznacz nowe podziały etykietami i zapisz ich lokalizację.",
  ],
  6: [
    "Regularnie sprawdzaj podlewanie roślin w małych pojemnikach podczas ciepłych dni.",
    "Przejrzyj partie pod kątem chwastów i roślin wymagających przesadzenia.",
  ],
  7: [
    "W upały kontroluj wilgotność podłoża także w środku pojemników.",
    "Zanotuj straty i sprawdź, czy przyczyną nie jest przesuszenie lub zastój wody.",
  ],
  8: [
    "Zrób przegląd stanów i zaplanuj jesienne podziały oraz przesadzenia.",
    "Uzupełnij etykiety i opisy partii przed sezonem sprzedaży.",
  ],
  9: [
    "Przygotuj miejsce na jesienne przesadzenia i nowe partie.",
    "Sprawdź, czy każda partia ma aktualną lokalizację i liczbę sztuk.",
  ],
  10: [
    "Sprawdź odpływ wody z pojemników przed okresem chłodów.",
    "Zgrupuj pojemniki w osłoniętym miejscu, uwzględniając mrozoodporność odmian.",
  ],
  11: [
    "Skontroluj zimowe ustawienie pojemników i zabezpieczenie przed wiatrem.",
    "Usuń wodę stojącą w miejscach składowania i sprawdź odpływy.",
  ],
  12: [
    "Zrób kopię zapasową danych i podsumuj stany przed nowym sezonem.",
    "Zaplanuj zakupy donic, podłoża i etykiet na kolejny rok.",
  ],
};

/*
 * FUNKCJA DODATKOWA: Centrum uwagi — spina cztery już gotowe moduły w jeden
 * poranny rzut oka: plany produkcji na TEN miesiąc, mocno zaległe segmenty
 * (>60 dni bez ruchu — ten sam `daysSince` co w Zaległościach), niski stan
 * zaopatrzenia (ta sama reguła co w Zaopatrzeniu: prog!=null && ilosc<=prog)
 * i niezrealizowane zamówienia. Czysta funkcja, nic nie mutuje.
 */
export function buildAttentionCenter(now, productionPlans, batchSegments, supplies, orders, zestawy = [], inventory = {}) {
  const nowMs = now.getTime();
  const plansDue = (productionPlans || []).filter(
    (p) => p.status === "planowane" && p.plannedYear === now.getFullYear() && p.plannedMonth === now.getMonth() + 1
  );
  const staleSegments = (batchSegments || [])
    .filter((s) => s.status === "aktywny" && Number(s.ilosc || 0) > 0)
    .map((s) => ({ ...s, daysIdle: daysSince(s.updatedAt, nowMs) }))
    .filter((s) => (s.daysIdle ?? 0) > 60)
    .sort((a, b) => (b.daysIdle || 0) - (a.daysIdle || 0));
  const lowSupplies = (supplies || []).filter((s) => s.prog != null && s.prog !== "" && Number(s.ilosc) <= Number(s.prog));
  const pendingOrders = (orders || []).filter((o) => o.status !== "zrealizowane");
  const orderShortages = findOrderShortages(pendingOrders, zestawy, inventory);
  return { plansDue, staleSegments, lowSupplies, pendingOrders, orderShortages };
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

export function PulpitTab({ plants, inventory, orders, zestawy, supplies, tasks, onAddTask, onCycleTask, onDeleteTask, onJumpToLocation, onJumpToMagazynSection, onJumpToSalesSection, onExport, onImport, onGetBackupText, onImportText, batches, onJumpToBatch, batchSegments, productionPlans }) {
  const [backupOpen, setBackupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchResults = searchBatches(batches || [], plants, searchQuery);
  const attention = buildAttentionCenter(new Date(), productionPlans, batchSegments, supplies, orders, zestawy, inventory);
  const hasAttention = attention.plansDue.length > 0 || attention.staleSegments.length > 0 ||
    attention.lowSupplies.length > 0 || attention.pendingOrders.length > 0 || attention.orderShortages.length > 0;
  const locationSummary = buildLocationStockSummary(inventory, batchSegments || []);
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const seasonalTips = SEASONAL_TIPS[curMonth] || [];

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

      {hasAttention && (
        <div className="order-card" style={{ marginBottom: 12 }}>
          <div className="order-card-body">
            <div className="section-title small-title" style={{ marginTop: 0 }}>Do sprawdzenia</div>
            {attention.pendingOrders.length > 0 && (
              <button className="order-card-head" style={{ padding: "6px 0" }} onClick={() => onJumpToSalesSection("zamowienia")}>
                <span>Niezrealizowane zamówienia</span>
                <span className="status-badge new">{attention.pendingOrders.length}</span>
              </button>
            )}
            {attention.orderShortages.length > 0 && (
              <button className="order-card-head" style={{ padding: "6px 0" }} onClick={() => onJumpToSalesSection("zamowienia")}>
                <span>Braki magazynowe do zamówień</span>
                <span className="status-badge new">{attention.orderShortages.length}</span>
              </button>
            )}
            {attention.orderShortages.map((shortage) => {
              const plant = plants.find((candidate) => candidate.id === shortage.plantId);
              return (
                <button
                  className="order-card-head"
                  style={{ padding: "4px 0 4px 10px", fontSize: 12 }}
                  key={`${shortage.plantId}-${shortage.container}`}
                  onClick={() => onJumpToSalesSection("zamowienia")}
                >
                  <span>{plant ? `${plant.nazwa_pl} (${plant.odmiana})` : "Roślina"} · {shortage.container}: brakuje {shortage.shortage} szt. (potrzeba {shortage.required}, stan {shortage.available})</span>
                </button>
              );
            })}
            {attention.plansDue.length > 0 && (
              <button className="order-card-head" style={{ padding: "6px 0" }} onClick={() => onJumpToMagazynSection("plan")}>
                <span>Plany produkcji na ten miesiąc</span>
                <span className="status-badge new">{attention.plansDue.length}</span>
              </button>
            )}
            {attention.staleSegments.length > 0 && (
              <button className="order-card-head" style={{ padding: "6px 0" }} onClick={() => onJumpToMagazynSection("zaleglosci")}>
                <span>Segmenty bez ruchu ponad 60 dni</span>
                <span className="status-badge new">{attention.staleSegments.length}</span>
              </button>
            )}
            {attention.lowSupplies.length > 0 && (
              <button className="order-card-head" style={{ padding: "6px 0" }} onClick={() => onJumpToMagazynSection("zaopatrzenie")}>
                <span>Niski stan zaopatrzenia · {attention.lowSupplies.map((supply) => supply.nazwa).join(", ")}</span>
                <span className="status-badge new">{attention.lowSupplies.length}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <section className="order-card dashboard-stock">
        <div className="order-card-body">
          <div className="section-title small-title dashboard-stock-title">
            <MapPin size={16} />
            <span>Stany i lokalizacje</span>
          </div>
          <p className="hint-text dashboard-stock-total">
            Stan zarejestrowany w magazynie: <strong>{locationSummary.inventoryQty} szt.</strong>
          </p>
          {locationSummary.locations.length > 0 ? (
            <div className="dashboard-location-list">
              {[...locationSummary.locations]
                .sort((a, b) => b.totalQty - a.totalQty)
                .slice(0, 4)
                .map((group) => (
                  <button
                    className="dashboard-location-item"
                    key={group.location}
                    type="button"
                    onClick={() => onJumpToLocation(group.location)}
                  >
                    <span>{group.location}</span>
                    <span>{group.totalQty} szt. · {new Set(group.rows.map((row) => row.plantId)).size} odm.</span>
                  </button>
                ))}
              {locationSummary.locations.length > 4 && (
                <button className="ghost-btn small dashboard-location-more" type="button" onClick={() => onJumpToLocation()}>
                  Pokaż wszystkie lokalizacje ({locationSummary.locations.length})
                </button>
              )}
            </div>
          ) : (
            <p className="hint-text">Brak aktywnych partii z przypisaną lokalizacją.</p>
          )}
          {(locationSummary.unlocatedTrackedQty > 0 || locationSummary.untrackedQty > 0) && (
            <button
              className="dashboard-stock-warning"
              type="button"
              onClick={() => onJumpToLocation(null)}
            >
              Bez lokalizacji: {locationSummary.unlocatedTrackedQty} szt. w partiach
              {locationSummary.untrackedQty > 0 ? ` · ${locationSummary.untrackedQty} szt. bez ewidencji partii` : ""}
            </button>
          )}
          {locationSummary.segmentsAboveInventory.length > 0 && (
            <button
              className="dashboard-stock-warning"
              type="button"
              onClick={() => onJumpToMagazynSection("inwentaryzacja")}
            >
              <AlertTriangle size={14} />
              <span>
                Ewidencja partii przekracza stan magazynu: {locationSummary.segmentsAboveInventory.slice(0, 3).map((issue) => {
                  const plant = plants.find((candidate) => candidate.id === issue.plantId);
                  return `${plant ? `${plant.nazwa_pl} (${plant.odmiana})` : "Roślina"} ${issue.container} +${issue.difference} szt.`;
                }).join(" · ")}
                {locationSummary.segmentsAboveInventory.length > 3 ? ` · i ${locationSummary.segmentsAboveInventory.length - 3} kolejnych pozycji` : ""}
                {" — sprawdź inwentaryzację"}
              </span>
            </button>
          )}
          {locationSummary.locations.length === 0 && locationSummary.unlocatedTrackedQty === 0 && locationSummary.untrackedQty === 0 && (
            <button className="ghost-btn small" type="button" onClick={() => onJumpToLocation()}>
              Otwórz „Co mam gdzie”
            </button>
          )}
        </div>
      </section>

      <TasksSection tasks={tasks} onAdd={onAddTask} onCycle={onCycleTask} onDelete={onDeleteTask} />

      <section className="order-card seasonal-card">
        <div className="order-card-body">
          <div className="section-title small-title seasonal-title">
            <Sprout size={16} />
            <span>Radar szkółki · {MONTHS[curMonth]}</span>
          </div>
          <p className="hint-text seasonal-note">Podpowiedzi sezonowe — dopasuj je do pogody i wymagań odmian.</p>
          {seasonalTips.map((tip) => {
            const alreadyAdded = tasks.some((task) => task.text === tip && task.status !== "done");
            return (
              <div className="seasonal-tip" key={tip}>
                <span>{tip}</span>
                <button
                  className="ghost-btn small"
                  type="button"
                  onClick={() => onAddTask(tip)}
                  disabled={alreadyAdded}
                  aria-label={alreadyAdded ? "Zadanie już dodane" : `Dodaj zadanie: ${tip}`}
                >
                  {alreadyAdded ? "Dodano" : <><Plus size={14} /> Dodaj</>}
                </button>
              </div>
            );
          })}
        </div>
      </section>

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
