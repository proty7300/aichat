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

// ── OpenAI & compatible (DeepSeek, Mistral pakai format yang sama) ──
async function callOpenAICompatible({ baseUrl, apiKey, model, systemPrompt, messages, stream }) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API error ${response.status}`)
  }
  return response
}

// ── Anthropic ──
async function callAnthropic({ apiKey, model, systemPrompt, messages, stream }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream,
      system: systemPrompt,
      messages,
    }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
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
export async function generateImage({ prompt, apiKey }) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
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

// ── Google Image Generation (Imagen) ──
export async function generateImageGoogle({ prompt, apiKey }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1 },
      }),
    }
  )
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Imagen API error ${response.status}`)
  }
  const data = await response.json()
  const b64 = data.predictions?.[0]?.bytesBase64Encoded
  return { url: null, b64 }
}

// ── Main streaming dispatcher ──
export async function streamChat({ providerId, model, modeId, messages, overrideKey }) {
  const apiKey = resolveKey(providerId, overrideKey)
  if (!apiKey) throw new Error(`API key untuk ${providerId} tidak ditemukan. Tambahkan di Settings atau Vercel env vars.`)

  const systemPrompt = MODES[modeId]?.systemPrompt || MODES.chat.systemPrompt
  const provider = PROVIDERS[providerId]
  const baseUrl = resolveBaseUrl(providerId)

  if (providerId === 'anthropic') {
    return callAnthropic({ apiKey, model, systemPrompt, messages, stream: true })
  }
  if (providerId === 'google') {
    return callGoogle({ apiKey, model, systemPrompt, messages, stream: true })
  }
  // openai-compatible: openai, deepseek, mistral, generalcompute, freemodel, cerebras
  return callOpenAICompatible({
    baseUrl,
    apiKey,
    model,
    systemPrompt,
    messages,
    stream: true,
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
  const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))
  let text = ''
  for (const line of lines) {
    try {
      const json = JSON.parse(line.slice(6))
      if (json.type === 'content_block_delta') {
        text += json.delta?.text || ''
      }
    } catch {}
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
