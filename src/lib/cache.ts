type Entry<T> = { value: T; expires: number }

const store: Map<string, Entry<unknown>> = new Map()

export function get<T>(key: string) {
  const e = store.get(key)
  if (!e) return null
  if (e.expires < Date.now()) {
    store.delete(key)
    return null
  }
  return e.value as T
}

export function set<T>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, expires: Date.now() + ttlMs })
}
