import { isDemoMode } from "@/lib/survey-config";
import { validateAnswers } from "@/lib/survey-validation";

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const validation = validateAnswers(body?.answers);
  if (!validation.ok && validation.error !== "required_answer_missing") return Response.json({ error: validation.error, code: validation.code }, { status: 400 });
  if (isDemoMode()) return Response.json({ saved: true, temporary: true, demo: true });
  return Response.json({ error: "draft_storage_not_enabled" }, { status: 501 });
}
