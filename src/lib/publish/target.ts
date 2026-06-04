import type { Course, Module, Lesson, Client } from "@prisma/client";

export type CourseWithContent = Course & {
  client?: Client | null;
  modules: (Module & { lessons: Lesson[] })[];
};

export interface PublishResult {
  externalRef: string;
  published: boolean;
}

/**
 * Contrato de qualquer destino de publicação. Hoje só o ClassOS,
 * mas qualquer destino novo é só implementar esta interface.
 */
export interface PublishTarget {
  publish(course: CourseWithContent, apiKey?: string): Promise<PublishResult>;
}
