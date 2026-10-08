import { useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kqpwahcxnmamypbcvwii.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lID65XpydwsykUaG6AbfFg_-odlj9c5";
const LOCAL_PREFIX = "szkolka:";
const PENDING_KEY = `${LOCAL_PREFIX}_pending_sync`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function localGet(key) {
  return window.localStorage.getItem(`${LOCAL_PREFIX}${key}`);
}

function localSet(key, rawValue) {
  window.localStorage.setItem(`${LOCAL_PREFIX}${key}`, rawValue);
}

function localDelete(key) {
  window.localStorage.removeItem(`${LOCAL_PREFIX}${key}`);
}

function reportSyncError(error) {
  const message = error instanceof Error ? error.message : String(error);
  window.dispatchEvent(new CustomEvent("app-sync-error", { detail: message }));
}

function getPendingQueue() {
  const raw = window.localStorage.getItem(PENDING_KEY);
  if (!raw) return [];
  const saved = JSON.parse(raw);
  if (!Array.isArray(saved)) throw new Error("Kolejka synchronizacji ma nieprawidłowy format.");

  return saved.map((entry) => {
    if (typeof entry === "string") return { key: entry, operation: "upsert" };
    if (
      entry &&
      typeof entry.key === "string" &&
      (entry.operation === "upsert" || entry.operation === "delete")
    ) {
      return entry;
    }
    throw new Error("Kolejka synchronizacji zawiera nieprawidłowy wpis.");
  });
}

function setPendingQueue(queue) {
  window.localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
}

function queueForSync(key, operation) {
  const queue = getPendingQueue().filter((entry) => entry.key !== key);
  queue.push({ key, operation });
  setPendingQueue(queue);
}

function getLocalRecords() {
  const records = new Map();
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const storageKey = window.localStorage.key(i);
    if (
      !storageKey ||
      !storageKey.startsWith(LOCAL_PREFIX) ||
      storageKey === PENDING_KEY ||
      storageKey.startsWith(`${LOCAL_PREFIX}_cloud_initialized:`)
    ) continue;

    const key = storageKey.slice(LOCAL_PREFIX.length);
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) continue;
    records.set(key, JSON.parse(raw));
  }
  return records;
}

let currentUserId = null;

export function setCurrentUserId(id) {
  currentUserId = id;
}

async function pushKeyToCloud(key) {
  if (!currentUserId) return false;
  const raw = localGet(key);
  if (raw === null) return false;

  try {
    const { error } = await supabase.from("app_data").upsert(
      {
        user_id: currentUserId,
        key,
        value: JSON.parse(raw),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,key" }
    );
    if (error) reportSyncError(error);
    return !error;
  } catch (error) {
    reportSyncError(error);
    return false;
  }
}

async function deleteKeyFromCloud(key) {
  if (!currentUserId) return false;
  try {
    const { error } = await supabase
      .from("app_data")
      .delete()
      .eq("user_id", currentUserId)
      .eq("key", key);
    if (error) reportSyncError(error);
    return !error;
  } catch (error) {
    reportSyncError(error);
    return false;
  }
}

export async function flushPendingSync() {
  if (typeof navigator === "undefined" || !navigator.onLine || !currentUserId) return;

  try {
    const queue = getPendingQueue();
    const remaining = [];
    for (const entry of queue) {
      const synced =
        entry.operation === "delete"
          ? await deleteKeyFromCloud(entry.key)
          : await pushKeyToCloud(entry.key);
      if (!synced) remaining.push(entry);
    }
    setPendingQueue(remaining);
  } catch (error) {
    reportSyncError(error);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    if (!currentUserId) return;
    void syncWithCloud(currentUserId)
      .then((result) => {
        if (result.updatedFromCloud) window.dispatchEvent(new Event("app-cloud-data-updated"));
      })
      .catch(reportSyncError);
  });
}

export async function loadKey(key, fallback) {
  const raw = localGet(key);
  return raw === null ? fallback : JSON.parse(raw);
}

