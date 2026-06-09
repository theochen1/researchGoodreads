import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/server/supabase";

export async function POST() {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();
  redirect("/login");
}

export async function GET() {
  redirect("/login");
}
