import Redis from 'ioredis'

const url = process.env.REDIS_URL

let client: Redis | null = null
if (url) {
  try {
    client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false
    })
  } catch {
    client = null
  }
}

export const redis = client
