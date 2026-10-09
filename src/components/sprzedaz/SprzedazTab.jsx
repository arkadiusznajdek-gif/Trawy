import { useState } from "react";
import { CennikPanel } from "./CennikPanel";
import { ZestawyPanel } from "./ZestawyPanel";
import { ZamowieniaPanel } from "./ZamowieniaPanel";
import { KlienciPanel } from "./KlienciPanel";
import { RaportyPanel } from "./RaportyPanel";
import { ProjektantRabaty } from "./ProjektantRabaty";

export function SprzedazTab({ plants, inventory, potSizes, plantContainerSizes, cennik, setCennik, costs, potRecipes, substrateCostPerL, orders, onCreateOrder, onDeleteOrder, onFulfillOrder, zestawy, setZestawy, clients, onAddClient, onDeleteClient, overheadCosts, batchSegments, batches }) {
  const [sub, setSub] = useState("cennik");
  return (
    <div className="tab-pad">
      <div className="segmented scrollable">
        <button className={sub === "cennik" ? "active" : ""} onClick={() => setSub("cennik")}>Cennik</button>
        <button className={sub === "zestawy" ? "active" : ""} onClick={() => setSub("zestawy")}>Zestawy{zestawy.length ? ` (${zestawy.length})` : ""}</button>
        <button className={sub === "zamowienia" ? "active" : ""} onClick={() => setSub("zamowienia")}>Zamówienia{orders.length ? ` (${orders.length})` : ""}</button>
        <button className={sub === "klienci" ? "active" : ""} onClick={() => setSub("klienci")}>Klienci{clients.length ? ` (${clients.length})` : ""}</button>
        <button className={sub === "raporty" ? "active" : ""} onClick={() => setSub("raporty")}>Raporty</button>
      </div>
      {sub === "cennik" && <CennikPanel plants={plants} potSizes={potSizes} plantContainerSizes={plantContainerSizes} cennik={cennik} setCennik={setCennik} potRecipes={potRecipes} substrateCostPerL={substrateCostPerL} />}
      {sub === "zestawy" && (
        <>
          <ProjektantRabaty plants={plants} inventory={inventory} potSizes={potSizes} plantContainerSizes={plantContainerSizes} cennik={cennik} setZestawy={setZestawy} />
          <ZestawyPanel plants={plants} potSizes={potSizes} plantContainerSizes={plantContainerSizes} zestawy={zestawy} setZestawy={setZestawy} cennik={cennik} />
        </>
      )}
      {sub === "zamowienia" && (
        <ZamowieniaPanel plants={plants} potSizes={potSizes} plantContainerSizes={plantContainerSizes} cennik={cennik} orders={orders} onCreateOrder={onCreateOrder}
          onDeleteOrder={onDeleteOrder} onFulfillOrder={onFulfillOrder} zestawy={zestawy} clients={clients} batches={batches} batchSegments={batchSegments} />
      )}
      {sub === "klienci" && <KlienciPanel clients={clients} orders={orders} onAdd={onAddClient} onDelete={onDeleteClient} />}
      {sub === "raporty" && <RaportyPanel orders={orders} zestawy={zestawy} costs={costs} overheadCosts={overheadCosts} plants={plants} batchSegments={batchSegments} />}
    </div>
  );
}
