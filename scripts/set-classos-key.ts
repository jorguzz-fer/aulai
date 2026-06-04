/**
 * Guarda (cifrada) a x-api-key do ClassOS de uma escola no Aulai.
 *
 *   tsx scripts/set-classos-key.ts --client <id-ou-nome> --key clsk_xxx
 *
 * A key é cifrada com SECRET_ENCRYPTION_KEY antes de ir pro banco.
 */
import { PrismaClient } from "@prisma/client";
import { encryptSecret } from "../src/lib/secrets";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const clientRef = arg("client");
  const key = arg("key");
  if (!clientRef || !key) {
    console.error("Uso: tsx scripts/set-classos-key.ts --client <id-ou-nome> --key clsk_xxx");
    process.exit(1);
  }

  const client =
    (await prisma.client.findUnique({ where: { id: clientRef } })) ??
    (await prisma.client.findFirst({ where: { name: { equals: clientRef, mode: "insensitive" } } }));
  if (!client) {
    console.error(`Escola não encontrada: ${clientRef}`);
    process.exit(1);
  }

  await prisma.client.update({
    where: { id: client.id },
    data: { classOsApiKey: encryptSecret(key) },
  });
  console.log(`✓ Key do ClassOS guardada (cifrada) para a escola: ${client.name}`);
  if (!process.env.SECRET_ENCRYPTION_KEY) {
    console.warn("⚠ SECRET_ENCRYPTION_KEY não definida — key guardada como texto puro (apenas dev).");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
