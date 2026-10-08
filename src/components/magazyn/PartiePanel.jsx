import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Camera, Trash2 } from "lucide-react";
import { containerLabel, money, formatLogTime, resizeImageToDataUrl } from "../../utils/helpers";
import { computeAllBatchStats } from "../../utils/batches";

/*
 * ETAP „Partie" (roadmapa, pkt 1): pierwszy ekran UI dla modelu Batch/
 * BatchSegment zbudowanego w etapach 1–11. CAŁKOWICIE read-only — wyłącznie
 * odczyt istniejących danych przez już gotowe, czyste funkcje z batches.js
 * (computeAllBatchStats). Nie dodaje, nie edytuje, nie usuwa niczego.
 * Model Batch/BatchSegment nie ma dziś przyjaznego, czytelnego numeru partii
 * — id jest technicznym identyfikatorem (`batch_...`), więc pokazujemy go
 * jawnie podpisany jako „ID", bez udawania, że to coś innego.
 */

export function shortId(id) {
  return id ? id.slice(-6) : "—";
}

/*
 * Przyjazny numer partii (opcja C — decyzja: 2026, po zgłoszeniu, że ID
 * wyglądało losowo, bo uid() to timestamp+losowe znaki, a shortId() brał
 * ostatnie 6 znaków = w większości losową końcówkę). Stare partie sprzed
 * tej zmiany nie mają pola `numer` — dla nich zostaje techniczne ID jako
 * fallback, żeby nic nie "zniknęło" z istniejących danych.
 */
export function batchLabel(batch) {
  if (!batch) return "—";
  if (batch.kod) return batch.kod;
  return batch.numer ? `#${batch.numer}` : `ID ${shortId(batch.id)}`;
}

export function sourceLabel(batch) {
  const src = batch.source || {};
  if (src.type === "podzial") return "Podział";
  if (src.type === "korekta") return "Korekta (nieznane pochodzenie)";
  return "Zakup";
}

export function plantName(plants, plantId) {
  const p = plants.find((pp) => pp.id === plantId);
  return p ? `${p.nazwa_pl} — ${p.odmiana}` : plantId;
}

