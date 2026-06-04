import type { Course, Module, Lesson, Client, ApprovalEvent } from "@prisma/client";
import { Stage, AssetStatus } from "@prisma/client";
import { ACTIONABLE_STAGES, IN_PRODUCTION_STAGES } from "@/lib/stages";
import { agoLabel, scheduleLabel, durationLabel } from "@/lib/format";

export type CourseFull = Course & {
  client: Client;
  modules: (Module & { lessons: Lesson[] })[];
  events: ApprovalEvent[];
};

export type LessonVM = {
  id: string;
  order: number;
  title: string;
  durationLabel: string;
  objective: string | null;
  script: string | null;
  exercise: string | null;
  videoUrl: string | null;
  videoStatus: AssetStatus;
  thumbnailUrl: string | null;
};

export type ModuleVM = {
  id: string;
  order: number;
  title: string;
  description: string | null;
  supportMaterials: string | null;
  links: { label: string; url: string }[];
  thumbnailUrl: string | null;
  lessons: LessonVM[];
};

export type CourseVM = {
  id: string;
  title: string;
  subtitle: string | null;
  clientName: string;
  stage: Stage;
  source: string;
  thumbnailUrl: string | null;
  externalRef: string | null;
  audience: string | null;
  promise: string | null;
  prerequisite: string | null;
  expectedResult: string | null;
  format: string | null;
  complianceNotes: string | null;
  moduleCount: number;
  lessonCount: number;
  videosReady: number;
  videosTotal: number;
  stageAgo: string;
  scheduledLabel: string | null;
  isActionable: boolean;
  isInProduction: boolean;
  modules: ModuleVM[];
};

export function toCourseVM(c: CourseFull): CourseVM {
  const lessons = c.modules.flatMap((m) => m.lessons);
  const videosTotal = lessons.length;
  const videosReady = lessons.filter((l) => l.videoStatus === AssetStatus.READY).length;

  return {
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    clientName: c.client.name,
    stage: c.stage,
    source: c.source,
    thumbnailUrl: c.thumbnailUrl,
    externalRef: c.externalRef,
    audience: c.audience,
    promise: c.promise,
    prerequisite: c.prerequisite,
    expectedResult: c.expectedResult,
    format: c.format,
    complianceNotes: c.complianceNotes,
    moduleCount: c.modules.length,
    lessonCount: lessons.length,
    videosReady,
    videosTotal,
    stageAgo: agoLabel(c.stageChangedAt),
    scheduledLabel: c.scheduledFor ? scheduleLabel(c.scheduledFor) : null,
    isActionable: ACTIONABLE_STAGES.includes(c.stage),
    isInProduction: IN_PRODUCTION_STAGES.includes(c.stage),
    modules: c.modules.map((m) => ({
      id: m.id,
      order: m.order,
      title: m.title,
      description: m.description,
      supportMaterials: m.supportMaterials,
      links: parseLinks(m.links),
      thumbnailUrl: m.thumbnailUrl,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        order: l.order,
        title: l.title,
        durationLabel: durationLabel(l.durationMinutes),
        objective: l.objective,
        script: l.script,
        exercise: l.exercise,
        videoUrl: l.videoUrl,
        videoStatus: l.videoStatus,
        thumbnailUrl: l.thumbnailUrl,
      })),
    })),
  };
}

function parseLinks(links: unknown): { label: string; url: string }[] {
  if (!Array.isArray(links)) return [];
  return links.filter(
    (l): l is { label: string; url: string } =>
      typeof l === "object" && l !== null && "label" in l && "url" in l,
  );
}

// Cor de capa determinística por hash do id (para cursos sem thumbnail).
export function gradientForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffff;
  const h1 = hash % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1} 65% 55%), hsl(${h2} 70% 45%))`;
}
