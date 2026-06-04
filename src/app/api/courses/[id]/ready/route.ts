import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/apiAuth";
import { markReadyForApproval } from "@/lib/courses";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// POST: n8n marca o curso pronto p/ aprovação quando todos os vídeos estão READY.
export async function POST(req: Request, { params }: Params) {
  const actor = await authorizeRequest(req);
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const course = await markReadyForApproval(id);
  return NextResponse.json({ course });
}
