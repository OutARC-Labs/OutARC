import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const profileSchema = z.object({
  major: z.string().max(100).optional(),
  gradYear: z.number().int().min(2020).max(2035).nullable().optional(),
  linkedin: z.string().url().or(z.literal('')).optional(),
  github: z.string().url().or(z.literal('')).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { major: true, gradYear: true, linkedin: true, github: true },
  })

  return Response.json(user)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: { major: true, gradYear: true, linkedin: true, github: true },
  })

  return Response.json(user)
}
