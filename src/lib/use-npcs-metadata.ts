"use client";

import { useEffect, useState } from "react";
import type { NpcMetadata } from "./bridge";

let memoryCache: NpcMetadata[] | null = null;
let memoryById: Map<number, NpcMetadata> | null = null;
let inflight: Promise<NpcMetadata[]> | null = null;

const STORAGE_KEY = "l2impure:npcs:v1";
const STORAGE_TS_KEY = "l2impure:npcs:v1:ts";
const STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

function tryLoadFromStorage(): NpcMetadata[] | null {
  if (typeof window === "undefined") return null;
  try {
    const ts = Number(localStorage.getItem(STORAGE_TS_KEY) ?? 0);
    if (!ts || Date.now() - ts > STORAGE_TTL_MS) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NpcMetadata[]) : null;
  } catch {
    return null;
  }
}

function saveToStorage(items: NpcMetadata[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
  } catch {
    /* QuotaExceeded — segue sem storage */
  }
}

async function fetchNpcs(): Promise<NpcMetadata[]> {
  if (memoryCache) return memoryCache;
  const fromStorage = tryLoadFromStorage();
  if (fromStorage) {
    memoryCache = fromStorage;
    memoryById = new Map(fromStorage.map((n) => [n.id, n]));
    return fromStorage;
  }
  if (!inflight) {
    inflight = fetch("/api/admin/npcs/metadata")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as NpcMetadata[];
      })
      .then((data) => {
        memoryCache = data;
        memoryById = new Map(data.map((n) => [n.id, n]));
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

export function clearNpcsCache() {
  memoryCache = null;
  memoryById = null;
  inflight = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TS_KEY);
    } catch {
      /* noop */
    }
  }
}

export function useNpcsMetadata() {
  const [npcs, setNpcs] = useState<NpcMetadata[] | null>(memoryCache);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(memoryCache === null);

  useEffect(() => {
    if (memoryCache) {
      setNpcs(memoryCache);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchNpcs()
      .then((data) => {
        if (!cancelled) {
          setNpcs(data);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { npcs, error, loading };
}

export function npcName(id: number): string {
  return memoryById?.get(id)?.name ?? `#${id}`;
}