export function PartiePanel({ plants, batches, batchSegments, onSetSegmentQuality, batchPhotos, onAddBatchPhoto, onDeleteBatchPhoto, photos, onPhotoError, jumpToBatchId, jumpToken }) {
  const [filterPlantId, setFilterPlantId] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(null);

  // FUNKCJA DODATKOWA: szybkie wyszukiwanie (Pulpit) — gdy jumpToken rośnie,
  // otwórz od razu szczegóły wskazanej partii, niezależnie od tego, co
  // aktualnie jest wybrane/filtrowane na liście.
  useEffect(() => {
    if (jumpToken) setSelectedBatchId(jumpToBatchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToken]);

  const stats = useMemo(() => computeAllBatchStats(batches, batchSegments), [batches, batchSegments]);

  const visibleBatches = useMemo(() => {
    let list = batches;
    if (filterPlantId) list = list.filter((b) => b.plantId === filterPlantId);
    if (!showClosed) list = list.filter((b) => b.status === "aktywna");
    return [...list].sort((a, b) => {
      if (a.status !== b.status) return a.status === "aktywna" ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [batches, filterPlantId, showClosed]);

  const selectedBatch = selectedBatchId ? batches.find((b) => b.id === selectedBatchId) : null;

  if (selectedBatch) {
    return (
      <BatchDetail
        batch={selectedBatch}
        batches={batches}
        batchSegments={batchSegments}
        plants={plants}
        onSelectBatch={setSelectedBatchId}
        onBack={() => setSelectedBatchId(null)}
        onSetSegmentQuality={onSetSegmentQuality}
        batchPhotos={batchPhotos}
        onAddBatchPhoto={onAddBatchPhoto}
        onDeleteBatchPhoto={onDeleteBatchPhoto}
        photos={photos}
        onPhotoError={onPhotoError}
      />
    );
  }

  return (
    <div>
      <p className="hint-text" style={{ marginTop: 12 }}>
        Przegląd partii i ich pochodzenia — wyłącznie do odczytu. Kliknij partię, żeby zobaczyć segmenty, historię i powiązania rodzic/dziecko.
      </p>

      <div className="order-form" style={{ marginTop: 4 }}>
        <label className="field">
          <span>Odmiana</span>
          <select value={filterPlantId} onChange={(e) => setFilterPlantId(e.target.value)}>
            <option value="">— wszystkie —</option>
            {plants.map((p) => <option key={p.id} value={p.id}>{p.nazwa_pl} — {p.odmiana}</option>)}
          </select>
        </label>
        <label className="checkbox-field">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
          <span>Pokaż też zamknięte partie</span>
        </label>
      </div>

      <div className="order-list">
        {visibleBatches.length === 0 && (
          <div className="empty-state">
            {batches.length === 0
              ? "Brak jeszcze żadnej śledzonej partii. Partie powstają, gdy w Zakupie/Podziale/Inwentaryzacji zaznaczysz „Śledź jako partię”."
              : "Brak partii pasujących do filtra."}
          </div>
        )}
        {visibleBatches.map((b) => {
          const s = stats[b.id];
          return (
            <div key={b.id} className="order-card">
              <button className="order-card-head" onClick={() => setSelectedBatchId(b.id)}>
                <div>
                  <div className="order-client">{plantName(plants, b.plantId)} <span className="order-date">· Partia {batchLabel(b)}</span></div>
                  <div className="order-date">
                    {sourceLabel(b, plants)} · {s.currentQty} / {b.initialQty} szt. · {s.activeSegmentCount} aktywn.{s.activeSegmentCount === 1 ? "y segment" : " segmenty/ów"}
                    {b.status === "zamknieta" ? " · zamknięta" : ""}
                  </div>
                </div>
                <div className="order-card-right">
                  <ChevronRight size={16} />
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const QUALITY_LABELS = { dobra: "Dobra", do_obserwacji: "Do obserwacji", slaba: "Słaba" };

function QualityBadge({ jakosc }) {
  if (!jakosc) return null;
  if (jakosc === "slaba") {
    return <span className="status-badge new" style={{ background: "transparent", border: "1px solid var(--danger, #c0392b)", color: "var(--danger, #c0392b)" }}>{QUALITY_LABELS.slaba}</span>;
  }
  return <span className={`status-badge ${jakosc === "dobra" ? "ok" : "new"}`}>{QUALITY_LABELS[jakosc] || jakosc}</span>;
}

function BatchDetail({ batch, batches, batchSegments, plants, onSelectBatch, onBack, onSetSegmentQuality, batchPhotos, onAddBatchPhoto, onDeleteBatchPhoto, photos, onPhotoError }) {
  const s = computeAllBatchStats([batch], batchSegments)[batch.id];
  const ownSegments = batchSegments.filter((seg) => seg.batchId === batch.id);
  const activeSegments = ownSegments.filter((seg) => seg.status === "aktywny");
  const closedSegments = ownSegments.filter((seg) => seg.status === "zamkniety");
  const [showClosedSegments, setShowClosedSegments] = useState(false);

  const parentBatch = batch.source?.parentBatchId ? batches.find((b) => b.id === batch.source.parentBatchId) : null;
  const parentSegment = batch.source?.parentSegmentId ? batchSegments.find((seg) => seg.id === batch.source.parentSegmentId) : null;
  const childBatches = batches.filter((b) => b.source?.parentBatchId === batch.id);

  return (
    <div>
      <button className="ghost-btn" style={{ marginTop: 12 }} onClick={onBack}><ChevronLeft size={15} /> Wszystkie partie</button>

      <div className="order-card" style={{ marginTop: 10 }}>
        <div className="order-card-head static">
          <div>
            <div className="order-client">{plantName(plants, batch.plantId)}</div>
            <div className="order-date">Partia {batchLabel(batch)} · {sourceLabel(batch, plants)} · {batch.status === "aktywna" ? "aktywna" : "zamknięta"}</div>
          </div>
        </div>
      </div>

      {onAddBatchPhoto && (
        <BatchPhotoGallery
          batchId={batch.id}
          entries={(batchPhotos || {})[batch.id] || []}
          photos={photos || {}}
          onAdd={onAddBatchPhoto}
          onDelete={onDeleteBatchPhoto}
          onError={onPhotoError}
        />
      )}

      {parentBatch && (
        <div className="order-card" style={{ marginTop: 8 }}>
          <button className="order-card-head" onClick={() => onSelectBatch(parentBatch.id)}>
            <div>
              <div className="order-client"><ChevronLeft size={14} style={{ verticalAlign: "middle" }} /> Partia źródłowa</div>
              <div className="order-date">
                {plantName(plants, parentBatch.plantId)} · Partia {batchLabel(parentBatch)}
                {parentSegment ? ` · segment: ${containerLabel(parentSegment.container)}${parentSegment.location ? ` (${parentSegment.location})` : ""}` : ""}
              </div>
            </div>
          </button>
        </div>
      )}

      <div className="totals-row" style={{ marginTop: 12 }}>
        <div className="totals-chip"><span className="totals-num">{s.initialQty}</span><span className="totals-label">początkowa</span></div>
        <div className="totals-chip"><span className="totals-num">{s.currentQty}</span><span className="totals-label">obecna</span></div>
        <div className="totals-chip"><span className="totals-num">{s.propagatedQty}</span><span className="totals-label">rozmnożona</span></div>
        <div className="totals-chip"><span className="totals-num">{s.lossQty}</span><span className="totals-label">strata</span></div>
        <div className="totals-chip"><span className="totals-num">{s.soldQty}</span><span className="totals-label">sprzedana</span></div>
      </div>

      <div className="section-title small-title" style={{ marginTop: 16 }}>Aktywne segmenty ({activeSegments.length})</div>
      {activeSegments.length === 0 && <div className="empty-state">Brak aktywnych segmentów.</div>}
      {activeSegments.map((seg) => (
        <div key={seg.id} className="order-card">
          <div className="order-card-head static">
            <div>
              <div className="order-client">{containerLabel(seg.container)}{seg.location ? ` — ${seg.location}` : ""} <QualityBadge jakosc={seg.jakosc} /></div>
              <div className="order-date">{seg.ilosc} szt. × {money(seg.kosztJednostkowy)} zł/szt.</div>
            </div>
            <div className="order-card-right">
              <span className="order-sum">{money(seg.ilosc * seg.kosztJednostkowy)} zł</span>
            </div>
          </div>
          {onSetSegmentQuality && (
            <div className="order-card-body">
              <label className="field">
                <span>Jakość (obserwacja — nie wpływa na ilość ani koszt)</span>
                <select value={seg.jakosc || ""} onChange={(e) => onSetSegmentQuality(seg.id, e.target.value || null)}>
                  <option value="">— nieoznaczona —</option>
                  <option value="dobra">Dobra</option>
                  <option value="do_obserwacji">Do obserwacji</option>
                  <option value="slaba">Słaba</option>
                </select>
              </label>
            </div>
          )}
        </div>
      ))}

      <div className="section-title small-title" style={{ marginTop: 16, cursor: "pointer" }} onClick={() => setShowClosedSegments((v) => !v)}>
        Zamknięte segmenty ({closedSegments.length}) {closedSegments.length > 0 ? (showClosedSegments ? "▾" : "▸") : ""}
      </div>
      {showClosedSegments && closedSegments.map((seg) => (
        <div key={seg.id} className="order-card">
          <div className="order-card-head static">
            <div>
              <div className="order-client">{containerLabel(seg.container)}{seg.location ? ` — ${seg.location}` : ""}</div>
              <div className="order-date">0 szt. (zamknięty) · ostatni koszt {money(seg.kosztJednostkowy)} zł/szt.</div>
            </div>
          </div>
        </div>
      ))}

      {childBatches.length > 0 && (
        <>
          <div className="section-title small-title" style={{ marginTop: 16 }}>Partie potomne ({childBatches.length})</div>
          {childBatches.map((cb) => (
            <div key={cb.id} className="order-card">
              <button className="order-card-head" onClick={() => onSelectBatch(cb.id)}>
                <div>
                  <div className="order-client">{plantName(plants, cb.plantId)} · Partia {batchLabel(cb)}</div>
                  <div className="order-date">{cb.status === "aktywna" ? "aktywna" : "zamknięta"}</div>
                </div>
                <div className="order-card-right"><ChevronRight size={16} /></div>
              </button>
            </div>
          ))}
        </>
      )}

      <div className="section-title small-title" style={{ marginTop: 16 }}>Historia partii</div>
      <div className="log-list">
        {batch.historia.map((h) => (
          <div key={h.id} className="log-row">
            <span className="log-time">{formatLogTime(h.ts)}</span>
            <span className="log-text">{h.opis}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/*
 * FUNKCJA DODATKOWA: galeria zdjęć w czasie per partia. Świadomie osobna od
 * PhotoThumb (miniaturka gatunku w Rośliny, zawsze jedna, nadpisywana) —
 * tu chodzi o TIMELINE: wiele zdjęć, każde z datą, żeby zobaczyć jak partia
 * zmieniała się w czasie (np. maj vs sierpień). Metadane w `batchPhotos`
 * (osobny, lekki stan w App.jsx), same obrazy w tym samym, generycznym
 * `photos`, którego już od dawna używa PhotoThumb — bez nowego mechanizmu
 * zapisu.
 */
function BatchPhotoGallery({ batchId, entries, photos, onAdd, onDelete, onError }) {
  const sorted = [...entries].sort((a, b) => new Date(b.ts) - new Date(a.ts));

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      onAdd(batchId, dataUrl);
    } catch (err) {
      onError && onError();
    }
  }

  return (
    <>
      <div className="section-title small-title" style={{ marginTop: 16 }}>Zdjęcia partii w czasie ({sorted.length})</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {sorted.map((entry) => (
          <div key={entry.id} style={{ position: "relative" }}>
            <div className="photo-thumb" style={{ width: 72, height: 72, cursor: "default" }}>
              {photos[entry.id] ? <img src={photos[entry.id]} alt="" /> : <Camera size={16} />}
            </div>
            <button
              className="icon-btn danger"
              style={{ position: "absolute", top: -6, right: -6, background: "var(--surface)", borderRadius: "50%" }}
              onClick={() => onDelete(batchId, entry.id)}
              aria-label="Usuń zdjęcie"
            >
              <Trash2 size={12} />
            </button>
            <div className="order-date" style={{ textAlign: "center", marginTop: 2, fontSize: 10 }}>{formatLogTime(entry.ts)}</div>
          </div>
        ))}
        <label className="photo-thumb" style={{ width: 72, height: 72 }} aria-label="Dodaj zdjęcie partii">
          <Camera size={16} />
          <input type="file" accept="image/*" onChange={handleFile} className="visually-hidden-input" />
        </label>
      </div>
    </>
  );
}
