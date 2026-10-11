import { fail, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import * as repo from "@/lib/db/repo";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const run = await repo.getRun(id);
    if (!run) throw new AppError("NOT_FOUND", "That scan doesn't exist.", 404);
    return ok({ run });
  } catch (e) {
    return fail(e);
  }
}
