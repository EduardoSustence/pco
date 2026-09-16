import { callSupabaseRpc, getSurveyConfig, isDemoMode } from "@/lib/survey-config";
import { normalizeAccessCode } from "@/lib/survey-validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const accessCode = normalizeAccessCode(body?.accessCode);
  if (!accessCode) return Response.json({ error: "invalid_code_format" }, { status: 400 });

  if (isDemoMode()) return Response.json({ valid: true, cycleSlug: "pesquisa-clima-2026", title: "Pesquisa de Clima 2026", privacyNoticeVersion: "1.0", demo: true });

  try {
    const config = getSurveyConfig();
    const result = await callSupabaseRpc<Array<{ valid: boolean; title: string; privacy_notice_version: string }>>("validate_survey_access", { p_cycle_slug: config.cycleSlug, p_access_code: accessCode });
    const cycle = result[0];
    if (!cycle?.valid) return Response.json({ error: "invalid_or_used_code" }, { status: 403 });
    return Response.json({ valid: true, cycleSlug: config.cycleSlug, title: cycle.title, privacyNoticeVersion: cycle.privacy_notice_version });
  } catch {
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }
}
