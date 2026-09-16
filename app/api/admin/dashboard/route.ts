import { callAdminRpc } from "@/lib/admin-auth";
import { getSurveyConfig } from "@/lib/survey-config";

export async function GET() {
  try {
    const { cycleSlug } = getSurveyConfig();
    const dashboard = await callAdminRpc("admin_dashboard", { p_cycle_slug: cycleSlug });
    return Response.json(dashboard, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    if (reason === "authentication_required") return Response.json({ error: reason }, { status: 401 });
    if (reason === "access_denied") return Response.json({ error: reason }, { status: 403 });
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }
}
