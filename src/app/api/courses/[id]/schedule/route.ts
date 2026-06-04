import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/apiAuth";
import { scheduleSchema } from "@/lib/validation";
import { scheduleCourse } from "@/lib/courses";
import { StageTransitionError } from "@/lib/stages";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const actor = await authorizeRequest(req);
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const course = await scheduleCourse(id, parsed.data);
    return NextResponse.json({ course });
  } catch (err) {
    if (err instanceof StageTransitionError) {
      return NextResponse.json({ error: "invalid_transition", message: err.message }, { status: 409 });
    }
    throw err;
  }
}
