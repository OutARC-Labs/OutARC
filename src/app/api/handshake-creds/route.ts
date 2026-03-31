import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encrypt'
import { z } from 'zod'

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = credsSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  let encrypted: string
  try {
    const payload = JSON.stringify({ email: parsed.data.email, password: parsed.data.password })
    encrypted = encrypt(payload)
  } catch (e) {
    console.error('Encryption failed:', e)
    return Response.json({ error: 'Encryption unavailable — check AES_ENCRYPTION_KEY' }, { status: 500 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { handshakeCredEnc: encrypted },
  })

  return Response.json({ success: true })
}
