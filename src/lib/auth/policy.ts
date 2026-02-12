const ownerAllowed = new Set([
  'dashboard:view',
  'subscriptions:view',
  'subscriptions:expired:view',
  'finance:view',
  'attendance:view',
  'bookings:view',
  'seats:view',
  'lockers:view',
  'backup:export',
  'students:view',
  'students:verify'
])

export function ownerPermit(action: string) {
  return ownerAllowed.has(action)
}

const staffAllowed = new Set([
  'finance:view',
  'finance:create_payment',
  'students:view',
  'attendance:view',
  'attendance:write',
  'verification:view',
  'verification:write'
])

export function staffPermit(action: string) {
  return staffAllowed.has(action)
}
