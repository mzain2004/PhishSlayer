import Groq from 'groq-sdk';
import { buildAttackTimeline, AttackTimeline } from './timeline';
import { verifyCustodyChain } from './chainOfCustody';
import { getEvidenceForCase } from './evidence';
import { createClient } from '@/lib/supabase/server';

export interface ForensicReport {
  caseId: string;
  generatedAt: Date;
  generatedBy: string;
  executiveSummary: string;
  technicalAnalysis: string;
  attackMethodology: string;
  impactAssessment: string;
  recommendations: string[];
  timeline: AttackTimeline;
  mitreTechniques: string[];
  iocSummary: string[];
  cvssHighest: number;
  evidenceCount: number;
  custodyVerification: any;
}

export async function generateForensicReport(caseId: string, orgId: string): Promise<ForensicReport> {
  const supabase = await createClient();
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const [timeline, evidence, custody] = await Promise.all([
    buildAttackTimeline(caseId, orgId),
    getEvidenceForCase(caseId, orgId),
    verifyCustodyChain(caseId)
  ]);

  const timelineSummary = timeline.phases.map(p => `- ${p.killChainStage}: ${p.summary}`).join('\n');
  const mitreList = Array.from(new Set(timeline.phases.flatMap(p => p.mitreTechniques))).join(', ');
  const iocList = [...timeline.involvedIps, ...timeline.involvedUsers].join(', ');

  const prompt = `You are a senior forensic analyst. Based on the following attack timeline and evidence, write a professional incident report.
    Timeline Summary:
    ${timelineSummary}
    
    MITRE Techniques: ${mitreList}
    IOCs: ${iocList}
    Severity: critical
    
    Generate JSON with fields: executiveSummary, technicalAnalysis, attackMethodology, impactAssessment, recommendations (array of strings).
    No markdown. Pure JSON only.`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' }
  });

  const aiResult = JSON.parse(completion.choices[0].message.content!);

  const report: ForensicReport = {
    caseId,
    generatedAt: new Date(),
    generatedBy: 'ai',
    executiveSummary: aiResult.executiveSummary,
    technicalAnalysis: aiResult.technicalAnalysis,
    attackMethodology: aiResult.attackMethodology,
    impactAssessment: aiResult.impactAssessment,
    recommendations: aiResult.recommendations,
    timeline,
    mitreTechniques: Array.from(new Set(timeline.phases.flatMap(p => p.mitreTechniques))),
    iocSummary: [...timeline.involvedIps, ...timeline.involvedUsers],
    cvssHighest: 0, // Would be fetched from alerts
    evidenceCount: evidence.length,
    custodyVerification: custody
  };

  // Cache report
  await supabase.from('forensic_reports').insert({
    case_id: caseId,
    organization_id: orgId,
    report_data: report,
    generated_by: 'ai'
  });

  return report;
}

export function exportReportAsJson(report: ForensicReport): string {
  return JSON.stringify({
    ...report,
    metadata: {
      exportedAt: new Date().toISOString(),
      schemaVersion: '1.0'
    }
  }, null, 2);
}
