import type { Connector } from '@/lib/supabase'
import type { ConnectorChunk } from './index'
import { chunkText } from './index'

interface GitHubConfig {
  repo: string     // "owner/repo"
  pat?: string     // personal access token (optional for public repos)
  paths?: string[] // optional path filter prefixes
}

interface GitHubContentItem {
  name: string
  path: string
  type: 'file' | 'dir'
  download_url: string | null
  url: string
  encoding?: string
  content?: string
  sha: string
}

const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs']
const MAX_FILES = 50

function headers(pat?: string): Record<string, string> {
  const h: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' }
  if (pat) h['Authorization'] = `Bearer ${pat}`
  return h
}

async function listContents(
  repo: string,
  path: string,
  pat?: string
): Promise<GitHubContentItem[]> {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`
  const res = await fetch(url, { headers: headers(pat) })
  if (!res.ok) {
    if (res.status === 404) return []
    throw new Error(`GitHub API error ${res.status} for ${path}`)
  }
  const data = await res.json()
  return Array.isArray(data) ? data : [data]
}

async function fetchFileContent(
  item: GitHubContentItem,
  pat?: string
): Promise<string | null> {
  // Use the file's API URL to get content with encoding info
  const res = await fetch(item.url, { headers: headers(pat) })
  if (!res.ok) return null
  const data: GitHubContentItem = await res.json()
  if (data.encoding === 'base64' && data.content) {
    return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8')
  }
  if (data.download_url) {
    const raw = await fetch(data.download_url, { headers: headers(pat) })
    if (raw.ok) return raw.text()
  }
  return null
}

async function collectFiles(
  repo: string,
  path: string,
  pat?: string,
  collected: GitHubContentItem[] = []
): Promise<GitHubContentItem[]> {
  if (collected.length >= MAX_FILES) return collected
  const items = await listContents(repo, path, pat)
  for (const item of items) {
    if (collected.length >= MAX_FILES) break
    if (item.type === 'dir') {
      // Skip hidden dirs and node_modules/vendor
      if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'vendor') continue
      await collectFiles(repo, item.path, pat, collected)
    } else if (item.type === 'file') {
      const ext = '.' + item.name.split('.').pop()?.toLowerCase()
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        collected.push(item)
      }
    }
  }
  return collected
}

export async function fetchGitHubChunks(connector: Connector): Promise<ConnectorChunk[]> {
  const config = connector.config as unknown as GitHubConfig
  if (!config.repo) throw new Error('GitHub connector requires a repo (owner/repo)')

  const files = await collectFiles(config.repo, '', config.pat)
  const chunks: ConnectorChunk[] = []

  for (const file of files) {
    const content = await fetchFileContent(file, config.pat)
    if (!content || content.trim().length < 30) continue

    const isMarkdown = file.name.endsWith('.md') || file.name.endsWith('.txt')
    const parts = chunkText(content, isMarkdown)
    const sourceUrl = `https://github.com/${config.repo}/blob/main/${file.path}`

    parts.forEach((part, idx) => {
      chunks.push({
        content: `[${config.repo}] ${file.path}\n\n${part}`,
        metadata: {
          source_type: 'github',
          source_url: sourceUrl,
          connector_id: connector.id,
          connector_name: connector.name,
          chunk_index: idx,
          repo: config.repo,
          file_path: file.path,
        },
      })
    })
  }

  return chunks
}
