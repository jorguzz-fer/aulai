/**
 * Redefine a senha de um usuário do painel (hash bcrypt).
 *
 *   tsx scripts/set-password.ts --email owner@aulai.com --password 'NovaSenha$$'
 *
 * Use ASPAS SIMPLES no terminal para a senha não ser interpretada pelo shell
 * (caracteres como $ viram referência de variável sem as aspas). Útil quando a
 * SEED_OWNER_PASSWORD foi mexida pelo Coolify/docker e o login não bate.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email");
  const password = arg("password");
  if (!email || !password) {
    console.error("Uso: tsx scripts/set-password.ts --email <email> --password '<senha>'");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`✓ Senha redefinida para: ${email} (${password.length} caracteres)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
