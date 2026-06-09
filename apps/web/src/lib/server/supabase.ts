import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import WebSocket from "ws";
import {
  getRequiredSupabaseAnonKey,
  getRequiredSupabaseServiceRoleKey,
  getRequiredSupabaseUrl,
} from "./env";

export type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

const realtimeTransport =
  typeof globalThis.WebSocket === "function"
    ? globalThis.WebSocket
    : (WebSocket as unknown as typeof globalThis.WebSocket);

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getRequiredSupabaseUrl(),
    getRequiredSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server components cannot set cookies; route handlers can.
          }
        },
      },
    },
  );
}

export function createServiceRoleClient() {
  return createClient(
    getRequiredSupabaseUrl(),
    getRequiredSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        transport: realtimeTransport,
      },
    },
  );
}
