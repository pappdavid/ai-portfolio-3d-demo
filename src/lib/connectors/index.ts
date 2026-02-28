import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'
import type { Connector } from '@/lib/supabase'
import { fetchGitHubChunks } from './github'
import { fetchJiraChunks } from './jira'
import { fetchCustomChunks } from './custom'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ConnectorChunk {
  content: string
  metadata: {
    source_type: string
    source_url?: string
    connector_id: number
    connector_name: string
    chunk_index: number
    [key: string]: unknown
  }
}

/**
 * Split text into chunks.
 * Markdown: split on headings (## / ###) with 150-char overlap.
 * Plain/code: fixed 800-char windows with 100-char overlap.
 */
export function chunkText(text: string, isMarkdown = false): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  if (isMarkdown) {
    // Split on ## or ### headings
    const sections = trimmed.split(/\n(?=#{2,3} )/)
    const chunks: string[] = []
    for (const section of sections) {
      if (section.trim().length < 20) continue
      // If a section is >1500 chars, further split it
      if (section.length <= 1500) {
        chunks.push(section.trim())
      } else {
        chunks.push(...chunkText(section, false))
      }
    }
    return chunks.length > 0 ? chunks : [trimmed.slice(0, 1500)]
  }

  // Fixed-size chunking with overlap
  const SIZE = 800
  const OVERLAP = 100
  const chunks: string[] = []
  let i = 0
  while (i < trimmed.length) {
    chunks.push(trimmed.slice(i, i + SIZE))
    i += SIZE - OVERLAP
  }
  return chunks
}

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return res.data[0].embedding
}

/**
 * Main sync orchestrator:
 * 1. Call the right adapter to get raw chunks
 * 2. Delete existing documents for this connector
 * 3. Embed + insert each chunk
 */
export async function syncConnector(connector: Connector): Promise<{ count: number }> {
  // 1. Fetch chunks from the right adapter
  let rawChunks: ConnectorChunk[]
  switch (connector.source_type) {
    case 'github':
      rawChunks = await fetchGitHubChunks(connector)
      break
    case 'jira':
      rawChunks = await fetchJiraChunks(connector)
      break
    case 'url':
    case 'manual':
      rawChunks = await fetchCustomChunks(connector)
      break
    default:
      throw new Error(`Unknown source_type: ${connector.source_type}`)
  }

  if (rawChunks.length === 0) {
    throw new Error('No content retrieved from source')
  }

  // 2. Delete existing documents for this connector
  await supabase.from('documents').delete().eq('connector_id', connector.id)

  // 3. Embed + insert each chunk
  let count = 0
  for (const chunk of rawChunks) {
    const embedding = await embed(chunk.content)
    await supabase.from('documents').insert({
      content: chunk.content,
      metadata: chunk.metadata,
      embedding,
      connector_id: connector.id,
    })
    count++
  }

  return { count }
}
