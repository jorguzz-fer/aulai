import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/apiAuth";
import { updateCourseSchema } from "@/lib/validation";
import { getCourse, updateCourse } from "@/lib/courses";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const actor = await authorizeRequest(req);
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const course = await getCourse(id);
  if (!course) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ course });
}

export async function PATCH(req: Request, { params }: Params) {
  const actor = await authorizeRequest(req);
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 422 });
  }
  const course = await updateCourse(id, parsed.data);
  return NextResponse.json({ course });
}
