import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { recordHeygenResult } from "@/lib/courses";

export const runtime = "nodejs";

function secretOk(provided: string | null): boolean {
  const expected = process.env.HEYGEN_WEBHOOK_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Callback do HeyGen quando um vídeo termina de renderizar.
 * Protegido por ?secret= (HeyGen não envia x-api-key).
 * Payload: { event_type: "avatar_video.success"|"...failed", event_data: { video_id, url, callback_id } }
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!secretOk(url.searchParams.get("secret"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { event_type?: string; event_data?: { video_id?: string; url?: string; callback_id?: string } }
    | null;
  if (!body) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const data = body.event_data ?? {};
  const success = (body.event_type ?? "").endsWith("success");

  const result = await recordHeygenResult({
    videoId: data.video_id,
    callbackId: data.callback_id,
    success,
    videoUrl: data.url,
  });

  return NextResponse.json({ ok: true, ...result });
}
