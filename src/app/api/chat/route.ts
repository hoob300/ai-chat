import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not set' }, { status: 500 })
  }

  const google = createGoogleGenerativeAI({ apiKey })

  try {
    const result = streamText({
      model: google('gemini-1.5-flash'),
      messages,
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const text of result.textStream) {
            controller.enqueue(encoder.encode(text))
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          controller.enqueue(encoder.encode(`오류: ${msg}`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
