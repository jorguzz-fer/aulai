import { z } from "zod";
import { Decision, Gate } from "@prisma/client";

// Criar curso: tudo opcional exceto título — n8n cria stub e preenche depois.
export const createCourseSchema = z.object({
  clientId: z.string().optional(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  audience: z.string().optional(),
  promise: z.string().optional(),
  prerequisite: z.string().optional(),
  expectedResult: z.string().optional(),
  format: z.string().optional(),
  complianceNotes: z.string().optional(),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

// Atualizar metadados do curso.
export const updateCourseSchema = createCourseSchema.partial().extend({
  thumbnailUrl: z.string().url().optional(),
});
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

const linkSchema = z.object({ label: z.string(), url: z.string().url() });

const lessonSchema = z.object({
  order: z.number().int().nonnegative(),
  title: z.string().min(1),
  durationMinutes: z.number().int().positive().optional(),
  objective: z.string().optional(),
  script: z.string().optional(),
  exercise: z.string().optional(),
});

const moduleSchema = z.object({
  order: z.number().int().nonnegative(),
  title: z.string().min(1),
  description: z.string().optional(),
  supportMaterials: z.string().optional(),
  links: z.array(linkSchema).optional(),
  lessons: z.array(lessonSchema).default([]),
});

// Currículo completo (módulos + aulas) — escrito pelo n8n após Claude gerar.
export const curriculumSchema = z.object({
  modules: z.array(moduleSchema),
});
export type CurriculumInput = z.infer<typeof curriculumSchema>;

// Atualização de assets de uma aula (HeyGen/Canva via n8n).
export const lessonAssetSchema = z.object({
  videoUrl: z.string().url().optional(),
  heygenRef: z.string().optional(),
  videoStatus: z.enum(["PENDING", "RENDERING", "READY", "FAILED"]).optional(),
  thumbnailUrl: z.string().url().optional(),
});
export type LessonAssetInput = z.infer<typeof lessonAssetSchema>;

// Decisão de aprovação.
export const decisionSchema = z.object({
  gate: z.nativeEnum(Gate).default(Gate.COURSE),
  decision: z.nativeEnum(Decision),
  comment: z.string().optional(),
  actorName: z.string().optional(), // usado quando decidido por serviço (WhatsApp)
  isFallback: z.boolean().optional(),
});
export type DecisionInput = z.infer<typeof decisionSchema>;

// Agendamento.
export const scheduleSchema = z.object({
  scheduledFor: z.coerce.date(),
});
export type ScheduleInput = z.infer<typeof scheduleSchema>;
