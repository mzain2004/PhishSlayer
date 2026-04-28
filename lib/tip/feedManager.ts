import axios from 'axios';

const OTX_API_KEY = process.env.OTX_API_KEY || '';

export interface IOC {
  iocType: 'ip' | 'domain' | 'url' | 'hash';
  value: string;
  tags: string[];
  confidence: number;
  source: string;
  expiresAt?: Date;
}

async function fetchOTX(): Promise<IOC[]> {
  if (!OTX_API_KEY) return [];
  try {
    const response = await axios.get('https://otx.alienvault.com/api/v1/pulses/subscribed', {
      headers: { 'X-OTX-API-KEY': OTX_API_KEY }
    });
    return response.data.results?.flatMap((pulse: any) => 
      pulse.indicators.map((ind: any) => ({
        iocType: normalizeType(ind.type),
        value: ind.indicator,
        tags: pulse.tags,
        confidence: 80,
        source: 'OTX'
      }))
    ) || [];
  } catch (error) {
    return [];
  }
}

async function fetchMISP(): Promise<IOC[]> {
  try {
    const response = await axios.get('https://www.circl.lu/doc/misp/feed-osint/manifest.json');
    // Simplified: OSINT manifest doesn't have all IOCs, would need to fetch individual files.
    // For this build, we'll return empty or mock a few.
    return [];
  } catch (error) {
    return [];
  }
}

async function fetchURLhaus(): Promise<IOC[]> {
  try {
    const response = await axios.get('https://urlhaus-api.abuse.ch/v1/urls/recent/');
    return response.data.urls?.map((u: any) => ({
      iocType: 'url' as const,
      value: u.url,
      tags: [u.threat],
      confidence: 90,
      source: 'URLhaus'
    })) || [];
  } catch (error) {
    return [];
  }
}

function normalizeType(type: string): IOC['iocType'] {
  if (type.includes('IPv4')) return 'ip';
  if (type.includes('domain')) return 'domain';
  if (type.includes('FileHash')) return 'hash';
  return 'url';
}

export async function syncAllFeeds(): Promise<IOC[]> {
  const results = await Promise.allSettled([
    fetchOTX(),
    fetchMISP(),
    fetchURLhaus()
  ]);

  const allIOCs: IOC[] = [];
  results.forEach(res => {
    if (res.status === 'fulfilled') allIOCs.push(...res.value);
  });

  return allIOCs;
}
