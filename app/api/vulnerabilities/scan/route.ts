import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { matchAssetsToVulns } from "@/lib/vuln/assetVulnMatcher";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const matches = await matchAssetsToVulns(orgId);
    const supabase = await createClient();

    const entries = matches.flatMap((m) =>
      m.matchedCVEs.map((c: any) => ({
        organization_id: orgId,
        asset_id: m.assetId,
        cve_id: c.cveId,
        cvss_score: c.cvssScore,
        severity: c.severity,
        description: c.description,
        affected_product: assetProduct(c.affectedProducts), // Helper to pick best product name
        patch_available: c.patchAvailable,
        status: "open",
      })),
    );

    if (entries.length > 0) {
      // Avoid duplicate CVEs for same asset (simplified)
      const { error } = await supabase
        .from("vulnerabilities")
        .upsert(entries, { onConflict: "asset_id,cve_id" });
      // Note: need unique constraint on asset_id,cve_id if using upsert on conflict
      if (error) {
        // Fallback to simple insert if upsert fails due to missing constraint
        await supabase.from("vulnerabilities").insert(entries);
      }
    }

    return NextResponse.json({
      success: true,
      count: entries.length,
      results: matches,
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 });
    console.error("Vuln scan error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

function assetProduct(products: string[]) {
  return products[0] || "Unknown";
}
