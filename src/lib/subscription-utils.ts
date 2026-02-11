export type SubscriptionLike = {
  status: string
  startDate: Date
  endDate: Date
}

export function isActiveNow(sub: SubscriptionLike, now: Date = new Date()): boolean {
  return sub.status === 'active' && sub.startDate <= now && sub.endDate >= now
}
