import { formatDateKey, type DailyLog } from '@/types/nutrition'

export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return formatDateKey(value)
}

export function filterHistory<T extends { date: string }>(
  history: T[],
  today: string,
  period: 'today' | 'yesterday' | 'week' | 'two_weeks',
) {
  const end = period === 'yesterday' ? shiftDate(today, -1) : today
  const start =
    period === 'week'
      ? shiftDate(today, -6)
      : period === 'two_weeks'
        ? shiftDate(today, -13)
        : end
  return history
    .filter((day) => day.date >= start && day.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function loggingStreak(logs: DailyLog[], today: string) {
  const dates = new Set(logs.filter((log) => log.entries.length > 0).map((log) => log.date))
  let date = dates.has(today) ? today : shiftDate(today, -1)
  let count = 0
  while (dates.has(date)) {
    count++
    date = shiftDate(date, -1)
  }
  return count
}

export function calorieBudget(
  base: number,
  burned: number,
  addBurned: boolean,
  rollover: boolean,
  previousIntake: number | null,
) {
  const carry =
    rollover && previousIntake !== null ? Math.min(200, Math.max(0, base - previousIntake)) : 0
  return base + (addBurned ? Math.max(0, burned) : 0) + carry
}

export function parsePositiveNumber(value: string, max = 100000): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  const number = Number(normalized)
  return Number.isFinite(number) && number > 0 && number <= max ? number : null
}

/** Historical entries belong to their selected calendar day, not the day of editing. */
export function timestampForDate(date: string, now = new Date()) {
  return date === formatDateKey(now) ? now.getTime() : new Date(`${date}T12:00:00`).getTime()
}
