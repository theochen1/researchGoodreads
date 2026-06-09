export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function parseEmailAllowlist(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isEmailInAllowlist(
  email: string | null | undefined,
  allowlist: string | undefined,
): boolean {
  if (!email) {
    return false;
  }

  return parseEmailAllowlist(allowlist).has(email.trim().toLowerCase());
}
