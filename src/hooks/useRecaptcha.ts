"use client";

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (
        siteKey: string,
        opts: { action: string },
      ) => Promise<string>;
      enterprise?: {
        ready: (cb: () => void) => void;
        execute: (
          siteKey: string,
          opts: { action: string },
        ) => Promise<string>;
      };
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const DISABLED =
  process.env.NEXT_PUBLIC_RECAPTCHA_DISABLED === "true" || !SITE_KEY;
// Permite trocar pra Enterprise sem recompilar código, se for esse o caso.
const ENTERPRISE =
  process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE === "true";

type Status = "idle" | "loading" | "ready" | "disabled" | "error";

function logPrefix(k: string | undefined) {
  if (!k) return "<empty>";
  return `${k.slice(0, 10)}...${k.slice(-4)} (len=${k.length})`;
}

export function useRecaptcha(): {
  status: Status;
  execute: (action: string) => Promise<string | null>;
} {
  const [status, setStatus] = useState<Status>(
    DISABLED ? "disabled" : "idle",
  );

  useEffect(() => {
    if (DISABLED || !SITE_KEY) {
      console.info(
        `[recaptcha] disabled (key=${logPrefix(SITE_KEY)}, flag=${process.env.NEXT_PUBLIC_RECAPTCHA_DISABLED})`,
      );
      return;
    }
    console.info(
      `[recaptcha] loading (key=${logPrefix(SITE_KEY)}, enterprise=${ENTERPRISE}, hostname=${typeof location !== "undefined" ? location.hostname : "?"})`,
    );

    const grOnWindow = ENTERPRISE
      ? window.grecaptcha?.enterprise
      : window.grecaptcha;
    if (grOnWindow) {
      setStatus("ready");
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-grecaptcha]",
    );
    if (existing) {
      existing.addEventListener("load", () => {
        const gr = ENTERPRISE
          ? window.grecaptcha?.enterprise
          : window.grecaptcha;
        gr?.ready(() => setStatus("ready"));
      });
      return;
    }
    setStatus("loading");
    const script = document.createElement("script");
    script.src = ENTERPRISE
      ? `https://www.google.com/recaptcha/enterprise.js?render=${SITE_KEY}`
      : `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.dataset.grecaptcha = "1";
    script.onload = () => {
      const gr = ENTERPRISE
        ? window.grecaptcha?.enterprise
        : window.grecaptcha;
      if (!gr) {
        console.error(
          `[recaptcha] script loaded mas window.grecaptcha${ENTERPRISE ? ".enterprise" : ""} não existe`,
        );
        setStatus("error");
        return;
      }
      gr.ready(() => {
        console.info("[recaptcha] ready");
        setStatus("ready");
      });
    };
    script.onerror = () => {
      console.error("[recaptcha] script failed to load");
      setStatus("error");
    };
    document.head.appendChild(script);
  }, []);

  const execute = useCallback(
    async (action: string): Promise<string | null> => {
      if (DISABLED || !SITE_KEY) return null;
      const gr = ENTERPRISE
        ? window.grecaptcha?.enterprise
        : window.grecaptcha;
      if (!gr) {
        console.error("[recaptcha] execute: grecaptcha não carregado");
        return null;
      }
      try {
        const token = await gr.execute(SITE_KEY, { action });
        console.info(
          `[recaptcha] execute ok (action=${action}, token_prefix=${token.slice(0, 12)}...)`,
        );
        return token;
      } catch (e) {
        const msg = (e as Error)?.message ?? String(e);
        console.error(
          `[recaptcha] execute FAILED (action=${action}, key=${logPrefix(SITE_KEY)}, enterprise=${ENTERPRISE}): ${msg}`,
        );
        if (msg.includes("Invalid site key")) {
          console.error(
            "[recaptcha] Hipóteses:\n" +
              "  1. A chave no env var não bate com a cadastrada no Google.\n" +
              "  2. A chave é reCAPTCHA Enterprise — setar NEXT_PUBLIC_RECAPTCHA_ENTERPRISE=true.\n" +
              "  3. Domain mismatch — verificar allowlist no console Google.",
          );
        }
        return null;
      }
    },
    [],
  );

  return { status, execute };
}
