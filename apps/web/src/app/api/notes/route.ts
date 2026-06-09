import { z } from "zod";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { assertOwnsUserPaper, requireUser } from "@/lib/server/auth";
import { trackEvent } from "@/lib/server/analytics";
import { createServiceRoleClient } from "@/lib/server/supabase";

const upsertNoteSchema = z.object({
  userPaperId: z.string().uuid(),
  body: z.string().min(1),
});

const deleteNoteSchema = z.object({
  userPaperId: z.string().uuid(),
});

export const POST = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const input = await parseJsonBody(request, upsertNoteSchema);
  await assertOwnsUserPaper(user.id, input.userPaperId);

  const serviceClient = createServiceRoleClient();
  const { data: userPaper, error: userPaperError } = await serviceClient
    .from("user_papers")
    .select("paper_id")
    .eq("id", input.userPaperId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (userPaperError || !userPaper) {
    throw userPaperError ?? new Error("User paper not found");
  }

  const { data: existingNote, error: existingNoteError } = await serviceClient
    .from("private_notes")
    .select("id")
    .eq("user_id", user.id)
    .eq("paper_id", userPaper.paper_id)
    .is("archived_at", null)
    .maybeSingle();

  if (existingNoteError) {
    throw existingNoteError;
  }

  if (existingNote) {
    const { error } = await serviceClient
      .from("private_notes")
      .update({ body: input.body })
      .eq("id", existingNote.id);

    if (error) {
      throw error;
    }

    return ok({ noteId: existingNote.id, saved: true });
  }

  const { data, error } = await serviceClient
    .from("private_notes")
    .insert({
      user_id: user.id,
      paper_id: userPaper.paper_id,
      body: input.body,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  await trackEvent({
    userId: user.id,
    eventName: "private_note_created",
    entityType: "private_note",
    entityId: data.id,
  });

  return ok({ noteId: data.id, saved: true });
});

export const DELETE = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const input = await parseJsonBody(request, deleteNoteSchema);
  await assertOwnsUserPaper(user.id, input.userPaperId);

  const serviceClient = createServiceRoleClient();
  const { data: userPaper, error: userPaperError } = await serviceClient
    .from("user_papers")
    .select("paper_id")
    .eq("id", input.userPaperId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (userPaperError || !userPaper) {
    throw userPaperError ?? new Error("User paper not found");
  }

  const { error } = await serviceClient
    .from("private_notes")
    .update({ archived_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("paper_id", userPaper.paper_id)
    .is("archived_at", null);

  if (error) {
    throw error;
  }

  return ok({ deleted: true });
});
