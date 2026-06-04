import { createHmac } from "node:crypto";

// NÃO funciona em Edge runtime — exige Node runtime nas rotas que chamam isto.
export type DomainEvent =
  | "course.ready_for_approval"
  | "course.approved"
  | "course.changes_requested"
  | "course.scheduled"
  | "course.published";

/**
 * Emite um evento de domínio para o webhook externo (n8n).
 * Fire-and-forget: NÃO bloqueia e NÃO lança. O banco já é a fonte da verdade.
 */
export function emitEvent(event: DomainEvent, payload: unknown): void {
  const url = process.env.OUTBOUND_WEBHOOK_URL;
  const secret = process.env.OUTBOUND_WEBHOOK_SECRET;
  if (!url || !secret) return;

  const body = JSON.stringify({ event, data: payload, at: new Date().toISOString() });
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  // Dispara sem aguardar; loga erro mas nunca propaga.
  void fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": signature,
    },
    body,
  }).catch((err) => {
    console.error(`[events] falha ao emitir ${event}:`, err);
  });
}
