import { useRef, useEffect } from "react";

/**
 * Warstwa storage.
 * W środowisku Claude Artifacts dostępne jest window.storage (get/set/list/delete).
 * Poza nim (zwykłe uruchomienie przeglądarkowe np. przez Vite) używamy
 * localStorage jako zamiennika o identycznym kształcie API — dzięki temu
 * reszta aplikacji nie musi wiedzieć, gdzie faktycznie trafiają dane.
 */
const hasNativeStorage = typeof window !== "undefined" && !!window.storage;

const localStorageShim = {
  async get(key) {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(`szkolka:${key}`);
    if (raw == null) return null;
    return { key, value: raw };
  },
  async set(key, value) {
    if (typeof window === "undefined") return null;
    window.localStorage.setItem(`szkolka:${key}`, value);
    return { key, value };
  },
  async delete(key) {
    if (typeof window === "undefined") return null;
    window.localStorage.removeItem(`szkolka:${key}`);
    return { key, deleted: true };
  },
  async list(prefix) {
    if (typeof window === "undefined") return { keys: [] };
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(`szkolka:${prefix || ""}`)) keys.push(k.replace("szkolka:", ""));
    }
    return { keys };
  },
};

const store = hasNativeStorage ? window.storage : localStorageShim;

export async function loadKey(key, fallback) {
  try {
    const res = await store.get(key, false);
    if (res && res.value) return JSON.parse(res.value);
    return fallback;
  } catch (e) {
    return fallback;
  }
}

export async function saveKey(key, value) {
  try {
    await store.set(key, JSON.stringify(value), false);
    return true;
  } catch (e) {
    return false;
  }
}

export async function deleteKey(key) {
  try {
    await store.delete(key, false);
    return true;
  } catch (e) {
    return false;
  }
}

export async function listPhotoKeys() {
  try {
    const res = await store.list("photo:");
    return (res && res.keys) || [];
  } catch (e) {
    return [];
  }
}

/**
 * Zapisuje dany klucz z debounce — wywoływane ponownie przy każdej zmianie
 * `value`, ale faktyczny zapis następuje dopiero `delay` ms po ostatniej zmianie.
 */
export function useDebouncedSave(key, value, ready, onError, delay = 500) {
  const timer = useRef(null);
  useEffect(() => {
    if (!ready) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const ok = await saveKey(key, value);
      if (!ok && onError) onError();
    }, delay);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ready]);
}

/**
 * Buduje klucz zapisu z prefiksem dzierżawcy (tenantId) — na razie używane
 * WYŁĄCZNIE dla nowych danych partii/segmentów. Istniejące klucze
 * (core-data/config-data/activity-data/photo:*) świadomie NIE przechodzą
 * przez tę funkcję, żeby nie zmienić ich nazwy i nie "zgubić" już zapisanych
 * danych — dokładnie ten błąd już raz kosztował realne dane użytkownika.
 */
export function tenantKey(key, tenantId) {
  return `${tenantId}:${key}`;
}
