import Groq from 'groq-sdk';
import { createClient } from '@/lib/supabase/server';
import { getTechniqueById } from './techniques';

export interface AlertContext {
  title: string;
  description: string;
  rawPayload: any;
  sourceType: string;
  iocs: string[];
  connectorType?: string;
}

export interface MitreTag {
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  confidence: number;
  reasoning: string;
  detectionNotes?: string;
  dataSources?: string[];
}

export async function tagAlertWithMitre(context: AlertContext): Promise<MitreTag[]> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const rawSummary = JSON.stringify(context.rawPayload).substring(0, 500);
  
  const prompt = `You are a MITRE ATT&CK expert. Analyze this security alert and identify the most relevant MITRE ATT&CK techniques.
     
    Alert Title: ${context.title}
    Alert Description: ${context.description}
    Source: ${context.sourceType}
    IOCs: ${context.iocs.join(', ')}
    Raw Data Summary: ${rawSummary}
    
    Respond ONLY with valid JSON array. No explanation. No markdown.
    Format: [{"techniqueId": "T1059.001", "techniqueName": "PowerShell", "tactic": "Execution", "confidence": 0.92, "reasoning": "one sentence"}]
    
    Rules:
    - Maximum 5 techniques
    - Only include if confidence >= 0.6
    - Use exact MITRE technique IDs
    - Confidence is float 0.0-1.0`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || '[]';
    const parsed = JSON.parse(response.replace(/```json|```/g, '').trim());

    if (!Array.isArray(parsed)) return [];

    const tags: MitreTag[] = [];
    for (const entry of parsed) {
      const tech = getTechniqueById(entry.techniqueId);
      if (tech && entry.confidence >= 0.6) {
        tags.push({
          techniqueId: tech.id,
          techniqueName: tech.name,
          tactic: entry.tactic,
          confidence: entry.confidence,
          reasoning: entry.reasoning,
          dataSources: tech.dataSources
        });
      }
    }

    return tags;
  } catch (error) {
    console.error('MITRE Tagging Error:', error);
    return [];
  }
}

export async function batchTagAlerts(alertIds: string[], orgId: string): Promise<void> {
  const supabase = await createClient();

  for (let i = 0; i < alertIds.length; i += 5) {
    const batch = alertIds.slice(i, i + 5);
    
    await Promise.all(batch.map(async (id) => {
      const { data: alert } = await supabase
        .from('alerts')
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId)
        .single();

      if (!alert) return;

      const context: AlertContext = {
        title: alert.title,
        description: alert.description,
        rawPayload: alert.raw_data,
        sourceType: alert.source,
        iocs: alert.cve_ids || [] // Using CVEs as proxy for IOCs if not separate
      };

      const tags = await tagAlertWithMitre(context);
      
      if (tags.length > 0) {
        const techniqueIds = tags.map(t => t.techniqueId);
        
        await supabase
          .from('alerts')
          .update({ 
            mitre_techniques: techniqueIds,
            mitre_tagged_at: new Date().toISOString()
          })
          .eq('id', id);

        const tagInserts = tags.map(t => ({
          organization_id: orgId,
          alert_id: id,
          technique_id: t.techniqueId,
          technique_name: t.techniqueName,
          tactic: t.tactic,
          confidence: t.confidence,
          reasoning: t.reasoning
        }));

        await supabase.from('mitre_alert_tags').upsert(tagInserts, { onConflict: 'alert_id,technique_id' });
      }
    }));

    if (i + 5 < alertIds.length) {
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}
