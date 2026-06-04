import type { Course, Module, Lesson } from "@prisma/client";

export type CourseWithContent = Course & {
  modules: (Module & { lessons: Lesson[] })[];
};

export interface PublishResult {
  externalRef: string;
}

/**
 * Contrato de qualquer destino de publicação. Hoje só o ClassOS,
 * mas qualquer destino novo é só implementar esta interface.
 */
export interface PublishTarget {
  publish(course: CourseWithContent): Promise<PublishResult>;
}
