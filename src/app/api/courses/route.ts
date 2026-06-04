import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/apiAuth";
import { createCourseSchema } from "@/lib/validation";
import { createCourse, listCourses } from "@/lib/courses";
import { Source } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const actor = await authorizeRequest(req);
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("archived") === "true";
  const courses = await listCourses({ includeArchived });
  return NextResponse.json({ courses });
}

export async function POST(req: Request) {
  const actor = await authorizeRequest(req);
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 422 });
  }

  const source = actor.kind === "service" ? Source.WHATSAPP : Source.MANUAL;
  const course = await createCourse(parsed.data, source);
  return NextResponse.json({ course }, { status: 201 });
}
