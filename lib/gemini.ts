import { GoogleGenAI } from "@google/genai";

// Primary model. Falls back to FALLBACK_MODEL on 503 (overloaded) or 429 (quota).
const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";

async function callModel(ai: GoogleGenAI, model: string, prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const text = response.text?.trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number }).status;
  return status === 503 || status === 429 || status === 500;
}

/**
 * Calls Gemini server-side and returns plain text.
 * Tries PRIMARY_MODEL first; falls back to FALLBACK_MODEL on transient errors.
 * Never expose process.env.GEMINI_API_KEY to the browser.
 */
export async function generateAIText(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const ai = new GoogleGenAI({ apiKey });

  // First attempt with primary model
  try {
    return await callModel(ai, PRIMARY_MODEL, prompt);
  } catch (primaryErr) {
    console.warn("[gemini] Primary model failed:", (primaryErr as Error).message?.slice(0, 100));
    if (!isRetryable(primaryErr)) throw primaryErr;
  }

  // Short pause then try fallback model
  await new Promise((r) => setTimeout(r, 1500));
  try {
    return await callModel(ai, FALLBACK_MODEL, prompt);
  } catch (fallbackErr) {
    console.error("[gemini] Fallback model also failed:", (fallbackErr as Error).message?.slice(0, 100));
    throw new Error("AI service is temporarily unavailable. Please try again in a moment.");
  }
}
