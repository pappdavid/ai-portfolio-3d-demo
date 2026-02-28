import { supabase } from '@/lib/supabase'
import { syncConnector } from '@/lib/connectors/index'
import type { Connector } from '@/lib/supabase'

export const maxDuration = 60 // Vercel function timeout in seconds

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Fetch connector config
  const { data: connector, error: fetchError } = await supabase
    .from('connectors')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !connector) {
    return Response.json({ error: 'Connector not found' }, { status: 404 })
  }

  // Mark as syncing
  await supabase
    .from('connectors')
    .update({ sync_status: 'syncing', sync_error: null })
    .eq('id', id)

  try {
    const { count } = await syncConnector(connector as Connector)

    // Update success state
    await supabase
      .from('connectors')
      .update({
        sync_status: 'success',
        documents_count: count,
        last_synced_at: new Date().toISOString(),
        sync_error: null,
      })
      .eq('id', id)

    return Response.json({ success: true, count })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    await supabase
      .from('connectors')
      .update({ sync_status: 'error', sync_error: message })
      .eq('id', id)

    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
