import { SignJWT, jwtVerify } from 'jose'

const secretKey = process.env.SESSION_SECRET || 'default-secret-key-change-me-in-prod-please'
const key = new TextEncoder().encode(secretKey)

export async function createSessionToken(payload: Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    })
    return payload
  } catch {
    return null
  }
}
