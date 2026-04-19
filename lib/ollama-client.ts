import { z } from "zod";
import { geminiGenerateText, getGeminiModel } from "@/lib/ai/gemini";

export const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || "http://localhost:11434";

const OLLAMA_TIMEOUT_MS = 30_000;
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

export interface OllamaOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  stop?: string[];
}

const OllamaGenerateInputSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1),
  options: z.record(z.string(), z.unknown()).optional(),
});

const OllamaGenerateResponseSchema = z.object({
  response: z.string(),
});

const OllamaTagsResponseSchema = z.object({
  models: z
    .array(
      z.object({
        name: z.string(),
      }),
    )
    .default([]),
});

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

async function geminiGenerate(promptOrPayload: string): Promise<string> {
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(promptOrPayload);
  } catch {
    parsedPayload = null;
  }

  const payload =
    parsedPayload && typeof parsedPayload === "object"
      ? parsedPayload
      : {
          contents: [
            {
              role: "user",
              parts: [{ text: promptOrPayload }],
            },
          ],
        };

  return geminiGenerateText(payload, {
    signal: createTimeoutSignal(OLLAMA_TIMEOUT_MS),
    context: "ollama-fallback",
  });
}

export async function ollamaGenerate(
  model: string,
  prompt: string,
  options?: OllamaOptions,
): Promise<string> {
  const parsedInput = OllamaGenerateInputSchema.safeParse({
    model,
    prompt,
    options,
  });

  if (!parsedInput.success) {
    throw new Error("Invalid Ollama generation input");
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: parsedInput.data.model,
      prompt: parsedInput.data.prompt,
      stream: false,
      options: parsedInput.data.options,
    }),
    signal: createTimeoutSignal(OLLAMA_TIMEOUT_MS),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Ollama generate failed (${response.status}): ${details}`);
  }

  const body = await response.json();
  const parsedResponse = OllamaGenerateResponseSchema.safeParse(body);
  if (!parsedResponse.success) {
    throw new Error("Ollama response schema invalid");
  }

  return parsedResponse.data.response;
}

export async function ollamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      signal: createTimeoutSignal(OLLAMA_TIMEOUT_MS),
    });

    if (!response.ok) {
      return false;
    }

    const body = await response.json();
    return OllamaTagsResponseSchema.safeParse(body).success;
  } catch {
    return false;
  }
}

export async function ollamaModels(): Promise<string[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
    method: "GET",
    signal: createTimeoutSignal(OLLAMA_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Ollama tags failed (${response.status})`);
  }

  const body = await response.json();
  const parsed = OllamaTagsResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error("Ollama tags schema invalid");
  }

  return parsed.data.models.map((model) => model.name);
}

export async function generateWithFallback(
  prompt: string,
  geminiPrompt?: string,
): Promise<string> {
  try {
    const result = await ollamaGenerate(DEFAULT_MODEL, prompt);
    console.info("[llm] provider=ollama model=%s", DEFAULT_MODEL);
    return result;
  } catch (ollamaError) {
    console.warn("[llm] provider=ollama failed, using Gemini fallback", {
      error: ollamaError instanceof Error ? ollamaError.message : "unknown",
    });
  }

  const geminiResult = await geminiGenerate(geminiPrompt || prompt);
  console.info("[llm] provider=gemini model=%s", getGeminiModel());
  return geminiResult;
}
