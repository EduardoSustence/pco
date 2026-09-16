import "server-only";

import { cookies } from "next/headers";
import { getSurveyConfig } from "@/lib/survey-config";

export const ADMIN_ACCESS_COOKIE = "sustence_admin_access";
export const ADMIN_REFRESH_COOKIE = "sustence_admin_refresh";

type SupabaseAuthResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email?: string };
};

export async function signInAdmin(email: string, password: string) {
  const { url, anonKey } = getSurveyConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("invalid_credentials");
  return response.json() as Promise<SupabaseAuthResponse>;
}

export async function saveAdminSession(session: SupabaseAuthResponse) {
  const store = await cookies();
  const common = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
  store.set(ADMIN_ACCESS_COOKIE, session.access_token, { ...common, maxAge: session.expires_in });
  store.set(ADMIN_REFRESH_COOKIE, session.refresh_token, { ...common, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_ACCESS_COOKIE);
  store.delete(ADMIN_REFRESH_COOKIE);
}

export async function getAdminAccessToken() {
  return (await cookies()).get(ADMIN_ACCESS_COOKIE)?.value ?? null;
}

export async function callAdminRpc<T>(functionName: string, body: Record<string, unknown>) {
  const token = await getAdminAccessToken();
  if (!token) throw new Error("authentication_required");
  const { url, anonKey } = getSurveyConfig();
  const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("authentication_required");
    if (response.status === 403) throw new Error("access_denied");
    throw new Error("admin_rpc_failed");
  }
  return response.json() as Promise<T>;
}
