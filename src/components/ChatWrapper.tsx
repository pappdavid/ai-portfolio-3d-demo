'use client'

import dynamic from 'next/dynamic'

const ChatUI = dynamic(() => import('./ChatUI'), { ssr: false })

export default function ChatWrapper() {
  return <ChatUI />
}
