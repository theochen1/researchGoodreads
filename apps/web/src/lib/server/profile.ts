import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "./supabase";
import {
  getOptionalSupabaseAnonKey,
  getOptionalSupabaseServiceRoleKey,
  getOptionalSupabaseUrl,
  getOptionalAdminEmailAllowlist,
  isEmailInAllowlist,
} from "./env";
import { isActiveBetaAccessRow } from "./access";

export type CurrentViewer = {
  id: string;
  name: string;
  username: string;
  affiliation: string | null;
  role: string | null;
  isAdmin: boolean;
};

export async function getOptionalCurrentProfile(): Promise<CurrentViewer | null> {
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
    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("id,name,username,affiliation,role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return null;
    }

    const email = user.email?.trim().toLowerCase() ?? null;
    const adminFromEnv = isEmailInAllowlist(
      email,
      getOptionalAdminEmailAllowlist(),
    );

    if (adminFromEnv) {
      return {
        ...profile,
        isAdmin: true,
      };
    }

    const { data: accessRow, error: accessError } = await serviceClient
      .from("beta_access")
      .select("is_admin,approved_at,accepted_at,expires_at")
      .ilike("email", email ?? "")
      .maybeSingle();

    if (accessError) {
      return {
        ...profile,
        isAdmin: false,
      };
    }

    return {
      ...profile,
      isAdmin: Boolean(accessRow?.is_admin && isActiveBetaAccessRow(accessRow)),
    };
  } catch {
    return null;
  }
}
