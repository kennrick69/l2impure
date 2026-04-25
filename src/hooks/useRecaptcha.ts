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
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const DISABLED =
  process.env.NEXT_PUBLIC_RECAPTCHA_DISABLED === "true" || !SITE_KEY;

type Status = "idle" | "loading" | "ready" | "disabled";

/**
 * Hook para reCAPTCHA v3 (invisível).
 * - Carrega o script sob demanda.
 * - Expõe execute(action) → Promise<string | null>.
 * - Em dev sem SITE_KEY, retorna ready=true e execute retorna null
 *   (backend também faz fallback quando RECAPTCHA_SECRET_KEY está ausente).
 */
export function useRecaptcha(): {
  status: Status;
  execute: (action: string) => Promise<string | null>;
} {
  const [status, setStatus] = useState<Status>(
    DISABLED ? "disabled" : "idle",
  );

  useEffect(() => {
    if (DISABLED || !SITE_KEY) return;
    if (window.grecaptcha) {
      setStatus("ready");
      return;
    }
    // Idempotent: se outra instância já começou a carregar, espera
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-grecaptcha]",
    );
    if (existing) {
      existing.addEventListener("load", () => {
        window.grecaptcha?.ready(() => setStatus("ready"));
      });
      return;
    }
    setStatus("loading");
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.dataset.grecaptcha = "1";
    script.onload = () => {
      window.grecaptcha?.ready(() => setStatus("ready"));
    };
    script.onerror = () => setStatus("disabled");
    document.head.appendChild(script);
  }, []);

  const execute = useCallback(
    async (action: string): Promise<string | null> => {
      if (DISABLED || !SITE_KEY || !window.grecaptcha) return null;
      try {
        return await window.grecaptcha.execute(SITE_KEY, { action });
      } catch (e) {
        console.error("[recaptcha] execute failed:", e);
        return null;
      }
    },
    [],
  );

  return { status, execute };
}
