import { beforeEach, expect, mock, test } from 'bun:test'
const data = new Map<string, string>()
mock.module('@/lib/storage-engine', () => ({
  storage: {
    getString: (key: string) => data.get(key),
    set: (key: string, value: string) => data.set(key, value),
    remove: (key: string) => data.delete(key),
    getAllKeys: () => [...data.keys()],
    clearAll: () => data.clear(),
  },
}))
const { useDailyLogStore } = await import('./daily-log-store')
const { useTrackingStore } = await import('./tracking-store')
const { useDraftStore } = await import('@/features/chat/draft-store')
const { getDailyLog } = await import('@/lib/storage')
const { formatDateKey } = await import('@/types/nutrition')
const food = {
  quantity: 1,
  snapshot: {
    name: 'Banana',
    serving: { amount: 1, unit: 'medium', gramWeight: 118 },
    nutrients: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  },
}
beforeEach(() => {
  data.clear()
  useDailyLogStore.getState().load()
  useTrackingStore.getState().reset()
  useDraftStore.setState({ entries: [], processed: [] })
})
test('log, edit, reload, and delete keep persisted totals correct', () => {
  const store = useDailyLogStore.getState()
  const entry = store.addEntry(food)
  store.updateEntry(entry.id, { quantity: 0.5 })
  store.load()
  expect(useDailyLogStore.getState().log.totals.calories).toBe(53)
  expect(getDailyLog(formatDateKey())?.totals.protein).toBe(0.7)
  store.removeEntry(entry.id)
  expect(getDailyLog(formatDateKey())?.totals.calories).toBe(0)
})
test('backdated entries retain the selected day and relogged meals get fresh ids', () => {
  const store = useDailyLogStore.getState()
  store.load('2026-01-15')
  const first = store.addMeal([food], 'Breakfast')[0]
  expect(formatDateKey(new Date(first.consumedAt))).toBe('2026-01-15')
  const next = store.addMeal([food], 'Breakfast')[0]
  expect(first.id).not.toBe(next.id)
  expect(first.mealGroupId).not.toBe(next.mealGroupId)
  store.removeMeal(first.mealGroupId!)
  expect(useDailyLogStore.getState().log.entries).toHaveLength(1)
})
test('water cannot go negative, weights upsert by day, saved meals are reusable', () => {
  const store = useTrackingStore.getState()
  const date = '2026-09-28'
  store.changeWater(date, -250)
  expect(useTrackingStore.getState().days[date].water).toBe(0)
  store.changeWater(date, 250)
  expect(useTrackingStore.getState().days[date].water).toBe(250)
  store.logWeight(80, date)
  store.logWeight(79, date)
  expect(useTrackingStore.getState().weights).toEqual([{ date, kg: 79 }])
  store.saveMeal('Breakfast', [food])
  expect(useTrackingStore.getState().savedMeals[0].entries).toHaveLength(1)
})
test('claiming a draft twice only yields food on the first tap', () => {
  useDraftStore
    .getState()
    .update(() => [{ toolCallId: 'test', entry: { ...food.snapshot, quantity: 1 } }])
  expect(useDraftStore.getState().take()).toHaveLength(1)
  expect(useDraftStore.getState().take()).toEqual([])
  expect(JSON.parse(data.get('chat:draft-state')!).entries).toEqual([])
})
test('chat tracking confirmation is atomic, idempotent, and respects dismissal', () => {
  const store = useTrackingStore.getState()
  const date = formatDateKey()
  expect(store.resolveChatAction('water', { kind: 'water', value: 500, date }, true)).toBe(true)
  expect(store.resolveChatAction('water', { kind: 'water', value: 500, date }, true)).toBe(
    false,
  )
  expect(useTrackingStore.getState().days[date].water).toBe(500)
  expect(JSON.parse(data.get('tracking:v1')!).chatActions.water).toBe('saved')
  expect(store.resolveChatAction('skip', { kind: 'weight', value: 80, date }, false)).toBe(true)
  expect(useTrackingStore.getState().weights).toEqual([])
  expect(
    store.resolveChatAction('future', { kind: 'steps', value: 100, date: '2999-01-01' }, true),
  ).toBe(false)
  expect(store.resolveChatAction('invalid', { kind: 'exercise', value: 100, date }, true)).toBe(
    false,
  )
})
