import { streamChat, generateImage, generateImageGoogle, parseOpenAIStream, parseAnthropicStream, parseGoogleStream } from '@/lib/llm'

export const runtime = 'edge'

export async function POST(req) {
  try {
    const { messages, providerId, model, modeId, overrideKey } = await req.json()

    // ── Image generation mode ──
    if (modeId === 'image') {
      const lastMsg = messages[messages.length - 1]?.content || ''
      let result

      if (providerId === 'google') {
        const apiKey = overrideKey || process.env.GOOGLE_API_KEY
        if (!apiKey) throw new Error('Google API key tidak ditemukan')
        result = await generateImageGoogle({ prompt: lastMsg, apiKey })
        return Response.json({
          type: 'image',
          b64: result.b64,
          prompt: lastMsg,
        })
      } else {
        const apiKey = overrideKey || process.env.OPENAI_API_KEY
        if (!apiKey) throw new Error('OpenAI API key tidak ditemukan')
        result = await generateImage({ prompt: lastMsg, apiKey })
        return Response.json({
          type: 'image',
          url: result.url,
          revisedPrompt: result.revised_prompt,
          prompt: lastMsg,
        })
      }
    }

    // ── Streaming chat ──
    const upstreamResponse = await streamChat({ providerId, model, modeId, messages, overrideKey })

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstreamResponse.body.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })

            let text = ''
            if (providerId === 'anthropic') {
              text = parseAnthropicStream(chunk)
            } else if (providerId === 'google') {
              text = parseGoogleStream(chunk)
            } else {
              text = parseOpenAIStream(chunk)
            }

            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`))
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
