import {
  addDays,
  format,
  parseISO,
  startOfWeek,
  subDays,
  isSameDay,
} from 'date-fns'

export function todayKey(d = new Date()): string {
  return format(d, 'yyyy-MM-dd')
}

export function formatDisplayDate(dateKey: string): string {
  const d = parseISO(dateKey)
  if (isSameDay(d, new Date())) return 'Today'
  if (isSameDay(d, subDays(new Date(), 1))) return 'Yesterday'
  return format(d, 'EEE, MMM d')
}

export function shiftDateKey(dateKey: string, delta: number): string {
  return format(addDays(parseISO(dateKey), delta), 'yyyy-MM-dd')
}

/** Last N days ending on `endKey`, oldest → newest. */
export function lastNDateKeys(endKey: string, n: number): string[] {
  const end = parseISO(endKey)
  return Array.from({ length: n }, (_, i) =>
    format(subDays(end, n - 1 - i), 'yyyy-MM-dd'),
  )
}

export function weekDateKeys(dateKey: string): string[] {
  const start = startOfWeek(parseISO(dateKey), { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'))
}