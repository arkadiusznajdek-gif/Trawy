import { useState, useEffect } from "react";
import { RoslinyPanel } from "./RoslinyPanel";
import { ZakupPanel } from "./ZakupPanel";
import { PodzialPanel } from "./PodzialPanel";
import { PrzesadzeniePanel } from "./PrzesadzeniePanel";
import { PartiePanel } from "./PartiePanel";
import { CoMamGdziePanel } from "./CoMamGdziePanel";
import { ZaleglosciPanel } from "./ZaleglosciPanel";
import { PlanProdukcjiPanel } from "./PlanProdukcjiPanel";
import { ZaopatrzeniePanel } from "./ZaopatrzeniePanel";
import { StratyPanel } from "./StratyPanel";
import { InwentaryzacjaPanel } from "./InwentaryzacjaPanel";
import { HistoriaPanel } from "./HistoriaPanel";
import { KosztyStalePanel } from "./KosztyStalePanel";

export function MagazynTab(props) {
  const [sub, setSub] = useState("rosliny");
  const { plants, inventory, onQtyChange, totals, containers, potSizes, onAddPotSize,
    plantContainerSizes, onTogglePlantContainer,
    photos, setPhotos, onPhotoError, onAddPlant, onRemovePlant,
    supplies, onSupplyQtyChange, onAddSupply, onRemoveSupply, losses, onAddLoss, onDeleteLoss, cennik, log,
    costs, potRecipes, substrateCostPerL, onSetPotRecipe, onSetSubstrateCostPerL, onPerformDivision, onSettleDivision,
    onPerformPurchase, onPerformTransplant, onPerformInventoryCount, batchSegments, batches, onSetSegmentQuality,
    productionPlans, onAddPlan, onSetPlanStatus, onDeletePlan,
    batchPhotos, onAddBatchPhoto, onDeleteBatchPhoto,
    jumpToBatchId, jumpToken,
    overheadCosts, onAddOverheadCost, onDeleteOverheadCost, magazynJump } = props;

  // FUNKCJA DODATKOWA: przy przyjściu z wyszukiwania (Pulpit) przełącz od razu
  // na zakładkę Partie — reszta (wybór konkretnej partii) dzieje się niżej,
  // w samym PartiePanel, przez ten sam jumpToken.
  useEffect(() => {
    if (jumpToken) setSub("partie");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToken]);

  useEffect(() => {
    if (magazynJump?.section) setSub(magazynJump.section);
  }, [magazynJump]);

  return (
    <div className="tab-pad">
      <div className="segmented scrollable">
        <button className={sub === "rosliny" ? "active" : ""} onClick={() => setSub("rosliny")}>Rośliny</button>
        <button className={sub === "zakup" ? "active" : ""} onClick={() => setSub("zakup")}>Zakup</button>
        <button className={sub === "podzial" ? "active" : ""} onClick={() => setSub("podzial")}>Podział</button>
        <button className={sub === "przesadzenie" ? "active" : ""} onClick={() => setSub("przesadzenie")}>Przesadzenie</button>
        <button className={sub === "partie" ? "active" : ""} onClick={() => setSub("partie")}>Partie</button>
        <button className={sub === "gdzie" ? "active" : ""} onClick={() => setSub("gdzie")}>Co mam gdzie</button>
        <button className={sub === "zaleglosci" ? "active" : ""} onClick={() => setSub("zaleglosci")}>Zaległości</button>
        <button className={sub === "plan" ? "active" : ""} onClick={() => setSub("plan")}>Plan produkcji</button>
        <button className={sub === "zaopatrzenie" ? "active" : ""} onClick={() => setSub("zaopatrzenie")}>Zaopatrzenie</button>
        <button className={sub === "koszty" ? "active" : ""} onClick={() => setSub("koszty")}>Koszty stałe</button>
        <button className={sub === "straty" ? "active" : ""} onClick={() => setSub("straty")}>Straty{losses.length ? ` (${losses.length})` : ""}</button>
        <button className={sub === "inwentaryzacja" ? "active" : ""} onClick={() => setSub("inwentaryzacja")}>Inwentaryzacja</button>
        <button className={sub === "historia" ? "active" : ""} onClick={() => setSub("historia")}>Historia</button>
      </div>
      {sub === "rosliny" && (
        <RoslinyPanel plants={plants} inventory={inventory} onQtyChange={onQtyChange} totals={totals}
          containers={containers} potSizes={potSizes} onAddPotSize={onAddPotSize}
          plantContainerSizes={plantContainerSizes} onTogglePlantContainer={onTogglePlantContainer}
          photos={photos} setPhotos={setPhotos} onPhotoError={onPhotoError} onAddPlant={onAddPlant} onRemovePlant={onRemovePlant}
          onSettleDivision={onSettleDivision} />
      )}
      {sub === "zakup" && (
        <ZakupPanel plants={plants} containers={containers} plantContainerSizes={plantContainerSizes}
          onPerformPurchase={onPerformPurchase} />
      )}
      {sub === "podzial" && (
        <PodzialPanel plants={plants} inventory={inventory} containers={containers} plantContainerSizes={plantContainerSizes}
          costs={costs} potRecipes={potRecipes} substrateCostPerL={substrateCostPerL} onPerformDivision={onPerformDivision}
          batchSegments={batchSegments} batches={batches} />
      )}
      {sub === "przesadzenie" && (
        <PrzesadzeniePanel plants={plants} inventory={inventory} containers={containers} plantContainerSizes={plantContainerSizes}
          costs={costs} potRecipes={potRecipes} substrateCostPerL={substrateCostPerL} batchSegments={batchSegments}
          onPerformTransplant={onPerformTransplant} batches={batches} />
      )}
      {sub === "partie" && (
        <PartiePanel plants={plants} batches={batches} batchSegments={batchSegments} onSetSegmentQuality={onSetSegmentQuality}
          batchPhotos={batchPhotos} onAddBatchPhoto={onAddBatchPhoto} onDeleteBatchPhoto={onDeleteBatchPhoto} photos={photos} onPhotoError={onPhotoError}
          jumpToBatchId={jumpToBatchId} jumpToken={jumpToken} />
      )}
      {sub === "gdzie" && (
        <CoMamGdziePanel
          plants={plants}
          inventory={inventory}
          batchSegments={batchSegments}
          batches={batches}
          jumpToken={magazynJump?.section === "gdzie" ? magazynJump.token : 0}
          jumpLocation={magazynJump?.location}
        />
      )}
      {sub === "zaleglosci" && (
        <ZaleglosciPanel plants={plants} batches={batches} batchSegments={batchSegments} />
      )}
      {sub === "plan" && (
        <PlanProdukcjiPanel plants={plants} batchSegments={batchSegments} batches={batches} productionPlans={productionPlans}
          onAddPlan={onAddPlan} onSetStatus={onSetPlanStatus} onDeletePlan={onDeletePlan} />
      )}
      {sub === "zaopatrzenie" && (
        <ZaopatrzeniePanel supplies={supplies} onChangeQty={onSupplyQtyChange} onAdd={onAddSupply} onRemove={onRemoveSupply}
          potSizes={potSizes} potRecipes={potRecipes} substrateCostPerL={substrateCostPerL}
          onSetPotRecipe={onSetPotRecipe} onSetSubstrateCostPerL={onSetSubstrateCostPerL} />
      )}
      {sub === "koszty" && (
        <KosztyStalePanel costs={overheadCosts} onAdd={onAddOverheadCost} onDelete={onDeleteOverheadCost} />
      )}
      {sub === "straty" && (
        <StratyPanel plants={plants} inventory={inventory} containers={containers} plantContainerSizes={plantContainerSizes}
          losses={losses} onAdd={onAddLoss} onDelete={onDeleteLoss} costs={costs} batchSegments={batchSegments} batches={batches} />
      )}
      {sub === "inwentaryzacja" && (
        <InwentaryzacjaPanel plants={plants} inventory={inventory} containers={containers} plantContainerSizes={plantContainerSizes}
          batchSegments={batchSegments} onPerformInventoryCount={onPerformInventoryCount} batches={batches} />
      )}
      {sub === "historia" && <HistoriaPanel log={log} />}
    </div>
  );
}
