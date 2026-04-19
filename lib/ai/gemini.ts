import { z } from "zod";

const GEMINI_BACKOFF_MS = [2000, 4000, 8000];

const GeminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(
            z.object({
              text: z.string().optional(),
            }),
          ),
        }),
      }),
    )
    .optional(),
});

class GeminiRateLimitError extends Error {
  readonly status: number;

  constructor(message: string) {
    super(message);
    this.name = "GeminiRateLimitError";
    this.status = 429;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getGeminiModel(): string {
  return process.env.GOOGLE_GEMINI_MODEL ?? "gemini-2.5-flash";
}

export function getGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY ?? null;
}

function toPayload(input: unknown): Record<string, unknown> {
  if (typeof input === "string") {
    return {
      contents: [
        {
          role: "user",
          parts: [{ text: input }],
        },
      ],
    };
  }

  if (input && typeof input === "object") {
    return input as Record<string, unknown>;
  }

  return {
    contents: [
      {
        role: "user",
        parts: [{ text: "" }],
      },
    ],
  };
}

async function attemptGeminiCall(
  payload: unknown,
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const model = getGeminiModel();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toPayload(payload)),
      signal,
    },
  );

  if (response.status === 429) {
    const details = await response.text();
    throw new GeminiRateLimitError(
      details ? `Rate limited: ${details}` : "Rate limited",
    );
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini failed (${response.status}): ${details}`);
  }

  const raw = await response.json();
  const parsed = GeminiResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Gemini response schema invalid");
  }

  const text =
    parsed.data.candidates?.[0]?.content.parts
      .map((part) => part.text || "")
      .join("")
      .trim() || "";

  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  return text;
}

export async function geminiGenerateText(
  payload: unknown,
  options: { signal?: AbortSignal; context?: string } = {},
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= GEMINI_BACKOFF_MS.length; attempt += 1) {
    try {
      return await attemptGeminiCall(payload, options.signal);
    } catch (error) {
      const isRateLimit = error instanceof GeminiRateLimitError;
      lastError = error instanceof Error ? error : new Error("Gemini failure");

      if (isRateLimit && attempt < GEMINI_BACKOFF_MS.length) {
        await sleep(GEMINI_BACKOFF_MS[attempt]);
        continue;
      }

      break;
    }
  }

  console.warn("[gemini] retries exhausted; using fallback", {
    context: options.context || "unknown",
    error: lastError?.message || "unknown",
  });

  throw lastError || new Error("Gemini retries exhausted");
}
