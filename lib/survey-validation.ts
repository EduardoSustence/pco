import questionsData from "@/data/questions.json";

type QuestionRecord = { code: string; type: string; options: string; required: boolean; acceptsNA: boolean; sensitive: boolean };
const questions = questionsData as QuestionRecord[];

export function normalizeAccessCode(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized) ? normalized : null;
}

export function validateAnswers(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false as const, error: "invalid_answers" };
  const answers = value as Record<string, unknown>;
  const knownCodes = new Set(questions.map((question) => question.code));
  if (Object.keys(answers).some((code) => !knownCodes.has(code))) return { ok: false as const, error: "unknown_question" };

  for (const question of questions) {
    const answer = answers[question.code];
    if (question.required && (typeof answer !== "string" || !answer.trim())) return { ok: false as const, error: "required_answer_missing", code: question.code };
    if (answer == null || answer === "") continue;
    if (typeof answer !== "string") return { ok: false as const, error: "invalid_answer_type", code: question.code };
    if (question.type === "Texto longo" && answer.length > 2000) return { ok: false as const, error: "answer_too_long", code: question.code };
  }
  return { ok: true as const, answers: answers as Record<string, string> };
}
