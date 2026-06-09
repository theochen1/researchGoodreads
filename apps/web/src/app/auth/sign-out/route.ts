import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/server/supabase";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();
  redirect("/login");
}
