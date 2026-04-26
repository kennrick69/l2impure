"use client";

import { useState } from "react";
import type { ItemMetadata } from "@/lib/bridge";
import { getItemFromCache } from "@/lib/use-items-metadata";

/**
 * ItemIcon — tenta CDN configurada via NEXT_PUBLIC_ITEM_ICON_BASE_URL
 * (fallback pra placeholder com emoji baseado no tipo).
 *
 * Pra ativar ícones reais, hospede um pack de ícones Interlude PNG
 * indexados por item ID e seta a env var no Railway:
 *   NEXT_PUBLIC_ITEM_ICON_BASE_URL=https://seu-cdn/icons
 * (a URL completa do PNG vira `${baseUrl}/${itemId}.png`).
 */
const BASE_URL = process.env.NEXT_PUBLIC_ITEM_ICON_BASE_URL;

function pickEmoji(meta: ItemMetadata | null | undefined): string {
  if (!meta) return "📦";
  if (meta.type === "Weapon") {
    const w = meta.weaponType ?? "";
    if (w.includes("BOW")) return "🏹";
    if (w.includes("DAGGER")) return "🗡️";
    if (w.includes("STAFF")) return "🪄";
    if (w.includes("FIST") || w.includes("DUAL")) return "👊";
    return "⚔️";
  }
  if (meta.type === "Armor") {
    const slot = meta.slot ?? "";
    if (slot === "head") return "🪖";
    if (slot === "feet") return "🥾";
    if (slot === "gloves") return "🧤";
    if (slot.includes("ring") || slot.includes("earring") || slot.includes("necklace"))
      return "💍";
    return "🛡️";
  }
  if (meta.type === "EtcItem") {
    const n = meta.name.toLowerCase();
    if (n.includes("potion") || n.includes("elixir") || n.includes("mana drug"))
      return "🧪";
    if (n.includes("scroll")) return "📜";
    if (n.includes("crystal")) return "💎";
    if (n.includes("recipe")) return "📋";
    if (n.includes("soulshot")) return "💢";
    if (n.includes("spiritshot")) return "🌀";
    if (n.includes("stone")) return "🪨";
    if (n.includes("herb")) return "🌿";
    if (n.includes("key")) return "🔑";
    if (n.includes("adena")) return "🪙";
    return "📦";
  }
  return "📦";
}

function gradeColor(grade?: string): string {
  switch (grade) {
    case "S":
      return "border-l2-gold/60 bg-l2-gold/10";
    case "A":
      return "border-purple-400/40 bg-purple-400/10";
    case "B":
      return "border-blue-400/40 bg-blue-400/10";
    case "C":
      return "border-l2-green/40 bg-l2-green/10";
    case "D":
      return "border-yellow-400/40 bg-yellow-400/10";
    default:
      return "border-white/10 bg-white/5";
  }
}

export function ItemIcon({
  itemId,
  item,
  size = 32,
}: {
  itemId: number;
  item?: ItemMetadata | null;
  size?: number;
}) {
  const meta = item ?? getItemFromCache(itemId);
  const [imgFailed, setImgFailed] = useState(!BASE_URL);
  const grade = meta?.grade ?? "NONE";
  const ringColor = gradeColor(grade);

  if (BASE_URL && !imgFailed) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded border ${ringColor}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${BASE_URL}/${itemId}.png`}
          alt={meta?.name ?? `#${itemId}`}
          width={size}
          height={size}
          onError={() => setImgFailed(true)}
          className="object-contain"
        />
      </span>
    );
  }

  const emoji = pickEmoji(meta);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded border text-base ${ringColor}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      title={meta?.name ?? `#${itemId}`}
    >
      {emoji}
    </span>
  );
}