export async function syncWithCloud(userId) {
  setCurrentUserId(userId);
  if (typeof navigator === "undefined" || !navigator.onLine) {
    return { synced: false, message: "Brak połączenia — zmiany zostaną zsynchronizowane po powrocie do sieci." };
  }

  const initializedKey = `${LOCAL_PREFIX}_cloud_initialized:${userId}`;
  const firstSyncOnThisDevice = !window.localStorage.getItem(initializedKey);
  const { data, error } = await supabase
    .from("app_data")
    .select("key, value")
    .eq("user_id", userId);
  if (error) throw error;

  const cloudRecords = new Map((data || []).map((row) => [row.key, row.value]));
  const localRecords = getLocalRecords();
  const pending = getPendingQueue();
  const pendingByKey = new Map(pending.map((entry) => [entry.key, entry]));
  const remaining = [];
  let updatedFromCloud = false;

  for (const entry of pending) {
    if (entry.operation === "delete") {
      if (!(await deleteKeyFromCloud(entry.key))) remaining.push(entry);
      else cloudRecords.delete(entry.key);
      continue;
    }

    if (!(await pushKeyToCloud(entry.key))) remaining.push(entry);
    else if (localRecords.has(entry.key)) cloudRecords.set(entry.key, localRecords.get(entry.key));
  }

  for (const [key, value] of localRecords) {
    if (pendingByKey.has(key) || (cloudRecords.has(key) && !firstSyncOnThisDevice)) continue;
    if (await pushKeyToCloud(key)) cloudRecords.set(key, value);
    else {
      const entry = { key, operation: "upsert" };
      remaining.push(entry);
      pendingByKey.set(key, entry);
    }
  }

  for (const [key, value] of cloudRecords) {
    if (pendingByKey.has(key)) continue;
    const serialized = JSON.stringify(value);
    if (localGet(key) !== serialized) {
      localSet(key, serialized);
      updatedFromCloud = true;
    }
  }

  for (const key of localRecords.keys()) {
    if (!cloudRecords.has(key) && pendingByKey.get(key)?.operation !== "upsert") {
      localDelete(key);
      updatedFromCloud = true;
    }
  }

  setPendingQueue(remaining);
  if (remaining.length === 0) window.localStorage.setItem(initializedKey, "true");
  return {
    synced: remaining.length === 0,
    updatedFromCloud,
    message:
      remaining.length === 0
        ? "Dane są zsynchronizowane."
        : "Aplikacja działa lokalnie; część zmian czeka na synchronizację.",
  };
}

export async function pullAllFromCloud() {
  if (!currentUserId) return;
  await syncWithCloud(currentUserId);
}

export async function saveKey(key, value) {
  localSet(key, JSON.stringify(value));
  if (typeof navigator !== "undefined" && navigator.onLine && currentUserId) {
    const ok = await pushKeyToCloud(key);
    if (!ok) queueForSync(key, "upsert");
  } else {
    queueForSync(key, "upsert");
  }
  return true;
}

export async function deleteKey(key) {
  localDelete(key);
  if (typeof navigator !== "undefined" && navigator.onLine && currentUserId) {
    const ok = await deleteKeyFromCloud(key);
    if (!ok) queueForSync(key, "delete");
  } else {
    queueForSync(key, "delete");
  }
  return true;
}

export async function listPhotoKeys() {
  const keys = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(`${LOCAL_PREFIX}photo:`)) {
      keys.push(key.slice(LOCAL_PREFIX.length));
    }
  }
  return keys;
}

export function useDebouncedSave(key, value, ready, onError, delay = 500) {
  const timer = useRef(null);
  useEffect(() => {
    if (!ready) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const ok = await saveKey(key, value);
        if (!ok && onError) onError();
      } catch (error) {
        reportSyncError(error);
        if (onError) onError();
      }
    }, delay);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ready]);
}

export function tenantKey(key, tenantId) {
  return `${tenantId}:${key}`;
}
