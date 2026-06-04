import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/apiAuth";
import { curriculumSchema } from "@/lib/validation";
import { setCurriculum } from "@/lib/courses";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// PUT/POST: substitui o currículo completo (módulos + aulas). Usado pelo n8n.
async function handle(req: Request, { params }: Params) {
  const actor = await authorizeRequest(req);
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = curriculumSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 422 });
  }
  const course = await setCurriculum(id, parsed.data);
  return NextResponse.json({ course });
}

export { handle as POST, handle as PUT };
