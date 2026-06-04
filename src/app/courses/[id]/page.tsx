import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse } from "@/lib/courses";
import { toCourseVM } from "@/lib/viewModel";

export const dynamic = "force-dynamic";

const VIDEO_BADGE: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: "", label: "Pendente" },
  RENDERING: { cls: "wait", label: "Renderizando" },
  READY: { cls: "ok", label: "Pronto" },
  FAILED: { cls: "no", label: "Falhou" },
};

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();
  const vm = toCourseVM(course);

  return (
    <>
      <header className="topbar">
        <div className="brand">
          Aul<span>ai</span>
        </div>
        <Link href="/" className="btn ghost">
          ← Voltar
        </Link>
      </header>

      <main className="container">
        <h1 style={{ marginBottom: 4 }}>{vm.title}</h1>
        {vm.subtitle && <p className="card-sub">{vm.subtitle}</p>}

        <div className="meta" style={{ margin: "12px 0 24px" }}>
          <span>{vm.clientName}</span>
          <span>{vm.moduleCount} módulos</span>
          <span>{vm.lessonCount} aulas</span>
          <span>
            🎬 {vm.videosReady}/{vm.videosTotal} vídeos
          </span>
          {vm.format && <span>{vm.format}</span>}
        </div>

        {(vm.audience || vm.promise || vm.prerequisite || vm.expectedResult) && (
          <section className="module" style={{ padding: 16 }}>
            <strong>Visão geral</strong>
            {vm.audience && <Field label="Público" value={vm.audience} />}
            {vm.promise && <Field label="Promessa" value={vm.promise} />}
            {vm.prerequisite && <Field label="Pré-requisito" value={vm.prerequisite} />}
            {vm.expectedResult && <Field label="Resultado esperado" value={vm.expectedResult} />}
          </section>
        )}

        {vm.modules.map((m) => (
          <details key={m.id} className="module" open>
            <summary>
              Módulo {m.order + 1}: {m.title}
            </summary>
            <div style={{ padding: "0 16px 12px" }}>
              {m.description && <p className="card-sub">{m.description}</p>}
              {m.supportMaterials && <Field label="Material de apoio" value={m.supportMaterials} />}
              {m.links.length > 0 && (
                <div className="meta">
                  {m.links.map((l) => (
                    <a key={l.url} className="link" href={l.url} target="_blank" rel="noreferrer">
                      {l.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>

            {m.lessons.map((l) => {
              const vb = VIDEO_BADGE[l.videoStatus] ?? { cls: "", label: l.videoStatus };
              return (
                <div key={l.id} className="lesson">
                  <div className="lesson-head">
                    <strong>
                      Aula {l.order + 1}: {l.title}
                    </strong>
                    <span className="meta">
                      <span>{l.durationLabel}</span>
                      <span className={`badge ${vb.cls}`}>{vb.label}</span>
                    </span>
                  </div>
                  {l.videoUrl && (
                    <video
                      controls
                      src={l.videoUrl}
                      poster={l.thumbnailUrl ?? undefined}
                      style={{ width: "100%", maxWidth: 320, borderRadius: 10, marginTop: 8 }}
                    />
                  )}
                  {l.objective && <Field label="Objetivo" value={l.objective} />}
                  {l.script && <Field label="Roteiro" value={l.script} scroll />}
                  {l.exercise && <Field label="Exercício" value={l.exercise} />}
                </div>
              );
            })}
          </details>
        ))}

        {vm.complianceNotes && (
          <section className="module" style={{ padding: 16 }}>
            <strong>⚠️ Conformidade</strong>
            <div className="scroll-text" style={{ marginTop: 8 }}>
              {vm.complianceNotes}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function Field({ label, value, scroll }: { label: string; value: string; scroll?: boolean }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div className="label">{label}</div>
      {scroll ? (
        <div className="scroll-text">{value}</div>
      ) : (
        <div style={{ fontSize: 14 }}>{value}</div>
      )}
    </div>
  );
}
