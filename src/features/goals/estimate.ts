import type { UserGoals } from '@/types/nutrition'

export const activityLevels = [
  { value: 1.4, label: 'Mostly sitting', detail: 'Little planned activity' },
  { value: 1.6, label: 'Lightly active', detail: 'Some walking or exercise each week' },
  { value: 1.8, label: 'Active', detail: 'Regular exercise and movement' },
  { value: 2, label: 'Very active', detail: 'Physical work or frequent training' },
] as const
export type GoalEstimateInput = {
  age: number
  heightCm: number
  weightKg: number
  equation: 'female' | 'male'
  activity: number
  focus: 'lose' | 'maintain' | 'gain'
  adjustment: 250 | 500
}

/** Mifflin–St Jeor resting energy, multiplied by a selected activity factor.
 * This is a starting estimate, not a model of weight change over time.
 * https://pubmed.ncbi.nlm.nih.gov/2305711/
 * https://www.niddk.nih.gov/bwp
 */
export function estimateGoals(input: GoalEstimateInput, current: UserGoals) {
  const { age, heightCm, weightKg, equation, activity, focus, adjustment } = input
  if (!Number.isInteger(age) || age < 18 || age > 100)
    throw new Error(
      'The calculator is for adults ages 18–100. You can set your own targets instead.',
    )
  if (
    !Number.isFinite(heightCm) ||
    heightCm < 120 ||
    heightCm > 230 ||
    !Number.isFinite(weightKg) ||
    weightKg < 35 ||
    weightKg > 300
  )
    throw new Error(
      'Check your measurements. The calculator supports 120–230 cm and 35–300 kg.',
    )
  if (!activityLevels.some((level) => level.value === activity))
    throw new Error('Choose an activity level.')
  if (
    !['female', 'male'].includes(equation) ||
    !['lose', 'maintain', 'gain'].includes(focus) ||
    ![250, 500].includes(adjustment)
  )
    throw new Error('Choose your calculation options.')
  if (focus === 'lose' && weightKg / (heightCm / 100) ** 2 < 18.5)
    throw new Error(
      'A weight-loss estimate is not suitable for these measurements. Use targets agreed with your clinician.',
    )
  const resting = 10 * weightKg + 6.25 * heightCm - 5 * age + (equation === 'male' ? 5 : -161)
  const maintenance = Math.round((resting * activity) / 10) * 10
  const calories =
    maintenance + (focus === 'lose' ? -adjustment : focus === 'gain' ? adjustment : 0)
  // A conservative product boundary, not a definition of a safe intake for everyone.
  if (calories < 1500 || calories < resting || calories > 10000)
    throw new Error(
      'This calculation falls outside Mora’s starting-target range. Try a smaller adjustment or use targets agreed with your clinician.',
    )
  const macroEnergy = current.protein * 4 + current.carbs * 4 + current.fat * 9
  if (
    !Number.isFinite(macroEnergy) ||
    macroEnergy <= 0 ||
    [current.protein, current.carbs, current.fat].some(
      (value) => !Number.isFinite(value) || value < 0,
    )
  )
    throw new Error('Enter valid protein, carb, and fat targets before estimating.')
  const ratio = calories / macroEnergy
  return {
    maintenance,
    goals: {
      calories,
      protein: Math.round(current.protein * ratio),
      carbs: Math.round(current.carbs * ratio),
      fat: Math.round(current.fat * ratio),
    },
  }
}
