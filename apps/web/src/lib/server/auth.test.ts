import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpaqueSecret, hashExtensionToken, sha256Hex } from "./crypto";
import { isEmailInAllowlist, parseEmailAllowlist } from "./env";
import { parseBearerToken, requireExtensionSession } from "./auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("server auth helper utilities", () => {
  it("normalizes email allowlists", () => {
    expect(parseEmailAllowlist(" A@EXAMPLE.com, b@example.com ")).toEqual(
      new Set(["a@example.com", "b@example.com"]),
    );
    expect(isEmailInAllowlist("a@example.com", " A@EXAMPLE.com ")).toBe(true);
    expect(isEmailInAllowlist("c@example.com", " A@EXAMPLE.com ")).toBe(false);
  });

  it("parses bearer tokens", () => {
    expect(
      parseBearerToken(
        new Request("http://localhost", {
          headers: { authorization: "Bearer token-123" },
        }),
      ),
    ).toBe("token-123");
    expect(parseBearerToken(new Request("http://localhost"))).toBeNull();
  });

  it("hashes extension tokens deterministically", () => {
    expect(sha256Hex("abc")).toHaveLength(64);
    expect(hashExtensionToken("token")).toBe(hashExtensionToken("token"));
  });

  it("uses the extension token pepper when hashing tokens", () => {
    vi.stubEnv("EXTENSION_TOKEN_PEPPER", "pepper-one");
    const firstHash = hashExtensionToken("token");

    vi.stubEnv("EXTENSION_TOKEN_PEPPER", "pepper-two");
    const secondHash = hashExtensionToken("token");

    expect(firstHash).toHaveLength(64);
    expect(secondHash).toHaveLength(64);
    expect(firstHash).not.toBe(secondHash);
  });

  it("creates opaque URL-safe extension secrets", () => {
    const firstSecret = createOpaqueSecret();
    const secondSecret = createOpaqueSecret();

    expect(firstSecret).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(firstSecret.length).toBeGreaterThanOrEqual(40);
    expect(firstSecret).not.toBe(secondSecret);
  });

  it("rejects extension requests without a bearer token before database access", async () => {
    await expect(
      requireExtensionSession(new Request("http://localhost")),
    ).rejects.toMatchObject({
      status: 401,
      code: "unauthorized",
    });
  });
});
