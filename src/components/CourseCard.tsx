"use client";

import { useState } from "react";
import Link from "next/link";
import type { CourseVM } from "@/lib/viewModel";
import { gradientForId } from "@/lib/viewModel";
import { SubmitButton } from "./SubmitButton";
import {
  approveAction,
  rejectAction,
  scheduleAction,
  publishNowAction,
  archiveAction,
} from "@/app/actions";

type Mode = "idle" | "reject" | "schedule";

const STAGE_BADGE: Record<string, { cls: string; label: string }> = {
  AGUARDANDO_GERACAO: { cls: "", label: "Aguardando geração" },
  EM_PRODUCAO: { cls: "wait", label: "Em produção" },
  AGUARDANDO_APROVACAO: { cls: "brand", label: "Aguardando aprovação" },
  AJUSTE_PEDIDO: { cls: "no", label: "Ajuste pedido" },
  APROVADO: { cls: "ok", label: "Aprovado" },
  AGENDADO: { cls: "wait", label: "Agendado" },
  PUBLICADO: { cls: "ok", label: "Publicado" },
};

export function CourseCard({ course }: { course: CourseVM }) {
  const [mode, setMode] = useState<Mode>("idle");
  const badge = STAGE_BADGE[course.stage] ?? { cls: "", label: course.stage };

  return (
    <article className="card">
      <div
        className="card-cover"
        style={
          course.thumbnailUrl
            ? { backgroundImage: `url(${course.thumbnailUrl})`, backgroundSize: "cover" }
            : { background: gradientForId(course.id) }
        }
      >
        <span className={`badge ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="card-body">
        <Link href={`/courses/${course.id}`} className="card-title">
          {course.title}
        </Link>
        {course.subtitle && <div className="card-sub">{course.subtitle}</div>}
        <div className="meta">
          <span>{course.moduleCount} módulos</span>
          <span>{course.lessonCount} aulas</span>
          <span>
            🎬 {course.videosReady}/{course.videosTotal}
          </span>
        </div>
        <div className="meta">
          <span>{course.clientName}</span>
          <span>{course.stageAgo}</span>
          {course.scheduledLabel && <span>📅 {course.scheduledLabel}</span>}
        </div>
      </div>

      <div className="card-actions">
        {course.isActionable && mode === "idle" && (
          <>
            <form action={approveAction}>
              <input type="hidden" name="id" value={course.id} />
              <SubmitButton className="btn ok" pendingLabel="Aprovando…">
                Aprovar
              </SubmitButton>
            </form>
            <button className="btn danger" onClick={() => setMode("reject")}>
              Pedir ajuste
            </button>
          </>
        )}

        {course.isActionable && mode === "reject" && (
          <form action={rejectAction} className="inline-form">
            <input type="hidden" name="id" value={course.id} />
            <textarea
              className="input"
              name="comment"
              rows={3}
              placeholder="O que ajustar?"
              required
            />
            <div className="row">
              <SubmitButton className="btn danger" pendingLabel="Enviando…">
                Enviar ajuste
              </SubmitButton>
              <button type="button" className="btn ghost" onClick={() => setMode("idle")}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {course.stage === "APROVADO" && mode === "idle" && (
          <>
            <form action={publishNowAction}>
              <input type="hidden" name="id" value={course.id} />
              <SubmitButton className="btn primary" pendingLabel="Publicando…">
                Publicar agora
              </SubmitButton>
            </form>
            <button className="btn" onClick={() => setMode("schedule")}>
              Agendar
            </button>
          </>
        )}

        {course.stage === "APROVADO" && mode === "schedule" && (
          <form action={scheduleAction} className="inline-form">
            <input type="hidden" name="id" value={course.id} />
            <input className="input" type="datetime-local" name="scheduledFor" required />
            <div className="row">
              <SubmitButton className="btn primary" pendingLabel="Agendando…">
                Confirmar
              </SubmitButton>
              <button type="button" className="btn ghost" onClick={() => setMode("idle")}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        <form action={archiveAction} style={{ marginLeft: "auto" }}>
          <input type="hidden" name="id" value={course.id} />
          <SubmitButton className="btn ghost" pendingLabel="…">
            Arquivar
          </SubmitButton>
        </form>
      </div>
    </article>
  );
}
