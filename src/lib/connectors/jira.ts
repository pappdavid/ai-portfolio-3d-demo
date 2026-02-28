import type { Connector } from '@/lib/supabase'
import type { ConnectorChunk } from './index'

interface JiraConfig {
  base_url: string    // e.g. https://your-domain.atlassian.net
  email: string       // Atlassian account email
  api_token: string   // Atlassian API token
  project_key: string // e.g. PROJ
  jql?: string        // optional custom JQL filter
}

interface JiraIssue {
  id: string
  key: string
  fields: {
    summary: string
    description?: {
      content?: Array<{
        content?: Array<{ text?: string; type: string }>
        type: string
      }>
    } | string | null
    status?: { name: string }
    assignee?: { displayName: string } | null
    issuetype?: { name: string }
    priority?: { name: string }
  }
}

/** Extract plain text from Atlassian Document Format (ADF) or plain string */
function extractDescription(desc: JiraIssue['fields']['description']): string {
  if (!desc) return ''
  if (typeof desc === 'string') return desc

  // ADF format
  const lines: string[] = []
  for (const block of desc.content ?? []) {
    for (const inline of block.content ?? []) {
      if (inline.type === 'text' && inline.text) {
        lines.push(inline.text)
      }
    }
  }
  return lines.join(' ')
}

export async function fetchJiraChunks(connector: Connector): Promise<ConnectorChunk[]> {
  const config = connector.config as unknown as JiraConfig
  if (!config.base_url || !config.email || !config.api_token || !config.project_key) {
    throw new Error('Jira connector requires base_url, email, api_token, and project_key')
  }

  const auth = Buffer.from(`${config.email}:${config.api_token}`).toString('base64')
  const jql = config.jql ?? `project = ${config.project_key} ORDER BY updated DESC`
  const url = `${config.base_url}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,description,status,assignee,issuetype,priority&maxResults=50`

  const res = await fetch(url, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Jira API error ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  const issues: JiraIssue[] = data.issues ?? []
  const chunks: ConnectorChunk[] = []

  issues.forEach((issue, idx) => {
    const desc = extractDescription(issue.fields.description)
    const status = issue.fields.status?.name ?? 'Unknown'
    const assignee = issue.fields.assignee?.displayName ?? 'Unassigned'
    const type = issue.fields.issuetype?.name ?? ''
    const priority = issue.fields.priority?.name ?? ''

    const content = [
      `[${issue.key}] ${issue.fields.summary}`,
      desc ? `\n${desc}` : '',
      `\nType: ${type} | Status: ${status} | Priority: ${priority} | Assignee: ${assignee}`,
    ].join('')

    chunks.push({
      content,
      metadata: {
        source_type: 'jira',
        source_url: `${config.base_url}/browse/${issue.key}`,
        connector_id: connector.id,
        connector_name: connector.name,
        chunk_index: idx,
        issue_key: issue.key,
        project_key: config.project_key,
        status,
        assignee,
      },
    })
  })

  return chunks
}
