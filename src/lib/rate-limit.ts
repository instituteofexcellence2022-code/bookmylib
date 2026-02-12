import { redis } from '@/lib/redis'
const store = new Map<string, { count: number; expires: number }>()

export function allow(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const existing = store.get(key)
  if (!existing || existing.expires <= now) {
    store.set(key, { count: 1, expires: now + windowMs })
    return true
  }
  if (existing.count < limit) {
    existing.count += 1
    return true
  }
  return false
}

export async function allowAsync(key: string, limit: number, windowMs: number) {
  if (!redis) {
    return allow(key, limit, windowMs)
  }
  const windowSec = Math.ceil(windowMs / 1000)
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, windowSec)
  }
  return count <= limit
}

export function loginLimiter(identifier: string, role: 'owner' | 'staff' | 'student' | 'admin') {
  const key = `login:${role}:${identifier}`
  const limit = 10
  const windowMs = 5 * 60 * 1000
  return allow(key, limit, windowMs)
}

export async function loginLimiterAsync(identifier: string, role: 'owner' | 'staff' | 'student' | 'admin') {
  const key = `login:${role}:${identifier}`
  const limit = 10
  const windowMs = 5 * 60 * 1000
  return allowAsync(key, limit, windowMs)
}
