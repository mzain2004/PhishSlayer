import axios from 'axios';

const NVD_API_KEY = process.env.NVD_API_KEY || '';

export async function searchCVEs(keyword: string) {
  try {
    const response = await axios.get('https://services.nvd.nist.gov/rest/json/cves/2.0', {
      params: { keywordSearch: keyword },
      headers: NVD_API_KEY ? { 'apiKey': NVD_API_KEY } : {}
    });

    return response.data.vulnerabilities?.map((v: any) => ({
      cveId: v.cve.id,
      severity: v.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity || 'UNKNOWN',
      cvssScore: v.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || 0,
      description: v.cve.descriptions?.[0]?.value || '',
      affectedProducts: v.cve.configurations?.[0]?.nodes?.[0]?.cpeMatch?.map((c: any) => c.criteria) || [],
      patchAvailable: v.cve.references?.some((r: any) => r.tags?.includes('Patch')) || false
    })) || [];
  } catch (error) {
    console.error('NVD API error:', error);
    return [];
  }
}
