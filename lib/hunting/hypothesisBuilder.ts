import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

export interface Hypothesis {
  title: string;
  hypothesis: string;
  huntQuery: string;
  mitreTechnique: string;
  priority: 'low' | 'medium' | 'high';
  dataSourcesNeeded: string[];
  searchPatterns: any;
}

export async function generateHypotheses(params: {
  orgId: string;
  recentAlerts: any[];
  mitreGaps: string[];
  threatIntelFeeds: any[];
}): Promise<Hypothesis[]> {
  const prompt = `
    You are an expert Threat Hunter. Based on the following data, generate 3-5 threat hunt hypotheses.
    
    RECENT ALERTS: ${JSON.stringify(params.recentAlerts.slice(0, 10))}
    MITRE COVERAGE GAPS: ${params.mitreGaps.join(', ')}
    THREAT INTEL FEEDS: ${JSON.stringify(params.threatIntelFeeds.slice(0, 10))}
    
    For each hypothesis, provide:
    - title: Clear name of the hunt.
    - hypothesis: What are we looking for and why.
    - huntQuery: A SQL-like query to run against 'events' table.
    - mitreTechnique: Relevant MITRE ATT&CK ID.
    - priority: low, medium, or high.
    - dataSourcesNeeded: Array of log sources.
    - searchPatterns: JSON object of specific indicators.
    
    Respond ONLY with a JSON array of objects.
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) return [];
    
    const parsed = JSON.parse(content);
    return (parsed.hypotheses || Object.values(parsed)[0] || []) as Hypothesis[];
  } catch (error) {
    console.error('Groq hypothesis generation error:', error);
    return [];
  }
}
