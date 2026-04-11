import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { checkTierAccess } from "@/lib/tier-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(
      /^[a-z0-9-]+$/,
      "slug must contain lowercase letters, numbers, or hyphens",
    ),
  plan: z
    .enum(["trial", "starter", "pro", "enterprise", "mssp"])
    .default("trial"),
  owner_id: z.string().uuid().optional(),
});

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const access = await checkTierAccess(user.id, "multi_org");
    if (!access.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Upgrade required",
          required_tier: "enterprise",
          current_tier: access.tier,
        },
        { status: 403 },
      );
    }

    const payload = await request.json();
    const parsed = CreateOrganizationSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const adminClient = getAdminClient();
    const { name, slug, plan, owner_id } = parsed.data;

    const organizationInsert: {
      name: string;
      slug: string;
      plan: "trial" | "starter" | "pro" | "enterprise" | "mssp";
      is_active: boolean;
      owner_id?: string;
    } = {
      name,
      slug,
      plan,
      is_active: true,
    };

    if (owner_id) {
      organizationInsert.owner_id = owner_id;
    }

    const { data: organization, error: orgError } = await adminClient
      .from("organizations")
      .insert(organizationInsert)
      .select("*")
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create organization: ${orgError?.message || "insert failed"}`,
        },
        { status: 500 },
      );
    }

    if (!owner_id) {
      return NextResponse.json({ success: true, organization });
    }

    const { error: memberError } = await adminClient
      .from("organization_members")
      .insert({
        organization_id: organization.id,
        user_id: owner_id,
        role: "owner",
      });

    if (memberError) {
      return NextResponse.json(
        {
          success: false,
          error: `Organization created but failed to add owner membership: ${memberError.message}`,
          organization,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, organization });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create organization",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const adminClient = getAdminClient();

    const { data: organizations, error: orgError } = await adminClient
      .from("organizations")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (orgError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to list organizations: ${orgError.message}`,
        },
        { status: 500 },
      );
    }

    const orgRows = organizations || [];
    const orgIds = orgRows.map((org: any) => org.id).filter(Boolean);

    let memberCountMap = new Map<string, number>();
    if (orgIds.length > 0) {
      const { data: members, error: membersError } = await adminClient
        .from("organization_members")
        .select("organization_id")
        .in("organization_id", orgIds);

      if (membersError) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to fetch organization members: ${membersError.message}`,
          },
          { status: 500 },
        );
      }

      memberCountMap = (members || []).reduce(
        (acc: Map<string, number>, row: any) => {
          const current = acc.get(row.organization_id) || 0;
          acc.set(row.organization_id, current + 1);
          return acc;
        },
        new Map<string, number>(),
      );
    }

    const data = orgRows.map((org: any) => ({
      ...org,
      member_count: memberCountMap.get(org.id) || 0,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to list organizations",
      },
      { status: 500 },
    );
  }
}
