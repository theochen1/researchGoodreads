import type { AnalyticsEventName } from "@cairn/shared";
import { createServiceRoleClient } from "./supabase";

export type TrackEventInput = {
  userId?: string | null;
  eventName: AnalyticsEventName;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function trackEvent(input: TrackEventInput): Promise<void> {
  try {
    const serviceClient = createServiceRoleClient();

    await serviceClient.from("analytics_events").insert({
      user_id: input.userId ?? null,
      event_name: input.eventName,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Analytics must never block the user action.
  }
}
