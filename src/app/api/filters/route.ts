import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const filtersSchema = z.object({
  keywords: z.array(z.string().max(100)).default([]),
  excludeCompanies: z.array(z.string().max(100)).default([]),
  roles: z.array(z.string().max(200)).default([]),
  maxPerDay: z.number().int().min(1).max(50).default(10),
})

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const filters = await prisma.jobFilter.findMany({
    where: { userId: session.user.id },
    orderBy: { id: 'desc' },
  })

  return Response.json(filters)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = filtersSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const filter = await prisma.jobFilter.create({
    data: { userId: session.user.id, ...parsed.data },
  })

  return Response.json(filter, { status: 201 })
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const filter = await prisma.jobFilter.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!filter) return Response.json({ error: 'Not found' }, { status: 404 })

  await prisma.jobFilter.delete({ where: { id } })
  return Response.json({ success: true })
}
