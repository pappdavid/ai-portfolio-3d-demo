import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('connectors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json(data)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, source_type, config } = body

  if (!name || !source_type || !config) {
    return Response.json({ error: 'name, source_type, and config are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('connectors')
    .insert({ name, source_type, config })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json(data, { status: 201 })
}
