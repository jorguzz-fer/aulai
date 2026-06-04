import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeRequest } from "@/lib/apiAuth";
import { updateModuleThumbnail } from "@/lib/courses";

export const runtime = "nodejs";

const schema = z.object({ thumbnailUrl: z.string().url() });

type Params = { params: Promise<{ id: string; mid: string }> };

// PATCH: capa (Canva) do módulo. Usado pelo n8n.
export async function PATCH(req: Request, { params }: Params) {
  const actor = await authorizeRequest(req);
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { mid } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 422 });
  }
  const module = await updateModuleThumbnail(mid, parsed.data.thumbnailUrl);
  return NextResponse.json({ module });
}
