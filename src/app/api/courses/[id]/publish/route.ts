import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/apiAuth";
import { publishCourse } from "@/lib/courses";
import { StageTransitionError } from "@/lib/stages";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// POST: força publicação no ClassOS (usado pelo agendamento/n8n e pelo painel).
export async function POST(req: Request, { params }: Params) {
  const actor = await authorizeRequest(req);
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const course = await publishCourse(id);
    return NextResponse.json({ course });
  } catch (err) {
    if (err instanceof StageTransitionError) {
      return NextResponse.json({ error: "invalid_transition", message: err.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "publish_failed", message: err instanceof Error ? err.message : "erro" },
      { status: 502 },
    );
  }
}
