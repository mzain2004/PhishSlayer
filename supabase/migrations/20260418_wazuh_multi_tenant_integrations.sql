CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'enterprise')),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'analyst')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS wazuh_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  manager_ip TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE wazuh_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on tenants" ON tenants;
CREATE POLICY "Service role full access on tenants"
  ON tenants
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can view own tenants" ON tenants;
CREATE POLICY "Users can view own tenants"
  ON tenants
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM tenant_members tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own tenants" ON tenants;
CREATE POLICY "Users can insert own tenants"
  ON tenants
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update own tenants" ON tenants;
CREATE POLICY "Owners can update own tenants"
  ON tenants
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access on tenant_members" ON tenant_members;
CREATE POLICY "Service role full access on tenant_members"
  ON tenant_members
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Members can view tenant membership" ON tenant_members;
CREATE POLICY "Members can view tenant membership"
  ON tenant_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
        AND tm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM tenants t
      WHERE t.id = tenant_members.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners admins can manage membership" ON tenant_members;
CREATE POLICY "Owners admins can manage membership"
  ON tenant_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM tenants t
      WHERE t.id = tenant_members.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners admins can update membership" ON tenant_members;
CREATE POLICY "Owners admins can update membership"
  ON tenant_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM tenants t
      WHERE t.id = tenant_members.tenant_id
        AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM tenants t
      WHERE t.id = tenant_members.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners admins can delete membership" ON tenant_members;
CREATE POLICY "Owners admins can delete membership"
  ON tenant_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM tenants t
      WHERE t.id = tenant_members.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access on wazuh_integrations" ON wazuh_integrations;
CREATE POLICY "Service role full access on wazuh_integrations"
  ON wazuh_integrations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Members can view own integrations" ON wazuh_integrations;
CREATE POLICY "Members can view own integrations"
  ON wazuh_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_members tm
      WHERE tm.tenant_id = wazuh_integrations.tenant_id
        AND tm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM tenants t
      WHERE t.id = wazuh_integrations.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners admins can manage integrations" ON wazuh_integrations;
CREATE POLICY "Owners admins can manage integrations"
  ON wazuh_integrations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tenant_members tm
      WHERE tm.tenant_id = wazuh_integrations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM tenants t
      WHERE t.id = wazuh_integrations.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners admins can update integrations" ON wazuh_integrations;
CREATE POLICY "Owners admins can update integrations"
  ON wazuh_integrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_members tm
      WHERE tm.tenant_id = wazuh_integrations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM tenants t
      WHERE t.id = wazuh_integrations.tenant_id
        AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tenant_members tm
      WHERE tm.tenant_id = wazuh_integrations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM tenants t
      WHERE t.id = wazuh_integrations.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners admins can delete integrations" ON wazuh_integrations;
CREATE POLICY "Owners admins can delete integrations"
  ON wazuh_integrations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_members tm
      WHERE tm.tenant_id = wazuh_integrations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM tenants t
      WHERE t.id = wazuh_integrations.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wazuh_integrations_tenant_id ON wazuh_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wazuh_integrations_last_seen_at ON wazuh_integrations(last_seen_at DESC);
