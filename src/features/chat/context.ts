import { getDailyLog, getUserGoals } from '@/lib/storage'
import { formatDateKey } from '@/types/nutrition'
import { shiftDate } from '@/utils/tracking'

export function buildAssistantContext(voiceMode = false) {
  const todayDateKey = formatDateKey()
  const foodHistory = Array.from({ length: 14 }, (_, index) =>
    getDailyLog(shiftDate(todayDateKey, -index)),
  )
    .filter((day) => day && day.entries.length > 0)
    .map((day) => ({
      date: day!.date,
      totals: day!.totals,
      entries: day!.entries.map((entry) => ({
        name: entry.snapshot.name,
        quantity: entry.quantity,
        meal: entry.meal,
        nutrients: entry.snapshot.nutrients,
      })),
    }))
  return { voiceMode, foodHistory, userGoals: getUserGoals(), todayDateKey }
}
