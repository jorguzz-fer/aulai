"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Decision, Gate } from "@prisma/client";
import { auth, signOut } from "@/auth";
import type { Actor } from "@/lib/apiAuth";
import {
  recordDecision,
  scheduleCourse,
  publishCourse,
  archiveCourse,
} from "@/lib/courses";

async function currentActor(): Promise<Actor> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return {
    kind: "user",
    id: session.user.id,
    name: session.user.name ?? "Usuário",
    email: session.user.email,
  };
}

export async function approveAction(formData: FormData) {
  const id = String(formData.get("id"));
  const actor = await currentActor();
  await recordDecision(id, { gate: Gate.COURSE, decision: Decision.APPROVED }, actor);
  revalidatePath("/");
  revalidatePath(`/courses/${id}`);
}

export async function rejectAction(formData: FormData) {
  const id = String(formData.get("id"));
  const comment = String(formData.get("comment") ?? "");
  const actor = await currentActor();
  await recordDecision(
    id,
    { gate: Gate.COURSE, decision: Decision.CHANGES_REQUESTED, comment },
    actor,
  );
  revalidatePath("/");
  revalidatePath(`/courses/${id}`);
}

export async function publishNowAction(formData: FormData) {
  const id = String(formData.get("id"));
  await currentActor();
  await publishCourse(id);
  revalidatePath("/");
  revalidatePath(`/courses/${id}`);
}

export async function scheduleAction(formData: FormData) {
  const id = String(formData.get("id"));
  const scheduledFor = new Date(String(formData.get("scheduledFor")));
  await currentActor();
  await scheduleCourse(id, { scheduledFor });
  revalidatePath("/");
  revalidatePath(`/courses/${id}`);
}

export async function archiveAction(formData: FormData) {
  const id = String(formData.get("id"));
  await currentActor();
  await archiveCourse(id, true);
  revalidatePath("/");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
