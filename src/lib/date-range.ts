import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, differenceInCalendarDays } from 'date-fns'

export function computeRange(
  timeRange?: 'Today' | 'Yesterday' | 'This Week' | 'Last Week' | 'This Month' | 'Last Month' | 'Custom Range',
  customStart?: Date | string,
  customEnd?: Date | string,
  weekStartsOn: number = 1
) {
  const now = new Date()
  let rangeStart = startOfDay(now)
  let rangeEnd = endOfDay(now)
  let prevRangeStart = startOfDay(subDays(now, 1))
  let prevRangeEnd = endOfDay(subDays(now, 1))

  const effectiveRange = timeRange || 'Today'
  if (effectiveRange === 'Custom Range' && customStart && customEnd) {
    const cs = typeof customStart === 'string' ? new Date(customStart) : customStart
    const ce = typeof customEnd === 'string' ? new Date(customEnd) : customEnd
    rangeStart = startOfDay(cs as Date)
    rangeEnd = endOfDay(ce as Date)
    const days = differenceInCalendarDays(rangeEnd, rangeStart) + 1
    prevRangeStart = startOfDay(subDays(rangeStart, days))
    prevRangeEnd = endOfDay(subDays(rangeStart, 1))
  } else if (effectiveRange === 'Yesterday') {
    rangeStart = startOfDay(subDays(now, 1))
    rangeEnd = endOfDay(subDays(now, 1))
    prevRangeStart = startOfDay(subDays(now, 2))
    prevRangeEnd = endOfDay(subDays(now, 2))
  } else if (effectiveRange === 'This Week') {
    rangeStart = startOfWeek(now, { weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 })
    rangeEnd = endOfWeek(now, { weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 })
    prevRangeStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 })
    prevRangeEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 })
  } else if (effectiveRange === 'Last Week') {
    const lw = subWeeks(now, 1)
    rangeStart = startOfWeek(lw, { weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 })
    rangeEnd = endOfWeek(lw, { weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 })
    const pw = subWeeks(now, 2)
    prevRangeStart = startOfWeek(pw, { weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 })
    prevRangeEnd = endOfWeek(pw, { weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 })
  } else if (effectiveRange === 'This Month') {
    rangeStart = startOfMonth(now)
    rangeEnd = endOfMonth(now)
    prevRangeStart = startOfMonth(subMonths(now, 1))
    prevRangeEnd = endOfMonth(subMonths(now, 1))
  } else if (effectiveRange === 'Last Month') {
    rangeStart = startOfMonth(subMonths(now, 1))
    rangeEnd = endOfMonth(subMonths(now, 1))
    prevRangeStart = startOfMonth(subMonths(now, 2))
    prevRangeEnd = endOfMonth(subMonths(now, 2))
  }

  return { rangeStart, rangeEnd, prevRangeStart, prevRangeEnd }
}
