import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "./supabase";
import {
  getOptionalSupabaseAnonKey,
  getOptionalSupabaseServiceRoleKey,
  getOptionalSupabaseUrl,
} from "./env";

export type Profile = {
  id: string;
  name: string;
  username: string;
  affiliation: string | null;
  role: string | null;
};

export async function getOptionalCurrentProfile(): Promise<Profile | null> {
  if (
    !getOptionalSupabaseUrl() ||
    !getOptionalSupabaseAnonKey() ||
    !getOptionalSupabaseServiceRoleKey()
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
