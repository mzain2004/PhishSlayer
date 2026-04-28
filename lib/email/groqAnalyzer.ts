import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export interface GroqAnalysisResult {
  summary: string;
  attackVector: string;
  confidence: number;
  recommendations: string[];
}

export async function analyzeHeadersWithGroq(
  rawHeaders: string,
  parsedData: any
): Promise<GroqAnalysisResult> {
  const prompt = `
    Analyze the following email headers and parsed metadata for security risks.
    
    RAW HEADERS:
    ${rawHeaders.substring(0, 5000)}
    
    PARSED DATA:
    ${JSON.stringify(parsedData, null, 2)}
    
    Return a JSON object with:
    - summary: A brief natural language summary of the findings.
    - attackVector: The likely method of attack (e.g., Business Email Compromise, Phishing, Spoofing).
    - confidence: A number between 0 and 1 representing your confidence in this analysis.
    - recommendations: An array of actionable steps for a SOC analyst.
    
    RESPONSE FORMAT: Only return valid JSON.
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert SOC analyst specializing in email header forensics.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Groq");
    }

    return JSON.parse(content) as GroqAnalysisResult;
  } catch (error) {
    console.error("Groq Analysis Error:", error);
    return {
      summary: "Failed to perform AI analysis on headers.",
      attackVector: "Unknown",
      confidence: 0,
      recommendations: ["Manually review headers for SPF/DKIM/DMARC failures."],
    };
  }
}
