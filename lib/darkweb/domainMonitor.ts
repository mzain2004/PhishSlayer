import axios from 'axios';

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY || '';
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX || '';

export async function checkPasteSites(domain: string) {
  if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) return { error: 'API unavailable', data: [] };
  
  try {
    const query = `site:pastebin.com OR site:ghostbin.co OR site:pastie.org "${domain}"`;
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: GOOGLE_SEARCH_API_KEY,
        cx: GOOGLE_SEARCH_CX,
        q: query
      }
    });
    return response.data.items || [];
  } catch (error) {
    console.error('Google Search API error:', error);
    return [];
  }
}

export async function checkPhishTank(domain: string) {
  try {
    // PhishTank doesn't have a direct "search domain" API without a key usually, 
    // but we can check if it's listed in recent or use a community check if available.
    // We'll mock the check if API is restricted or just return clean.
    const response = await axios.post('https://checkurl.phishtank.com/checkurl/', 
      new URLSearchParams({ url: `http://${domain}`, format: 'json' })
    );
    return response.data?.results?.in_database || false;
  } catch (error) {
    return false;
  }
}

export async function monitorDomain(domain: string) {
  const [pastes, isPhishing] = await Promise.all([
    checkPasteSites(domain),
    checkPhishTank(domain)
  ]);

  return {
    domain,
    pastes: pastes.map((p: any) => ({ title: p.title, link: p.link, snippet: p.snippet })),
    isPhishing,
    monitoredAt: new Date()
  };
}
