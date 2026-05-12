import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/permissions'
import { acceptInvitationIfPresent } from '@/lib/auth/invitations'

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

/**
 * POST /api/team/invitations/accept
 * Accepts the pending invitation referenced by the authenticated user's metadata.
 */
export async function POST() {
  try {
    const user = await requireAuth()
    const result = await acceptInvitationIfPresent(user.id)

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return jsonError('UNAUTHORIZED', 'Требуется аутентификация', 401)
    }

    console.error('[POST /api/team/invitations/accept]', err)
    return jsonError('INTERNAL_ERROR', 'Ошибка принятия приглашения', 500)
  }
}
