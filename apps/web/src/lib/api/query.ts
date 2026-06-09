export function parseBoundedLimit(
  value: string | null,
  { defaultLimit, maxLimit }: { defaultLimit: number; maxLimit: number },
): number {
  const parsed = Number(value ?? defaultLimit);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultLimit;
  }

  return Math.min(Math.floor(parsed), maxLimit);
}
