import { callSupabaseRpc, getSurveyConfig, isDemoMode } from "@/lib/survey-config";
import { normalizeAccessCode, validateAnswers } from "@/lib/survey-validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const accessCode = normalizeAccessCode(body?.accessCode);
  const validation = validateAnswers(body?.answers);
  if (!accessCode) return Response.json({ error: "invalid_code_format" }, { status: 400 });
  if (!validation.ok) return Response.json({ error: validation.error, code: validation.code }, { status: 400 });

  if (isDemoMode()) return Response.json({ success: true, demo: true });

  try {
    const config = getSurveyConfig();
    await callSupabaseRpc<string>("submit_survey", { p_cycle_slug: config.cycleSlug, p_access_code: accessCode, p_privacy_notice_version: body?.privacyNoticeVersion ?? config.privacyNoticeVersion, p_answers: validation.answers });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "submission_failed" }, { status: 422 });
  }
}
