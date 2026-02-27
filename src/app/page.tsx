import ChatWrapper from '@/components/ChatWrapper'

export default function Home() {
  return (
    <main className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              <span className="text-indigo-400">AI</span> Portfolio 3D Demo
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">RAG · Thesys C1 · Three.js · pgvector</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-slate-400">Live</span>
          </div>
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 overflow-hidden max-w-4xl mx-auto w-full">
        <ChatWrapper />
      </div>
    </main>
  )
}
