import { PROVIDERS } from '@/lib/models'

export async function GET() {
  const available = Object.entries(PROVIDERS).map(([id, p]) => ({
    id,
    name: p.name,
    hasKey: !!process.env[p.envKey],
    models: p.models,
    supportsImages: p.supportsImages,
    supportsImageGen: p.supportsImageGen,
  }))
  return Response.json(available)
}
