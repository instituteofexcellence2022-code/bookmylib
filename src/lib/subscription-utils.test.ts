import { describe, it, expect } from 'vitest'
import { isActiveNow } from './subscription-utils'

describe('isActiveNow', () => {
  it('returns true for active within range', () => {
    const now = new Date('2025-01-10T12:00:00Z')
    const sub = { status: 'active', startDate: new Date('2025-01-01T00:00:00Z'), endDate: new Date('2025-01-31T23:59:59Z') }
    expect(isActiveNow(sub, now)).toBe(true)
  })

  it('returns false if status is pending', () => {
    const now = new Date('2025-01-10T12:00:00Z')
    const sub = { status: 'pending', startDate: new Date('2025-01-01T00:00:00Z'), endDate: new Date('2025-01-31T23:59:59Z') }
    expect(isActiveNow(sub, now)).toBe(false)
  })

  it('returns false if not started yet', () => {
    const now = new Date('2025-01-10T12:00:00Z')
    const sub = { status: 'active', startDate: new Date('2025-01-11T00:00:00Z'), endDate: new Date('2025-01-31T23:59:59Z') }
    expect(isActiveNow(sub, now)).toBe(false)
  })

  it('returns false if expired', () => {
    const now = new Date('2025-02-01T12:00:00Z')
    const sub = { status: 'active', startDate: new Date('2025-01-01T00:00:00Z'), endDate: new Date('2025-01-31T23:59:59Z') }
    expect(isActiveNow(sub, now)).toBe(false)
  })
})
