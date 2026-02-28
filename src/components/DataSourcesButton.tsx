'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Database,
  Github,
  Link,
  FileText,
  RefreshCw,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import type { Connector } from '@/lib/supabase'

type SourceType = 'github' | 'jira' | 'url' | 'manual'
type View = 'list' | 'add'

const SOURCE_TYPES: { type: SourceType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'github', label: 'GitHub', icon: <Github className="w-4 h-4" />, description: 'Repo files & docs' },
  { type: 'jira', label: 'Jira', icon: <Database className="w-4 h-4" />, description: 'Issues & tickets' },
  { type: 'url', label: 'URL', icon: <Link className="w-4 h-4" />, description: 'Fetch any webpage' },
  { type: 'manual', label: 'Manual', icon: <FileText className="w-4 h-4" />, description: 'Paste text' },
]

function sourceIcon(type: string) {
  switch (type) {
    case 'github': return <Github className="w-4 h-4 text-slate-300" />
    case 'jira': return <Database className="w-4 h-4 text-blue-400" />
    case 'url': return <Link className="w-4 h-4 text-indigo-400" />
    case 'manual': return <FileText className="w-4 h-4 text-slate-400" />
    default: return <Database className="w-4 h-4 text-slate-400" />
  }
}

function StatusBadge({ status, error }: { status: Connector['sync_status']; error?: string | null }) {
  if (status === 'syncing') return <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
  if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
  if (status === 'error') return (
    <span title={error ?? 'Sync failed'}>
      <AlertCircle className="w-4 h-4 text-red-400" />
    </span>
  )
  return null
}

function InputField({
  label, placeholder, value, onChange, type = 'text', required = false,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-400">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
        required={required}
      />
    </div>
  )
}

function AddConnectorForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void
  onCancel: () => void
}) {
  const [selectedType, setSelectedType] = useState<SourceType>('github')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Per-type fields
  const [githubRepo, setGithubRepo] = useState('')
  const [githubPat, setGithubPat] = useState('')
  const [jiraBaseUrl, setJiraBaseUrl] = useState('')
  const [jiraEmail, setJiraEmail] = useState('')
  const [jiraToken, setJiraToken] = useState('')
  const [jiraProjectKey, setJiraProjectKey] = useState('')
  const [urlValue, setUrlValue] = useState('')
  const [manualText, setManualText] = useState('')

  function buildConfig(): Record<string, string> {
    switch (selectedType) {
      case 'github': return { repo: githubRepo, pat: githubPat }
      case 'jira': return {
        base_url: jiraBaseUrl,
        email: jiraEmail,
        api_token: jiraToken,
        project_key: jiraProjectKey,
      }
      case 'url': return { url: urlValue }
      case 'manual': return { text: manualText }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setError('')
    setSubmitting(true)

    try {
      // 1. Create connector
      const createRes = await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), source_type: selectedType, config: buildConfig() }),
      })
      if (!createRes.ok) {
        const body = await createRes.json()
        throw new Error(body.error ?? 'Failed to create connector')
      }
      const connector: Connector = await createRes.json()

      // 2. Trigger sync
      const syncRes = await fetch(`/api/connectors/${connector.id}/sync`, { method: 'POST' })
      if (!syncRes.ok) {
        const body = await syncRes.json()
        throw new Error(body.error ?? 'Sync failed')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Source type picker */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Source type</p>
        <div className="grid grid-cols-2 gap-2">
          {SOURCE_TYPES.map(({ type, label, icon, description }) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                selectedType === type
                  ? 'border-indigo-500/60 bg-indigo-600/20 text-white'
                  : 'border-slate-700/50 bg-slate-900/40 text-slate-300 hover:border-slate-600/60'
              }`}
            >
              {icon}
              <div>
                <div className="text-xs font-medium">{label}</div>
                <div className="text-[10px] text-slate-500">{description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <InputField label="Name" placeholder="My data source" value={name} onChange={setName} required />

      {/* Type-specific fields */}
      {selectedType === 'github' && (
        <>
          <InputField
            label="Repository"
            placeholder="owner/repo"
            value={githubRepo}
            onChange={setGithubRepo}
            required
          />
          <InputField
            label="Personal Access Token (optional, for private repos)"
            placeholder="ghp_..."
            value={githubPat}
            onChange={setGithubPat}
            type="password"
          />
        </>
      )}

      {selectedType === 'jira' && (
        <>
          <InputField
            label="Jira Base URL"
            placeholder="https://your-domain.atlassian.net"
            value={jiraBaseUrl}
            onChange={setJiraBaseUrl}
            required
          />
          <InputField
            label="Email"
            placeholder="your@email.com"
            value={jiraEmail}
            onChange={setJiraEmail}
            type="email"
            required
          />
          <InputField
            label="API Token"
            placeholder="Atlassian API token"
            value={jiraToken}
            onChange={setJiraToken}
            type="password"
            required
          />
          <InputField
            label="Project Key"
            placeholder="PROJ"
            value={jiraProjectKey}
            onChange={setJiraProjectKey}
            required
          />
        </>
      )}

      {selectedType === 'url' && (
        <InputField
          label="URL"
          placeholder="https://example.com/docs"
          value={urlValue}
          onChange={setUrlValue}
          required
        />
      )}

      {selectedType === 'manual' && (
        <div className="space-y-1">
          <label className="text-xs text-slate-400">
            Content<span className="text-red-400 ml-0.5">*</span>
          </label>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Paste your text content here..."
            rows={6}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 resize-none"
            required
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-700/50 text-slate-400 text-sm hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Syncing…
            </>
          ) : (
            'Connect & Sync'
          )}
        </button>
      </div>
    </form>
  )
}

function ConnectorCard({
  connector,
  onSync,
  onDelete,
  syncing,
}: {
  connector: Connector
  onSync: (id: number) => void
  onDelete: (id: number) => void
  syncing: boolean
}) {
  const isSyncing = syncing || connector.sync_status === 'syncing'

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3.5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {sourceIcon(connector.source_type)}
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{connector.name}</p>
            <p className="text-[11px] text-slate-500 capitalize">
              {connector.source_type}
              {connector.documents_count > 0 && ` · ${connector.documents_count} docs`}
            </p>
          </div>
        </div>
        <StatusBadge status={connector.sync_status} error={connector.sync_error} />
      </div>

      {connector.sync_status === 'error' && connector.sync_error && (
        <p className="text-[11px] text-red-400 bg-red-950/30 rounded px-2 py-1 truncate" title={connector.sync_error}>
          {connector.sync_error}
        </p>
      )}

      {connector.last_synced_at && (
        <p className="text-[10px] text-slate-600">
          Last synced {new Date(connector.last_synced_at).toLocaleString()}
        </p>
      )}

      <div className="flex gap-1.5 pt-0.5">
        <button
          onClick={() => onSync(connector.id)}
          disabled={isSyncing}
          title="Re-sync"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync
        </button>
        <button
          onClick={() => onDelete(connector.id)}
          disabled={isSyncing}
          title="Delete"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700/50 text-slate-400 hover:text-red-400 hover:border-red-800/50 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  )
}

export default function DataSourcesButton() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('list')
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(false)
  const [syncingIds, setSyncingIds] = useState<Set<number>>(new Set())

  useEffect(() => { setMounted(true) }, [])

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await fetch('/api/connectors')
      if (res.ok) setConnectors(await res.json())
    } catch {
      // Ignore
    }
  }, [])

  useEffect(() => {
    if (open) {
      setLoading(true)
      fetchConnectors().finally(() => setLoading(false))
    }
  }, [open, fetchConnectors])

  // Poll for syncing connectors
  useEffect(() => {
    const syncing = connectors.filter((c) => c.sync_status === 'syncing')
    if (syncing.length === 0) return

    const interval = setInterval(async () => {
      const updated = await Promise.all(
        syncing.map(async (c) => {
          const res = await fetch(`/api/connectors/${c.id}`)
          return res.ok ? (await res.json() as Connector) : c
        })
      )
      setConnectors((prev) =>
        prev.map((c) => updated.find((u) => u.id === c.id) ?? c)
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [connectors])

  async function handleSync(id: number) {
    setSyncingIds((s) => new Set(s).add(id))
    try {
      await fetch(`/api/connectors/${id}/sync`, { method: 'POST' })
      await fetchConnectors()
    } finally {
      setSyncingIds((s) => { const n = new Set(s); n.delete(id); return n })
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/connectors/${id}`, { method: 'DELETE' })
    setConnectors((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setView('list') }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/50 bg-slate-800/60 text-slate-300 hover:text-white hover:border-slate-600 text-sm transition-colors"
      >
        <Database className="w-3.5 h-3.5" />
        Data Sources
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 bg-black/40 z-[9998]"
              />

              {/* Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-96 bg-slate-900 border-l border-slate-800 z-[9999] flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <h2 className="text-base font-semibold text-white">Data Sources</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {view === 'list' ? (
                  <>
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                      </div>
                    ) : connectors.length === 0 ? (
                      <div className="text-center py-8 space-y-2">
                        <Database className="w-8 h-8 text-slate-700 mx-auto" />
                        <p className="text-sm text-slate-500">No data sources yet</p>
                        <p className="text-xs text-slate-600">Connect GitHub, Jira, or a URL to give the chat more context</p>
                      </div>
                    ) : (
                      connectors.map((c) => (
                        <ConnectorCard
                          key={c.id}
                          connector={c}
                          onSync={handleSync}
                          onDelete={handleDelete}
                          syncing={syncingIds.has(c.id)}
                        />
                      ))
                    )}
                  </>
                ) : (
                  <AddConnectorForm
                    onSuccess={() => {
                      setView('list')
                      fetchConnectors()
                    }}
                    onCancel={() => setView('list')}
                  />
                )}
              </div>

              {/* Footer — only show Add button in list view */}
              {view === 'list' && (
                <div className="p-5 border-t border-slate-800">
                  <button
                    onClick={() => setView('add')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Data Source
                  </button>
                </div>
              )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
