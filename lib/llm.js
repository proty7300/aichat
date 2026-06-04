import { PROVIDERS, MODES } from './models'

// Resolve API key: cek override dulu, fallback ke env var
function resolveKey(providerId, overrideKey) {
  if (overrideKey && overrideKey.trim()) return overrideKey.trim()
  const envKey = PROVIDERS[providerId]?.envKey
  return envKey ? process.env[envKey] : null
}

// Resolve base URL: cek baseUrlEnv dulu, fallback ke baseUrl static, hapus trailing slash
function resolveBaseUrl(providerId) {
  const provider = PROVIDERS[providerId]
  if (!provider) return null
  const baseUrlEnv = provider.baseUrlEnv
  let baseUrl = (baseUrlEnv && process.env[baseUrlEnv]) ? process.env[baseUrlEnv] : provider.baseUrl
  // Remove trailing slash to avoid double slashes
  return baseUrl?.replace(/\/$/, '')
}

// ── OpenAI & compatible (DeepSeek, Mistral, Freemodel pakai format yang sama) ──
async function callOpenAICompatible({ baseUrl, apiKey, model, systemPrompt, messages, stream, providerId }) {
  // Freemodel doesn't support streaming - force non-streaming
  const isFreemodel = providerId === 'freemodelclaude' || providerId === 'freemodelopenai'
  const actualStream = isFreemodel ? false : stream
  
  const url = `${baseUrl}/chat/completions`
  console.log('callOpenAICompatible:', { url, model, stream: actualStream, isFreemodel, providerId })
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: actualStream,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  })
  console.log('OpenAI compatible response status:', response.status, 'providerId:', providerId)
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    console.error('OpenAI compatible error:', err)
    throw new Error(err.error?.message || `API error ${response.status}`)
  }
  return response
}

// ── Anthropic ──
async function callAnthropic({ apiKey, model, systemPrompt, messages, stream, baseUrl, providerId }) {
  // Freemodel uses /v1/messages endpoint, Anthropic uses direct URL
  const endpoint = baseUrl ? `${baseUrl}/v1/messages` : 'https://api.anthropic.com/v1/messages'
  console.log('Calling Anthropic endpoint:', endpoint, 'model:', model, 'stream:', stream, 'providerId:', providerId)
  
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  }
  
  // Only add anthropic-version header for official Anthropic API
  if (providerId === 'anthropic') {
    headers['anthropic-version'] = '2023-06-01'
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream,
      system: systemPrompt,
      messages,
    }),
  })
  console.log('Anthropic response status:', response.status)
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    console.error('Anthropic error:', err)
    throw new Error(err.error?.message || `API error ${response.status}`)
  }
  return response
}

// ── Anthropic Non-Streaming (for providers that don't support streaming) ──
async function callAnthropicNonStreaming({ apiKey, model, systemPrompt, messages, baseUrl, providerId }) {
  const endpoint = baseUrl ? `${baseUrl}/v1/messages` : 'https://api.anthropic.com/v1/messages'
  console.log('Calling Anthropic (non-streaming) endpoint:', endpoint, 'model:', model, 'providerId:', providerId)
  
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  }
  
  // Only add anthropic-version header for official Anthropic API
  if (providerId === 'anthropic') {
    headers['anthropic-version'] = '2023-06-01'
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream: false,
      system: systemPrompt,
      messages,
    }),
  })
  console.log('Anthropic non-streaming response status:', response.status)
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    console.error('Anthropic non-streaming error:', err)
    throw new Error(err.error?.message || `API error ${response.status}`)
  }
  return response
}

// ── Google Gemini ──
async function callGoogle({ apiKey, model, systemPrompt, messages, stream }) {
  const geminiMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const endpoint = stream
    ? `streamGenerateContent?alt=sse&key=${apiKey}`
    : `generateContent?key=${apiKey}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: geminiMessages,
        generationConfig: { maxOutputTokens: 4096 },
      }),
    }
  )
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API error ${response.status}`)
  }
  return response
}

// ── Image Generation (OpenAI DALL-E) ──
export async function generateImage({ prompt, apiKey, model = 'dall-e-3', baseUrl }) {
  // Use provided baseUrl or default to OpenAI
  const apiUrl = baseUrl 
    ? `${baseUrl}/images/generations`
    : 'https://api.openai.com/v1/images/generations'
  
  // Map model names for General Compute
  const modelMapping = {
    'dall-e-3': 'dall-e-3',
    'stable-diffusion-xl': 'stable-diffusion-xl',
  }
  const actualModel = modelMapping[model] || 'dall-e-3'
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: actualModel,
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Image API error ${response.status}`)
  }
  const data = await response.json()
  return data.data[0]
}

// ── Google Image Generation (Gemini 2.0 Flash - FREE tier) ──
export async function generateImageGoogle({ prompt, apiKey }) {
  // Gemini 2.0 Flash image generation - tersedia di free tier
  // Imagen 3/4 hanya untuk paid plan
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    console.error('Google image gen error:', response.status, err)
    throw new Error(err.error?.message || `Image API error ${response.status}`)
  }

  const data = await response.json()
  const parts = data.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'))
  if (!imagePart) throw new Error('Tidak ada gambar dalam response. Coba prompt yang lebih spesifik.')

  return { url: null, b64: imagePart.inlineData.data }
}

// ── Main streaming dispatcher ──
export async function streamChat({ providerId, model, modeId, messages, overrideKey }) {
  const apiKey = resolveKey(providerId, overrideKey)
  if (!apiKey) throw new Error(`API key untuk "${providerId}" tidak ditemukan. Model: ${model}. Tambahkan di Settings atau Vercel env vars.`)
  const baseUrl = resolveBaseUrl(providerId)
  console.log('streamChat:', { providerId, model, baseUrl, hasKey: !!apiKey })

  const systemPrompt = MODES[modeId]?.systemPrompt || MODES.chat.systemPrompt
  const provider = PROVIDERS[providerId]

  // All providers (General Compute, Cerebras) use OpenAI-compatible format
  return callOpenAICompatible({
    baseUrl,
    apiKey,
    model,
    systemPrompt,
    messages,
    stream: true,
    providerId,
  })
}

// ── SSE stream parsers ──
export function parseOpenAIStream(chunk) {
  const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))
  let text = ''
  for (const line of lines) {
    const data = line.slice(6)
    if (data === '[DONE]') continue
    try {
      const json = JSON.parse(data)
      // Try multiple possible paths for content
      text += json.choices?.[0]?.delta?.content || 
              json.choices?.[0]?.message?.content || 
              json.content || 
              ''
    } catch (e) {
      console.error('Parse error:', e.message, 'data:', data)
    }
  }
  return text
}

export function parseAnthropicStream(chunk) {
  const lines = chunk.split('\n')
  let text = ''
  for (const line of lines) {
    if (!line.trim()) continue
    // Handle both 'data: ' prefix and raw JSON lines
    const dataStr = line.startsWith('data: ') ? line.slice(6) : line
    if (dataStr === '[DONE]') continue
    try {
      const json = JSON.parse(dataStr)
      console.log('Anthropic stream chunk:', json)
      if (json.type === 'content_block_delta') {
        text += json.delta?.text || ''
      } else if (json.type === 'content_block_start' && json.content_block?.text) {
        text += json.content_block.text
      }
    } catch (e) {
      console.log('Parse error for line:', line.slice(0, 100), e.message)
    }
  }
  return text
}

export function parseGoogleStream(chunk) {
  const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))
  let text = ''
  for (const line of lines) {
    try {
      const json = JSON.parse(line.slice(6))
      text += json.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } catch {}
  }
  return text
}
