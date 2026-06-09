import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function routeFiles(directory: string): string[] {
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry);
      const stats = statSync(path);

      if (stats.isDirectory()) {
        return routeFiles(path);
      }

      return entry === "route.ts" ? [path] : [];
    })
    .sort();
}

function relativeRoute(path: string) {
  return relative(process.cwd(), path);
}

describe("API route authorization conventions", () => {
  const apiRouteDirectory = resolve(process.cwd(), "src/app/api");
  const routes = routeFiles(apiRouteDirectory);

  it("wraps API route handlers with the standard route wrapper", () => {
    for (const route of routes) {
      const source = readFileSync(route, "utf8");

      expect(source, relativeRoute(route)).toContain("withApiRoute");
    }
  });

  it("checks authorization before direct service-role use", () => {
    const tokenExchangeRoute = "src/app/api/extension/token/route.ts";

    for (const route of routes) {
      const source = readFileSync(route, "utf8");
      const routeName = relativeRoute(route);
      const serviceRoleIndex = source.indexOf("createServiceRoleClient()");

      if (serviceRoleIndex === -1 || routeName === tokenExchangeRoute) {
        continue;
      }

      const authIndexes = [
        source.indexOf("requireUser("),
        source.indexOf("requireAdmin("),
        source.indexOf("requireExtensionSession("),
      ].filter((index) => index !== -1);

      expect(
        authIndexes.some((index) => index < serviceRoleIndex),
        routeName,
      ).toBe(true);
    }
  });

  it("keeps admin routes behind requireAdmin", () => {
    for (const route of routes.filter((route) =>
      relativeRoute(route).startsWith("src/app/api/admin/"),
    )) {
      const source = readFileSync(route, "utf8");

      expect(source, relativeRoute(route)).toContain("requireAdmin(");
    }
  });

  it("uses ownership checks for user-paper mutation routes", () => {
    const ownedMutationRoutes = [
      "src/app/api/comments/route.ts",
      "src/app/api/library/route.ts",
      "src/app/api/notes/route.ts",
      "src/app/api/user-papers/[userPaperId]/route.ts",
    ];

    for (const routeName of ownedMutationRoutes) {
      const source = readFileSync(resolve(process.cwd(), routeName), "utf8");

      expect(source, routeName).toContain("assertOwnsUserPaper(");
    }
  });

  it("keeps extension operation routes behind extension-session auth", () => {
    const extensionSessionRoutes = [
      "src/app/api/extension/capture/route.ts",
      "src/app/api/extension/status/route.ts",
      "src/app/api/example/extension/route.ts",
    ];

    for (const routeName of extensionSessionRoutes) {
      const source = readFileSync(resolve(process.cwd(), routeName), "utf8");

      expect(source, routeName).toContain("requireExtensionSession(");
    }
  });
});
