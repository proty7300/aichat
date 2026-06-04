import { streamChat, generateImage, generateImageGoogle, generateImagePollinations, generateImageCloudflare, parseOpenAIStream } from '@/lib/llm'

// REMOVED: export const runtime = 'edge'
// Edge runtime has ~25s timeout which causes "Streaming request failed"
// Node.js runtime has much longer timeout (60s on Vercel hobby, 300s on Pro)

export const maxDuration = 60 // seconds - increase if on Vercel Pro

export async function POST(req) {
  try {
    const { messages, providerId, model, modeId, overrideKey } = await req.json()

    console.log('Chat request:', { providerId, model, modeId, hasOverrideKey: !!overrideKey })

    // ── Image generation mode ──
    if (modeId === 'image') {
      const lastMsg = messages[messages.length - 1]?.content || ''
      let result

      // Pollinations - tidak perlu API key
      if (providerId === 'pollinations') {
        result = await generateImagePollinations({ prompt: lastMsg, model })
        return Response.json({
          type: 'image',
          b64: result.b64,
          prompt: lastMsg,
          model,
        })
      } else if (providerId === 'cloudflare') {
        const apiToken = overrideKey || process.env.CLOUDFLARE_API_TOKEN
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
        if (!apiToken) throw new Error('Cloudflare API Token tidak ditemukan. Set CLOUDFLARE_API_TOKEN di Settings atau env vars.')
        if (!accountId) throw new Error('Cloudflare Account ID tidak ditemukan. Set CLOUDFLARE_ACCOUNT_ID di env vars.')
        result = await generateImageCloudflare({ prompt: lastMsg, model, apiToken, accountId })
        console.log('Cloudflare result b64 length:', result.b64?.length, 'first 50 chars:', result.b64?.slice(0, 50))
        return Response.json({
          type: 'image',
          b64: result.b64,
          prompt: lastMsg,
          model,
        })
      } else if (providerId === 'generalcompute') {
        const apiKey = overrideKey || process.env.GENERAL_COMPUTE_API_KEY
        const baseUrl = process.env.GENERAL_COMPUTE_BASE_URL || 'https://api.generalcompute.com'
        if (!apiKey) throw new Error('General Compute API key tidak ditemukan. Set di Settings.')
        result = await generateImage({ prompt: lastMsg, apiKey, model, baseUrl })
        return Response.json({
          type: 'image',
          url: result.url,
          revisedPrompt: result.revised_prompt,
          prompt: lastMsg,
          model,
        })
      } else if (providerId === 'google') {
        const apiKey = overrideKey || process.env.GOOGLE_API_KEY
        if (!apiKey) throw new Error('Google API key tidak ditemukan. Set di Settings.')
        result = await generateImageGoogle({ prompt: lastMsg, apiKey })
        return Response.json({ type: 'image', b64: result.b64, prompt: lastMsg })
      } else {
        const apiKey = overrideKey || process.env.OPENAI_API_KEY
        if (!apiKey) throw new Error('OpenAI API key tidak ditemukan')
        result = await generateImage({ prompt: lastMsg, apiKey, model })
        return Response.json({
          type: 'image',
          url: result.url,
          revisedPrompt: result.revised_prompt,
          prompt: lastMsg,
          model,
        })
      }
    }

    // ── Streaming chat ──
    let upstreamResponse
    try {
      upstreamResponse = await streamChat({ providerId, model, modeId, messages, overrideKey })
    } catch (err) {
      console.error('streamChat error:', err)
      // Return informative error to client
      return Response.json(
        { error: `Gagal menghubungi API: ${err.message}` },
        { status: 502 }
      )
    }

    console.log('streamChat status:', upstreamResponse.status)

    const contentType = upstreamResponse.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const data = await upstreamResponse.json()
      const text = data.choices?.[0]?.message?.content || data.content?.[0]?.text || ''
      if (!text) {
        return new Response(
          `data: ${JSON.stringify({ error: 'Response kosong dari API' })}\n\ndata: [DONE]\n\n`,
          { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } }
        )
      }
      return new Response(`data: ${JSON.stringify({ text })}\n\ndata: [DONE]\n\n`, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      })
    }

    // Streaming response
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstreamResponse.body.getReader()
        let buffer = ''
        // Timeout: jika tidak ada data selama 30 detik, batalkan
        let timeoutId
        const resetTimeout = () => {
          clearTimeout(timeoutId)
          timeoutId = setTimeout(() => {
            reader.cancel()
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'API timeout: tidak ada respons dalam 30 detik' })}\n\n`)
            )
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          }, 30000)
        }

        resetTimeout()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            resetTimeout()
            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk

            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            const text = parseOpenAIStream(lines.join('\n') + '\n')
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }

          if (buffer.trim()) {
            const text = parseOpenAIStream(buffer)
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
        } catch (e) {
          console.error('Stream read error:', e)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: `Stream error: ${e.message}` })}\n\n`)
          )
        } finally {
          clearTimeout(timeoutId)
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
    console.error('Handler error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
