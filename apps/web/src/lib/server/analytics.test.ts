import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./analytics";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("./supabase", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mocks.from,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue({ insert: mocks.insert });
  mocks.insert.mockResolvedValue({ error: null });
});

describe("analytics tracking", () => {
  it("writes analytics events with empty metadata by default", async () => {
    await trackEvent({
      userId: "00000000-0000-4000-8000-000000000001",
      eventName: "paper_added",
      entityType: "paper",
      entityId: "10000000-0000-4000-8000-000000000001",
    });

    expect(mocks.from).toHaveBeenCalledWith("analytics_events");
    expect(mocks.insert).toHaveBeenCalledWith({
      user_id: "00000000-0000-4000-8000-000000000001",
      event_name: "paper_added",
      entity_type: "paper",
      entity_id: "10000000-0000-4000-8000-000000000001",
      metadata: {},
    });
  });

  it("does not block callers when analytics insertion fails", async () => {
    mocks.insert.mockRejectedValueOnce(new Error("analytics unavailable"));

    await expect(
      trackEvent({
        eventName: "metadata_resolution_failed",
        metadata: { sourceType: "unknown" },
      }),
    ).resolves.toBeUndefined();
  });

  it("does not include private note bodies in the private note event route", () => {
    const routeSource = readFileSync(
      resolve(process.cwd(), "src/app/api/notes/route.ts"),
      "utf8",
    );
    const privateNoteEventBlock = routeSource.match(
      /await trackEvent\(\{\s+userId: user\.id,\s+eventName: "private_note_created",[\s\S]*?\}\);/,
    )?.[0];

    expect(privateNoteEventBlock).toBeDefined();
    expect(privateNoteEventBlock).not.toContain("metadata");
    expect(privateNoteEventBlock).not.toContain("body");
  });
});
