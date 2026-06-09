import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { requireExtensionSession } from "@/lib/server/auth";
import { parsePaperInput } from "@/lib/server/capture";
import {
  findCurrentUserPaper,
  findExistingPaper,
} from "@/lib/server/capture-service";

export const GET = withApiRoute(async (request) => {
  const session = await requireExtensionSession(request);
  const requestUrl = new URL(request.url);
  const pageUrl = requestUrl.searchParams.get("url");

  if (!pageUrl) {
    return ok({
      saved: false,
      parsedInput: null,
      paper: null,
      userPaper: null,
      paperUrl: null,
    });
  }

  const parsedInput = parsePaperInput(pageUrl);
  const paper = await findExistingPaper(parsedInput);

  if (!paper) {
    return ok({
      saved: false,
      parsedInput,
      paper: null,
      userPaper: null,
      paperUrl: null,
    });
  }

  const userPaper = await findCurrentUserPaper(session.userId, paper.id);

  return ok({
    saved: Boolean(userPaper),
    parsedInput,
    paper,
    userPaper,
    paperUrl: `/papers/${paper.id}`,
  });
});
