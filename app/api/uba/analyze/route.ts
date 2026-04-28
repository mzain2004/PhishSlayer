import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { detectAnomalies } from '@/lib/uba/anomalyDetector';
import { updateRiskProfile, logAnomalyEvent } from '@/lib/uba/profileBuilder';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AnalyzeSchema = z.object({
  userId: z.string(),
  organizationId: z.string().uuid(),
  currentActivity: z.object({
    ip: z.string(),
    timestamp: z.string().optional().default(() => new Date().toISOString()),
    endpoint: z.string().optional(),
    action: z.string().optional(),
    alertCountLastHour: z.number().optional()
  })
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = AnalyzeSchema.parse(body);
    const { userId, organizationId, currentActivity } = validated;

    // 1. Detect Anomalies
    const analysisResult = await detectAnomalies({
      userId,
      orgId: organizationId,
      ip: currentActivity.ip,
      timestamp: new Date(currentActivity.timestamp),
      endpoint: currentActivity.endpoint,
      action: currentActivity.action,
      alertCountLastHour: currentActivity.alertCountLastHour
    });

    // 2. Update Risk Profile
    const profile = await updateRiskProfile(userId, organizationId, analysisResult);

    // 3. Log individual anomalies
    for (const anomaly of analysisResult.anomalies) {
      await logAnomalyEvent(userId, organizationId, anomaly);
    }

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('[UBA Analyze API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
