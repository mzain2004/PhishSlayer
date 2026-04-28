import { simpleParser } from 'mailparser';

interface Hop {
  from?: string;
  by?: string;
  with?: string;
  id?: string;
  for?: string;
  date?: string;
  delay?: number;
}

export interface HeaderAnalysisResult {
  hops: Hop[];
  spf: string | null;
  dkim: string | null;
  dmarc: string | null;
  suspiciousFlags: string[];
  riskScore: number;
  originatingIp: string | null;
}

export async function parseEmailHeaders(rawHeaders: string): Promise<HeaderAnalysisResult> {
  const parsed = await simpleParser(rawHeaders);
  const headers = parsed.headers;
  
  const hops: Hop[] = [];
  const received = headers.get('received');
  const receivedChain = Array.isArray(received) ? received : received ? [received] : [];
  
  receivedChain.forEach((header: any) => {
    // Basic hop extraction logic
    const hop: Hop = {};
    const fromMatch = header.match(/from\s+([^\s]+)/i);
    const byMatch = header.match(/by\s+([^\s]+)/i);
    const withMatch = header.match(/with\s+([^\s]+)/i);
    const dateMatch = header.match(/;\s+(.+)$/);

    if (fromMatch) hop.from = fromMatch[1];
    if (byMatch) hop.by = byMatch[1];
    if (withMatch) hop.with = withMatch[1];
    if (dateMatch) hop.date = dateMatch[1];
    
    hops.push(hop);
  });

  const spf = (headers.get('authentication-results') as string)?.match(/spf=(\w+)/)?.[1] || null;
  const dkim = (headers.get('authentication-results') as string)?.match(/dkim=(\w+)/)?.[1] || null;
  const dmarc = (headers.get('authentication-results') as string)?.match(/dmarc=(\w+)/)?.[1] || null;
  const originatingIp = (headers.get('x-originating-ip') as string) || (headers.get('x-sender-ip') as string) || null;

  const suspiciousFlags: string[] = [];
  let riskScore = 0;

  // Header Injection Check
  if (rawHeaders.includes('\r\n\r\n') && rawHeaders.split('\r\n\r\n')[0].match(/[^\r]\n[^\r]/)) {
    suspiciousFlags.push('Potential Header Injection');
    riskScore += 40;
  }

  // Auth Failures
  if (spf === 'fail') { suspiciousFlags.push('SPF Fail'); riskScore += 20; }
  if (dkim === 'fail') { suspiciousFlags.push('DKIM Fail'); riskScore += 20; }
  if (dmarc === 'fail') { suspiciousFlags.push('DMARC Fail'); riskScore += 30; }

  // Mismatched Reply-To
  const from = parsed.from?.value[0]?.address;
  const replyTo = parsed.replyTo?.value[0]?.address;
  if (from && replyTo && from !== replyTo) {
    const fromDomain = from.split('@')[1];
    const replyToDomain = replyTo.split('@')[1];
    if (fromDomain !== replyToDomain) {
      suspiciousFlags.push('Mismatched Reply-To Domain');
      riskScore += 25;
    }
  }

  // X-Priority High often used in phish
  if (headers.get('x-priority') === '1 (Highest)' || headers.get('x-priority') === '1') {
    suspiciousFlags.push('High Priority Flag');
    riskScore += 10;
  }

  return {
    hops,
    spf,
    dkim,
    dmarc,
    suspiciousFlags,
    riskScore: Math.min(riskScore, 100),
    originatingIp
  };
}
