import { SignJWT, jwtVerify } from 'jose'

function getEncodedKey() {
  const secretKey = process.env.SESSION_SECRET
  if (!secretKey && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is not set in environment variables.')
  }
  const finalKey = secretKey || 'default-secret-key-change-me-in-prod-please'
  return new TextEncoder().encode(finalKey)
}

export async function createSessionToken(payload: Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getEncodedKey())
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getEncodedKey(), {
      algorithms: ['HS256'],
    })
    return payload
  } catch {
    return null
  }
}
