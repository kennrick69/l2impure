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
const ENTERPRISE =
  process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE === "true";

type Status = "disabled" | "loading" | "ready" | "error";

function prefix(k: string | undefined) {
  if (!k) return "<empty>";
  return `${k.slice(0, 10)}…${k.slice(-4)} (len=${k.length})`;
}

/**
 * O script é carregado no root layout via <Script> do Next.js
 * (idempotente, uma vez por documento, antes de qualquer form).
 * Este hook só aguarda o `grecaptcha` ficar disponível e expõe execute().
 */
export function useRecaptcha(): {
  status: Status;
  execute: (action: string) => Promise<string | null>;
} {
  const [status, setStatus] = useState<Status>(
    DISABLED ? "disabled" : "loading",
  );

  useEffect(() => {
    if (DISABLED || !SITE_KEY) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 50; // 5s de timeout (100ms × 50)

    function check() {
      if (cancelled) return;
      const gr = ENTERPRISE
        ? window.grecaptcha?.enterprise
        : window.grecaptcha;
      if (gr && typeof gr.ready === "function") {
        gr.ready(() => {
          if (!cancelled) {
            console.info(
              `[recaptcha] ready (key=${prefix(SITE_KEY)}, enterprise=${ENTERPRISE}, host=${location.hostname})`,
            );
            setStatus("ready");
          }
        });
        return;
      }
      if (++attempts >= maxAttempts) {
        console.error(
          `[recaptcha] timeout aguardando window.grecaptcha${ENTERPRISE ? ".enterprise" : ""} (key=${prefix(SITE_KEY)})`,
        );
        setStatus("error");
        return;
      }
      setTimeout(check, 100);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const execute = useCallback(
    async (action: string): Promise<string | null> => {
      if (DISABLED || !SITE_KEY) return null;
      const gr = ENTERPRISE
        ? window.grecaptcha?.enterprise
        : window.grecaptcha;
      if (!gr) {
        console.error("[recaptcha] execute: grecaptcha ainda não carregado");
        return null;
      }
      try {
        const token = await gr.execute(SITE_KEY, { action });
        console.info(
          `[recaptcha] execute OK (action=${action}, token=${token.slice(0, 12)}…)`,
        );
        return token;
      } catch (e) {
        const msg = (e as Error)?.message ?? String(e);
        console.error(
          `[recaptcha] execute FAILED (action=${action}, key=${prefix(SITE_KEY)}, enterprise=${ENTERPRISE}, host=${location.hostname}): ${msg}`,
        );
        return null;
      }
    },
    [],
  );

  return { status, execute };
}
