import { z } from 'zod'

export const trackingActionSchema = z.object({
  kind: z.enum(['water', 'steps', 'weight', 'exercise']),
  value: z
    .number()
    .finite()
    .nonnegative()
    .max(100000)
    .describe(
      'Water in ml, total daily steps, body weight in kg, or exercise calories. Convert imperial units first.',
    ),
  date: z.iso.date().optional().describe('Local date YYYY-MM-DD. Omit for today.'),
  name: z.string().trim().max(100).optional().describe('Exercise name'),
  minutes: z.number().finite().positive().max(1440).optional().describe('Exercise duration'),
  estimated: z.boolean().optional().describe('True when exercise calories are estimated'),
})
export type TrackingAction = z.infer<typeof trackingActionSchema>
export function validTrackingAction(action: TrackingAction, today: string) {
  if (action.date && action.date > today) return false
  switch (action.kind) {
    case 'water':
      return action.value > 0 && action.value <= 10000
    case 'weight':
      return action.value > 0 && action.value <= 500
    case 'steps':
      return Number.isInteger(action.value)
    case 'exercise':
      return !!action.name && !!action.minutes && action.value <= 10000
  }
}
export function trackingActionLabel(action: TrackingAction) {
  switch (action.kind) {
    case 'water':
      return `Add ${action.value} ml water`
    case 'steps':
      return `Set daily steps to ${action.value.toLocaleString()}`
    case 'weight':
      return `Record weight: ${action.value} kg`
    case 'exercise':
      return `${action.name} · ${action.minutes} min · ${action.value} cal${action.estimated ? ' (estimate)' : ''}`
  }
}
