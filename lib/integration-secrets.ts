import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const IV_LENGTH = 12;
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const keyB64 = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!keyB64) {
    throw new Error("Missing credential encryption key");
  }

  const key = Buffer.from(keyB64.trim(), "base64");
  if (key.length !== 32) {
    throw new Error("Invalid credential encryption key");
  }

  return key;
}

export function encryptIntegrationSecret(value: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, ciphertext, authTag]).toString("base64");
}

export function decryptIntegrationSecret(payload: string) {
  const key = getEncryptionKey();
  const buffer = Buffer.from(payload, "base64");

  if (buffer.length <= IV_LENGTH + 16) {
    throw new Error("Invalid encrypted payload");
  }

  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(buffer.length - 16);
  const ciphertext = buffer.subarray(IV_LENGTH, buffer.length - 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
