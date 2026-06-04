"use client";

import { useState } from "react";
import type { CourseVM } from "@/lib/viewModel";
import { CourseCard } from "./CourseCard";

type Tab = "pending" | "production" | "history";

export function Dashboard({ courses }: { courses: CourseVM[] }) {
  const [tab, setTab] = useState<Tab>("pending");

  const pending = courses.filter((c) => c.isActionable);
  const production = courses.filter((c) => c.isInProduction);
  const history = courses.filter((c) => !c.isActionable && !c.isInProduction);

  const current = tab === "pending" ? pending : tab === "production" ? production : history;

  return (
    <>
      <div className="tabs">
        <button
          className={`tab ${tab === "pending" ? "active" : ""}`}
          onClick={() => setTab("pending")}
        >
          Pendentes <span className="chip">{pending.length}</span>
        </button>
        <button
          className={`tab ${tab === "production" ? "active" : ""}`}
          onClick={() => setTab("production")}
        >
          Em produção <span className="chip">{production.length}</span>
        </button>
        <button
          className={`tab ${tab === "history" ? "active" : ""}`}
          onClick={() => setTab("history")}
        >
          Histórico <span className="chip">{history.length}</span>
        </button>
      </div>

      {current.length === 0 ? (
        <div className="empty">Nada por aqui ainda.</div>
      ) : (
        <div className="grid">
          {current.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </>
  );
}
