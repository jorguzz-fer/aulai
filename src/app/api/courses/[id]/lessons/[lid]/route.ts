import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/apiAuth";
import { lessonAssetSchema } from "@/lib/validation";
import { updateLessonAsset } from "@/lib/courses";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; lid: string }> };

// PATCH: atualiza assets de uma aula (vídeo HeyGen / arte Canva). Usado pelo n8n.
export async function PATCH(req: Request, { params }: Params) {
  const actor = await authorizeRequest(req);
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { lid } = await params;
  const body = await req.json().catch(() => null);
  const parsed = lessonAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 422 });
  }
  const lesson = await updateLessonAsset(lid, parsed.data);
  return NextResponse.json({ lesson });
}
