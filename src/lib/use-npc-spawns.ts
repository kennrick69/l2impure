"use client";

import { useEffect, useState } from "react";

type SpawnsByNpc = Record<string, { x: number; y: number }[]>;

let memoryCache: SpawnsByNpc | null = null;
let inflight: Promise<SpawnsByNpc> | null = null;

const STORAGE_KEY = "l2impure:npc-spawns:v1";
const STORAGE_TS_KEY = "l2impure:npc-spawns:v1:ts";
const STORAGE_TTL_MS = 60 * 60 * 1000; // 1h — spawns mudam mais que items

function tryLoadFromStorage(): SpawnsByNpc | null {
  if (typeof window === "undefined") return null;
  try {
    const ts = Number(localStorage.getItem(STORAGE_TS_KEY) ?? 0);
    if (!ts || Date.now() - ts > STORAGE_TTL_MS) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SpawnsByNpc) : null;
  } catch {
    return null;
  }
}

function saveToStorage(data: SpawnsByNpc) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
  } catch {
    /* QuotaExceeded */
  }
}

async function fetchSpawns(): Promise<SpawnsByNpc> {
  if (memoryCache) return memoryCache;
  const fromStorage = tryLoadFromStorage();
  if (fromStorage) {
    memoryCache = fromStorage;
    return fromStorage;
  }
  if (!inflight) {
    inflight = fetch("/api/admin/npcs/all-spawns")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as { byNpc: SpawnsByNpc };
        return j.byNpc;
      })
      .then((data) => {
        memoryCache = data;
        saveToStorage(data);
        return data;
      })
      .catch((e) => {
        inflight = null;
        throw e;
      });
  }
  return inflight;
}

export function useNpcSpawnsIndex() {
  const [data, setData] = useState<SpawnsByNpc | null>(memoryCache);
  const [loading, setLoading] = useState(memoryCache === null);

  useEffect(() => {
    if (memoryCache) {
      setData(memoryCache);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchSpawns()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}
