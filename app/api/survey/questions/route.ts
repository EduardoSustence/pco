import questions from "@/data/questions.json";

export const dynamic = "force-static";

export async function GET() {
  return Response.json({ questions, count: questions.length, schemaVersion: "1.0" }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}
