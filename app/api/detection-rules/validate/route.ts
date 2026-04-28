import { NextRequest, NextResponse } from 'next/server';
import { parseSigmaRule } from '@/lib/detection/sigmaParser';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { ruleContent, type } = await req.json();

    if (type === 'sigma') {
      try {
        const parsed = parseSigmaRule(ruleContent);
        return NextResponse.json({ valid: true, parsed });
      } catch (e: any) {
        return NextResponse.json({ valid: false, error: e.message }, { status: 400 });
      }
    }

    if (type === 'yara') {
       // Simple YARA validation - check for 'rule' and 'condition'
       const hasRule = /rule\s+[a-zA-Z0-9_]+/.test(ruleContent);
       const hasCondition = /condition:/.test(ruleContent);
       if (hasRule && hasCondition) {
         return NextResponse.json({ valid: true });
       }
       return NextResponse.json({ valid: false, error: 'Invalid YARA syntax: missing rule name or condition:' }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
