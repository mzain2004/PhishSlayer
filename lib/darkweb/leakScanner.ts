import axios from 'axios';

const HIBP_API_KEY = process.env.HIBP_API_KEY || '';
const DEHASHED_API_KEY = process.env.DEHASHED_API_KEY || '';
const DEHASHED_EMAIL = process.env.DEHASHED_EMAIL || '';

export interface LeakResult {
  email: string;
  breaches: any[];
  passwordExposed: boolean;
  sources: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

async function scanHIBP(email: string) {
  if (!HIBP_API_KEY) return { error: 'API unavailable', data: [] };
  try {
    const response = await axios.get(`https://haveibeenpwned.com/api/v3/breachedaccount/${email}`, {
      headers: { 'hibp-api-key': HIBP_API_KEY, 'user-agent': 'PhishSlayer' }
    });
    return { data: response.data || [] };
  } catch (error: any) {
    if (error.response?.status === 404) return { data: [] };
    return { error: 'HIBP API error', data: [] };
  }
}

async function scanDeHashed(email: string) {
  if (!DEHASHED_API_KEY || !DEHASHED_EMAIL) return { error: 'API unavailable', data: [] };
  try {
    const response = await axios.get(`https://api.dehashed.com/search?query=email:${email}`, {
      auth: { username: DEHASHED_EMAIL, password: DEHASHED_API_KEY },
      headers: { 'Accept': 'application/json' }
    });
    return { data: response.data?.entries || [] };
  } catch (error) {
    return { error: 'DeHashed API error', data: [] };
  }
}

async function scanLeakCheck(email: string) {
  try {
    const response = await axios.get(`https://leakcheck.io/api/public?check=${email}`);
    return { data: response.data?.results || [] };
  } catch (error) {
    return { error: 'LeakCheck API error', data: [] };
  }
}

export async function scanEmailLeaks(email: string): Promise<LeakResult> {
  const results = await Promise.allSettled([
    scanHIBP(email),
    scanDeHashed(email),
    scanLeakCheck(email)
  ]);

  const allBreaches: any[] = [];
  const sources: string[] = [];
  let passwordExposed = false;

  results.forEach((res, index) => {
    const sourceName = ['HIBP', 'DeHashed', 'LeakCheck'][index];
    if (res.status === 'fulfilled' && !res.value.error) {
      const data = res.value.data;
      if (Array.isArray(data) && data.length > 0) {
        allBreaches.push(...data);
        sources.push(sourceName);
        if (sourceName === 'DeHashed' || sourceName === 'LeakCheck') {
          // These often return actual leak details including if password/hash is present
          passwordExposed = true; 
        }
      }
    }
  });

  let severity: LeakResult['severity'] = 'low';
  if (allBreaches.length > 5) severity = 'high';
  if (passwordExposed) severity = 'critical';
  else if (allBreaches.length > 0) severity = 'medium';

  return {
    email,
    breaches: allBreaches,
    passwordExposed,
    sources,
    severity
  };
}
