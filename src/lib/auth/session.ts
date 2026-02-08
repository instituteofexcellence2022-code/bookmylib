import { cookies } from 'next/headers'
import { createSessionToken } from './jwt'
import { COOKIE_KEYS } from './constants'

export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 // 7 days
}

export async function createSession(userId: string, role: 'owner' | 'staff' | 'student') {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const token = await createSessionToken({ userId, role })
    const cookieStore = await cookies()
    
    let cookieName: string = COOKIE_KEYS.STUDENT
    if (role === 'owner') cookieName = COOKIE_KEYS.OWNER
    if (role === 'staff') cookieName = COOKIE_KEYS.STAFF

    cookieStore.set(cookieName, token, {
        ...COOKIE_OPTIONS,
        expires: expiresAt
    })
}

export async function deleteSession(role: 'owner' | 'staff' | 'student') {
    const cookieStore = await cookies()
    let cookieName: string = COOKIE_KEYS.STUDENT
    if (role === 'owner') cookieName = COOKIE_KEYS.OWNER
    if (role === 'staff') cookieName = COOKIE_KEYS.STAFF
    
    cookieStore.delete(cookieName)
}

export { createSessionToken }
