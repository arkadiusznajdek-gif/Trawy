function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");
}

function matchesLight(plant, light) {
  const text = normalize(plant.stanowisko);
  if (light === "slonce") return text.includes("slonce");
  if (light === "polcien") return text.includes("polcien");
  if (light === "cien") return text.includes("cien") && !text.includes("polcien");
  return true;
}

function densityRange(plant) {
  const min = Number(plant.gestosc_m2_min);
  const max = Number(plant.gestosc_m2_max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min || plant.gestosc_brak) {
    return null;
  }
  return { min, max };
}

function heightValue(plant) {
  const match = String(plant.wys_szer || "").match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : 0;
}

export function getPlantStock(inventory, plantId) {
  return Object.values(inventory?.[plantId] || {}).reduce((sum, qty) => {
    const value = Number(qty);
    return sum + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);
}

export function recommendPlants(plants, { light = "any", onlyInStock = false, inventory = {} } = {}) {
  return plants
    .filter((plant) => densityRange(plant) && matchesLight(plant, light))
    .map((plant) => ({ ...plant, availableStock: getPlantStock(inventory, plant.id) }))
    .filter((plant) => !onlyInStock || plant.availableStock > 0)
    .sort((a, b) => heightValue(b) - heightValue(a) || a.nazwa_pl.localeCompare(b.nazwa_pl, "pl"));
}

export function estimatePlantingQuantity(areaM2, plant) {
  const area = Number(areaM2);
  const density = densityRange(plant);
  if (!Number.isFinite(area) || area <= 0 || !density) return null;
  return {
    min: Math.max(1, Math.ceil(area * density.min)),
    max: Math.max(1, Math.ceil(area * density.max)),
  };
}
