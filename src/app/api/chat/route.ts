import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { NextRequest } from 'next/server'

export const maxDuration = 60

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { messages, model } = await req.json()

  const result = streamText({
    model: model === 'claude'
      ? anthropic('claude-sonnet-4-6')
      : openai('gpt-4o'),
    messages,
  })

  return result.toTextStreamResponse()
}
