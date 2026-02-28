-- Connectors table: stores connection config + sync state for each data source
CREATE TABLE connectors (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  source_type     TEXT NOT NULL CHECK (source_type IN ('github','jira','url','manual')),
  config          JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  sync_status     TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle','syncing','error','success')),
  sync_error      TEXT,
  documents_count INTEGER DEFAULT 0,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add source tracking to documents (nullable so existing seeded rows are unaffected)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS connector_id BIGINT REFERENCES connectors(id) ON DELETE CASCADE;
