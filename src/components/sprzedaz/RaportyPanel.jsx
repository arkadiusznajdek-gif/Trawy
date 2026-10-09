import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, ChevronLeft, TrendingUp, TrendingDown } from "lucide-react";
import { MONTHS } from "../../constants";
import { money, computeYearlyProfitReport, computeTopVarietiesByProfit } from "../../utils/helpers";

export function RaportyPanel({ orders, zestawy, costs, overheadCosts, plants, batchSegments, inventory, cennik }) {
  const yearsInData = useMemo(() => {
    const ys = new Set([new Date().getFullYear()]);
    orders.forEach((o) => { const y = Number((o.data || "").split("-")[0]); if (y) ys.add(y); });
    return Array.from(ys).sort((a, b) => b - a);
  }, [orders]);
  const [year, setYear] = useState(yearsInData[0]);
  const [expandedMonth, setExpandedMonth] = useState(null);

  const { monthly, totals } = useMemo(
    () => computeYearlyProfitReport(orders, zestawy, costs, overheadCosts, year, batchSegments),
    [orders, zestawy, costs, overheadCosts, year, batchSegments]
  );
  const topVarieties = useMemo(() => computeTopVarietiesByProfit(orders, zestawy, costs, year, 5, batchSegments), [orders, zestawy, costs, year, batchSegments]);
  const inventoryValue = useMemo(() => {
    let cost = 0;
    let retail = 0;
    Object.entries(inventory).forEach(([plantId, row]) => {
      Object.entries(row || {}).forEach(([container, qty]) => {
        const quantity = Number(qty || 0);
        cost += quantity * Number(costs[plantId]?.[container] || 0);
        retail += quantity * Number(cennik[plantId]?.[container] || 0);
      });
    });
    return { cost, retail };
  }, [inventory, costs, cennik]);

  const pending = useMemo(
    () => orders.filter((o) => o.status !== "zrealizowane"),
    [orders]
  );
  const pendingSum = pending.reduce((s, o) => s + Number(o.suma || 0), 0);

  function plantLabel(plantId, container) {
    const p = plants.find((pp) => pp.id === plantId);
    return p ? `${p.nazwa_pl} (${p.odmiana}) · ${container}` : `${plantId} · ${container}`;
  }

  const yearIdx = yearsInData.indexOf(year);
  const canPrev = yearIdx < yearsInData.length - 1;
  const canNext = yearIdx > 0;

  return (
    <div style={{ marginTop: 4 }}>
      <div className="year-switcher">
        <button className="icon-btn" disabled={!canPrev} onClick={() => setYear(yearsInData[yearIdx + 1])}><ChevronLeft size={18} /></button>
        <span className="year-label">{year}</span>
        <button className="icon-btn" disabled={!canNext} onClick={() => setYear(yearsInData[yearIdx - 1])}><ChevronRight size={18} /></button>
      </div>

      <div className="section-title" style={{ marginTop: 8 }}>Szacunkowa wartość obecnego zapasu</div>
      <div className="stat-row" style={{ marginBottom: 8 }}>
        <div className="stat-box">
          <span className="stat-label">Koszt zapisany w magazynie</span>
          <span className="stat-value">{money(inventoryValue.cost)} zł</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Wartość wg cennika</span>
          <span className="stat-value">{money(inventoryValue.retail)} zł</span>
        </div>
      </div>
      <div className={`stat-box ${inventoryValue.retail - inventoryValue.cost < 0 ? "stat-neg" : "stat-pos"}`} style={{ marginBottom: 8 }}>
        <span className="stat-label">Szacunkowa różnica przed kosztami stałymi</span>
        <span className="stat-value">{money(inventoryValue.retail - inventoryValue.cost)} zł</span>
      </div>
      <p className="hint-text">To orientacyjna wycena niesprzedanych roślin według kosztów zapisanych przy zakupach i operacjach oraz aktualnych cen w Cenniku — nie jest to zrealizowany zysk.</p>

      <div className="stat-row" style={{ marginBottom: 8 }}>
        <div className="stat-box">
          <span className="stat-label">Przychód (rok)</span>
          <span className="stat-value">{money(totals.revenue)} zł</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Koszt sprzedanych</span>
          <span className="stat-value">{money(totals.cogs)} zł</span>
        </div>
      </div>
      <div className="stat-row" style={{ marginBottom: 8 }}>
        <div className="stat-box">
          <span className="stat-label">Koszty stałe (rok)</span>
          <span className="stat-value">{money(totals.overhead)} zł</span>
        </div>
        <div className={`stat-box ${totals.netProfit < 0 ? "stat-neg" : "stat-pos"}`}>
          <span className="stat-label">Zysk netto (rok)</span>
          <span className="stat-value">{totals.netProfit < 0 ? <TrendingDown size={15} /> : <TrendingUp size={15} />} {money(totals.netProfit)} zł</span>
        </div>
      </div>

      {pending.length > 0 && (
        <p className="hint-text">W realizacji: {pending.length} {pending.length === 1 ? "zamówienie" : "zamówień"} na {money(pendingSum)} zł — nieujęte jeszcze w zysku, dopóki nie oznaczysz ich jako zrealizowane.</p>
      )}

      <div className="section-title" style={{ marginTop: 14 }}>Miesiąc po miesiącu</div>
      <div className="order-list">
        {monthly.map((row) => {
          const isOpen = expandedMonth === row.month;
          const hasActivity = row.revenue > 0 || row.cogs > 0 || row.overhead > 0;
          return (
            <div key={row.month} className="order-card">
              <button className="order-card-head" onClick={() => setExpandedMonth(isOpen ? null : row.month)}>
                <div>
                  <div className="order-client">{MONTHS[row.month]}</div>
                  <div className="order-date">{row.ordersCount} {row.ordersCount === 1 ? "zamówienie" : "zamówień"}{!hasActivity ? " · brak ruchu" : ""}</div>
                </div>
                <div className="order-card-right">
                  <span className={`order-sum ${row.netProfit < 0 ? "neg" : ""}`}>{money(row.netProfit)} zł</span>
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </button>
              {isOpen && (
                <div className="order-card-body">
                  <div className="order-line"><span>Przychód</span><span>{money(row.revenue)} zł</span></div>
                  <div className="order-line"><span>Koszt sprzedanych</span><span>−{money(row.cogs)} zł</span></div>
                  <div className="order-line"><span>Zysk brutto</span><span>{money(row.grossProfit)} zł</span></div>
                  <div className="order-line"><span>Koszty stałe</span><span>−{money(row.overhead)} zł</span></div>
                  <div className="order-line report-total"><span>Zysk netto</span><span>{money(row.netProfit)} zł</span></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {topVarieties.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 14 }}>Najbardziej zyskowne odmiany w {year}</div>
          <div className="plant-list">
            {topVarieties.map((v, i) => (
              <div key={`${v.plantId}-${v.container}-${i}`} className="supply-card">
                <div className="supply-card-main">
                  <div className="plant-name">{i + 1}. {plantLabel(v.plantId, v.container)}</div>
                  <div className="supply-meta">
                    {v.ilosc} szt. sprzedanych · zysk {money(v.profit)} zł{v.fromZestaw ? " (częściowo z zestawów)" : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="hint-text" style={{ marginTop: 10 }}>
        Koszt sprzedanych liczony jest wg aktualnego koszt/szt. z Cennika w momencie generowania raportu — jeśli zmieniasz koszty wstecz, przeszłe miesiące też się przeliczą.
      </p>
    </div>
  );
}
