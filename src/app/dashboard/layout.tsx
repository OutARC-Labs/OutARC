import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import DashboardSidebar from '@/components/dashboard/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <DashboardSidebar user={session.user} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
