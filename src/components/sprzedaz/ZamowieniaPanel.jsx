import { useState } from "react";
import { AlertCircle, Boxes, Plus, Trash2 } from "lucide-react";
import { clampInt, money, resolvePotContainers, uid, containerLabel } from "../../utils/helpers";
import { plantName, batchLabel } from "../magazyn/PartiePanel";
import { NumberInput } from "../shared/NumberInput";

function clampModuleQty(v) {
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0.1;
  return Math.round(n * 10) / 10;
}

/*
 * FUNKCJA DODATKOWA: lista do zbiórki. Mirror DOKŁADNIE tej samej polityki
 * FIFO (po createdAt segmentu), którą etap 9 przyjął dla rzeczywistej
 * sprzedaży (App.jsx, sellFromSegments) — to tylko PODGLĄD tego, co i tak
 * by się stało przy realizacji, pokazany wcześniej, żeby wiedzieć gdzie
 * fizycznie iść. Czysta funkcja, nic nie mutuje, nic nie rezerwuje.
 * Pozycje bez pokrycia w żadnym segmencie (towar "gołe") trafiają jako
 * osobny wiersz z location=null — jawnie, nie zgadujemy skąd je wziąć.
 */
export function buildPickingList(order, zestawy, batchSegments) {
  const needed = {};
  function addNeed(plantId, container, qty) {
    needed[plantId] = needed[plantId] || {};
    needed[plantId][container] = (needed[plantId][container] || 0) + qty;
  }
  (order.pozycje || []).forEach((it) => {
    if (it.kind === "plant") {
      addNeed(it.plantId, it.container, Number(it.ilosc || 0));
    } else if (it.kind === "zestaw") {
      const z = zestawy.find((zz) => zz.id === it.zestawId);
      if (z) (z.pozycje || []).forEach((comp) => addNeed(comp.plantId, comp.container, Number(comp.ilosc || 0) * Number(it.ilosc || 0)));
    }
  });

  const items = [];
  Object.entries(needed).forEach(([plantId, row]) => {
    Object.entries(row).forEach(([container, qty]) => {
      let remaining = qty;
      const candidates = (batchSegments || [])
        .filter((s) => s.plantId === plantId && s.container === container && s.status === "aktywny" && Number(s.ilosc || 0) > 0)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      for (const seg of candidates) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, Number(seg.ilosc || 0));
        if (take <= 0) continue;
        items.push({ plantId, container, location: seg.location, ilosc: take, batchId: seg.batchId, segmentId: seg.id });
        remaining -= take;
      }
      if (remaining > 0) {
        items.push({ plantId, container, location: null, ilosc: remaining, batchId: null, segmentId: null });
      }
    });
  });
  return items;
}

