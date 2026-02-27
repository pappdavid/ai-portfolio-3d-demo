import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import OpenAI from 'openai'
import { matchDocuments } from '@/lib/supabase'

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are an AI portfolio assistant for a junior AI/ML developer. You have access to information about their projects and can discuss their technical achievements.

When the user asks to visualize, show, or display project metrics, accuracies, or comparisons in 3D, you MUST include a JSON code block in your response using exactly this format:

\`\`\`json
{"type":"globe","data":[{"label":"Project Name","value":95,"color":"#6366f1"}],"title":"My AI Projects"}
\`\`\`

Types available:
- "globe" - for showing project accuracies/metrics as points on a globe
- "neural" - for showing project relationships as a neural network
- "helix" - for showing projects as a timeline helix

Only include the JSON block when visualization is explicitly requested. Keep your text response concise and informative. If no context is available, answer from general AI/ML knowledge.`

export async function POST(req: Request) {
  const { messages } = await req.json()

  const lastUserMessage = messages.findLast((m: { role: string }) => m.role === 'user')?.content || ''

  // Get embedding for the user's query
  let context = ''
  try {
    const embeddingRes = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: lastUserMessage,
    })
    const embedding = embeddingRes.data[0].embedding

    // RAG: find relevant documents
    const matches = await matchDocuments(embedding, 5)

    if (matches.length > 0) {
      context = '\n\nRelevant project information:\n' + matches.map((m) => m.content).join('\n\n')
    }
  } catch (err) {
    // Fallback: proceed without RAG context
    console.error('RAG retrieval error (proceeding without context):', err)
  }

  const systemWithContext = SYSTEM_PROMPT + context

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: systemWithContext,
    messages,
  })

  return result.toTextStreamResponse()
}
