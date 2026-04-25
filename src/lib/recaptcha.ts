/**
 * reCAPTCHA v3 server-side verification.
 * https://developers.google.com/recaptcha/docs/v3
 */
const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export type RecaptchaResult = {
  success: boolean;
  score: number;
  action?: string;
  hostname?: string;
  errorCodes?: string[];
};

export async function verifyRecaptcha(
  token: string | null | undefined,
  expectedAction?: string,
  minScore = 0.5,
): Promise<RecaptchaResult> {
  // Opt-out explícito (pra troubleshooting / testes sem reCAPTCHA configurado)
  if (process.env.RECAPTCHA_DISABLED === "true") {
    return { success: true, score: 1, action: expectedAction };
  }
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    // Sem secret configurado — comportamento de dev: permitir.
    if (process.env.NODE_ENV !== "production") {
      return { success: true, score: 1, action: expectedAction };
    }
    return { success: false, score: 0, errorCodes: ["missing-secret"] };
  }
  if (!token) {
    return { success: false, score: 0, errorCodes: ["missing-token"] };
  }
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = (await res.json()) as {
      success: boolean;
      score?: number;
      action?: string;
      hostname?: string;
      "error-codes"?: string[];
    };
    const score = data.score ?? 0;
    const ok =
      data.success &&
      score >= minScore &&
      (!expectedAction || data.action === expectedAction);
    return {
      success: ok,
      score,
      action: data.action,
      hostname: data.hostname,
      errorCodes: data["error-codes"],
    };
  } catch (e) {
    console.error("[recaptcha] verify failed:", (e as Error).message);
    return { success: false, score: 0, errorCodes: ["network-error"] };
  }
}
