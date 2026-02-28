import type { Connector } from '@/lib/supabase'
import type { ConnectorChunk } from './index'
import { chunkText } from './index'

interface CustomConfig {
  url?: string   // URL to fetch
  text?: string  // manually pasted text
}

/** Strip HTML tags and collapse whitespace */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export async function fetchCustomChunks(connector: Connector): Promise<ConnectorChunk[]> {
  const config = connector.config as unknown as CustomConfig
  let rawText = ''
  let sourceUrl: string | undefined

  if (connector.source_type === 'url' && config.url) {
    const res = await fetch(config.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Portfolio-Bot/1.0)' },
    })
    if (!res.ok) throw new Error(`Failed to fetch URL ${config.url}: ${res.status}`)
    const contentType = res.headers.get('content-type') ?? ''
    const body = await res.text()
    rawText = contentType.includes('html') ? stripHtml(body) : body
    sourceUrl = config.url
  } else if (connector.source_type === 'manual' && config.text) {
    rawText = config.text
  } else {
    throw new Error('Custom connector requires either a url or text in config')
  }

  if (rawText.trim().length < 20) {
    throw new Error('Retrieved content is too short to be useful')
  }

  const isMarkdown = rawText.includes('\n## ') || rawText.includes('\n### ')
  const parts = chunkText(rawText, isMarkdown)

  return parts.map((part, idx) => ({
    content: part,
    metadata: {
      source_type: connector.source_type,
      source_url: sourceUrl,
      connector_id: connector.id,
      connector_name: connector.name,
      chunk_index: idx,
    },
  }))
}
