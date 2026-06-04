export const PROVIDERS = {
  pollinations: {
    id: 'pollinations',
    name: 'Free Image Gen',
    envKey: null,
    baseUrl: null,
    models: [
      { id: 'flux', name: 'FLUX Schnell (Free)', modes: ['image'] },
      { id: 'turbo', name: 'SDXL Turbo (Free)', modes: ['image'] },
      { id: 'gpt-image-2', name: 'GPT Image 2 (Free)', modes: ['image'] },

    ],
    supportsImages: false,
    supportsImageGen: true,
    noKeyRequired: true,
  },
  google: {
    id: 'google',
    name: 'Google AI',
    envKey: 'GOOGLE_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com',
    models: [],
    supportsImages: false,
    supportsImageGen: false,
  },
  generalcompute: {
    id: 'generalcompute',
    name: 'General Compute',
    envKey: 'GENERAL_COMPUTE_API_KEY',
    baseUrlEnv: 'GENERAL_COMPUTE_BASE_URL',
    baseUrl: 'https://api.generalcompute.com/v1',
    models: [
      { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', modes: ['chat', 'coding', 'reasoning'] },
      { id: 'deepseek-v3.1', name: 'DeepSeek V3.1', modes: ['chat', 'coding', 'reasoning'] },
      { id: 'minimax-m2.7', name: 'MiniMax M2.7', modes: ['chat', 'coding'] },
      { id: 'dall-e-3', name: 'DALL-E 3', modes: ['image'] },
      { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL', modes: ['image'] },
    ],
    supportsImages: false,
    supportsImageGen: true,
  },
  cloudflare: {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    envKey: 'CLOUDFLARE_API_TOKEN',
    baseUrl: null,
    models: [
      { id: '@cf/black-forest-labs/flux-1-schnell', name: 'FLUX.1 Schnell (Free)', modes: ['image'] },
      { id: '@cf/bytedance/stable-diffusion-xl-lightning', name: 'SDXL Lightning (Free)', modes: ['image'] },
      { id: '@cf/stabilityai/stable-diffusion-xl-base-1.0', name: 'Stable Diffusion XL (Free)', modes: ['image'] },
      { id: '@cf/lykon/dreamshaper-8-lcm', name: 'Dreamshaper 8 (Free)', modes: ['image'] },
      { id: '@cf/llava-hf/llava-1.5-7b-hf', name: 'LLaVA 1.5 Vision (Free)', modes: ['chat', 'coding', 'reasoning'], vision: true },
    ],
    supportsImages: true,
    supportsImageGen: true,
  },
  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    envKey: 'CEREBRAS_API_KEY',
    baseUrlEnv: 'CEREBRAS_BASE_URL',
    baseUrl: 'https://api.cerebras.ai/v1',
    models: [
      { id: 'glm-4.7', name: 'Z.ai GLM 4.7', modes: ['chat', 'coding', 'reasoning'] },
      { id: 'gpt-oss', name: 'OpenAI GPT OSS', modes: ['chat', 'coding', 'reasoning'] },
    ],
    supportsImages: false,
    supportsImageGen: false,
  },
}

export const MODES = {
  chat: {
    id: 'chat',
    name: 'Chat',
    icon: '💬',
    description: 'Percakapan umum',
    systemPrompt: `You are a helpful, friendly AI assistant. Be concise and clear in your responses. Use markdown formatting when it helps clarity.`,
  },
  coding: {
    id: 'coding',
    name: 'Coding',
    icon: '💻',
    description: 'Bantu coding & debug',
    systemPrompt: `You are an expert coding assistant. Follow these rules strictly:
1. Always wrap code in markdown code blocks with the correct language tag (e.g. \`\`\`python, \`\`\`javascript)
2. After showing code, briefly explain what it does
3. Point out potential bugs, edge cases, or improvements
4. Suggest modern best practices and patterns
5. If fixing code, clearly explain what was changed and why
6. For complex problems, break down the solution step by step
7. Always consider performance and security implications`,
  },
  reasoning: {
    id: 'reasoning',
    name: 'Reasoning',
    icon: '🧠',
    description: 'Penalaran mendalam',
    systemPrompt: `You are a deep reasoning assistant. For every problem:
1. Break it down into smaller sub-problems
2. Think through each step carefully and explicitly
3. Consider multiple approaches and their trade-offs
4. Show your reasoning process transparently
5. Verify your conclusions by checking edge cases
6. Present a clear, well-structured final answer`,
  },
  image: {
    id: 'image',
    name: 'Image Gen',
    icon: '🎨',
    description: 'Generate gambar dari teks',
    systemPrompt: `You are an image generation assistant. Help the user craft effective image prompts and describe what images you're generating.`,
  },
}

export function getAllModels() {
  return Object.values(PROVIDERS).flatMap((p) =>
    p.models.map((m) => ({ ...m, provider: p.id, providerName: p.name }))
  )
}

export function getModelsByMode(modeId) {
  return getAllModels().filter((m) => m.modes.includes(modeId))
}
