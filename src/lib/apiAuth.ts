import { timingSafeEqual } from "node:crypto";
import { auth } from "@/auth";

export type Actor =
  | { kind: "service"; name: string }
  | { kind: "user"; id: string; name: string; email?: string | null };

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Autenticação dupla: aceita n8n/serviços (x-api-key) OU painel web (sessão NextAuth).
 * Retorna o Actor ou null se não autorizado.
 */
export async function authorizeRequest(req: Request): Promise<Actor | null> {
  // 1. n8n / serviços
  const key = req.headers.get("x-api-key");
  const expected = process.env.SERVICE_API_KEY;
  if (key && expected && constantTimeEqual(key, expected)) {
    return { kind: "service", name: "n8n" };
  }

  // 2. Painel web
  const session = await auth();
  if (session?.user) {
    return {
      kind: "user",
      id: session.user.id,
      name: session.user.name ?? "Usuário",
      email: session.user.email,
    };
  }

  return null;
}
