import type { AnalyticsEventName } from "@cairn/shared";
import { analyticsEventNames } from "@cairn/shared";
import { createServiceRoleClient } from "./supabase";

type Metric = {
  label: string;
  value: number;
  description: string;
};

type EventCounts = Record<AnalyticsEventName, number>;

type CountQueryResult = {
  count: number | null;
  error: Error | null;
};

type CountQuery = PromiseLike<CountQueryResult> & {
  eq(column: string, value: unknown): CountQuery;
  is(column: string, value: unknown): CountQuery;
  not(column: string, operator: string, value: unknown): CountQuery;
};

async function countRows(
  table: string,
  apply?: (query: CountQuery) => CountQuery,
) {
  const serviceClient = createServiceRoleClient();
  const baseQuery = serviceClient
    .from(table)
    .select("*", { count: "exact", head: true }) as unknown as CountQuery;
  const query = apply ? apply(baseQuery) : baseQuery;
  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function getEventCounts(): Promise<EventCounts> {
  const entries = await Promise.all(
    analyticsEventNames.map(async (eventName) => {
      const count = await countRows("analytics_events", (query) =>
        query.eq("event_name", eventName),
      );

      return [eventName, count] as const;
    }),
  );

  return Object.fromEntries(entries) as EventCounts;
}

async function countRecentlyActiveUsers() {
  const serviceClient = createServiceRoleClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await serviceClient
    .from("analytics_events")
    .select("user_id")
    .gte("created_at", since)
    .not("user_id", "is", null)
    .range(0, 9999);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((event) => event.user_id)).size;
}

async function countPapersWithMultipleUsers() {
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("user_papers")
    .select("paper_id,user_id")
    .is("removed_at", null)
    .range(0, 49999);

  if (error) {
    throw error;
  }

  const paperUsers = new Map<string, Set<string>>();

  for (const row of data ?? []) {
    const currentUsers = paperUsers.get(row.paper_id) ?? new Set<string>();
    currentUsers.add(row.user_id);
    paperUsers.set(row.paper_id, currentUsers);
  }

  return Array.from(paperUsers.values()).filter((users) => users.size > 1)
    .length;
}

export async function getBetaMetrics() {
  const [
    eventCounts,
    activeUsers,
    betaUsers,
    canonicalPapers,
    activeUserPapers,
    removedUserPapers,
    privateNotes,
    visibleComments,
    activeFollows,
    activeExtensionSessions,
    papersWithMultipleUsers,
  ] = await Promise.all([
    getEventCounts(),
    countRecentlyActiveUsers(),
    countRows("profiles"),
    countRows("papers", (query) => query.is("deleted_at", null)),
    countRows("user_papers", (query) => query.is("removed_at", null)),
    countRows("user_papers", (query) => query.not("removed_at", "is", null)),
    countRows("private_notes", (query) => query.is("archived_at", null)),
    countRows("user_papers", (query) =>
      query.not("visible_comment", "is", null),
    ),
    countRows("follows"),
    countRows("extension_sessions", (query) => query.is("revoked_at", null)),
    countPapersWithMultipleUsers(),
  ]);

  const metrics: Metric[] = [
    {
      label: "30-day active users",
      value: activeUsers,
      description: "Distinct users with analytics events in the last 30 days.",
    },
    {
      label: "Beta profiles",
      value: betaUsers,
      description: "Authenticated beta profiles currently in the app.",
    },
    {
      label: "Canonical papers",
      value: canonicalPapers,
      description: "Non-deleted canonical paper records.",
    },
    {
      label: "Active library saves",
      value: activeUserPapers,
      description: "Active user-paper relationships.",
    },
    {
      label: "Removed library saves",
      value: removedUserPapers,
      description: "Soft-removed user-paper relationships.",
    },
    {
      label: "Private notes",
      value: privateNotes,
      description: "Active private note records. Bodies are not exposed here.",
    },
    {
      label: "Visible comments",
      value: visibleComments,
      description: "User-paper rows with visible comments.",
    },
    {
      label: "Active follows",
      value: activeFollows,
      description: "One-way follow relationships.",
    },
    {
      label: "Extension sessions",
      value: activeExtensionSessions,
      description: "Non-revoked opaque-token extension sessions.",
    },
    {
      label: "Multi-user papers",
      value: papersWithMultipleUsers,
      description: "Papers saved by more than one active user.",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    metrics,
    eventCounts,
  };
}
