import type { PublishTarget, PublishResult, CourseWithContent } from "./target";

/**
 * Client da REST API v1 do ClassOS.
 *
 * Contrato: POST {CLASSOS_API_URL}/courses, onde CLASSOS_API_URL já inclui o
 * prefixo /api/v1 (ex.: https://app.classos.com/api/v1).
 *   - Auth: header x-api-key (chave POR ESCOLA — resolve o tenant no ClassOS)
 *   - Bulk + idempotente por (organização, sourceRef)
 *   - sourceRef em todos os níveis preserva o progresso dos alunos na republicação
 *   - Resposta: { id, published }  (201 criado / 200 atualizado)
 */

// Monta o endpoint /courses de forma tolerante: aceita CLASSOS_API_URL com ou
// sem o sufixo /api/v1 (evita duplicar e gerar 404 em produção).
function coursesEndpoint(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return /\/api\/v\d+$/.test(base) ? `${base}/courses` : `${base}/api/v1/courses`;
}

// Descrição do curso composta a partir dos metadados do Aulai (ClassOS tem um
// único campo `description`; o Aulai guarda público/promessa/etc separados).
function buildDescription(c: CourseWithContent): string | undefined {
  const parts = [
    c.audience && `Público: ${c.audience}`,
    c.promise && `Promessa: ${c.promise}`,
    c.prerequisite && `Pré-requisito: ${c.prerequisite}`,
    c.expectedResult && `Resultado esperado: ${c.expectedResult}`,
    c.complianceNotes && `Conformidade: ${c.complianceNotes}`,
  ].filter(Boolean);
  return parts.length ? parts.join("\n\n") : undefined;
}

// Descrição do módulo: junta descrição + materiais de apoio + links.
function buildModuleDescription(m: CourseWithContent["modules"][number]): string | undefined {
  const links = Array.isArray(m.links)
    ? (m.links as { label?: string; url?: string }[])
        .map((l) => (l?.label && l?.url ? `${l.label}: ${l.url}` : l?.url))
        .filter(Boolean)
    : [];
  const parts = [
    m.description,
    m.supportMaterials && `Material de apoio: ${m.supportMaterials}`,
    links.length ? `Links:\n${links.join("\n")}` : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join("\n\n") : undefined;
}

function buildPayload(course: CourseWithContent) {
  return {
    sourceRef: course.id, // id do curso no Aulai — chave de idempotência
    title: course.title,
    subtitle: course.subtitle ?? undefined,
    description: buildDescription(course),
    level: "ALL_LEVELS",
    visibility: "PRIVATE",
    publish: true,
    modules: [...course.modules]
      .sort((a, b) => a.order - b.order)
      .map((m) => ({
        sourceRef: m.id,
        title: m.title,
        description: buildModuleDescription(m),
        lessons: [...m.lessons]
          .sort((a, b) => a.order - b.order)
          .map((l) => ({
            sourceRef: l.id,
            title: l.title,
            // Aula com vídeo renderizado (HeyGen) → VIDEO/file; senão TEXT.
            ...(l.videoUrl
              ? { contentType: "VIDEO", videoProvider: "file", videoSource: l.videoUrl }
              : { contentType: "TEXT" }),
            durationMinutes: l.durationMinutes ?? undefined,
            isPreview: false,
            isRequired: true,
          })),
      })),
  };
}

class ClassOSTarget implements PublishTarget {
  async publish(course: CourseWithContent, apiKey?: string): Promise<PublishResult> {
    const baseUrl = process.env.CLASSOS_API_URL;
    if (!baseUrl) throw new Error("CLASSOS_API_URL não configurada");

    const key = apiKey ?? process.env.CLASSOS_API_KEY;
    if (!key) {
      throw new Error("Chave do ClassOS ausente (Client.classOsApiKey ou CLASSOS_API_KEY)");
    }

    const res = await fetch(coursesEndpoint(baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify(buildPayload(course)),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ClassOS respondeu ${res.status}: ${text}`);
    }

    const json = (await res.json().catch(() => ({}))) as { id?: string; published?: boolean };
    if (!json.id) throw new Error("ClassOS não retornou o id do curso");
    return { externalRef: json.id, published: json.published ?? true };
  }
}

export const classOSTarget: PublishTarget = new ClassOSTarget();
