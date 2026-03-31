import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ProfileForm from '@/components/dashboard/profile-form'

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [user, resumes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { major: true, gradYear: true, linkedin: true, github: true, handshakeCredEnc: true },
    }),
    prisma.resume.findMany({
      where: { userId: session.user.id },
      orderBy: { uploadedAt: 'desc' },
    }),
  ])

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Your info and credentials used when applying.
        </p>
      </div>
      <ProfileForm
        user={{
          name: session.user.name,
          email: session.user.email,
          major: user?.major ?? '',
          gradYear: user?.gradYear ?? null,
          linkedin: user?.linkedin ?? '',
          github: user?.github ?? '',
          hasHandshakeCreds: !!user?.handshakeCredEnc,
        }}
        resumes={resumes}
      />
    </div>
  )
}
