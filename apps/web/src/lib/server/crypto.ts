import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashExtensionToken(token: string): string {
  const pepper = process.env.EXTENSION_TOKEN_PEPPER ?? "";

  return sha256Hex(`${pepper}:${token}`);
}

export function createOpaqueSecret(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export function timingSafeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
