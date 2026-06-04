import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export const runtime = 'edge'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

export async function POST(req) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const chatId = formData.get('chatId')
    
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const filename = `${chatId}/${Date.now()}-${file.name}`
    
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    })
    
    await r2Client.send(command)
    
    const imageUrl = `${process.env.R2_PUBLIC_URL}/${filename}`
    
    return Response.json({ url: imageUrl, filename })
  } catch (error) {
    console.error('R2 upload error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
