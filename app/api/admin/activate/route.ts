import { getSurveyConfig } from "@/lib/survey-config";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!accessToken || password.length < 10 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return Response.json({ error: "invalid_activation" }, { status: 400 });
  }
  const { url, anonKey } = getSurveyConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
    cache: "no-store",
  });
  if (!response.ok) return Response.json({ error: "activation_failed" }, { status: 401 });
  return Response.json({ activated: true });
}
