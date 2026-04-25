"use client";

import { useEffect, useState } from "react";
import type { ItemMetadata } from "./bridge";

let memoryCache: ItemMetadata[] | null = null;
let memoryById: Map<number, ItemMetadata> | null = null;
let inflight: Promise<ItemMetadata[]> | null = null;

const STORAGE_KEY = "l2impure:items:v1";
const STORAGE_TS_KEY = "l2impure:items:v1:ts";
const STORAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function tryLoadFromStorage(): ItemMetadata[] | null {
  if (typeof window === "undefined") return null;
  try {
    const ts = Number(localStorage.getItem(STORAGE_TS_KEY) ?? 0);
    if (!ts || Date.now() - ts > STORAGE_TTL_MS) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ItemMetadata[];
  } catch {
    return null;
  }
}

function saveToStorage(items: ItemMetadata[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
  } catch {
    // QuotaExceededError em alguns browsers — sem cache permanente, só RAM
  }
}

async function fetchItems(): Promise<ItemMetadata[]> {
  if (memoryCache) return memoryCache;
  const fromStorage = tryLoadFromStorage();
  if (fromStorage) {
    memoryCache = fromStorage;
    memoryById = new Map(fromStorage.map((i) => [i.id, i]));
    return fromStorage;
  }
  if (!inflight) {
    inflight = fetch("/api/admin/items/metadata")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ItemMetadata[];
      })
      .then((data) => {
        memoryCache = data;
        memoryById = new Map(data.map((i) => [i.id, i]));
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

export function getItemFromCache(itemId: number): ItemMetadata | null {
  return memoryById?.get(itemId) ?? null;
}

export function useItemsMetadata() {
  const [items, setItems] = useState<ItemMetadata[] | null>(memoryCache);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(memoryCache === null);

  useEffect(() => {
    if (memoryCache) {
      setItems(memoryCache);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchItems()
      .then((data) => {
        if (!cancelled) {
          setItems(data);
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

  return { items, error, loading };
}

/**
 * Lookup síncrono pra montar nomes em renderizações (ex: tabela de
 * inventário). Retorna fallback se cache não carregado ainda.
 */
export function itemName(itemId: number): string {
  return memoryById?.get(itemId)?.name ?? `#${itemId}`;
}

export function itemGrade(itemId: number): string {
  return memoryById?.get(itemId)?.grade ?? "NONE";
}
