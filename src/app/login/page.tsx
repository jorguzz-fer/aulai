"use client";

import { useActionState } from "react";
import Link from "next/link";
import { authenticate } from "./actions";
import { PasswordInput } from "@/components/PasswordInput";
import { SubmitButton } from "@/components/SubmitButton";

export default function LoginPage() {
  const [error, formAction] = useActionState(authenticate, undefined);

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>
          Aul<span style={{ color: "var(--brand-600)" }}>ai</span>
        </h1>
        <p className="sub">Painel de aprovação de cursos</p>
        <form action={formAction}>
          <div className="field">
            <label className="label">E-mail</label>
            <input className="input" type="email" name="email" required />
          </div>
          <div className="field">
            <label className="label">Senha</label>
            <PasswordInput name="password" required />
          </div>
          {error && <p className="error">{error}</p>}
          <SubmitButton className="btn primary" pendingLabel="Entrando…">
            Entrar
          </SubmitButton>
        </form>
        <p style={{ marginTop: 16 }}>
          <Link className="link" href="/login/reset">
            Esqueci minha senha
          </Link>
        </p>
      </div>
    </div>
  );
}
