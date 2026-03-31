import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import FiltersForm from '@/components/dashboard/filters-form'

export default async function FiltersPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const filters = await prisma.jobFilter.findMany({
    where: { userId: session.user.id },
    orderBy: { id: 'desc' },
  })

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Filters</h1>
        <p className="text-muted-foreground mt-1">
          Control which internships OutARC applies to on your behalf.
        </p>
      </div>
      <FiltersForm filters={filters} />
    </div>
  )
}
