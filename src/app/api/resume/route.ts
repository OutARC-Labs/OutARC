import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const resumes = await prisma.resume.findMany({
    where: { userId: session.user.id },
    orderBy: { uploadedAt: 'desc' },
  })

  return Response.json(resumes)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })
  if (file.type !== 'application/pdf') {
    return Response.json({ error: 'Only PDF files are supported' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Parse PDF text (non-fatal)
  let parsedText: string | null = null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
    const data = await pdfParse(buffer)
    parsedText = data.text ?? null
  } catch {
    // continue without parsed text
  }

  // Store as base64 data URL — replace with S3/Blob in production
  const base64 = buffer.toString('base64')
  const url = `data:application/pdf;base64,${base64}`

  const resume = await prisma.resume.create({
    data: {
      userId: session.user.id,
      filename: file.name,
      url,
      parsedText,
    },
  })

  return Response.json(resume, { status: 201 })
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const resume = await prisma.resume.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!resume) return Response.json({ error: 'Not found' }, { status: 404 })

  await prisma.resume.delete({ where: { id } })
  return Response.json({ success: true })
}
