import { useTrackingStore } from '@/stores/tracking-store'
import { formatDateKey } from '@/types/nutrition'
export const healthAvailable = true
/** User initiated, read-only import. No permission request or health query at startup. */
export async function importHealth() {
  const health = await import('@kingstinct/react-native-healthkit')
  if (!health.isHealthDataAvailable())
    throw new Error('Apple Health is unavailable on this device.')
  await health.requestAuthorization({
    toRead: [
      'HKQuantityTypeIdentifierStepCount',
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      'HKQuantityTypeIdentifierBodyMass',
    ],
  })
  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date()
  const filter = { date: { startDate, endDate } }
  const [steps, energy, weight] = await Promise.all([
    health.queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
      unit: 'count',
      filter,
    }),
    health.queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      ['cumulativeSum'],
      { unit: 'kcal', filter },
    ),
    health.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg'),
  ])
  const store = useTrackingStore.getState()
  const today = formatDateKey()
  // Empty results can mean denied read access. Never overwrite manual values with zero.
  if (steps.sumQuantity) store.setSteps(today, steps.sumQuantity.quantity)
  if (energy.sumQuantity) store.setHealthCalories(today, energy.sumQuantity.quantity)
  if (weight && weight.quantity > 0)
    store.logWeight(weight.quantity, formatDateKey(weight.startDate))
  return 'Imported available steps, active calories, and your latest weight. Manage access in the Health app.'
}
