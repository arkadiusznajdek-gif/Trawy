import { useState, useEffect, useMemo, useRef } from "react";
import { AlertCircle } from "lucide-react";

import { PLANTS } from "./data/plants";
import { DEFAULT_SUPPLIES, DEFAULT_POT_SIZES, DEFAULT_TENANT_ID, DEFAULT_LABEL_SETTINGS } from "./constants";
import { uid, clampInt, money, containerLabel, costOfContainer, findSupplyByContainer, findSubstrateSupply, monthsToRomanText, deriveContainerSizes, migrateSupplies } from "./utils/helpers";
import { loadKey, saveKey, deleteKey, listPhotoKeys, useDebouncedSave, tenantKey } from "./utils/storage";
import { createBatch, createSegment, divideSegment, transplantSegment, recordSegmentLoss, recordSegmentRemoval, recordSegmentInventoryCorrection, recordSegmentSale, setSegmentQuality } from "./utils/batches";
import { createProductionPlan, setPlanStatus } from "./utils/productionPlans";

import { Header } from "./components/layout/Header";
import { BottomNav } from "./components/layout/BottomNav";
import { PulpitTab } from "./components/pulpit/PulpitTab";
import { MagazynTab } from "./components/magazyn/MagazynTab";
import { HarmonogramTab } from "./components/harmonogram/HarmonogramTab";
import { SprzedazTab } from "./components/sprzedaz/SprzedazTab";
import { EtykietyTab } from "./components/etykiety/EtykietyTab";
import { GlobalStyle } from "./styles/GlobalStyle";

/*
 * Zapis danych jest skonsolidowany do 3 kluczy zamiast dawnych ~17, żeby
 * ograniczyć liczbę równoległych wywołań storage:
 *  - "core-data"     — inventory, cennik, orders, zestawy, costs (dane transakcyjne)
 *  - "config-data"   — potSizes, plantContainerSizes, potRecipes, substrateCostPerL,
 *                       supplies, customPlants, clients (dane konfiguracyjne)
 *  - "activity-data" — done, customTasks, losses, log, tasks (aktywność/terminarz)
 * Zdjęcia zostają osobno, po jednym kluczu na roślinę ("photo:{plantId}"),
 * żeby uniknąć jednego dużego blobu bliskiego limitowi rozmiaru.
 */

