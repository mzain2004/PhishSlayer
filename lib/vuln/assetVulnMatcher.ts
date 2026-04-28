import { searchCVEs } from './nvdScanner';
import { createClient } from '../supabase/server';

export async function matchAssetsToVulns(orgId: string) {
  const supabase = await createClient();
  
  // 1. Pull assets
  const { data: assets, error } = await supabase
    .from('assets')
    .select('*')
    .eq('organization_id', orgId);
  
  if (error) throw error;

  const summary = [];

  for (const asset of assets || []) {
    // 2. Search CVEs for asset product
    const product = asset.product || asset.name;
    if (!product) continue;

    const cves = await searchCVEs(product);
    
    // 3. Filter/match logic (simplified)
    const matches = cves.filter((c: any) => 
      c.affectedProducts.some((p: string) => p.toLowerCase().includes(product.toLowerCase()))
    );

    if (matches.length > 0) {
      const totalRisk = matches.reduce((sum: number, c: any) => sum + (c.cvssScore || 0), 0);
      summary.push({
        assetId: asset.id,
        assetName: asset.name,
        matchedCVEs: matches,
        totalRisk
      });
    }
  }

  return summary;
}
