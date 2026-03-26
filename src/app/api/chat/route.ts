import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { NextRequest } from 'next/server'

export const maxDuration = 60

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
})

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  const result = streamText({
    model: google('gemini-1.5-flash'),
    messages,
  })

  return result.toTextStreamResponse()
}
