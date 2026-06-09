import { redirect } from "next/navigation";
import { ensureBetaAccess, ensureProfile } from "@/lib/server/access";
import { createSupabaseServerClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    redirect("/login");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const access = await ensureBetaAccess(user);

  if (!access.allowed) {
    await supabase.auth.signOut();
    redirect("/access-pending");
  }

  await ensureProfile(user);
  redirect("/library");
}
