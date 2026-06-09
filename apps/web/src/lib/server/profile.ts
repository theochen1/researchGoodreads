import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "./supabase";
import { getOptionalEnv } from "./env";

export type Profile = {
  id: string;
  name: string;
  username: string;
  affiliation: string | null;
  role: string | null;
};

export async function getOptionalCurrentProfile(): Promise<Profile | null> {
  if (
    !getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL") ||
    !getOptionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    !getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY")
  ) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient
      .from("profiles")
      .select("id,name,username,affiliation,role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}
