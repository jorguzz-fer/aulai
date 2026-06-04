import type { PublishTarget, PublishResult, CourseWithContent } from "./target";

/**
 * Client REST do ClassOS.
 *
 * ⚠️ CONTRATO ASSUMIDO — ajustar quando o contrato real do ClassOS chegar.
 * Payload montado a partir da estrutura completa do curso (metadados + módulos + aulas + assets).
 */
function buildPayload(course: CourseWithContent) {
  return {
    title: course.title,
    subtitle: course.subtitle ?? undefined,
    thumbnailUrl: course.thumbnailUrl ?? undefined,
    metadata: {
      audience: course.audience ?? undefined,
      promise: course.promise ?? undefined,
      prerequisite: course.prerequisite ?? undefined,
      expectedResult: course.expectedResult ?? undefined,
      format: course.format ?? undefined,
      complianceNotes: course.complianceNotes ?? undefined,
    },
    modules: [...course.modules]
      .sort((a, b) => a.order - b.order)
      .map((m) => ({
        title: m.title,
        description: m.description ?? undefined,
        supportMaterials: m.supportMaterials ?? undefined,
        links: m.links ?? undefined,
        thumbnailUrl: m.thumbnailUrl ?? undefined,
        lessons: [...m.lessons]
          .sort((a, b) => a.order - b.order)
          .map((l) => ({
            title: l.title,
            durationMinutes: l.durationMinutes ?? undefined,
            objective: l.objective ?? undefined,
            script: l.script ?? undefined,
            exercise: l.exercise ?? undefined,
            videoUrl: l.videoUrl ?? undefined,
            thumbnailUrl: l.thumbnailUrl ?? undefined,
          })),
      })),
  };
}

class ClassOSTarget implements PublishTarget {
  async publish(course: CourseWithContent): Promise<PublishResult> {
    const baseUrl = process.env.CLASSOS_API_URL;
    const apiKey = process.env.CLASSOS_API_KEY;
    if (!baseUrl) {
      throw new Error("CLASSOS_API_URL não configurada");
    }

    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/courses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify(buildPayload(course)),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ClassOS respondeu ${res.status}: ${text}`);
    }

    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      courseId?: string;
      externalRef?: string;
    };
    const externalRef = json.id ?? json.courseId ?? json.externalRef;
    if (!externalRef) {
      throw new Error("ClassOS não retornou um id de curso");
    }
    return { externalRef };
  }
}

export const classOSTarget: PublishTarget = new ClassOSTarget();
