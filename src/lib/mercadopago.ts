/**
 * MercadoPago — adaptado da integração homologada da IMP Locadora.
 * fetch() nativo, sem SDK npm. Singleton lê credenciais de env vars.
 *
 * Escopo L2 Impure: só Checkout Pro (PIX/cartão/boleto via redirect),
 * consulta de pagamento, refund, validação de assinatura webhook.
 */
import { createHmac } from "node:crypto";

const MP_BASE = "https://api.mercadopago.com";

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    public status?: number,
    public mpData?: unknown,
  ) {
    super(message);
    this.name = "MercadoPagoError";
  }
}

export type MpPreference = {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
};

export type MpPayment = {
  id: string;
  status: string;
  statusDetail: string;
  amount: number;
  externalReference: string | null;
  dateApproved: string | null;
  paymentMethodId: string | null;
};

class MercadoPagoService {
  get accessToken(): string | null {
    return process.env.MP_ACCESS_TOKEN ?? null;
  }
  get publicKey(): string | null {
    return process.env.MP_PUBLIC_KEY ?? null;
  }
  get webhookUrl(): string | null {
    return process.env.MP_WEBHOOK_URL ?? null;
  }
  get webhookSecret(): string | null {
    return process.env.MP_WEBHOOK_SECRET ?? null;
  }

  isConfigured(): boolean {
    return Boolean(this.accessToken);
  }

  private headers(idempotencyKey?: string): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };
    if (idempotencyKey) h["X-Idempotency-Key"] = idempotencyKey;
    return h;
  }

  private async request<T = unknown>(
    method: "GET" | "POST" | "PUT",
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new MercadoPagoError("MP_ACCESS_TOKEN não configurado", 503);
    }
    const res = await fetch(MP_BASE + path, {
      method,
      headers: this.headers(idempotencyKey),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const msg =
        (data.message as string) ||
        (data.error as string) ||
        `MP API ${res.status}`;
      throw new MercadoPagoError(msg, res.status, data);
    }
    return data as T;
  }

  /**
   * Cria uma preferência Checkout Pro. Player é redirecionado pro init_point
   * e paga via PIX/cartão/boleto. MP envia webhook quando confirmado.
   */
  async createCheckoutPreference(opts: {
    title: string;
    description?: string;
    unitPrice: number;
    payerEmail?: string;
    externalReference: string;
    backUrls: { success: string; failure: string; pending: string };
  }): Promise<MpPreference> {
    const body = {
      items: [
        {
          id: opts.externalReference,
          title: opts.title,
          description: opts.description ?? opts.title,
          quantity: 1,
          unit_price: Number(opts.unitPrice.toFixed(2)),
          currency_id: "BRL",
          category_id: "others",
        },
      ],
      payer: opts.payerEmail ? { email: opts.payerEmail } : undefined,
      back_urls: opts.backUrls,
      auto_return: "approved",
      external_reference: opts.externalReference,
      notification_url: this.webhookUrl ?? undefined,
      statement_descriptor: "L2 IMPURE",
    };
    const data = await this.request<{
      id: string;
      init_point: string;
      sandbox_init_point: string;
    }>("POST", "/checkout/preferences", body);
    return {
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
    };
  }

  async getPayment(id: string): Promise<MpPayment> {
    const data = await this.request<{
      id: number;
      status: string;
      status_detail: string;
      transaction_amount: number;
      external_reference: string | null;
      date_approved: string | null;
      payment_method_id: string | null;
    }>("GET", `/v1/payments/${encodeURIComponent(id)}`);
    return {
      id: String(data.id),
      status: data.status,
      statusDetail: data.status_detail,
      amount: Number(data.transaction_amount),
      externalReference: data.external_reference,
      dateApproved: data.date_approved,
      paymentMethodId: data.payment_method_id,
    };
  }

  async refund(paymentId: string, amount?: number): Promise<unknown> {
    const body = amount ? { amount: Number(amount.toFixed(2)) } : {};
    return this.request(
      "POST",
      `/v1/payments/${encodeURIComponent(paymentId)}/refunds`,
      body,
    );
  }

  /**
   * Valida assinatura do webhook MP. Manifest oficial:
   *   id:{paymentId};request-id:{requestId};ts:{ts};
   * HMAC-SHA256 com MP_WEBHOOK_SECRET, comparado a v1 do header x-signature.
   *
   * Retorna true se válido OU se webhookSecret não está configurado
   * (modo permissivo — recomendamos configurar em prod).
   */
  validateWebhookSignature(
    headers: Headers,
    paymentId: string | null,
  ): { valid: boolean; reason?: string } {
    if (!this.webhookSecret) {
      return { valid: true, reason: "no-secret-configured" };
    }
    if (!paymentId) return { valid: false, reason: "no-payment-id" };
    const sig = headers.get("x-signature");
    const requestId = headers.get("x-request-id");
    if (!sig || !requestId) return { valid: false, reason: "missing-headers" };
    const tsMatch = sig.match(/ts=(\d+)/);
    const v1Match = sig.match(/v1=([a-f0-9]+)/);
    if (!tsMatch || !v1Match) return { valid: false, reason: "bad-signature-format" };
    const ts = tsMatch[1];
    const v1 = v1Match[1];
    if (!ts || !v1) return { valid: false, reason: "bad-signature-format" };
    const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac("sha256", this.webhookSecret)
      .update(manifest)
      .digest("hex");
    return expected === v1
      ? { valid: true }
      : { valid: false, reason: "hash-mismatch" };
  }
}

export const mp = new MercadoPagoService();
