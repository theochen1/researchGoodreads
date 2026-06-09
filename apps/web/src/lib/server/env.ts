function getRequiredValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getRequiredSupabaseUrl(): string {
  return getRequiredValue(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function getRequiredSupabaseAnonKey(): string {
  return getRequiredValue(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getRequiredSupabaseServiceRoleKey(): string {
  return getRequiredValue(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getOptionalAdminEmailAllowlist(): string | undefined {
  return process.env.ADMIN_EMAIL_ALLOWLIST || undefined;
}

export function getOptionalSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || undefined;
}

export function getOptionalSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined;
}

export function getOptionalSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || undefined;
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
