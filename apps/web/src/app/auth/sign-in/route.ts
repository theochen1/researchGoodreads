import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/server/supabase";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/login");
  }

  redirect(data.url);
}
