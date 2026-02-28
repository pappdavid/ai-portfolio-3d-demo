import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface DocumentMatch {
  id: number
  content: string
  metadata: Record<string, unknown>
  similarity: number
}

export async function matchDocuments(
  queryEmbedding: number[],
  matchCount = 5
): Promise<DocumentMatch[]> {
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    match_threshold: 0.0,
  })

  if (error) {
    console.error('Supabase matchDocuments error:', error)
    return []
  }

  return (data as DocumentMatch[]) || []
}

// ── Connectors ────────────────────────────────────────────────────────────────

export interface Connector {
  id: number
  name: string
  source_type: 'github' | 'jira' | 'url' | 'manual'
  config: Record<string, string>
  is_active: boolean
  sync_status: 'idle' | 'syncing' | 'error' | 'success'
  sync_error: string | null
  documents_count: number
  last_synced_at: string | null
  created_at: string
}
