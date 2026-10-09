import test from "node:test";
import assert from "node:assert/strict";
import { PLANTS } from "../src/data/plants.js";
import { estimatePlantingQuantity, getPlantStock, recommendPlants } from "../src/utils/planerRabaty.js";

test("recommendations match sun and partial shade from plant descriptions", () => {
  const sunny = recommendPlants(PLANTS, { light: "slonce" });
  const partial = recommendPlants(PLANTS, { light: "polcien" });

  assert.ok(sunny.length > 0);
  assert.ok(sunny.every((plant) => /słońce/i.test(plant.stanowisko)));
  assert.ok(partial.length > 0);
  assert.ok(partial.every((plant) => /półcień/i.test(plant.stanowisko)));
});

test("planting quantities scale the catalog density to the requested area", () => {
  const plant = {
    gestosc_m2_min: 2,
    gestosc_m2_max: 3,
    gestosc_brak: false,
  };

  assert.deepEqual(estimatePlantingQuantity(4, plant), { min: 8, max: 12 });
  assert.equal(estimatePlantingQuantity(0, plant), null);
  assert.equal(estimatePlantingQuantity(4, { gestosc_brak: true }), null);
});

test("recommendations can be restricted to plants with stock", () => {
  const plants = [
    { id: "available", nazwa_pl: "A", wys_szer: "100 / 50", stanowisko: "Słońce", gestosc_m2_min: 1, gestosc_m2_max: 2 },
    { id: "empty", nazwa_pl: "B", wys_szer: "80 / 40", stanowisko: "Słońce", gestosc_m2_min: 1, gestosc_m2_max: 2 },
  ];
  const inventory = { available: { P9: 3, C3: 2 }, empty: { P9: 0 } };
  const filtered = recommendPlants(plants, { light: "slonce", onlyInStock: true, inventory });

  assert.deepEqual(filtered.map((plant) => plant.id), ["available"]);
  assert.equal(filtered[0].availableStock, 5);
  assert.equal(getPlantStock(inventory, "empty"), 0);
});
