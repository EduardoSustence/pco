import "server-only";

export function isDemoMode() {
  return process.env.SURVEY_DEMO_MODE !== "false";
}

export function getSurveyConfig() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const cycleSlug = process.env.SURVEY_CYCLE_SLUG ?? "pesquisa-clima-2026";
  const privacyNoticeVersion = process.env.SURVEY_PRIVACY_NOTICE_VERSION ?? "1.0";

  if (!url || !anonKey) throw new Error("supabase_not_configured");
  return { url: url.replace(/\/$/, ""), anonKey, cycleSlug, privacyNoticeVersion };
}

export async function callSupabaseRpc<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const { url, anonKey } = getSurveyConfig();
  const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Supabase RPC failed", { functionName, status: response.status, detail: detail.slice(0, 300) });
    throw new Error("supabase_rpc_failed");
  }
  return response.json() as Promise<T>;
}
