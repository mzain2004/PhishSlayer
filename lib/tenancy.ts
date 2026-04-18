import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export type TenantRole = "owner" | "admin" | "analyst";

type TenantRow = {
  id: string;
  name: string;
};

type TenantMemberRow = {
  tenant_id: string;
  role: TenantRole;
  created_at: string;
};

export type TenantResolution = {
  tenantId: string;
  tenantName: string;
  role: TenantRole;
};

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
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

async function getTenantById(tenantId: string): Promise<TenantRow | null> {
  const adminClient = getServiceRoleClient();
  const { data, error } = await adminClient
    .from("tenants")
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
): Promise<TenantMemberRow | null> {
  const adminClient = getServiceRoleClient();
  const { data, error } = await adminClient
    .from("tenant_members")
    .select("tenant_id, role, created_at")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as TenantMemberRow;
}

async function getFirstMembership(
  userId: string,
): Promise<TenantMemberRow | null> {
  const adminClient = getServiceRoleClient();
  const { data, error } = await adminClient
    .from("tenant_members")
    .select("tenant_id, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as TenantMemberRow;
}

async function getOwnedTenant(
  userId: string,
): Promise<TenantResolution | null> {
  const adminClient = getServiceRoleClient();
  const { data, error } = await adminClient
    .from("tenants")
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
): Promise<TenantResolution> {
  const adminClient = getServiceRoleClient();
  const defaultName =
    tenantNameHint && tenantNameHint.trim().length > 0
      ? `${tenantNameHint.trim()} Tenant`
      : "Default Tenant";

  const { data: tenantInsert, error: tenantError } = await adminClient
    .from("tenants")
    .insert({
      name: defaultName,
      plan: "starter",
      owner_id: userId,
    })
    .select("id, name")
    .single();

  if (tenantError || !tenantInsert) {
    throw new Error(
      `Failed to create default tenant: ${tenantError?.message || "insert failed"}`,
    );
  }

  await adminClient.from("tenant_members").upsert(
    {
      tenant_id: tenantInsert.id,
      user_id: userId,
      role: "owner",
    },
    { onConflict: "tenant_id,user_id" },
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
  autoCreate?: boolean;
}): Promise<TenantResolution | null> {
  const {
    userId,
    preferredTenantId,
    tenantNameHint,
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
    const tenant = await getTenantById(firstMembership.tenant_id);
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

  return createDefaultTenantForUser(userId, tenantNameHint);
}
