'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
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

function getMessageText(parts: UIMessage['parts']): string {
  return parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export default function ChatUI() {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error: chatError } = useChat({
    transport: new DefaultChatTransport({ api: '/api/rag-chat' }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return
    setInputValue('')
    await sendMessage({ text })
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    send(inputValue)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">AI Portfolio Assistant</h2>
              <p className="text-slate-400">Ask about projects or request 3D visualizations</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="px-3 py-1.5 rounded-full bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 text-sm hover:bg-indigo-800/50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const text = getMessageText(msg.parts)
          const isUser = msg.role === 'user'
          const sceneConfig = !isUser ? parseSceneConfig(text) : null
          const displayText = !isUser ? stripJsonBlock(text) : text

          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/80 border border-slate-700/50 text-slate-100'
                }`}
              >
                {displayText && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>
                )}
                {sceneConfig && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-slate-700/50 h-80">
                    <ThreeScene config={sceneConfig} />
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            </div>
          </div>
        )}

        {chatError && (
          <div className="flex items-center gap-2 text-red-400 text-sm px-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{chatError.message || 'Something went wrong'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleFormSubmit}
        className="p-4 border-t border-slate-800/50 flex gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about my AI projects or request a 3D visualization..."
          disabled={isLoading}
          className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
