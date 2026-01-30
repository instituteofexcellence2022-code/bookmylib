export const COOKIE_KEYS = {
    OWNER: 'owner_session',
    STAFF: 'staff_session',
    STUDENT: 'student_session'
} as const

export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 // 7 days
}
