"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function resetPassword(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const email = String(formData.get("email") ?? "");
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  const expected = process.env.PASSWORD_RESET_TOKEN;
  if (!expected) return "Reset de senha desativado (sem PASSWORD_RESET_TOKEN).";
  if (token !== expected) return "Token inválido.";
  if (password.length < 8) return "A senha precisa de ao menos 8 caracteres.";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return "Usuário não encontrado.";

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { email }, data: { passwordHash } });
  return "ok";
}
