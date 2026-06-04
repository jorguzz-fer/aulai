import { Stage, Gate, Decision, Channel, Source } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextStageForDecision, canPublish, canSchedule, StageTransitionError } from "@/lib/stages";
import { emitEvent } from "@/lib/events";
import { classOSTarget } from "@/lib/publish/classos";
import { decryptSecret } from "@/lib/secrets";
import type { Actor } from "@/lib/apiAuth";
import type {
  CreateCourseInput,
  UpdateCourseInput,
  CurriculumInput,
  LessonAssetInput,
  DecisionInput,
  ScheduleInput,
} from "@/lib/validation";

const courseInclude = {
  client: true,
  modules: { orderBy: { order: "asc" as const }, include: { lessons: { orderBy: { order: "asc" as const } } } },
  events: { orderBy: { createdAt: "desc" as const } },
};

export async function listCourses(opts?: { includeArchived?: boolean }) {
  return prisma.course.findMany({
    where: opts?.includeArchived ? {} : { archived: false },
    include: courseInclude,
    orderBy: { stageChangedAt: "desc" },
  });
}

export async function getCourse(id: string) {
  return prisma.course.findUnique({ where: { id }, include: courseInclude });
}

/** Cria um curso (stub). n8n preenche o currículo depois. */
export async function createCourse(input: CreateCourseInput, source: Source = Source.WHATSAPP) {
  let clientId = input.clientId;
  if (!clientId) {
    const firstClient = await prisma.client.findFirst();
    if (!firstClient) throw new Error("Nenhum Client cadastrado para associar o curso");
    clientId = firstClient.id;
  }
  return prisma.course.create({
    data: {
      clientId,
      title: input.title,
      subtitle: input.subtitle,
      audience: input.audience,
      promise: input.promise,
      prerequisite: input.prerequisite,
      expectedResult: input.expectedResult,
      format: input.format,
      complianceNotes: input.complianceNotes,
      source,
      stage: Stage.AGUARDANDO_GERACAO,
    },
    include: courseInclude,
  });
}

export async function updateCourse(id: string, input: UpdateCourseInput) {
  return prisma.course.update({ where: { id }, data: input, include: courseInclude });
}

/**
 * Substitui o currículo (módulos + aulas) e move o curso p/ EM_PRODUCAO.
 * Idempotente: apaga módulos antigos (cascade nas aulas) e recria.
 */
export async function setCurriculum(id: string, input: CurriculumInput) {
  return prisma.$transaction(async (tx) => {
    await tx.module.deleteMany({ where: { courseId: id } });
    for (const m of input.modules) {
      await tx.module.create({
        data: {
          courseId: id,
          order: m.order,
          title: m.title,
          description: m.description,
          supportMaterials: m.supportMaterials,
          links: m.links ?? undefined,
          lessons: {
            create: m.lessons.map((l) => ({
              order: l.order,
              title: l.title,
              durationMinutes: l.durationMinutes,
              objective: l.objective,
              script: l.script,
              exercise: l.exercise,
            })),
          },
        },
      });
    }
    return tx.course.update({
      where: { id },
      data: { stage: Stage.EM_PRODUCAO, stageChangedAt: new Date() },
      include: courseInclude,
    });
  });
}

/** Atualiza assets de uma aula (vídeo HeyGen / arte Canva). */
export async function updateLessonAsset(lessonId: string, input: LessonAssetInput) {
  return prisma.lesson.update({ where: { id: lessonId }, data: input });
}

/**
 * Marca o curso como pronto para aprovação (EM_PRODUCAO → AGUARDANDO_APROVACAO).
 * Chamado pelo n8n quando todos os vídeos estão READY.
 */
export async function markReadyForApproval(id: string) {
  return prisma.course.update({
    where: { id },
    data: { stage: Stage.AGUARDANDO_APROVACAO, stageChangedAt: new Date() },
    include: courseInclude,
  });
}

/** Grava decisão de aprovação + evento, na MESMA transação. Emite webhook depois. */
export async function recordDecision(id: string, input: DecisionInput, actor: Actor) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new Error("Curso não encontrado");

  const gate = input.gate ?? Gate.COURSE;
  const next = nextStageForDecision(course.stage, gate, input.decision);

  const actorName =
    actor.kind === "user" ? actor.name : input.actorName ?? "Serviço";
  const actorUserId = actor.kind === "user" ? actor.id : null;
  const channel = actor.kind === "user" ? Channel.SCREEN : Channel.WHATSAPP;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.approvalEvent.create({
      data: {
        courseId: id,
        gate,
        decision: input.decision,
        channel,
        actorUserId,
        actorName,
        comment: input.comment,
        isFallback: input.isFallback ?? false,
      },
    });
    return tx.course.update({
      where: { id },
      data: { stage: next, stageChangedAt: new Date() },
      include: courseInclude,
    });
  });

  emitEvent(
    input.decision === Decision.APPROVED ? "course.approved" : "course.changes_requested",
    { id: updated.id, title: updated.title, stage: updated.stage, comment: input.comment },
  );

  return updated;
}

export async function scheduleCourse(id: string, input: ScheduleInput) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new Error("Curso não encontrado");
  if (!canSchedule(course.stage)) {
    throw new StageTransitionError(`Não é possível agendar um curso em '${course.stage}'.`);
  }
  const updated = await prisma.course.update({
    where: { id },
    data: { stage: Stage.AGENDADO, scheduledFor: input.scheduledFor, stageChangedAt: new Date() },
    include: courseInclude,
  });
  emitEvent("course.scheduled", {
    id: updated.id,
    title: updated.title,
    scheduledFor: updated.scheduledFor,
  });
  return updated;
}

/** Publica no ClassOS via PublishTarget, guarda externalRef e emite evento. */
export async function publishCourse(id: string) {
  const course = await prisma.course.findUnique({ where: { id }, include: courseInclude });
  if (!course) throw new Error("Curso não encontrado");
  if (!canPublish(course.stage)) {
    throw new StageTransitionError(`Não é possível publicar um curso em '${course.stage}'.`);
  }

  // Chave por escola (cifrada no Client); cai para a env global se não houver.
  const apiKey = course.client?.classOsApiKey
    ? decryptSecret(course.client.classOsApiKey)
    : undefined;
  const { externalRef } = await classOSTarget.publish(course, apiKey);

  const updated = await prisma.course.update({
    where: { id },
    data: {
      stage: Stage.PUBLICADO,
      externalRef,
      publishedAt: new Date(),
      stageChangedAt: new Date(),
    },
    include: courseInclude,
  });

  emitEvent("course.published", {
    id: updated.id,
    title: updated.title,
    externalRef: updated.externalRef,
  });

  return updated;
}

export async function archiveCourse(id: string, archived = true) {
  return prisma.course.update({ where: { id }, data: { archived }, include: courseInclude });
}
