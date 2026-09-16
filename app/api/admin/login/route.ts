import { saveAdminSession, signInAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return Response.json({ error: "invalid_credentials" }, { status: 400 });
  try {
    const session = await signInAdmin(email, password);
    await saveAdminSession(session);
    return Response.json({ authenticated: true, email: session.user.email ?? email });
  } catch {
    return Response.json({ error: "invalid_credentials" }, { status: 401 });
  }
}
