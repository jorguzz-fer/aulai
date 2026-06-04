"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword } from "./actions";
import { PasswordInput } from "@/components/PasswordInput";
import { SubmitButton } from "@/components/SubmitButton";

export default function ResetPage() {
  const [result, formAction] = useActionState(resetPassword, undefined);
  const isOk = result === "ok";

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Redefinir senha</h1>
        <p className="sub">Use o token de reset configurado no servidor.</p>
        {isOk ? (
          <>
            <p style={{ color: "var(--ok)" }}>Senha redefinida com sucesso.</p>
            <p style={{ marginTop: 16 }}>
              <Link className="link" href="/login">
                Ir para o login
              </Link>
            </p>
          </>
        ) : (
          <form action={formAction}>
            <div className="field">
              <label className="label">E-mail</label>
              <input className="input" type="email" name="email" required />
            </div>
            <div className="field">
              <label className="label">Token de reset</label>
              <input className="input" type="text" name="token" required />
            </div>
            <div className="field">
              <label className="label">Nova senha</label>
              <PasswordInput name="password" required />
            </div>
            {result && !isOk && <p className="error">{result}</p>}
            <SubmitButton className="btn primary" pendingLabel="Salvando…">
              Redefinir
            </SubmitButton>
            <p style={{ marginTop: 16 }}>
              <Link className="link" href="/login">
                Voltar ao login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
