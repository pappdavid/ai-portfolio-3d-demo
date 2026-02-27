'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, AlertCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { SceneConfig } from './ThreeScene'

// Dynamic import to avoid SSR issues with Three.js
const ThreeScene = dynamic(() => import('./ThreeScene'), { ssr: false })

const SUGGESTED_PROMPTS = [
  'Show 3D accuracies globe',
  'Visualize projects as neural network',
  'Display projects on helix timeline',
  'What are my best performing models?',
  'Tell me about the NLP projects',
]

function parseSceneConfig(text: string): SceneConfig | null {
  try {
    const match = text.match(/```json\s*(\{[\s\S]*?\})\s*```/)
    if (!match) return null
    const json = JSON.parse(match[1])
    if (!json.type || !['globe', 'neural', 'helix'].includes(json.type)) return null
    if (!Array.isArray(json.data) || json.data.length === 0) return null
    return json as SceneConfig
  } catch {
    return null
  }
}

function stripJsonBlock(text: string): string {
  return text.replace(/```json\s*\{[\s\S]*?\}\s*```/g, '').trim()
}

export default function ChatUI() {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, append, status } = useChat({
    api: '/api/rag-chat',
    onError: (e) => setError(e.message || 'Something went wrong'),
    onFinish: () => setError(null),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return
    setInputValue('')
    setError(null)
    await append({ role: 'user', content: text })
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputValue)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Error toast */}
      {error && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">AI Portfolio Assistant</h2>
              <p className="text-slate-400 text-sm max-w-md">
                Ask about projects, request 3D visualizations of metrics, or explore the AI portfolio.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="px-3 py-1.5 text-xs rounded-full border border-slate-600 bg-slate-800/50 text-slate-300 hover:border-indigo-500 hover:text-indigo-300 hover:bg-indigo-950/30 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const content = typeof msg.content === 'string' ? msg.content : ''
          const sceneConfig = msg.role === 'assistant' ? parseSceneConfig(content) : null
          const displayText = msg.role === 'assistant' ? stripJsonBlock(content) : content

          return (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'w-auto' : 'w-full'}`}>
                {msg.role === 'user' ? (
                  <div className="rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-sm text-white">
                    {content}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayText && (
                      <div className="rounded-2xl rounded-tl-sm bg-slate-800/80 border border-slate-700/50 px-4 py-3 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {displayText}
                      </div>
                    )}
                    {sceneConfig && <ThreeScene config={sceneConfig} />}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-slate-800/80 border border-slate-700/50 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700/50 bg-slate-900/50 px-4 py-3">
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about projects or request a 3D visualization..."
            className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}
