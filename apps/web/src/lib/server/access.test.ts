import type { User } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getActiveBetaUserIds,
  getDisplayName,
  getUsername,
  isActiveBetaAccessRow,
  isBetaEmailAllowlisted,
} from "./access";
import type { createServiceRoleClient } from "./supabase";

function userFixture(overrides: Partial<User>): User {
  return {
    id: "12345678-0000-4000-8000-000000000000",
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    user_metadata: {},
    ...overrides,
  } as User;
}

function serviceClientFixture({
  accessRows,
  users,
}: {
  accessRows: {
    email: string | null;
    approved_at: string | null;
    accepted_at: string | null;
    expires_at: string | null;
  }[];
  users: { id: string; email?: string | null }[];
}) {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe("beta_access");

      return {
        select: vi.fn().mockResolvedValue({ data: accessRows, error: null }),
      };
    }),
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users }, error: null }),
      },
    },
  } as unknown as ReturnType<typeof createServiceRoleClient>;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("access profile defaults", () => {
  it("uses OAuth display metadata before email fallback", () => {
    expect(
      getDisplayName(
        userFixture({
          email: "paper.reader@example.edu",
          user_metadata: { full_name: "Paper Reader" },
        }),
      ),
    ).toBe("Paper Reader");
    expect(
      getDisplayName(
        userFixture({
          email: "paper.reader@example.edu",
          user_metadata: {},
        }),
      ),
    ).toBe("paper.reader");
  });

  it("generates a stable lowercase username seed", () => {
    expect(
      getUsername(
        userFixture({
          email: "Paper.Reader+Beta@example.edu",
        }),
      ),
    ).toBe("paper_reader_beta_12345678");
  });
});

describe("isActiveBetaAccessRow", () => {
  it("accepts approved rows that have not expired", () => {
    expect(
      isActiveBetaAccessRow({
        approved_at: "2026-01-01T00:00:00.000Z",
        accepted_at: null,
        expires_at: null,
      }),
    ).toBe(true);
  });

  it("accepts accepted invite rows that have not expired", () => {
    expect(
      isActiveBetaAccessRow({
        approved_at: null,
        accepted_at: "2026-01-01T00:00:00.000Z",
        expires_at: null,
      }),
    ).toBe(true);
  });

  it("rejects expired rows", () => {
    expect(
      isActiveBetaAccessRow({
        approved_at: "2026-01-01T00:00:00.000Z",
        accepted_at: null,
        expires_at: "2026-01-02T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("rejects rows that have not been approved or accepted", () => {
    expect(
      isActiveBetaAccessRow({
        approved_at: null,
        accepted_at: null,
        expires_at: null,
      }),
    ).toBe(false);
  });
});

describe("beta allowlists", () => {
  it("treats admin and beta env allowlists as beta-active emails", () => {
    vi.stubEnv("ADMIN_EMAIL_ALLOWLIST", "admin@example.edu");
    vi.stubEnv("BETA_EMAIL_ALLOWLIST", "reader@example.edu");

    expect(isBetaEmailAllowlisted("ADMIN@example.edu")).toBe(true);
    expect(isBetaEmailAllowlisted("reader@example.edu")).toBe(true);
    expect(isBetaEmailAllowlisted("other@example.edu")).toBe(false);
  });
});

describe("getActiveBetaUserIds", () => {
  it("returns users with active beta access rows or env allowlist membership", async () => {
    vi.stubEnv("BETA_EMAIL_ALLOWLIST", "env@example.edu");
    const serviceClient = serviceClientFixture({
      accessRows: [
        {
          email: "approved@example.edu",
          approved_at: "2026-01-01T00:00:00.000Z",
          accepted_at: null,
          expires_at: null,
        },
        {
          email: "expired@example.edu",
          approved_at: "2026-01-01T00:00:00.000Z",
          accepted_at: null,
          expires_at: "2026-01-02T00:00:00.000Z",
        },
      ],
      users: [
        { id: "approved-user", email: "approved@example.edu" },
        { id: "expired-user", email: "expired@example.edu" },
        { id: "env-user", email: "env@example.edu" },
        { id: "unknown-user", email: "unknown@example.edu" },
      ],
    });

    await expect(getActiveBetaUserIds(serviceClient)).resolves.toEqual(
      new Set(["approved-user", "env-user"]),
    );
  });

  it("can limit active beta user lookup to candidate user ids", async () => {
    const serviceClient = serviceClientFixture({
      accessRows: [
        {
          email: "first@example.edu",
          approved_at: "2026-01-01T00:00:00.000Z",
          accepted_at: null,
          expires_at: null,
        },
        {
          email: "second@example.edu",
          approved_at: "2026-01-01T00:00:00.000Z",
          accepted_at: null,
          expires_at: null,
        },
      ],
      users: [
        { id: "first-user", email: "first@example.edu" },
        { id: "second-user", email: "second@example.edu" },
      ],
    });

    await expect(
      getActiveBetaUserIds(serviceClient, ["second-user"]),
    ).resolves.toEqual(new Set(["second-user"]));
  });
});
