import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import type { Session } from 'next-auth'

/**
 * Returns the current session or null.
 * Type is augmented via src/types/next-auth.d.ts so session.user.id is available.
 */
export async function auth(): Promise<Session | null> {
  return getServerSession(authOptions)
}
