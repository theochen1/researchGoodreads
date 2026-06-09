import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const requiredEnvKeys = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "ADMIN_EMAIL_ALLOWLIST",
  "BETA_EMAIL_ALLOWLIST",
  "EXTENSION_TOKEN_PEPPER",
  "PLASMO_PUBLIC_WEB_APP_URL",
] as const;

describe("environment documentation", () => {
  it("documents required local and beta environment variables", () => {
    const envExample = readFileSync(
      resolve(process.cwd(), "../../.env.example"),
      "utf8",
    );
    const extensionEnvExample = readFileSync(
      resolve(process.cwd(), "../../apps/extension/.env.example"),
      "utf8",
    );
    const supabaseReadme = readFileSync(
      resolve(process.cwd(), "../../supabase/README.md"),
      "utf8",
    );

    for (const key of requiredEnvKeys) {
      expect(envExample).toContain(`${key}=`);
      expect(supabaseReadme).toContain(key);
    }

    expect(extensionEnvExample).toContain("PLASMO_PUBLIC_WEB_APP_URL=");
  });
});
