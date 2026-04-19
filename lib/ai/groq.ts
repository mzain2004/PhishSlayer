import Groq from "groq-sdk";

let groqClient: Groq | null = null;

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GROQ_API_KEY");
    }
    groqClient = new Groq({ apiKey });
  }

  return groqClient;
}

export function getGroqModel(): string {
  return process.env.GROQ_MODEL ?? DEFAULT_MODEL;
}

export async function groqComplete(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024,
): Promise<string> {
  for (let i = 0; i < 3; i += 1) {
    try {
      const response = await getGroqClient().chat.completions.create({
        model: getGroqModel(),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.1,
      });

      return response.choices[0]?.message?.content ?? "";
    } catch (error) {
      const status = (error as { status?: number | string } | null)?.status;
      if ((status === 429 || status === "429") && i < 2) {
        await sleep(2 ** i * 2000);
        continue;
      }
      throw error;
    }
  }

  return "";
}