export function ZamowieniaPanel({ plants, potSizes, plantContainerSizes, cennik, orders, onCreateOrder, onDeleteOrder, onFulfillOrder, zestawy, clients, batches, batchSegments }) {
  const [formOpen, setFormOpen] = useState(false);
  const [klient, setKlient] = useState("");
  const [items, setItems] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [fulfillingId, setFulfillingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  function makePlantItemLocal() {
    const plant = plants[0];
    const avail = resolvePotContainers(plantContainerSizes, potSizes, plant ? plant.id : "");
    const container = avail[0] || potSizes[0] || "P9";
    const cena = plant ? (cennik[plant.id]?.[container] ?? 0) : 0;
    return { kind: "plant", plantId: plant ? plant.id : "", container, ilosc: "", cena };
  }
  function makeZestawItemLocal() {
    const z = zestawy[0];
    if (!z) return null;
    return { kind: "zestaw", zestawId: z.id, ilosc: "", cena: z.cena || 0 };
  }
  function openForm() { setItems([makePlantItemLocal()]); setFormOpen(true); }
  function resetForm() { setKlient(""); setItems(null); setFormOpen(false); }

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, ...patch };
      if (next.kind === "plant" && patch.plantId !== undefined) {
        const avail = resolvePotContainers(plantContainerSizes, potSizes, next.plantId);
        if (!avail.includes(next.container)) next.container = avail[0] || potSizes[0];
      }
      if (next.kind === "plant" && (patch.plantId !== undefined || patch.container !== undefined)) {
        const cn = cennik[next.plantId]?.[next.container];
        next.cena = cn !== undefined ? cn : 0;
      }
      if (next.kind === "zestaw" && patch.zestawId !== undefined) {
        const z = zestawy.find((zz) => zz.id === next.zestawId);
        next.cena = z ? z.cena : 0;
      }
      return next;
    }));
  }
  function addPlantItem() { setItems((prev) => [...prev, makePlantItemLocal()]); }
  function addZestawItem() { const zi = makeZestawItemLocal(); if (!zi) return; setItems((prev) => [...prev, zi]); }
  function removeItem(idx) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

  const orderSum = (items || []).reduce((s, it) => s + Number(it.ilosc || 0) * Number(it.cena || 0), 0);
  const hasUnpricedPlant = (items || []).some((it) => it.kind === "plant" && !cennik[it.plantId]?.[it.container] && it.cena === 0);

  function labelFor(it) {
    if (it.kind === "plant") {
      const p = plants.find((pp) => pp.id === it.plantId);
      return p ? `${p.nazwa_pl} (${p.odmiana}) · ${it.container}` : "Roślina";
    }
    const z = zestawy.find((zz) => zz.id === it.zestawId);
    return z ? `Zestaw: ${z.nazwa}` : "Zestaw";
  }

  function saveOrder() {
    if (!klient.trim() || !items || items.length === 0 || items.some((it) => clampInt(it.ilosc, 0) <= 0)) return;
    const matched = clients.find((c) => c.nazwa.trim().toLowerCase() === klient.trim().toLowerCase());
    const pozycje = items.map((it) => ({ ...it, nazwa: labelFor(it) }));
    const order = {
      id: uid("o"), klient: klient.trim(), klientId: matched ? matched.id : null,
      data: new Date().toISOString().slice(0, 10), status: "nowe", pozycje, suma: orderSum,
    };
    onCreateOrder(order);
    resetForm();
  }
  function handleFulfill(order, deduct) { onFulfillOrder(order, deduct); setFulfillingId(null); }
  function handleDelete(id) { onDeleteOrder(id); setConfirmingId(null); }

  return (
    <div>
      {!formOpen ? (
        <button className="primary-btn" style={{ marginTop: 12 }} onClick={openForm}><Plus size={17} /> Nowe zamówienie</button>
      ) : (
        <div className="order-form">
          <label className="field">
            <span>Klient</span>
            <input list="clients-dl" value={klient} onChange={(e) => setKlient(e.target.value)} placeholder="Imię, nazwa firmy…" />
            <datalist id="clients-dl">{clients.map((c) => <option key={c.id} value={c.nazwa} />)}</datalist>
          </label>

          <div className="section-title small-title">Podgląd zamówienia</div>

          {items.map((it, idx) => (
            <div key={idx} className="order-item-row">
              {it.kind === "plant" ? (
                <>
                  <select value={it.plantId} onChange={(e) => updateItem(idx, { plantId: e.target.value })}>
                    {plants.map((p) => <option key={p.id} value={p.id}>{p.nazwa_pl} — {p.odmiana}</option>)}
                  </select>
                  <div className="order-item-sub">
                    <select value={it.container} onChange={(e) => updateItem(idx, { container: e.target.value })}>
                      {potSizes.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <NumberInput inputMode="numeric" min="1" value={it.ilosc} onChange={(e) => updateItem(idx, { ilosc: e.target.value })} placeholder="Ilość" />
                    <div className="price-input-wrap small">
                      <NumberInput inputMode="decimal" min="0" value={it.cena} onChange={(e) => updateItem(idx, { cena: Math.max(0, Number(e.target.value) || 0) })} />
                      <span className="pln">zł</span>
                    </div>
                    {items.length > 1 && <button className="icon-btn danger" onClick={() => removeItem(idx)}><Trash2 size={15} /></button>}
                  </div>
                  {!cennik[it.plantId]?.[it.container] && (
                    <div className="price-warning"><AlertCircle size={12} /> Brak ceny w cenniku — wpisz ręcznie</div>
                  )}
                </>
              ) : (
                <>
                  <select value={it.zestawId} onChange={(e) => updateItem(idx, { zestawId: e.target.value })}>
                    {zestawy.map((z) => (
                      <option key={z.id} value={z.id}>
                        Zestaw: {z.nazwa}{z.dlugosc_mb ? ` · ${z.dlugosc_mb} mb${z.szerokosc_m ? ` × ${z.szerokosc_m} m` : ""}` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="order-item-sub">
                    <NumberInput inputMode="decimal" min="0.1" step="0.1" value={it.ilosc} onChange={(e) => updateItem(idx, { ilosc: e.target.value })} placeholder="Ilość" />
                    <div className="price-input-wrap small">
                      <NumberInput inputMode="decimal" min="0" value={it.cena} onChange={(e) => updateItem(idx, { cena: Math.max(0, Number(e.target.value) || 0) })} />
                      <span className="pln">zł</span>
                    </div>
                    {items.length > 1 && <button className="icon-btn danger" onClick={() => removeItem(idx)}><Trash2 size={15} /></button>}
                  </div>
                  {(() => {
                    const z = zestawy.find((zz) => zz.id === it.zestawId);
                    return z?.dlugosc_mb ? (
                      <p className="hint-text" style={{ margin: "2px 0 0" }}>
                        = {(Number(it.ilosc || 0) * z.dlugosc_mb).toFixed(1)} mb
                        {z.szerokosc_m ? ` · szerokość ${z.szerokosc_m} m` : ""}
                      </p>
                    ) : null;
                  })()}
                </>
              )}
              <div className="order-item-subtotal">= {money(Number(it.ilosc || 0) * Number(it.cena || 0))} zł</div>
            </div>
          ))}

          <div className="form-actions" style={{ marginTop: 0 }}>
            <button className="ghost-btn" onClick={addPlantItem}><Plus size={15} /> Roślina</button>
            {zestawy.length > 0 && <button className="ghost-btn" onClick={addZestawItem}><Boxes size={15} /> Zestaw</button>}
          </div>

          {hasUnpricedPlant && <div className="price-warning"><AlertCircle size={12} /> Niektóre pozycje mają cenę 0 zł — sprawdź przed zapisem.</div>}

          <div className="order-total">Razem: <strong>{money(orderSum)} zł</strong></div>

          <div className="form-actions">
            <button className="secondary-btn" onClick={resetForm}>Anuluj</button>
            <button className="primary-btn" disabled={!klient.trim() || items.some((it) => clampInt(it.ilosc, 0) <= 0)} onClick={saveOrder}>Zapisz zamówienie</button>
          </div>
        </div>
      )}

      <div className="order-list">
        {orders.length === 0 && !formOpen && <div className="empty-state">Brak zamówień. Dodaj pierwsze powyżej.</div>}
        {orders.map((o) => {
          const isOpen = expandedId === o.id;
          return (
            <div key={o.id} className="order-card">
              <button className="order-card-head" onClick={() => setExpandedId(isOpen ? null : o.id)}>
                <div>
                  <div className="order-client">{o.klient}</div>
                  <div className="order-date">{o.data} · {o.pozycje.length} poz.</div>
                </div>
                <div className="order-card-right">
                  <span className="order-sum">{money(o.suma)} zł</span>
                  <span className={`status-badge ${o.status === "zrealizowane" ? "ok" : "new"}`}>{o.status === "zrealizowane" ? "Zrealizowane" : "Nowe"}</span>
                </div>
              </button>
              {isOpen && (
                <div className="order-card-body">
                  {o.pozycje.map((it, i) => {
                    const z = it.kind === "zestaw" ? zestawy.find((zz) => zz.id === it.zestawId) : null;
                    return (
                      <div key={i} className="order-line">
                        <span>
                          {it.nazwa || labelFor(it)} × {it.ilosc}
                          {z?.dlugosc_mb ? ` (${(Number(it.ilosc || 0) * z.dlugosc_mb).toFixed(1)} mb${z.szerokosc_m ? ` × ${z.szerokosc_m} m` : ""})` : ""}
                        </span>
                        <span>{money(it.ilosc * it.cena)} zł</span>
                      </div>
                    );
                  })}
                  <div className="order-card-actions">
                    {o.status !== "zrealizowane" && (() => {
                      const pickItems = buildPickingList(o, zestawy, batchSegments);
                      return pickItems.length > 0 && (
                        <div style={{ width: "100%" }}>
                          <div className="section-title small-title" style={{ marginTop: 0 }}>Lista do zbiórki</div>
                          {pickItems.map((p, i) => (
                            <div key={i} className="hint-text" style={{ marginBottom: 2 }}>
                              {p.location
                                ? `${p.ilosc} szt. ${plantName(plants, p.plantId)}, ${containerLabel(p.container)} — ${p.location} (partia ${batchLabel((batches || []).find((b) => b.id === p.batchId))})`
                                : `${p.ilosc} szt. ${plantName(plants, p.plantId)}, ${containerLabel(p.container)} — lokalizacja nieznana (towar bez śledzonej partii)`}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    {o.status !== "zrealizowane" && fulfillingId !== o.id && (
                      <button className="secondary-btn" onClick={() => setFulfillingId(o.id)}>Oznacz jako zrealizowane</button>
                    )}
                    {fulfillingId === o.id && (
                      <div className="confirm-box">
                        <span>Odjąć te ilości z magazynu?</span>
                        <div className="confirm-actions">
                          <button className="primary-btn small" onClick={() => handleFulfill(o, true)}>Tak, odejmij</button>
                          <button className="secondary-btn small" onClick={() => handleFulfill(o, false)}>Nie, tylko oznacz</button>
                          <button className="ghost-btn small" onClick={() => setFulfillingId(null)}>Anuluj</button>
                        </div>
                      </div>
                    )}
                    {confirmingId !== o.id ? (
                      <button className="icon-btn danger" onClick={() => setConfirmingId(o.id)}><Trash2 size={15} /></button>
                    ) : (
                      <div className="confirm-box">
                        <span>Usunąć zamówienie?</span>
                        <div className="confirm-actions">
                          <button className="danger-btn small" onClick={() => handleDelete(o.id)}>Usuń</button>
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

/* ---- Klienci ---- */