const KNOWN_IMPORT_KEYS = [
  "inventory", "cennik", "zamowienia", "schedule-done", "custom-tasks", "zestawy",
  "photos", "custom-plants", "clients", "losses", "log", "supplies", "pot-sizes",
  "plant-container-sizes", "pot-recipes", "substrate-cost-per-l", "koszty", "tasks-general",
  "overhead-costs", "batches", "batch-segments", "production-plans", "batch-photos",
  "piorin-number", "origin-country", "thermal-label-size", "label-settings",
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("pulpit");

  const [inventory, setInventory] = useState({});
  const [cennik, setCennik] = useState({});
  const [orders, setOrders] = useState([]);
  const [done, setDone] = useState({});
  const [customTasks, setCustomTasks] = useState({});
  const [zestawy, setZestawy] = useState([]);
  const [photos, setPhotos] = useState({});
  const [customPlants, setCustomPlants] = useState([]);
  const [clients, setClients] = useState([]);
  const [losses, setLosses] = useState([]);
  const [log, setLog] = useState([]);
  const [supplies, setSupplies] = useState(DEFAULT_SUPPLIES);
  const potSizes = useMemo(() => {
    const derived = deriveContainerSizes(supplies);
    return derived.length ? derived : DEFAULT_POT_SIZES;
  }, [supplies]);
  const [plantContainerSizes, setPlantContainerSizes] = useState({});
  const [potRecipes, setPotRecipes] = useState({});
  const [substrateCostPerL, setSubstrateCostPerL] = useState(0);
  const [piorinNumber, setPiorinNumber] = useState("");
  const [originCountry, setOriginCountry] = useState("PL");
  const [thermalLabelSize, setThermalLabelSize] = useState({ width: 40, height: 30 });
  const [labelSettings, setLabelSettings] = useState(DEFAULT_LABEL_SETTINGS);
  const [costs, setCosts] = useState({});
  const [toast, setToast] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [overheadCosts, setOverheadCosts] = useState([]);
  const [productionPlans, setProductionPlans] = useState([]);
  const [batchPhotos, setBatchPhotos] = useState({});

  /*
   * ETAP 1 (fundament): Batch/BatchSegment — śledzenie pochodzenia roślin.
   * Nieużywane jeszcze przez żaden ekran; istnieją tu wyłącznie jako stan
   * i zapis, gotowe do podłączenia w kolejnym etapie. Nie wpływają na
   * `inventory`/`costs` ani na zachowanie istniejących ekranów.
   */
  const [batches, setBatches] = useState([]);
  const [batchSegments, setBatchSegments] = useState([]);
  const [undoCount, setUndoCount] = useState(0);
  const undoStackRef = useRef([]);
  const pendingUndoRef = useRef(null);
  const previousUndoSnapshotRef = useRef(null);

  function notify(msg, type) {
    setToast({ msg, type: type || "error" });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    (async () => {
      const [core, config, activity, photoKeys, batchesLoaded] = await Promise.all([
        loadKey("core-data", {}),
        loadKey("config-data", {}),
        loadKey("activity-data", {}),
        listPhotoKeys(),
        loadKey(tenantKey("batches-data", DEFAULT_TENANT_ID), { batches: [], segments: [] }),
      ]);

      setInventory(core.inventory || {});
      setCennik(core.cennik || {});
      setOrders(core.orders || []);
      setZestawy(core.zestawy || []);
      setCosts(core.costs || {});

      setPlantContainerSizes(config.plantContainerSizes || {});
      setPotRecipes(config.potRecipes || {});
      setSubstrateCostPerL(config.substrateCostPerL || 0);
      const { supplies: migratedSupplies } = migrateSupplies(config.supplies || DEFAULT_SUPPLIES, config.potSizes || DEFAULT_POT_SIZES);
      setSupplies(migratedSupplies);
      setCustomPlants(config.customPlants || []);
      setClients(config.clients || []);
      setPiorinNumber(config.piorinNumber || "");
      setOriginCountry(config.originCountry || "PL");
      setThermalLabelSize(config.thermalLabelSize || { width: 40, height: 30 });
      setLabelSettings({
        ...DEFAULT_LABEL_SETTINGS,
        ...(config.labelSettings || {}),
        labelFields: { ...DEFAULT_LABEL_SETTINGS.labelFields, ...(config.labelSettings?.labelFields || {}) },
      });

      setDone(activity.done || {});
      setCustomTasks(activity.customTasks || {});
      setLosses(activity.losses || []);
      setLog(activity.log || []);
      setTasks(activity.tasks || []);
      setOverheadCosts(activity.overheadCosts || []);
      setProductionPlans(activity.productionPlans || []);
      setBatchPhotos(activity.batchPhotos || {});

      setBatches(batchesLoaded.batches || []);
      setBatchSegments(batchesLoaded.segments || []);

      const photoEntries = await Promise.all(
        photoKeys.map(async (key) => {
          const val = await loadKey(key, null);
          return [key.replace("photo:", ""), val];
        })
      );
      const ph = {};
      photoEntries.forEach(([id, val]) => { if (val) ph[id] = val; });
      setPhotos(ph);
      photosLoadedRef.current = ph;

      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coreData = useMemo(() => ({ inventory, cennik, orders, zestawy, costs }), [inventory, cennik, orders, zestawy, costs]);
  const configData = useMemo(
    () => ({ potSizes, plantContainerSizes, potRecipes, substrateCostPerL, supplies, customPlants, clients, piorinNumber, originCountry, thermalLabelSize, labelSettings }),
    [potSizes, plantContainerSizes, potRecipes, substrateCostPerL, supplies, customPlants, clients, piorinNumber, originCountry, thermalLabelSize, labelSettings]
  );
  const activityData = useMemo(() => ({ done, customTasks, losses, log, tasks, overheadCosts, productionPlans, batchPhotos }), [done, customTasks, losses, log, tasks, overheadCosts, productionPlans, batchPhotos]);
  const undoableSnapshot = useMemo(
    () => ({
      inventory, cennik, orders, done, customTasks, zestawy, customPlants, clients, losses, log,
      supplies, plantContainerSizes, potRecipes, substrateCostPerL, piorinNumber, originCountry,
      thermalLabelSize, labelSettings, costs, tasks, overheadCosts, productionPlans, batchPhotos, batches, batchSegments,
    }),
    [
      inventory, cennik, orders, done, customTasks, zestawy, customPlants, clients, losses, log,
      supplies, plantContainerSizes, potRecipes, substrateCostPerL, piorinNumber, originCountry,
      thermalLabelSize, labelSettings, costs, tasks, overheadCosts, productionPlans, batchPhotos, batches, batchSegments,
    ]
  );

  useDebouncedSave("core-data", coreData, ready, notify);
  useDebouncedSave("config-data", configData, ready, notify);
  useDebouncedSave("activity-data", activityData, ready, notify);

  /*
   * ETAP 1: zapis partii/segmentów pod osobnym, prefiksowanym tenantId kluczem.
   * Celowo NIE dołączam tego do istniejących trzech grup (core/config/activity),
   * żeby zmiana była w 100% addytywna i nie dotykała już działającego zapisu.
   */
  const batchesData = useMemo(() => ({ batches, segments: batchSegments }), [batches, batchSegments]);
  useDebouncedSave(tenantKey("batches-data", DEFAULT_TENANT_ID), batchesData, ready, notify);

  useEffect(() => {
    if (!ready) return;

    const currentSnapshot = JSON.stringify(undoableSnapshot);
    if (previousUndoSnapshotRef.current === null) {
      previousUndoSnapshotRef.current = currentSnapshot;
      return;
    }
    if (previousUndoSnapshotRef.current === currentSnapshot) return;

    const pending = pendingUndoRef.current;
    if (pending) {
      clearTimeout(pending.timer);
    } else {
      pendingUndoRef.current = {
        snapshot: JSON.parse(previousUndoSnapshotRef.current),
        timer: null,
      };
    }
    previousUndoSnapshotRef.current = currentSnapshot;
    setUndoCount(undoStackRef.current.length + 1);

    pendingUndoRef.current.timer = setTimeout(() => {
      const completed = pendingUndoRef.current;
      if (!completed) return;
      undoStackRef.current = [...undoStackRef.current, completed.snapshot].slice(-10);
      pendingUndoRef.current = null;
      setUndoCount(undoStackRef.current.length);
    }, 900);
  }, [ready, undoableSnapshot]);

  useEffect(() => () => {
    if (pendingUndoRef.current) clearTimeout(pendingUndoRef.current.timer);
  }, []);

  // Zdjęcia: zapisywane pojedynczo, tylko te, które faktycznie się zmieniły.
  const photosLoadedRef = useRef({});
  useEffect(() => {
    if (!ready) return;
    const prev = photosLoadedRef.current;
    Object.entries(photos).forEach(([id, dataUrl]) => {
      if (prev[id] !== dataUrl) {
        saveKey(`photo:${id}`, dataUrl).then((ok) => {
          if (!ok) notify("Nie udało się zapisać zdjęcia — spróbuj mniejsze/inne zdjęcie.");
        });
      }
    });
    photosLoadedRef.current = photos;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, ready]);

  const allPlants = useMemo(() => {
    const legacyGautierFescue = customPlants.find((plant) =>
      /gautier/i.test(plant.odmiana || "") &&
      /nied.wiedzie futro/i.test((plant.odmiana || "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    );
    return [
      ...PLANTS.map((plant) =>
        plant.id === "p27" && legacyGautierFescue
          ? { ...plant, id: legacyGautierFescue.id }
          : plant
      ),
      ...customPlants.filter((plant) => plant.id !== legacyGautierFescue?.id),
    ];
  }, [customPlants]);
  const containers = useMemo(() => [...potSizes, "grunt"], [potSizes]);

  const totals = useMemo(() => {
    const t = {};
    containers.forEach((c) => { t[c] = 0; });
    Object.values(inventory).forEach((row) => {
      containers.forEach((c) => { t[c] += Number(row?.[c] || 0); });
    });
    return t;
  }, [inventory, containers]);
  const potsTotal = useMemo(() => potSizes.reduce((s, c) => s + Number(totals[c] || 0), 0), [totals, potSizes]);
  const magazynValue = useMemo(() => {
    let v = 0;
    Object.entries(inventory).forEach(([plantId, row]) => {
      Object.entries(row || {}).forEach(([container, qty]) => {
        v += Number(qty || 0) * Number(costs[plantId]?.[container] || 0);
      });
    });
    return v;
  }, [inventory, costs]);
  const salesValue = useMemo(() => {
    let v = 0;
    Object.entries(inventory).forEach(([plantId, row]) => {
      Object.entries(row || {}).forEach(([container, qty]) => {
        v += Number(qty || 0) * Number(cennik[plantId]?.[container] || 0);
      });
    });
    return v;
  }, [inventory, cennik]);

  function addPotSize(name) {
    const trimmed = (name || "").trim();
    if (!trimmed || trimmed.toLowerCase() === "grunt") return;
    if (potSizes.some((p) => p.toLowerCase() === trimmed.toLowerCase())) { notify(`Rozmiar „${trimmed}” już istnieje.`); return; }
    setSupplies((prev) => [...prev, { id: uid("sup"), nazwa: `Donice ${trimmed} (puste)`, ilosc: 0, jednostka: "szt.", prog: null, cena: 0, typ: "donica", rozmiar: trimmed }]);
    pushLog(`Dodano rozmiar pojemnika (jako materiał w Zaopatrzeniu): ${trimmed}`);
  }
  function togglePlantContainer(plantId, container) {
    const current = plantContainerSizes[plantId] && plantContainerSizes[plantId].length ? plantContainerSizes[plantId] : containers;
    const isActive = current.includes(container);
    if (isActive) {
      if (current.length <= 1) { notify("Ta odmiana musi mieć przynajmniej jeden dostępny rozmiar pojemnika."); return; }
      const stock = Number(inventory[plantId]?.[container] || 0);
      if (stock > 0) { notify(`Nie można wyłączyć „${containerLabel(container)}” — jest tam ${stock} szt. na stanie.`); return; }
      const next = current.filter((c) => c !== container);
      setPlantContainerSizes((prev) => ({ ...prev, [plantId]: next }));
    } else {
      const next = [...current, container];
      setPlantContainerSizes((prev) => ({ ...prev, [plantId]: next }));
    }
  }
  function setPotRecipe(size, patch) {
    setPotRecipes((prev) => ({ ...prev, [size]: { ...(prev[size] || { koszt_donicy: 0, podloze_l: 0 }), ...patch } }));
  }
  const TASK_STATUS_ORDER = ["todo", "progress", "done"];
  function addTask(text, date) {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    setTasks((prev) => [{ id: uid("tk"), text: trimmed, status: "todo", date: date || null, createdAt: Date.now() }, ...prev]);
  }
  function cycleTaskStatus(id) {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const idx = TASK_STATUS_ORDER.indexOf(t.status);
      const next = TASK_STATUS_ORDER[(idx + 1) % TASK_STATUS_ORDER.length];
      return { ...t, status: next };
    }));
  }
  function deleteTask(id) { setTasks((prev) => prev.filter((t) => t.id !== id)); }
  /*
   * ETAP 5: Centrum produkcji / podział i rozmnażanie.
   * Walidacja odbywa się CAŁA przed jakąkolwiek mutacją stanu (inventory/
   * costs/supplies/batches), żeby nie zostawić rozjechanego stanu przy
   * błędzie (np. ubytek > ilość w segmencie). Stary flow bez śledzenia
   * partii (trackAsBatch=false) jest bajt w bajt taki sam jak w etapie 3/4.
   * Zwraca `resultInfo` do wyświetlenia w UI (źródło przed/po, produkcja,
   * nowa partia) — PodzialPanel odbiera to jako wartość zwróconą z wywołania.
   */
  function performDivision({ plantId, sourceContainer, sourceQty, deductSource, targets, trackAsBatch, sourceSegmentId }) {
    const validTargets = targets.filter((t) => t.container && clampInt(t.ilosc, 0) > 0);
    if (!plantId || validTargets.length === 0) { notify("Podaj przynajmniej jedną pozycję docelową z ilością większą od zera."); return; }
    const totalNewUnits = validTargets.reduce((s, t) => s + clampInt(t.ilosc, 0), 0);

    // Wymóg 7: śledzenie partii bez wskazanego rzeczywistego segmentu źródłowego jest zablokowane.
    if (trackAsBatch && !sourceSegmentId) {
      notify("Zaznaczyłeś śledzenie partii — wybierz rzeczywisty segment źródłowy, albo odznacz śledzenie.");
      return;
    }

    let sourceSegment = null;
    if (trackAsBatch && sourceSegmentId) {
      sourceSegment = batchSegments.find((s) => s.id === sourceSegmentId);
      if (!sourceSegment) { notify("Nie znaleziono wybranego segmentu źródłowego partii."); return; }
    }

    let actualSourceQty = clampInt(sourceQty, 0);
    if (deductSource) {
      const have = Number(inventory[plantId]?.[sourceContainer] || 0);
      if (actualSourceQty > have) { notify(`W źródle (${containerLabel(sourceContainer)}) było tylko ${have} szt. — ograniczono do tej ilości.`); return; }
      if (actualSourceQty <= 0) { notify("Brak sztuk w źródle do wykorzystania."); return; }
      // Wymóg 7: ubytek źródła większy niż dostępna ilość w śledzonym segmencie nie może zostać zapisany.
      if (sourceSegment && actualSourceQty > Number(sourceSegment.ilosc || 0)) {
        notify(`Ubytek źródła (${actualSourceQty}) przekracza dostępną ilość w segmencie partii (${sourceSegment.ilosc} szt.).`);
        return;
      }
    }

    /*
     * NAPRAWA AUDYTU 7.5: przy trackAsBatch+sourceSegment koszt źródłowy
     * używany do wyliczenia kosztu segmentów POTOMNYCH musi pochodzić z
     * `sourceSegment.kosztJednostkowy`, nie z zagregowanego
     * `costs[plantId][sourceContainer]` — inaczej błędny (uśredniony) koszt
     * trwale zapisałby się w nowej partii potomnej. Stary flow bez partii —
     * bez zmian, jedyne dostępne źródło to nadal agregat.
     */
    const srcCostPerSzt = trackAsBatch && sourceSegment
      ? Number(sourceSegment.kosztJednostkowy || 0)
      : Number(costs[plantId]?.[sourceContainer] || 0);
    const totalSrcCost = deductSource ? actualSourceQty * srcCostPerSzt : 0;
    const srcCostPerNewUnit = totalNewUnits > 0 ? totalSrcCost / totalNewUnits : 0;

    if (deductSource) {
      const have = Number(inventory[plantId]?.[sourceContainer] || 0);
      const nextSrc = Math.max(0, have - actualSourceQty);
      setInventory((prev) => ({ ...prev, [plantId]: { ...(prev[plantId] || {}), [sourceContainer]: nextSrc } }));
    }

    setInventory((prev) => {
      const next = { ...prev, [plantId]: { ...(prev[plantId] || {}) } };
      validTargets.forEach((t) => {
        const cur = Number(next[plantId][t.container] || 0);
        next[plantId][t.container] = cur + clampInt(t.ilosc, 0);
      });
      return next;
    });

    setCosts((prev) => {
      const plantCosts = { ...(prev[plantId] || {}) };
      validTargets.forEach((t) => {
        const containerCost = costOfContainer(potRecipes, substrateCostPerL, t.container);
        const unitCost = srcCostPerNewUnit + containerCost;
        const priorQty = Number(inventory[plantId]?.[t.container] || 0);
        const priorCost = Number(plantCosts[t.container] || 0);
        const addedQty = clampInt(t.ilosc, 0);
        const newQty = priorQty + addedQty;
        plantCosts[t.container] = Math.round((newQty > 0 ? (priorQty * priorCost + addedQty * unitCost) / newQty : unitCost) * 100) / 100;
      });
      return { ...prev, [plantId]: plantCosts };
    });

    setSupplies((prev) => prev.map((s) => {
      let delta = 0;
      validTargets.forEach((t) => {
        const potSupply = findSupplyByContainer([s], t.container);
        if (potSupply) delta -= clampInt(t.ilosc, 0);
      });
      const substrateSupply = findSubstrateSupply([s]);
      if (substrateSupply) {
        validTargets.forEach((t) => {
          const recipe = potRecipes[t.container];
          if (recipe) delta -= Number(recipe.podloze_l || 0) * clampInt(t.ilosc, 0);
        });
      }
      return delta !== 0 ? { ...s, ilosc: Math.max(0, Number(s.ilosc || 0) + delta) } : s;
    }));

    const targetsText = validTargets.map((t) => `${clampInt(t.ilosc, 0)}× ${containerLabel(t.container)}${t.location ? ` (${t.location})` : ""}`).join(" + ");
    pushLog(`Podział ${plantLabel(plantId)}: ${deductSource ? `${actualSourceQty} szt. z ${containerLabel(sourceContainer)} → ` : ""}${targetsText}`);

    const resultInfo = {
      production: validTargets.map((t) => ({ container: t.container, ilosc: clampInt(t.ilosc, 0), location: t.location || null })),
      source: null,
      newBatch: null,
    };

    /*
     * ETAP 5: gdy trackAsBatch jest zaznaczony, sourceSegment jest w tym
     * miejscu ZAWSZE realnym, istniejącym segmentem (wymuszone walidacją
     * wyżej — nie ma już ścieżki "nowa partia bez rodzica" jak w etapie
     * 3/4). Wymóg 2: jedna operacja może utworzyć wiele segmentów
     * potomnych (po jednym na każdą pozycję docelową) — wszystkie należą
     * do JEDNEJ nowej partii, bo `divideSegment` tworzy dokładnie jedną
     * partię na wywołanie i po jednym segmencie na każdą pozycję z
     * `nowePozycje`.
     */
    if (trackAsBatch && sourceSegment) {
      const nowePozycje = validTargets.map((t) => {
        const containerCost = costOfContainer(potRecipes, substrateCostPerL, t.container);
        const unitCost = srcCostPerNewUnit + containerCost;
        return { container: t.container, location: t.location || null, ilosc: clampInt(t.ilosc, 0), kosztJednostkowy: unitCost };
      });
      const zrodloUbytek = deductSource ? actualSourceQty : 0;
      const result = divideSegment({
        batches, segments: batchSegments, sourceSegmentId, zrodloUbytek, nowePozycje,
        tenantId: DEFAULT_TENANT_ID,
        opis: `Podział ${plantLabel(plantId)}: ${targetsText}.`,
      });
      if (result.ok) {
        setBatches(result.batches);
        setBatchSegments(result.segments);
        const before = Number(sourceSegment.ilosc || 0);
        resultInfo.source = {
          label: plantLabel(plantId),
          location: sourceSegment.location || null,
          before,
          after: Math.max(0, before - zrodloUbytek),
        };
        resultInfo.newBatch = {
          id: result.newBatchId,
          originLabel: `${plantLabel(plantId)} / partia ${sourceSegment.batchId}`,
        };
      } else {
        notify(`Nie udało się powiązać podziału z segmentem partii: ${result.error} (inventory i koszty zaktualizowane normalnie).`);
      }
    }

    return resultInfo;
  }

  /*
   * ETAP 4: rejestracja zakupu. Zachowuje pełną kompatybilność ze starym
   * flow (aktualizacja inventory + kosztu średnią ważoną) niezależnie od
   * `trackAsBatch`. Gdy `trackAsBatch` jest true, dodatkowo zakłada nową
   * partię i jej pierwszy segment ze `source.type = "zakup"` — to jest
   * jedyne miejsce, gdzie partia powstaje bez rodzica z definicji (zakup
   * to zawsze punkt startowy pochodzenia).
   */
  function performPurchase({ plantId, container, ilosc, kosztJednostkowy, location, trackAsBatch, customLabel }) {
    const qty = clampInt(ilosc, 0);
    if (!plantId || !container || qty <= 0) { notify("Podaj odmianę, pojemnik i ilość większą od zera."); return; }
    const unitCost = Math.max(0, Number(kosztJednostkowy) || 0);

    setInventory((prev) => {
      const plantRow = { ...(prev[plantId] || {}) };
      plantRow[container] = Number(plantRow[container] || 0) + qty;
      return { ...prev, [plantId]: plantRow };
    });

    setCosts((prev) => {
      const plantCosts = { ...(prev[plantId] || {}) };
      const priorQty = Number(inventory[plantId]?.[container] || 0);
      const priorCost = Number(plantCosts[container] || 0);
      const newQty = priorQty + qty;
      plantCosts[container] = Math.round((newQty > 0 ? (priorQty * priorCost + qty * unitCost) / newQty : unitCost) * 100) / 100;
      return { ...prev, [plantId]: plantCosts };
    });

    pushLog(`Zakup ${plantLabel(plantId)}: +${qty} szt. ${containerLabel(container)}${location ? ` (${location})` : ""} po ${money(unitCost)} zł/szt.`);

    if (trackAsBatch) {
      const newBatch = createBatch({
        tenantId: DEFAULT_TENANT_ID,
        plantId,
        source: { type: "zakup", parentBatchId: null, parentSegmentId: null },
        initialQty: qty,
        opis: `Zakup: ${qty} szt. ${containerLabel(container)}${location ? ` — ${location}` : ""}.`,
        existingBatches: batches,
        customLabel,
      });
      const newSegment = createSegment({
        tenantId: DEFAULT_TENANT_ID,
        batchId: newBatch.id,
        plantId,
        container,
        location: location || null,
        ilosc: qty,
        kosztJednostkowy: unitCost,
        originEventOpis: `Zakup: ${qty} szt.${location ? ` do ${location}` : ""}.`,
      });
      setBatches((prev) => [...prev, newBatch]);
      setBatchSegments((prev) => [...prev, newSegment]);
    }
  }

  /*
   * ETAP 6: przesadzenie / przeniesienie w obrębie tej samej rośliny —
   * NIGDY nie tworzy nowej partii, nigdy nie zwiększa liczby roślin.
   * Cała walidacja (wymóg 7) odbywa się PRZED jakąkolwiek mutacją stanu,
   * dokładnie jak w etapie 5.
   *
   * Dwie równoległe struktury, tak jak w etapach 3-5:
   * - inventory/costs (stary flow) aktualizowane ZAWSZE, niezależnie od
   *   trackAsBatch — to jest "istniejący mechanizm przesadzania inventory",
   *   który ma dalej działać dla użytkownika niekorzystającego z partii
   *   (wymóg 11). Koszt źródła (per pojemnik, uśredniony) się nie zmienia
   *   (tak jak przy Podziale) — zmienia się tylko koszt celu (średnia
   *   ważona z nowym kosztem = koszt źródła + koszt nowego pojemnika/
   *   podłoża z Receptury).
   * - batches/batchSegments (opcjonalnie, gdy trackAsBatch && sourceSegmentId)
   *   aktualizowane przez gotowe, przetestowane `transplantSegment()` z
   *   batches.js — bez zmian w modelu Batch/BatchSegment (wymóg: nie
   *   twórz drugiego mechanizmu, nie zmieniaj modelu).
   */
  function performTransplant({ plantId, sourceContainer, ilosc, toContainer, toLocation, trackAsBatch, sourceSegmentId }) {
    const qty = clampInt(ilosc, 0);
    if (!plantId) { notify("Wybierz odmianę."); return; }
    if (qty <= 0) { notify("Podaj ilość większą od zera."); return; }
    if (!toContainer) { notify("Wybierz pojemnik docelowy."); return; }

    let sourceSegment = null;
    if (trackAsBatch) {
      if (!sourceSegmentId) { notify("Zaznaczyłeś śledzenie partii — wybierz rzeczywisty segment źródłowy, albo odznacz śledzenie."); return; }
      sourceSegment = batchSegments.find((s) => s.id === sourceSegmentId);
      if (!sourceSegment) { notify("Nie znaleziono wybranego segmentu źródłowego."); return; }
      if (qty > Number(sourceSegment.ilosc || 0)) {
        notify(`Ilość do przesadzenia (${qty}) przekracza stan segmentu źródłowego (${sourceSegment.ilosc} szt.).`);
        return;
      }
      if (toContainer === sourceSegment.container && (toLocation || null) === (sourceSegment.location || null)) {
        notify("Pojemnik i lokalizacja docelowa są takie same jak źródłowe — to nie byłoby przesadzenie.");
        return;
      }
    } else {
      const have = Number(inventory[plantId]?.[sourceContainer] || 0);
      if (qty > have) { notify(`Ilość do przesadzenia (${qty}) przekracza stan źródła (${have} szt.).`); return; }
      if (toContainer === sourceContainer) { notify("Pojemnik docelowy jest taki sam jak źródłowy — to nie byłoby przesadzenie."); return; }
    }

    const recipeMissing = toContainer !== "grunt" && !potRecipes[toContainer];
    if (recipeMissing) { notify(`Brak receptury dla pojemnika ${containerLabel(toContainer)} — uzupełnij ją w Zaopatrzeniu przed przesadzeniem.`); return; }
    const extraCostPerUnit = costOfContainer(potRecipes, substrateCostPerL, toContainer);

    // Stary flow: przenosimy ilość między pojemnikami w surowym inventory.
    // Suma sztuk się nie zmienia (wymóg 9) — odejmujemy dokładnie tyle, ile dodajemy.
    setInventory((prev) => {
      const row = { ...(prev[plantId] || {}) };
      row[sourceContainer] = Math.max(0, Number(row[sourceContainer] || 0) - qty);
      row[toContainer] = Number(row[toContainer] || 0) + qty;
      return { ...prev, [plantId]: row };
    });

    /*
     * NAPRAWA AUDYTU 7.5: gdy trackAsBatch+sourceSegment, koszt źródłowy
     * MUSI pochodzić z tego konkretnego segmentu (`sourceSegment.kosztJednostkowy`
     * — źródło prawdy dla operacji na konkretnym segmencie), NIE z
     * zblendowanego, uśrednionego `costs[plantId][sourceContainer]` — bo ten
     * agregat może obejmować inne segmenty tego samego pojemnika o innym
     * koszcie (albo ilości spoza partii), co dawało błędny koszt segmentu
     * docelowego przy rozbieżnych kosztach źródeł. Dla starego flow
     * (trackAsBatch=false) zachowanie jest identyczne jak dotychczas —
     * tam nie ma segmentu, więc agregat jest jedynym dostępnym źródłem.
     */
    const sourceUnitCostAggregate = trackAsBatch && sourceSegment
      ? Number(sourceSegment.kosztJednostkowy || 0)
      : Number(costs[plantId]?.[sourceContainer] || 0);
    setCosts((prev) => {
      const plantCosts = { ...(prev[plantId] || {}) };
      const newUnitCostAggregate = sourceUnitCostAggregate + extraCostPerUnit;
      const priorQty = Number(inventory[plantId]?.[toContainer] || 0);
      const priorCost = Number(plantCosts[toContainer] || 0);
      const newQty = priorQty + qty;
      plantCosts[toContainer] = Math.round((newQty > 0 ? (priorQty * priorCost + qty * newUnitCostAggregate) / newQty : newUnitCostAggregate) * 100) / 100;
      // Koszt pozostałych sztuk źródła (wymóg 4) pozostaje niezmieniony — nie dotykamy plantCosts[sourceContainer].
      return { ...prev, [plantId]: plantCosts };
    });

    const fromLocationText = trackAsBatch && sourceSegment && sourceSegment.location ? ` (${sourceSegment.location})` : "";
    const toLocationText = toLocation ? ` (${toLocation})` : "";
    const batchText = trackAsBatch && sourceSegment ? ` — Batch ${sourceSegment.batchId}` : "";
    pushLog(`Przesadzenie ${plantLabel(plantId)}: ${qty} szt. ${containerLabel(sourceContainer)}${fromLocationText} → ${containerLabel(toContainer)}${toLocationText}${batchText}.`);

    /*
     * ROADMAPA pkt 4 (znane z audytu funkcjonalnego, HIGH #3): Przesadzenie
     * sadzi rośliny do nowego pojemnika dokładnie tak samo jak Podział, więc
     * musi tak samo zużywać donice/podłoże z Zaopatrzenia — dotąd tego nie
     * robiło, w przeciwieństwie do performDivision/settleAsDivision. Ten sam
     * wzorzec: donica konkretnego rozmiaru -1 szt., podłoże -litry z
     * receptury × ilość. Przesadzenie do "grunt" nic nie zużywa (naturalnie:
     * findSupplyByContainer i potRecipes nie mają wpisu dla "grunt").
     */
    setSupplies((prev) => prev.map((s) => {
      let delta = 0;
      const potSupply = findSupplyByContainer([s], toContainer);
      if (potSupply) delta -= qty;
      const substrateSupply = findSubstrateSupply([s]);
      if (substrateSupply) {
        const recipe = potRecipes[toContainer];
        if (recipe) delta -= Number(recipe.podloze_l || 0) * qty;
      }
      return delta !== 0 ? { ...s, ilosc: Math.max(0, Number(s.ilosc || 0) + delta) } : s;
    }));

    const resultInfo = {
      plantLabel: plantLabel(plantId),
      ilosc: qty,
      fromContainer: sourceContainer,
      fromLocation: trackAsBatch && sourceSegment ? sourceSegment.location || null : null,
      toContainer,
      toLocation: toLocation || null,
      batchId: null,
    };

    if (trackAsBatch && sourceSegment) {
      const result = transplantSegment({
        segments: batchSegments,
        sourceSegmentId,
        ilosc: qty,
        toContainer,
        toLocation: toLocation || null,
        extraCostPerUnit,
      });
      if (result.ok) {
        setBatchSegments(result.segments);
        resultInfo.batchId = sourceSegment.batchId;
      } else {
        notify(`Nie udało się zaktualizować segmentu partii: ${result.error} (inventory i koszty zaktualizowane normalnie).`);
      }
    }

    return resultInfo;
  }

  function settleAsDivision(plantId, deltas) {
    const negEntries = Object.entries(deltas).filter(([, d]) => d < 0);
    const posEntries = Object.entries(deltas).filter(([, d]) => d > 0);
    if (negEntries.length === 0 || posEntries.length === 0) return;

    const totalSrcCost = negEntries.reduce((s, [c, d]) => s + Math.abs(d) * Number(costs[plantId]?.[c] || 0), 0);
    const totalNewUnits = posEntries.reduce((s, [, d]) => s + d, 0);
    const srcCostPerNewUnit = totalNewUnits > 0 ? totalSrcCost / totalNewUnits : 0;

    setCosts((prev) => {
      const plantCosts = { ...(prev[plantId] || {}) };
      posEntries.forEach(([c, d]) => {
        const containerCost = costOfContainer(potRecipes, substrateCostPerL, c);
        const unitCost = srcCostPerNewUnit + containerCost;
        const currentQty = Number(inventory[plantId]?.[c] || 0);
        const priorQty = Math.max(0, currentQty - d);
        const priorCost = Number(plantCosts[c] || 0);
        plantCosts[c] = Math.round((currentQty > 0 ? (priorQty * priorCost + d * unitCost) / currentQty : unitCost) * 100) / 100;
      });
      return { ...prev, [plantId]: plantCosts };
    });

    setSupplies((prev) => prev.map((s) => {
      let delta = 0;
      posEntries.forEach(([c, d]) => {
        const potSupply = findSupplyByContainer([s], c);
        if (potSupply) delta -= d;
      });
      const substrateSupply = findSubstrateSupply([s]);
      if (substrateSupply) {
        posEntries.forEach(([c, d]) => {
          const recipe = potRecipes[c];
          if (recipe) delta -= Number(recipe.podloze_l || 0) * d;
        });
      }
      return delta !== 0 ? { ...s, ilosc: Math.max(0, Number(s.ilosc || 0) + delta) } : s;
    }));

    const fromText = negEntries.map(([c, d]) => `${Math.abs(d)}× ${containerLabel(c)}`).join(" + ");
    const toText = posEntries.map(([c, d]) => `${d}× ${containerLabel(c)}`).join(" + ");
    pushLog(`Podział (przez korektę ilości) ${plantLabel(plantId)}: ${fromText} → ${toText}`);
  }

  /* ---- funkcje pomocnicze / mutujące (z logowaniem historii) ---- */
  function plantLabel(plantId) {
    const p = allPlants.find((pp) => pp.id === plantId);
    return p ? `${p.nazwa_pl} (${p.odmiana})` : plantId;
  }
  function pushLog(text) {
    setLog((prev) => [{ id: uid("l"), ts: Date.now(), text }, ...prev].slice(0, 200));
  }
  /*
   * ROADMAPA (SHOULD HAVE, pkt 11): status jakości segmentu. Jedyne
   * miejsce mutujące w ekranie Partie — celowo bardzo wąski wyjątek od
   * pierwotnego "w pełni read-only" (żadna ilość, koszt ani lokalizacja
   * nadal nie jest tam edytowalna, tylko ta jedna obserwacja).
   */
  function setSegmentQualityH(segmentId, jakosc) {
    const result = setSegmentQuality({ segments: batchSegments, segmentId, jakosc });
    if (result.ok) {
      setBatchSegments(result.segments);
    } else {
      notify(`Nie udało się zapisać jakości: ${result.error}`);
    }
  }

  /*
   * ROADMAPA (SHOULD HAVE, pkt 6): planowanie produkcji. Plan to wyłącznie
   * notatka — nie tworzy żadnego Batch/BatchSegment, nie rezerwuje niczego
   * w inventory. Realne wykonanie nadal dzieje się przez istniejący ekran
   * Podział; plan jest ręcznie oznaczany jako wykonany/anulowany po fakcie.
   */
  function addProductionPlan(data) {
    if (!data.plantId) { notify("Wybierz odmianę."); return; }
    if (!data.plannedYear || !data.plannedMonth) { notify("Podaj planowany miesiąc."); return; }
    const plan = createProductionPlan(data);
    setProductionPlans((prev) => [plan, ...prev]);
    pushLog(`Plan produkcji: ${plantLabel(data.plantId)} — ${data.plannedMonth}/${data.plannedYear}${data.expectedQty ? `, spodziewane ${data.expectedQty} szt.` : ""}.`);
  }
  function setPlanStatusH(planId, status) {
    const result = setPlanStatus(productionPlans, planId, status);
    if (result.ok) {
      setProductionPlans(result.plans);
    } else {
      notify(`Nie udało się zaktualizować planu: ${result.error}`);
    }
  }
  function deleteProductionPlan(planId) {
    setProductionPlans((prev) => prev.filter((p) => p.id !== planId));
  }

  /*
   * FUNKCJA DODATKOWA: zdjęcia w czasie per PARTIA (nie per odmiana jak
   * dotychczasowy PhotoThumb). Świadomie NIE dotyka istniejącego
   * `photos[plantId]` (miniaturka gatunku w Rośliny) — to osobna, równoległa
   * ścieżka w TYM SAMYM, już generycznym magazynie `photos` (kluczowanym po
   * dowolnym stringu, nie tylko plantId — potwierdzone w kodzie efektu
   * zapisu). `batchPhotos[batchId]` trzyma tylko metadane (kiedy, notatka);
   * same obrazy idą do `photos[photoId]`, dokładnie tym samym mechanizmem
   * co zdjęcia odmian — więc automatycznie trafiają do backupu (już tam są
   * przez istniejące pole `photos`) bez dodatkowej pracy.
   */
  function addBatchPhoto(batchId, dataUrl, note) {
    const photoId = uid("photo");
    setBatchPhotos((prev) => ({ ...prev, [batchId]: [...(prev[batchId] || []), { id: photoId, ts: new Date().toISOString(), note: note || "" }] }));
    setPhotos((prev) => ({ ...prev, [photoId]: dataUrl }));
  }
  function deleteBatchPhoto(batchId, photoId) {
    setBatchPhotos((prev) => ({ ...prev, [batchId]: (prev[batchId] || []).filter((p) => p.id !== photoId) }));
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[photoId];
      return next;
    });
    deleteKey(`photo:${photoId}`);
  }

  /*
   * FUNKCJA DODATKOWA: szybkie przejście z wyszukiwania (Pulpit) prosto do
   * szczegółów konkretnej partii w zakładce Partie. `jumpToken` rośnie przy
   * każdym kliknięciu wyniku wyszukiwania, żeby zadziałało nawet gdy
   * użytkownik klika tę samą partię drugi raz z rzędu.
   */
  const [jumpToBatchId, setJumpToBatchId] = useState(null);
  const [jumpToken, setJumpToken] = useState(0);
  function jumpToBatch(batchId) {
    setTab("magazyn");
    setJumpToBatchId(batchId);
    setJumpToken((t) => t + 1);
  }

  function changeInventoryQty(plantId, container, nextVal) {
    const cur = Number(inventory[plantId]?.[container] || 0);
    const n = clampInt(nextVal, 0);
    if (n === cur) return;
    setInventory((prev) => ({ ...prev, [plantId]: { ...(prev[plantId] || {}), [container]: n } }));
    pushLog(`${plantLabel(plantId)} · ${containerLabel(container)}: ${cur} → ${n} (${n - cur > 0 ? "+" : ""}${n - cur})`);

    /*
     * NAPRAWA CRITICAL #1 (audyt funkcjonalny): ręczna zmiana ilości w
     * zakładce Rośliny nie ma żadnego pojęcia segmentu (brak formularza
     * z wyborem), więc przy ZMNIEJSZENIU synchronizujemy aktywne segmenty
     * tej pozycji tą samą polityką FIFO po `createdAt`, którą przyjęliśmy
     * dla sprzedaży w etapie 9 — inaczej segmenty pokazywałyby więcej
     * sztuk niż fizycznie zostało po korekcie w dół. Używamy istniejącego
     * `recordSegmentInventoryCorrection` (typ "inwentaryzacja_korekta") —
     * bez nowej funkcji w batches.js, koszt jednostkowy pozostałych sztuk
     * bez zmian, dokładnie jak przy zwykłej inwentaryzacji.
     * ZWIĘKSZENIE ilości NIE tworzy/zmienia żadnego segmentu — powiększa
     * tylko legalną pulę „gołych” sztuk bez partii (ugruntowaną od etapu
     * 4): nie ma tu skąd wziąć kosztu ani pochodzenia, więc — zgodnie z
     * zasadą z etapu 7 — nic nie zapisujemy anonimowo do żadnego segmentu.
     */
    const delta = n - cur;
    if (delta < 0) {
      let remaining = Math.abs(delta);
      let curBatches = batches, curSegments = batchSegments;
      const candidates = curSegments
        .filter((s) => s.plantId === plantId && s.container === container && s.status === "aktywny")
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      for (const seg of candidates) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, Number(seg.ilosc || 0));
        if (take <= 0) continue;
        const result = recordSegmentInventoryCorrection({
          batches: curBatches, segments: curSegments, segmentId: seg.id,
          stanSystemowy: seg.ilosc, stanFizyczny: Number(seg.ilosc || 0) - take,
          powod: "Ręczna korekta ilości (Rośliny)",
        });
        if (result.ok) { curBatches = result.batches; curSegments = result.segments; remaining -= take; }
      }
      if (curBatches !== batches) setBatches(curBatches);
      if (curSegments !== batchSegments) setBatchSegments(curSegments);
    }
  }
  /*
   * ETAP 7: Strata i Usunięcie dzielą ten sam mechanizm mutacji (raw
   * inventory zawsze aktualizowane — to jak dotychczas — plus opcjonalne
   * powiązanie z rzeczywistym segmentem partii, gdy trackAsBatch+segmentId).
   * `typ`: "strata" (roślina zginęła) | "usuniecie" (świadoma decyzja) —
   * to jedyna różnica semantyczna; oba korzystają z tej samej walidacji.
   * Walidacja w CAŁOŚCI przed jakąkolwiek mutacją (wymóg 12).
   */
  function recordLoss(data) {
    const typ = data.typ === "usuniecie" ? "usuniecie" : "strata";
    const n = clampInt(data.ilosc, 0);
    if (!data.plantId) { notify("Wybierz odmianę."); return; }
    if (n <= 0) { notify("Podaj ilość większą od zera."); return; }
    if (!data.powod || !String(data.powod).trim()) { notify("Podaj powód."); return; }

    let segment = null;
    if (data.trackAsBatch) {
      if (!data.segmentId) { notify("Zaznaczyłeś śledzenie partii — wybierz rzeczywisty segment, albo odznacz śledzenie."); return; }
      segment = batchSegments.find((s) => s.id === data.segmentId);
      if (!segment) { notify("Nie znaleziono wybranego segmentu."); return; }
      if (n > Number(segment.ilosc || 0)) { notify(`Ilość (${n}) przekracza stan segmentu (${segment.ilosc} szt.).`); return; }
    } else {
      const have = Number(inventory[data.plantId]?.[data.container] || 0);
      if (n > have) { notify(`Ilość (${n}) przekracza dostępny stan (${have} szt.).`); return; }
    }

    const cur = Number(inventory[data.plantId]?.[data.container] || 0);
    const nextVal = Math.max(0, cur - n);
    setInventory((prev) => ({ ...prev, [data.plantId]: { ...(prev[data.plantId] || {}), [data.container]: nextVal } }));
    const entry = { id: uid("st"), typ, plantId: data.plantId, container: data.container, ilosc: n, powod: data.powod, komentarz: data.komentarz || null, data: data.data || new Date().toISOString().slice(0, 10) };
    setLosses((prev) => [entry, ...prev]);
    pushLog(`${typ === "usuniecie" ? "Usunięcie" : "Strata"}: -${n} ${plantLabel(data.plantId)} (${containerLabel(data.container)}) — ${data.powod}`);

    if (data.trackAsBatch && segment) {
      const fn = typ === "usuniecie" ? recordSegmentRemoval : recordSegmentLoss;
      const result = fn({ batches, segments: batchSegments, segmentId: segment.id, ilosc: n, powod: data.powod, komentarz: data.komentarz || null });
      if (result.ok) {
        setBatches(result.batches);
        setBatchSegments(result.segments);
      } else {
        notify(`Nie udało się zaktualizować segmentu partii: ${result.error} (inventory zaktualizowane normalnie).`);
      }
    }
  }
  function deleteLoss(id) { setLosses((prev) => prev.filter((l) => l.id !== id)); }

  /*
   * ETAP 7: Inwentaryzacja / korekta ilości. Walidacja w całości przed
   * mutacją. Ujemna różnica: zmniejsza inventory (i segment, jeśli
   * śledzony) — koszt jednostkowy NIGDY się nie zmienia. Dodatnia różnica
   * bez wskazanego segmentu (albo bez śledzenia partii): zwykła korekta w
   * górę na inventory, bez tworzenia partii. Dodatnia różnica ZE
   * śledzeniem partii: nigdy nie dopisywana anonimowo do istniejącego
   * segmentu — zawsze nowa partia `source.type = "korekta"` z jawnym
   * opisem nieznanego pochodzenia, wymaga podania kosztu jednostkowego.
   */
  function performInventoryCount({ plantId, container, trackAsBatch, segmentId, stanFizyczny, powod, kosztJednostkowy, location }) {
    if (!plantId) { notify("Wybierz odmianę."); return; }
    if (!container) { notify("Wybierz pojemnik."); return; }
    const fizyczna = clampInt(stanFizyczny, 0);
    if (!powod || !String(powod).trim()) { notify("Podaj powód inwentaryzacji."); return; }

    let segment = null;
    if (trackAsBatch) {
      if (!segmentId) { notify("Zaznaczyłeś śledzenie partii — wybierz rzeczywisty segment, albo odznacz śledzenie."); return; }
      segment = batchSegments.find((s) => s.id === segmentId);
      if (!segment) { notify("Nie znaleziono wybranego segmentu."); return; }
    }

    const systemowa = trackAsBatch && segment ? Number(segment.ilosc || 0) : Number(inventory[plantId]?.[container] || 0);
    const roznica = fizyczna - systemowa;
    if (roznica === 0) { notify("Brak różnicy między stanem systemowym a fizycznym — nic do zatwierdzenia."); return; }

    /*
     * NAPRAWA CRITICAL #1 (etap 9): koszt nadwyżki musi pochodzić od
     * użytkownika niezależnie od trackAsBatch — bo agregat `costs[...]`
     * MUSI zostać przeliczony w obu przypadkach (wcześniej w ogóle nie był
     * aktualizowany, co cicho dezaktualizowało koszt magazynu).
     */
    if (roznica > 0) {
      const koszt = Math.max(0, Number(kosztJednostkowy || 0));
      if (koszt <= 0) { notify("Nadwyżka wymaga podania kosztu jednostkowego."); return; }
    }

    setInventory((prev) => {
      const row = { ...(prev[plantId] || {}) };
      row[container] = Math.max(0, Number(row[container] || 0) + roznica);
      return { ...prev, [plantId]: row };
    });

    /*
     * NAPRAWA CRITICAL #1: agregat `costs[plantId][container]` musi zostać
     * przeliczony po dodatniej korekcie — wcześniej `setCosts` w ogóle nie
     * było tu wołane, więc agregat cicho się dezaktualizował (nie
     * odzwierciedlał kosztu nowo dodanych sztuk). Do wzoru średniej ważonej
     * używamy SUROWEJ ilości z `inventory` sprzed operacji (nie `systemowa`,
     * które w trybie trackAsBatch pochodzi z segmentu i może się różnić od
     * agregatu) — to zachowuje ten sam wzorzec co performPurchase/
     * performDivision/performTransplant. Ujemna korekta: bez zmian, koszt
     * jednostkowy pozostałych sztuk pozostaje identyczny (zgodnie ze
     * specyfikacją etapu 7) — tu nic nie liczymy.
     */
    if (roznica > 0) {
      const koszt = Math.max(0, Number(kosztJednostkowy || 0));
      const rawPriorQty = Number(inventory[plantId]?.[container] || 0);
      const rawPriorCost = Number(costs[plantId]?.[container] || 0);
      const newQty = rawPriorQty + roznica;
      setCosts((prev) => {
        const plantCosts = { ...(prev[plantId] || {}) };
        plantCosts[container] = Math.round((newQty > 0 ? (rawPriorQty * rawPriorCost + roznica * koszt) / newQty : koszt) * 100) / 100;
        return { ...prev, [plantId]: plantCosts };
      });
    }

    pushLog(`Inwentaryzacja ${plantLabel(plantId)} (${containerLabel(container)}): system ${systemowa} → fizyczny ${fizyczna} (${roznica > 0 ? "+" : ""}${roznica}). Powód: ${powod}.`);

    const resultInfo = { stanSystemowy: systemowa, stanFizyczny: fizyczna, roznica, newBatch: null };

    if (roznica < 0 && trackAsBatch && segment) {
      const result = recordSegmentInventoryCorrection({ batches, segments: batchSegments, segmentId: segment.id, stanSystemowy: segment.ilosc, stanFizyczny: Number(segment.ilosc || 0) + roznica, powod });
      if (result.ok) {
        setBatches(result.batches);
        setBatchSegments(result.segments);
      } else {
        notify(`Nie udało się zaktualizować segmentu partii: ${result.error} (inventory zaktualizowane normalnie).`);
      }
    } else if (roznica > 0 && trackAsBatch) {
      const koszt = Math.max(0, Number(kosztJednostkowy || 0));
      const newBatch = createBatch({
        tenantId: DEFAULT_TENANT_ID,
        plantId,
        source: { type: "korekta", parentBatchId: null, parentSegmentId: null },
        initialQty: roznica,
        opis: `Nieznane pochodzenie / korekta inwentaryzacyjna: +${roznica} szt. ${containerLabel(container)}. Powód: ${powod}.`,
        existingBatches: batches,
      });
      const newSegment = createSegment({
        tenantId: DEFAULT_TENANT_ID,
        batchId: newBatch.id,
        plantId,
        container,
        location: location || null,
        ilosc: roznica,
        kosztJednostkowy: koszt,
        originEventOpis: `Nadwyżka inwentaryzacyjna: +${roznica} szt. Nieznane pochodzenie.`,
      });
      setBatches((prev) => [...prev, newBatch]);
      setBatchSegments((prev) => [...prev, newSegment]);
      resultInfo.newBatch = { id: newBatch.id, ilosc: roznica };
    }

    return resultInfo;
  }
  function addCustomPlant(data) {
    const plant = {
      id: uid("c"),
      lp: allPlants.length + 1,
      nazwa_pl: data.nazwa_pl.trim(),
      odmiana: data.odmiana.trim(),
      wys_szer: data.wys_szer.trim(),
      stanowisko: data.stanowisko.trim(),
      kwitnienie: data.kwitnienie.trim(),
      zimozielona: data.zimozielona,
      opis: data.opis.trim(),
      ciecie_text: data.ciecie_months.length ? `Cięcie: ${monthsToRomanText(data.ciecie_months)}` : "",
      podzial_text: data.podzial_months.length ? `Podział: ${monthsToRomanText(data.podzial_months)}` : "",
      ciecie_months: data.ciecie_months,
      podzial_months: data.podzial_months,
      special: !!data.special,
      custom: true,
    };
    setCustomPlants((prev) => [...prev, plant]);
    pushLog(`Dodano nową odmianę: ${plant.nazwa_pl} (${plant.odmiana})`);
  }
  function removeCustomPlant(id) {
    const p = customPlants.find((pp) => pp.id === id);
    setCustomPlants((prev) => prev.filter((pp) => pp.id !== id));
    setPlantContainerSizes((prev) => { const next = { ...prev }; delete next[id]; return next; });
    if (p) pushLog(`Usunięto własną odmianę: ${p.nazwa_pl}`);
  }
  function addClient(data) {
    const c = { id: uid("cl"), nazwa: data.nazwa.trim(), telefon: (data.telefon || "").trim(), notatki: (data.notatki || "").trim(), createdAt: Date.now() };
    setClients((prev) => [c, ...prev]);
    pushLog(`Dodano klienta: ${c.nazwa}`);
  }
  function deleteClient(id) {
    const c = clients.find((cc) => cc.id === id);
    setClients((prev) => prev.filter((cc) => cc.id !== id));
    if (c) pushLog(`Usunięto klienta: ${c.nazwa}`);
  }
  function addSupply(data) {
    setSupplies((prev) => [...prev, { id: uid("sup"), ...data }]);
    pushLog(`Dodano materiał: ${data.nazwa}`);
  }
  function removeSupply(id) {
    const s = supplies.find((ss) => ss.id === id);
    if (s && s.typ === "donica" && s.rozmiar) {
      const stuck = Object.values(inventory).some((row) => Number(row?.[s.rozmiar] || 0) > 0);
      if (stuck) { notify(`Nie można usunąć „${s.nazwa}” — są jeszcze rośliny w tym rozmiarze (${s.rozmiar}) w magazynie.`); return; }
    }
    setSupplies((prev) => prev.filter((ss) => ss.id !== id));
    if (s) pushLog(`Usunięto materiał: ${s.nazwa}`);
  }
  function changeSupplyQty(id, nextVal) {
    setSupplies((prev) => prev.map((s) => (s.id === id ? { ...s, ilosc: clampInt(nextVal, 0) } : s)));
  }
  function addOverheadCost(item) {
    setOverheadCosts((prev) => [item, ...prev]);
    pushLog(`Koszt stały: +${item.nazwa} (${item.okres}, ${money(item.kwota)} zł)`);
  }
  function deleteOverheadCost(id) {
    const it = overheadCosts.find((x) => x.id === id);
    setOverheadCosts((prev) => prev.filter((x) => x.id !== id));
    if (it) pushLog(`Usunięto koszt stały: ${it.nazwa}`);
  }
  function createOrder(order) {
    setOrders((prev) => [order, ...prev]);
    pushLog(`Nowe zamówienie — ${order.klient}: ${money(order.suma)} zł`);
  }
  function deleteOrderH(id) {
    const o = orders.find((oo) => oo.id === id);
    setOrders((prev) => prev.filter((oo) => oo.id !== id));
    if (o) pushLog(`Usunięto zamówienie — ${o.klient}`);
  }

  /**
   * Realizacja zamówienia. Przed odjęciem stanu sprawdzamy, czy w magazynie
   * jest wystarczająco dużo sztuk — jeśli nie, użytkownik dostaje wyraźne
   * ostrzeżenie z listą brakujących pozycji (stan i tak zostanie przycięty
   * do zera, tak jak wcześniej, ale teraz w sposób jawny, a nie po cichu).
   */
  /*
   * NAPRAWA CRITICAL #2 (etap 9): sprzedaż musi zmniejszać realne
   * BatchSegment, nie tylko surowe inventory — inaczej segmenty pokazują
   * więcej sztuk niż fizycznie zostało po sprzedaży, co łamie
   * niezmienniczość „inventory == suma aktywnych segmentów” (zweryfikowaną
   * w audycie 7.5, który nie testował sprzedaży) i fałszuje każdą kolejną
   * operację (Podział/Przesadzenie/Strata/Inwentaryzacja) wybierającą
   * segment jako źródło.
   *
   * POLITYKA WYBORU SEGMENTU (jawna decyzja, nie domysł): model zamówienia
   * NIE niesie wybranego segmentu (pozycja to tylko plantId+container+ilość
   * — to świadomie zostaje niezmienione w tym etapie, patrz plan). Skoro
   * użytkownik nie może tu nic wybrać, stosujemy FIFO po dacie założenia
   * segmentu (`createdAt`, rosnąco — najstarszy najpierw), sprzedając z
   * kolejnych aktywnych segmentów aż do pokrycia zamówionej ilości. FIFO to
   * standardowy, przewidywalny wybór dla żywego materiału szkółkarskiego
   * (najpierw schodzi najstarsza partia) i jest deterministyczny.
   * Jeśli aktywne segmenty nie pokrywają całej sprzedanej ilości (bo część
   * stanu to „gołe” sztuki bez partii — to legalny, wspierany od etapu 4
   * przypadek), sprzedajemy tyle, ile segmenty realnie mają, i nie
   * blokujemy realizacji zamówienia (dokładnie tak jak dotychczasowe
   * traktowanie niedoboru w inventory — ostrzeżenie, nie blokada).
   * Dla pozycji typu „zestaw” brak sensownej ceny jednostkowej per
   * składnik (cena dotyczy całego zestawu) — do historii segmentu trafia
   * `cena: null`, co nie wpływa na żadne obliczenia (pole czysto
   * informacyjne w `recordSegmentSale`).
   */
  function sellFromSegments(plantId, container, qtyNeeded, unitCena, orderId) {
    let remaining = qtyNeeded;
    let curBatches = batches, curSegments = batchSegments;
    const candidates = curSegments
      .filter((s) => s.plantId === plantId && s.container === container && s.status === "aktywny")
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    for (const seg of candidates) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, Number(seg.ilosc || 0));
      if (take <= 0) continue;
      const result = recordSegmentSale({ batches: curBatches, segments: curSegments, segmentId: seg.id, ilosc: take, cena: unitCena, orderId });
      if (result.ok) {
        curBatches = result.batches;
        curSegments = result.segments;
        remaining -= take;
      }
    }
    return { batches: curBatches, segments: curSegments };
  }

  function fulfillOrderH(order, deduct) {
    if (deduct) {
      const need = {};
      function addNeed(plantId, container, qty) {
        need[plantId] = need[plantId] || {};
        need[plantId][container] = (need[plantId][container] || 0) + qty;
      }
      order.pozycje.forEach((it) => {
        if (it.kind === "plant") {
          addNeed(it.plantId, it.container, Number(it.ilosc || 0));
        } else if (it.kind === "zestaw") {
          const z = zestawy.find((zz) => zz.id === it.zestawId);
          if (z) {
            z.pozycje.forEach((comp) => {
              addNeed(comp.plantId, comp.container, Math.round(Number(comp.ilosc || 0) * Number(it.ilosc || 0)));
            });
          }
        }
      });
      const shortages = [];
      Object.entries(need).forEach(([plantId, row]) => {
        Object.entries(row).forEach(([container, qty]) => {
          const have = Number(inventory[plantId]?.[container] || 0);
          if (qty > have) {
            shortages.push(`${plantLabel(plantId)} (${containerLabel(container)}): brakuje ${qty - have} szt.`);
          }
        });
      });
      if (shortages.length > 0) {
        notify(`Stan magazynowy niższy niż zamówienie — ${shortages.join("; ")}.`);
      }

      setInventory((prev) => {
        const next = { ...prev };
        order.pozycje.forEach((it) => {
          if (it.kind === "plant") {
            const row = { ...(next[it.plantId] || {}) };
            row[it.container] = Math.max(0, Number(row[it.container] || 0) - Number(it.ilosc || 0));
            next[it.plantId] = row;
          } else if (it.kind === "zestaw") {
            const z = zestawy.find((zz) => zz.id === it.zestawId);
            if (z) {
              z.pozycje.forEach((comp) => {
                const row = { ...(next[comp.plantId] || {}) };
                row[comp.container] = Math.max(0, Number(row[comp.container] || 0) - Math.round(Number(comp.ilosc || 0) * Number(it.ilosc || 0)));
                next[comp.plantId] = row;
              });
            }
          }
        });
        return next;
      });

      // NAPRAWA CRITICAL #2: mirror tych samych ubytków w batchSegments (FIFO, patrz komentarz wyżej).
      let curBatches = batches, curSegments = batchSegments;
      Object.entries(need).forEach(([plantId, row]) => {
        Object.entries(row).forEach(([container, qty]) => {
          const hasAnySegment = curSegments.some((s) => s.plantId === plantId && s.container === container && s.status === "aktywny");
          if (!hasAnySegment) return;
          const it = order.pozycje.find((p) => p.kind === "plant" && p.plantId === plantId && p.container === container);
          const unitCena = it ? Number(it.cena || 0) : null;
          const r = sellFromSegments(plantId, container, qty, unitCena, order.id);
          curBatches = r.batches;
          curSegments = r.segments;
        });
      });
      if (curBatches !== batches) setBatches(curBatches);
      if (curSegments !== batchSegments) setBatchSegments(curSegments);
    }
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "zrealizowane" } : o)));
    pushLog(deduct ? `Zrealizowano zamówienie — ${order.klient} (odjęto ${money(order.suma)} zł ze stanu)` : `Zrealizowano zamówienie — ${order.klient} (bez zmiany stanu)`);
  }

  /** Buduje treść kopii zapasowej jako tekst JSON (używane i przy pobieraniu pliku, i przy kopiowaniu do schowka). */
  function buildBackupJson() {
    const payload = {
      inventory, cennik, zamowienia: orders, "schedule-done": done, "custom-tasks": customTasks,
      zestawy, photos, "custom-plants": customPlants, clients, losses, log, supplies,
      "pot-sizes": potSizes, "plant-container-sizes": plantContainerSizes,
      "pot-recipes": potRecipes, "substrate-cost-per-l": substrateCostPerL, koszty: costs, "tasks-general": tasks,
      "overhead-costs": overheadCosts, batches, "batch-segments": batchSegments,
      "production-plans": productionPlans,
      "batch-photos": batchPhotos,
      "piorin-number": piorinNumber, "origin-country": originCountry, "thermal-label-size": thermalLabelSize,
      "label-settings": labelSettings,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(payload, null, 2);
  }

  /** Próbuje wywołać pobranie pliku — w podglądzie w czacie może nie zadziałać, dlatego jest to tylko dodatek do kopiowania tekstu. */
  function handleExport() {
    try {
      const blob = new Blob([buildBackupJson()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `szkolka-traw-kopia-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      // po cichu — użytkownik i tak ma tekst kopii w oknie kopii zapasowej
    }
  }

  /** Wspólna logika wczytywania — używana zarówno przy wybraniu pliku, jak i przy wklejeniu tekstu. */
  function applyImportText(text) {
    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        notify("To nie wygląda na poprawną kopię zapasową szkółki.");
        return false;
      }
      const hasKnownField = KNOWN_IMPORT_KEYS.some((k) => Object.prototype.hasOwnProperty.call(data, k));
      if (!hasKnownField) {
        notify("Brak rozpoznawalnych danych szkółki — import przerwany.");
        return false;
      }

      if (data.inventory) setInventory(data.inventory);
      if (data.cennik) setCennik(data.cennik);
      if (data.zamowienia) setOrders(data.zamowienia);
      if (data["schedule-done"]) setDone(data["schedule-done"]);
      if (data["custom-tasks"]) setCustomTasks(data["custom-tasks"]);
      if (data.zestawy) setZestawy(data.zestawy);
      if (data.photos) {
        setPhotos(data.photos);
        Object.entries(data.photos).forEach(([id, dataUrl]) => saveKey(`photo:${id}`, dataUrl));
      }
      if (data["custom-plants"]) setCustomPlants(data["custom-plants"]);
      if (data.clients) setClients(data.clients);
      if (data.losses) setLosses(data.losses);
      if (data.log) setLog(data.log);
      if (data.supplies) {
        const { supplies: migratedImportedSupplies } = migrateSupplies(data.supplies, data["pot-sizes"] || []);
        setSupplies(migratedImportedSupplies);
      }
      if (data["plant-container-sizes"]) setPlantContainerSizes(data["plant-container-sizes"]);
      if (data["pot-recipes"]) setPotRecipes(data["pot-recipes"]);
      if (data["substrate-cost-per-l"] !== undefined) setSubstrateCostPerL(data["substrate-cost-per-l"]);
      if (data.koszty) setCosts(data.koszty);
      if (data["tasks-general"]) setTasks(data["tasks-general"]);
      if (data["overhead-costs"]) setOverheadCosts(data["overhead-costs"]);
      if (data["production-plans"]) setProductionPlans(data["production-plans"]);
      if (data["batch-photos"]) setBatchPhotos(data["batch-photos"]);
      if (data["piorin-number"] !== undefined) setPiorinNumber(data["piorin-number"]);
      if (data["origin-country"]) setOriginCountry(data["origin-country"]);
      if (data["thermal-label-size"]) setThermalLabelSize(data["thermal-label-size"]);
      if (data["label-settings"]) {
        setLabelSettings({
          ...DEFAULT_LABEL_SETTINGS,
          ...data["label-settings"],
          labelFields: { ...DEFAULT_LABEL_SETTINGS.labelFields, ...(data["label-settings"].labelFields || {}) },
        });
      }
      // batches i batch-segments to jedna logiczna całość (segmenty odwołują się do
      // batchId, partie z podziału/korekty do parentBatchId/parentSegmentId) — importowane
      // razem, tylko gdy OBA pola są obecne w kopii, żeby nie zostawić połowicznego stanu
      // (np. segmentów bez ich partii, gdyby ktoś ręcznie edytował plik kopii).
      if (data.batches && data["batch-segments"]) {
        setBatches(data.batches);
        setBatchSegments(data["batch-segments"]);
      }
      pushLog("Przywrócono dane z kopii zapasowej.");
      notify("Kopia zapasowa wczytana.", "success");
      return true;
    } catch (err) {
      notify("Nieprawidłowy tekst kopii zapasowej.");
      return false;
    }
  }

  async function handleImport(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    applyImportText(text);
  }

  function undoLastChange() {
    const pending = pendingUndoRef.current;
    const snapshot = pending ? pending.snapshot : undoStackRef.current[undoStackRef.current.length - 1];
    if (!snapshot) return;

    if (pending) {
      clearTimeout(pending.timer);
      pendingUndoRef.current = null;
    } else {
      undoStackRef.current = undoStackRef.current.slice(0, -1);
    }
    previousUndoSnapshotRef.current = JSON.stringify(snapshot);

    setInventory(snapshot.inventory);
    setCennik(snapshot.cennik);
    setOrders(snapshot.orders);
    setDone(snapshot.done);
    setCustomTasks(snapshot.customTasks);
    setZestawy(snapshot.zestawy);
    setCustomPlants(snapshot.customPlants);
    setClients(snapshot.clients);
    setLosses(snapshot.losses);
    setLog(snapshot.log);
    setSupplies(snapshot.supplies);
    setPlantContainerSizes(snapshot.plantContainerSizes);
    setPotRecipes(snapshot.potRecipes);
    setSubstrateCostPerL(snapshot.substrateCostPerL);
    setPiorinNumber(snapshot.piorinNumber);
    setOriginCountry(snapshot.originCountry);
    setThermalLabelSize(snapshot.thermalLabelSize);
    setLabelSettings(snapshot.labelSettings);
    setCosts(snapshot.costs);
    setTasks(snapshot.tasks);
    setOverheadCosts(snapshot.overheadCosts);
    setProductionPlans(snapshot.productionPlans);
    setBatchPhotos(snapshot.batchPhotos);
    setBatches(snapshot.batches);
    setBatchSegments(snapshot.batchSegments);
    setUndoCount(undoStackRef.current.length);
    notify("Ostatnia zmiana została cofnięta.", "success");
  }

  return (
    <div className="app-shell">
      <GlobalStyle />
      <Header tab={tab} potsTotal={potsTotal} onUndo={undoLastChange} canUndo={undoCount > 0} />
      <main className="app-content">
        {!ready ? (
          <div className="loading">Wczytywanie danych…</div>
        ) : tab === "pulpit" ? (
          <PulpitTab
            plants={allPlants} inventory={inventory} potsTotal={potsTotal} magazynValue={magazynValue} salesValue={salesValue} orders={orders}
            done={done} customTasks={customTasks} log={log} supplies={supplies}
            tasks={tasks} onAddTask={addTask} onCycleTask={cycleTaskStatus} onDeleteTask={deleteTask}
            onNavigate={setTab} onExport={handleExport} onImport={handleImport}
            onGetBackupText={buildBackupJson} onImportText={applyImportText}
            batches={batches} onJumpToBatch={jumpToBatch}
            batchSegments={batchSegments} productionPlans={productionPlans}
          />
        ) : tab === "magazyn" ? (
          <MagazynTab
            plants={allPlants} inventory={inventory} onQtyChange={changeInventoryQty} totals={totals}
            containers={containers} potSizes={potSizes} onAddPotSize={addPotSize}
            plantContainerSizes={plantContainerSizes} onTogglePlantContainer={togglePlantContainer}
            photos={photos} setPhotos={setPhotos}
            onPhotoError={() => notify("Nie udało się zapisać zdjęcia — spróbuj mniejsze/inne zdjęcie.")}
            onAddPlant={addCustomPlant} onRemovePlant={removeCustomPlant}
            supplies={supplies} onSupplyQtyChange={changeSupplyQty} onAddSupply={addSupply} onRemoveSupply={removeSupply}
            losses={losses} onAddLoss={recordLoss} onDeleteLoss={deleteLoss}
            cennik={cennik} log={log}
            costs={costs} potRecipes={potRecipes} substrateCostPerL={substrateCostPerL}
            onSetPotRecipe={setPotRecipe} onSetSubstrateCostPerL={setSubstrateCostPerL}
            onPerformDivision={performDivision}
            onSettleDivision={settleAsDivision}
            onPerformPurchase={performPurchase}
            onPerformTransplant={performTransplant}
            onPerformInventoryCount={performInventoryCount}
            batchSegments={batchSegments}
            batches={batches}
            onSetSegmentQuality={setSegmentQualityH}
            productionPlans={productionPlans} onAddPlan={addProductionPlan} onSetPlanStatus={setPlanStatusH} onDeletePlan={deleteProductionPlan}
            batchPhotos={batchPhotos} onAddBatchPhoto={addBatchPhoto} onDeleteBatchPhoto={deleteBatchPhoto}
            jumpToBatchId={jumpToBatchId} jumpToken={jumpToken}
            overheadCosts={overheadCosts} onAddOverheadCost={addOverheadCost} onDeleteOverheadCost={deleteOverheadCost}
          />
        ) : tab === "harmonogram" ? (
          <HarmonogramTab plants={allPlants} done={done} setDone={setDone} customTasks={customTasks} setCustomTasks={setCustomTasks}
            tasks={tasks} onCycleTask={cycleTaskStatus} batchSegments={batchSegments} batches={batches} />
        ) : tab === "sprzedaz" ? (
          <SprzedazTab
            plants={allPlants} potSizes={potSizes} plantContainerSizes={plantContainerSizes}
            cennik={cennik} setCennik={setCennik} costs={costs} potRecipes={potRecipes}
            substrateCostPerL={substrateCostPerL}
            orders={orders} onCreateOrder={createOrder} onDeleteOrder={deleteOrderH} onFulfillOrder={fulfillOrderH}
            zestawy={zestawy} setZestawy={setZestawy}
            clients={clients} onAddClient={addClient} onDeleteClient={deleteClient}
            overheadCosts={overheadCosts}
            batchSegments={batchSegments}
            batches={batches}
          />
        ) : (
          <EtykietyTab plants={allPlants} inventory={inventory} potSizes={potSizes} batchSegments={batchSegments} batches={batches}
            piorinNumber={piorinNumber} setPiorinNumber={setPiorinNumber}
            originCountry={originCountry} setOriginCountry={setOriginCountry}
            thermalLabelSize={thermalLabelSize} setThermalLabelSize={setThermalLabelSize}
            labelSettings={labelSettings} setLabelSettings={setLabelSettings} />
        )}
      </main>
      <BottomNav tab={tab} setTab={setTab} />
      {toast && <div className={`toast ${toast.type === "success" ? "success" : ""}`}><AlertCircle size={15} /> {toast.msg}</div>}
    </div>
  );
}
