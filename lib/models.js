export const PROVIDERS = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', modes: ['chat', 'coding', 'reasoning'] },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', modes: ['chat', 'coding'] },
      { id: 'o1-mini', name: 'o1 Mini', modes: ['reasoning'] },
      { id: 'o1-preview', name: 'o1 Preview', modes: ['reasoning'] },
    ],
    imageModel: 'dall-e-3',
    supportsImages: true,
    supportsImageGen: true,
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', modes: ['chat', 'coding', 'reasoning'] },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', modes: ['chat', 'coding', 'reasoning'] },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', modes: ['chat', 'coding'] },
    ],
    supportsImages: true,
    supportsImageGen: false,
  },
  google: {
    id: 'google',
    name: 'Google',
    envKey: 'GOOGLE_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', modes: ['chat', 'coding', 'reasoning'] },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', modes: ['chat', 'coding'] },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', modes: ['chat', 'coding'] },
    ],
    supportsImages: true,
    supportsImageGen: true,
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', modes: ['chat', 'coding'] },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', modes: ['reasoning', 'coding'] },
    ],
    supportsImages: false,
    supportsImageGen: false,
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral',
    envKey: 'MISTRAL_API_KEY',
    baseUrl: 'https://api.mistral.ai/v1',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', modes: ['chat', 'coding'] },
      { id: 'codestral-latest', name: 'Codestral', modes: ['coding'] },
    ],
    supportsImages: false,
    supportsImageGen: false,
  },
  generalcompute: {
    id: 'generalcompute',
    name: 'General Compute',
    envKey: 'GENERAL_COMPUTE_API_KEY',
    baseUrlEnv: 'GENERAL_COMPUTE_BASE_URL',
    baseUrl: 'https://api.generalcompute.com',
    models: [
      { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', modes: ['chat', 'coding', 'reasoning'] },
      { id: 'deepseek-v3.1', name: 'DeepSeek V3.1', modes: ['chat', 'coding', 'reasoning'] },
      { id: 'minimax-m2.7', name: 'MiniMax M2.7', modes: ['chat', 'coding'] },
    ],
    supportsImages: false,
    supportsImageGen: false,
  },
  freemodelclaude: {
    id: 'freemodelclaude',
    name: 'Freemodel (Claude)',
    envKey: 'FREEMODEL_CLAUDE_API_KEY',
    baseUrlEnv: 'FREEMODEL_CLAUDE_BASE_URL',
    baseUrl: 'https://cc.freemodel.dev',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', modes: ['chat', 'coding', 'reasoning'] },
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', modes: ['chat', 'coding', 'reasoning'] },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', modes: ['chat', 'coding'] },
    ],
    supportsImages: false,
    supportsImageGen: false,
  },
  freemodelopenai: {
    id: 'freemodelopenai',
    name: 'Freemodel (OpenAI)',
    envKey: 'FREEMODEL_OPENAI_API_KEY',
    baseUrlEnv: 'FREEMODEL_OPENAI_BASE_URL',
    baseUrl: 'https://api.freemodel.dev/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', modes: ['chat', 'coding', 'reasoning'] },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', modes: ['chat', 'coding'] },
      { id: 'o1-mini', name: 'o1 Mini', modes: ['reasoning'] },
      { id: 'o1-preview', name: 'o1 Preview', modes: ['reasoning'] },
    ],
    supportsImages: false,
    supportsImageGen: false,
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
