-- Phase 10: Agent service tables for L2/L3 pipeline
-- hunt_reports, pending_actions, ioc_store, document_chunks (pgvector RAG),
-- agent_reasoning embedding column, similarity search functions

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Hunt reports from L3 DeerFlow
CREATE TABLE IF NOT EXISTS hunt_reports (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    alert_id            uuid REFERENCES alerts(id),
    hunt_objective      text NOT NULL,
    executive_summary   text,
    ioc_table           jsonb,
    attack_chain        jsonb,
    mitre_techniques    jsonb,
    recommendations     jsonb,
    confidence          float4,
    sources             text[],
    created_at          timestamptz DEFAULT now()
);
ALTER TABLE hunt_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hunt_reports_org" ON hunt_reports FOR ALL
USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = (auth.jwt() ->> 'sub')
));
CREATE INDEX IF NOT EXISTS idx_hunt_reports_org ON hunt_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_hunt_reports_alert ON hunt_reports(alert_id);

-- Pending L2 actions awaiting human approval
CREATE TABLE IF NOT EXISTS pending_actions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    alert_id            uuid NOT NULL REFERENCES alerts(id),
    action_name         text NOT NULL,
    action_params       jsonb NOT NULL,
    consequence_model   jsonb NOT NULL,
    approvals           text[] DEFAULT '{}',
    required_approvals  int DEFAULT 1,
    status              text DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected','executed')),
    approved_at         timestamptz,
    rejected_at         timestamptz,
    rejected_reason     text,
    executed_at         timestamptz,
    created_at          timestamptz DEFAULT now()
);
ALTER TABLE pending_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pending_actions_org" ON pending_actions FOR ALL
USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = (auth.jwt() ->> 'sub')
));
CREATE INDEX IF NOT EXISTS idx_pending_actions_org_status ON pending_actions(organization_id, status);

-- IOC store
CREATE TABLE IF NOT EXISTS ioc_store (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id),
    ioc_type        text CHECK (ioc_type IN ('ip','domain','hash','url','email','cve')),
    value           text NOT NULL,
    threat_score    float4,
    source          text,
    first_seen      timestamptz DEFAULT now(),
    last_seen       timestamptz DEFAULT now(),
    related_alerts  uuid[],
    metadata        jsonb
);
ALTER TABLE ioc_store ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ioc_store_org" ON ioc_store FOR ALL
USING (organization_id IS NULL OR organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = (auth.jwt() ->> 'sub')
));
CREATE INDEX IF NOT EXISTS idx_ioc_store_org_type ON ioc_store(organization_id, ioc_type);
CREATE INDEX IF NOT EXISTS idx_ioc_store_value ON ioc_store(value);

-- Agent evolution proposals (OpenSpace + HALO + EvoMap)
CREATE TABLE IF NOT EXISTS agent_evolution (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id),
    source          text CHECK (source IN ('openspace','halo','evomap')),
    proposal_type   text NOT NULL,
    proposal_data   jsonb NOT NULL,
    applied         boolean DEFAULT false,
    applied_at      timestamptz,
    applied_by      text,
    created_at      timestamptz DEFAULT now()
);
ALTER TABLE agent_evolution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_evolution_org" ON agent_evolution FOR ALL
USING (organization_id IS NULL OR organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = (auth.jwt() ->> 'sub')
));
CREATE INDEX IF NOT EXISTS idx_agent_evolution_org ON agent_evolution(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_evolution_applied ON agent_evolution(applied);

-- Decepticon red team findings (service_role access only — no public RLS policy)
CREATE TABLE IF NOT EXISTS decepticon_findings (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id),
    suite           text,
    scenario_name   text NOT NULL,
    severity        text,
    description     text,
    exploited       boolean DEFAULT false,
    recommendation  text,
    environment     text DEFAULT 'test',
    created_at      timestamptz DEFAULT now()
);
ALTER TABLE decepticon_findings ENABLE ROW LEVEL SECURITY;
-- Only service_role can access — no user-level RLS policy
CREATE INDEX IF NOT EXISTS idx_decepticon_findings_org ON decepticon_findings(organization_id);

-- EvoMap episode tracking (fallback mode)
CREATE TABLE IF NOT EXISTS evomap_episodes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id),
    alert_id        uuid,
    technique_id    text NOT NULL,
    confidence      float4,
    created_at      timestamptz DEFAULT now()
);
ALTER TABLE evomap_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evomap_episodes_org" ON evomap_episodes FOR ALL
USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = (auth.jwt() ->> 'sub')
));
CREATE INDEX IF NOT EXISTS idx_evomap_episodes_org_tech ON evomap_episodes(organization_id, technique_id);

-- Document chunks for Page Index RAG
CREATE TABLE IF NOT EXISTS document_chunks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id),
    document_id     uuid,
    page_number     int,
    chunk_index     int,
    content         text NOT NULL,
    embedding       vector(1536),
    metadata        jsonb
);
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chunks_org" ON document_chunks FOR ALL
USING (organization_id IS NULL OR organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = (auth.jwt() ->> 'sub')
));
CREATE INDEX IF NOT EXISTS idx_document_chunks_ivfflat
ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Similarity search for Page Index RAG
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(1536),
    match_count int DEFAULT 5,
    org_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (id uuid, content text, similarity float, metadata jsonb)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT dc.id, dc.content,
           1 - (dc.embedding <=> query_embedding) AS similarity,
           dc.metadata
    FROM document_chunks dc
    WHERE (org_id_filter IS NULL OR dc.organization_id = org_id_filter)
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Add embedding column to agent_reasoning for similar incident retrieval
ALTER TABLE agent_reasoning ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS idx_agent_reasoning_embedding
ON agent_reasoning USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Similar incident retrieval function
CREATE OR REPLACE FUNCTION match_similar_alerts(
    query_embedding vector(1536),
    match_count int DEFAULT 5,
    org_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid, alert_id uuid, similarity float,
    attack_type text, decision text, confidence float4
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT ar.id, ar.alert_id,
           1 - (ar.embedding <=> query_embedding) AS similarity,
           a.attack_type, ar.decision, ar.confidence_score
    FROM agent_reasoning ar
    JOIN alerts a ON a.id = ar.alert_id
    WHERE (org_id_filter IS NULL OR a.organization_id = org_id_filter)
      AND ar.embedding IS NOT NULL
    ORDER BY ar.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
