import { streamChat, generateImage, generateImageGoogle, parseOpenAIStream, parseAnthropicStream, parseGoogleStream } from '@/lib/llm'

export const runtime = 'edge'

export async function POST(req) {
  try {
    const { messages, providerId, model, modeId, overrideKey } = await req.json()
    
    // Debug logging
    console.log('Chat request:', { providerId, model, modeId, hasOverrideKey: !!overrideKey })

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
    console.log('Calling streamChat with providerId:', providerId, 'model:', model)
    const upstreamResponse = await streamChat({ providerId, model, modeId, messages, overrideKey })

    // Check if this is a non-streaming response (Freemodel)
    const contentType = upstreamResponse.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      // Non-streaming response - parse OpenAI-compatible format
      const data = await upstreamResponse.json()
      console.log('Non-streaming response:', data)
      const text = data.choices?.[0]?.message?.content || data.content?.[0]?.text || ''
      return new Response(`data: ${JSON.stringify({ text })}\n\ndata: [DONE]\n\n`, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstreamResponse.body.getReader()
        let buffer = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk

            // Process complete lines only
            const lines = buffer.split('\n')
            buffer = lines.pop() || '' // Keep incomplete line in buffer

            let text = ''
            if (providerId === 'anthropic') {
              text = parseAnthropicStream(lines.join('\n') + '\n')
            } else if (providerId === 'google') {
              text = parseGoogleStream(lines.join('\n') + '\n')
            } else {
              text = parseOpenAIStream(lines.join('\n') + '\n')
            }

            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          // Process any remaining buffer
          if (buffer.trim()) {
            let text = ''
            if (providerId === 'anthropic') {
              text = parseAnthropicStream(buffer)
            } else if (providerId === 'google') {
              text = parseGoogleStream(buffer)
            } else {
              text = parseOpenAIStream(buffer)
            }
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
        } catch (e) {
          console.error('Stream error:', e)
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
