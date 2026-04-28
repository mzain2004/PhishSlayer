import axios from 'axios';

export interface ScanResult {
  verdict: 'clean' | 'suspicious' | 'malicious' | 'unknown';
  score: number;
  screenshotUrl?: string;
  categories: string[];
  maliciousIndicators: string[];
}

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY || '';
const URLSCAN_API_KEY = process.env.URLSCAN_API_KEY || ''; // Basic doesn't need it but good to have

async function scanVirusTotal(url: string): Promise<Partial<ScanResult>> {
  if (!VT_API_KEY) return { verdict: 'unknown', score: 0 };
  
  try {
    const urlId = Buffer.from(url).toString('base64').replace(/=/g, '');
    const reportResponse = await axios.get(
      `https://www.virustotal.com/api/v3/urls/${urlId}`,
      { headers: { 'x-apikey': VT_API_KEY } }
    );
    
    const stats = reportResponse.data.data.attributes.last_analysis_stats;
    const maliciousCount = stats.malicious;
    
    return {
      verdict: maliciousCount > 3 ? 'malicious' : maliciousCount > 0 ? 'suspicious' : 'clean',
      score: (maliciousCount / (stats.harmless + stats.malicious + stats.suspicious + stats.undetected)) * 100,
      maliciousIndicators: Object.entries(reportResponse.data.data.attributes.last_analysis_results || {})
        .filter(([_, res]: any) => res.category === 'malicious')
        .map(([engine, _]) => engine),
      categories: reportResponse.data.data.attributes.categories ? Object.values(reportResponse.data.data.attributes.categories) : []
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      // If not found, submit it
      try {
        const formData = new URLSearchParams();
        formData.append('url', url);
        await axios.post(
          'https://www.virustotal.com/api/v3/urls',
          formData,
          { headers: { 'x-apikey': VT_API_KEY } }
        );
      } catch (submitError) {
        console.error('VT Submit Error:', submitError);
      }
    }
    console.error('VirusTotal Error:', error.message);
    return { verdict: 'unknown', score: 0 };
  }
}

async function scanUrlScan(url: string): Promise<Partial<ScanResult>> {
  try {
    const response = await axios.post(
      'https://urlscan.io/api/v1/scan/',
      { url, visibility: 'public' },
      { headers: URLSCAN_API_KEY ? { 'API-Key': URLSCAN_API_KEY } : {} }
    );
    
    return {
      screenshotUrl: response.data.screenshot,
      verdict: 'unknown'
    };
  } catch (error: any) {
    console.error('UrlScan Error:', error.message);
    return { verdict: 'unknown' };
  }
}

async function scanPhishTank(url: string): Promise<Partial<ScanResult>> {
  try {
    const response = await axios.post(
      'https://checkurl.phishtank.com/checkurl/',
      new URLSearchParams({
        url,
        format: 'json',
        app_key: process.env.PHISHTANK_API_KEY || ''
      })
    );
    
    const results = response.data?.results;
    const isPhish = results?.in_database && results?.valid;
    return {
      verdict: isPhish ? 'malicious' : 'clean',
      score: isPhish ? 100 : 0,
      maliciousIndicators: isPhish ? ['PhishTank Positive'] : []
    };
  } catch (error: any) {
    console.error('PhishTank Error:', error.message);
    return { verdict: 'unknown' };
  }
}

export async function scanUrl(url: string): Promise<ScanResult> {
  const results = await Promise.allSettled([
    scanVirusTotal(url),
    scanUrlScan(url),
    scanPhishTank(url)
  ]);

  let finalVerdict: ScanResult['verdict'] = 'clean';
  let maxScore = 0;
  let screenshotUrl = '';
  const allCategories = new Set<string>();
  const allIndicators = new Set<string>();

  results.forEach((res) => {
    if (res.status === 'fulfilled') {
      const val = res.value;
      if (val.verdict === 'malicious') finalVerdict = 'malicious';
      else if (val.verdict === 'suspicious' && finalVerdict !== 'malicious') finalVerdict = 'suspicious';
      
      if (val.score !== undefined && val.score > maxScore) maxScore = val.score;
      if (val.screenshotUrl) screenshotUrl = val.screenshotUrl;
      if (Array.isArray(val.categories)) val.categories.forEach(c => allCategories.add(c));
      if (Array.isArray(val.maliciousIndicators)) val.maliciousIndicators.forEach(i => allIndicators.add(i));
    }
  });

  return {
    verdict: finalVerdict,
    score: maxScore,
    screenshotUrl,
    categories: Array.from(allCategories),
    maliciousIndicators: Array.from(allIndicators)
  };
}
