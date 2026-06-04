import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

// Cifragem simétrica (AES-256-GCM) para segredos guardados no banco — ex.: a
// x-api-key do ClassOS por escola. A chave vem de SECRET_ENCRYPTION_KEY.
//
// Formato armazenado:
//   enc:<iv b64>:<authTag b64>:<ciphertext b64>   (quando há chave configurada)
//   plain:<valor>                                  (fallback dev, sem chave)

function getKey(): Buffer | null {
  const raw = process.env.SECRET_ENCRYPTION_KEY;
  if (!raw) return null;
  // Aceita qualquer string e deriva 32 bytes determinísticos.
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  const key = getKey();
  if (!key) return `plain:${plain}`;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  if (stored.startsWith("plain:")) return stored.slice("plain:".length);
  if (!stored.startsWith("enc:")) return stored; // legado: texto puro
  const key = getKey();
  if (!key) throw new Error("SECRET_ENCRYPTION_KEY ausente para descriptografar segredo");
  const [, ivB, tagB, dataB] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
