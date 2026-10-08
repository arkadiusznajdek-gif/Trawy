import { useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kqpwahcxnmamypbcvwii.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lID65XpydwsykUaG6AbfFg_-odlj9c5";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function localGet(key) {
  return window.localStorage.getItem(`szkolka:${key}`);
}
function localSet(key, rawValue) {
  window.localStorage.setItem(`szkolka:${key}`, rawValue);
}
function localDelete(key) {
  window.localStorage.removeItem(`szkolka:${key}`);
}
function getPendingQueue() {
  try {
    return JSON.parse(window.localStorage.getItem("szkolka:_pending_sync") || "[]");
  } catch {
    return [];
  }
}
function setPendingQueue(list) {
  window.localStorage.setItem("szkolka:_pending_sync", JSON.stringify(list));
}
function queueForSync(key) {
  const queue = getPendingQueue();
  if (!queue.includes(key)) queue.push(key);
  setPendingQueue(queue);
}

let currentUserId = null;
export function setCurrentUserId(id) {
  currentUserId = id;
}

async function pushKeyToCloud(key) {
  if (!currentUserId) return false;
  const raw = localGet(key);
  if (raw == null) return false;
  try {
    const { error } = await supabase.from("app_data").upsert({
      user_id: currentUserId,
      key,
      value: JSON.parse(raw),
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function flushPendingSync() {
  if (typeof navigator === "undefined" || !navigator.onLine || !currentUserId) return;
  const queue = getPendingQueue();
  if (queue.length === 0) return;
  const remaining = [];
  for (const key of queue) {
    const ok = await pushKeyToCloud(key);
    if (!ok) remaining.push(key);
  }
  setPendingQueue(remaining);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushPendingSync();
  });
}

export async function loadKey(key, fallback) {
  const raw = localGet(key);
  return raw == null ? fallback : JSON.parse(raw);
}

export async function pullAllFromCloud() {
  if (!currentUserId || typeof navigator === "undefined" || !navigator.onLine) return;
  const { data, error } = await supabase.from("app_data").select("key, value").eq("user_id", currentUserId);
  if (error || !data) return;
  data.forEach((row) => {
    localSet(row.key, JSON.stringify(row.value));
  });
}

export async function saveKey(key, value) {
  localSet(key, JSON.stringify(value));
  if (typeof navigator !== "undefined" && navigator.onLine && currentUserId) {
    const ok = await pushKeyToCloud(key);
    if (!ok) queueForSync(key);
  } else {
    queueForSync(key);
  }
  return true;
}

export async function deleteKey(key) {
  localDelete(key);
  if (currentUserId) {
    try {
      await supabase.from("app_data").delete().eq("user_id", currentUserId).eq("key", key);
    } catch {}
  }
  return true;
}

export async function listPhotoKeys() {
  const keys = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith("szkolka:photo:")) keys.push(k.replace("szkolka:", ""));
  }
  return keys;
}

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

export function tenantKey(key, tenantId) {
  return `${tenantId}:${key}`;
}
