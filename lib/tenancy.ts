import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

export type TenantRole = "owner" | "admin" | "analyst";

type TenantRow = {
  id: string;
  name: string;
};

type OrganizationMemberRow = {
  organization_id: string;
  role: TenantRole;
  created_at: string;
};

export type TenantResolution = {
  tenantId: string;
  tenantName: string;
  role: TenantRole;
};

function buildDefaultOrganizationSlug(userEmail?: string): string {
  const emailPrefix =
    typeof userEmail === "string" && userEmail.includes("@")
      ? userEmail.split("@")[0]
      : "default";
  const normalizedPrefix = emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const safePrefix = normalizedPrefix.length > 0 ? normalizedPrefix : "default";

  return `${safePrefix}-${Date.now()}`;
}

export function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createSupabaseAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getAuthenticatedUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  return { id: userId };
}

async function getTenantById(tenantId: string): Promise<TenantRow | null> {
  const adminClient = getServiceRoleClient();
  const { data, error } = await adminClient
    .from("organizations")
    .select("id, name")
    .eq("id", tenantId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as TenantRow;
}

async function getMembership(
  userId: string,
  tenantId: string,
): Promise<OrganizationMemberRow | null> {
  const adminClient = getServiceRoleClient();
  const { data, error } = await adminClient
    .from("organization_members")
    .select("organization_id, role, created_at")
    .eq("user_id", userId)
    .eq("organization_id", tenantId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as OrganizationMemberRow;
}

async function getFirstMembership(
  userId: string,
): Promise<OrganizationMemberRow | null> {
  const adminClient = getServiceRoleClient();
  const { data, error } = await adminClient
    .from("organization_members")
    .select("organization_id, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as OrganizationMemberRow;
}

async function getOwnedTenant(
  userId: string,
): Promise<TenantResolution | null> {
  const adminClient = getServiceRoleClient();
  const { data, error } = await adminClient
    .from("organizations")
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    tenantId: data.id,
    tenantName: data.name,
    role: "owner",
  };
}

async function createDefaultTenantForUser(
  userId: string,
  tenantNameHint?: string,
  userEmail?: string,
): Promise<TenantResolution> {
  const adminClient = getServiceRoleClient();
  const existingOwnedTenant = await getOwnedTenant(userId);
  if (existingOwnedTenant) {
    return existingOwnedTenant;
  }
  const defaultName =
    tenantNameHint && tenantNameHint.trim().length > 0
      ? `${tenantNameHint.trim()} Tenant`
      : "Default Tenant";
  const slug = buildDefaultOrganizationSlug(userEmail);

  const { data: tenantInsert, error: tenantError } = await adminClient
    .from("organizations")
    .insert({
      name: defaultName,
      slug,
      plan: "trial",
      owner_id: userId,
    })
    .select("id, name")
    .single();

  if (tenantError || !tenantInsert) {
    throw new Error(
      `Failed to create default tenant: ${tenantError?.message || "insert failed"}`,
    );
  }

  await adminClient.from("organization_members").upsert(
    {
      organization_id: tenantInsert.id,
      user_id: userId,
      role: "owner",
    },
    { onConflict: "organization_id,user_id" },
  );

  return {
    tenantId: tenantInsert.id,
    tenantName: tenantInsert.name,
    role: "owner",
  };
}

export async function resolveTenantForUser(options: {
  userId: string;
  preferredTenantId?: string;
  tenantNameHint?: string;
  userEmail?: string;
  autoCreate?: boolean;
}): Promise<TenantResolution | null> {
  const {
    userId,
    preferredTenantId,
    tenantNameHint,
    userEmail,
    autoCreate = true,
  } = options;

  if (preferredTenantId) {
    const directMembership = await getMembership(userId, preferredTenantId);
    if (directMembership) {
      const tenant = await getTenantById(preferredTenantId);
      if (!tenant) {
        return null;
      }

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        role: directMembership.role,
      };
    }

    const ownedTenant = await getOwnedTenant(userId);
    if (ownedTenant && ownedTenant.tenantId === preferredTenantId) {
      return ownedTenant;
    }

    return null;
  }

  const firstMembership = await getFirstMembership(userId);
  if (firstMembership) {
    const tenant = await getTenantById(firstMembership.organization_id);
    if (tenant) {
      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        role: firstMembership.role,
      };
    }
  }

  const ownedTenant = await getOwnedTenant(userId);
  if (ownedTenant) {
    return ownedTenant;
  }

  if (!autoCreate) {
    return null;
  }

  return createDefaultTenantForUser(userId, tenantNameHint, userEmail);
}
