import { createClient } from "@supabase/supabase-js";
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const accessCode = body?.accessCode?.trim().toUpperCase();
    if (!accessCode || !/^PESQ-\d{4}-[A-Z0-9]{5}$/.test(accessCode)) {
      return Response.json(
        { error: "invalid_code_format", message: "Código deve ter formato PESQ-2026-XXXXX" },
        { status: 400 }
      );
    }
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return Response.json({ error: "configuration_error" }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("participants")
      .select("codigo_unico, status")
      .eq("codigo_unico", accessCode)
      .single();
    if (error) {
      console.error("Supabase error:", error);
      return Response.json(
        { error: "invalid_code", message: "Código de participação não encontrado" },
        { status: 403 }
      );
    }
    if (!data) {
      return Response.json(
        { error: "invalid_code", message: "Código de participação não encontrado" },
        { status: 403 }
      );
    }
    if (data.status === "respondido") {
      return Response.json(
        { error: "already_responded", message: "Este código já foi utilizado" },
        { status: 403 }
      );
    }
    return Response.json({
      valid: true,
      code: accessCode,
      message: "Código validado com sucesso"
    });
  } catch (err) {
    console.error("Validation error:", err);
    return Response.json(
      { error: "service_error", message: "Erro ao validar código" },
      { status: 500 }
    );
  }
}
