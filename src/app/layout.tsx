import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Portfolio 3D Demo',
  description:
    'Interactive AI portfolio with RAG chat, Thesys C1 generative UI, and Three.js 3D visualizations. Built with Next.js 15, Supabase pgvector, and Vercel AI SDK.',
  keywords: ['AI', 'portfolio', 'RAG', 'Three.js', 'Next.js', 'Supabase', 'machine learning'],
  openGraph: {
    title: 'AI Portfolio 3D Demo',
    description: 'Chat with AI to explore ML projects in stunning 3D',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-white antialiased`}>{children}</body>
    </html>
  )
}
