import { requirePageUser } from "@/lib/server/page-auth";
import { PaperPage } from "./paper-page";

export const dynamic = "force-dynamic";

export default async function PaperRoutePage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  await requirePageUser();
  const { paperId } = await params;

  return <PaperPage paperId={paperId} />;
}
