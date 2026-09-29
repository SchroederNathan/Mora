import type { FoodConfirmationEntry } from '@/types/nutrition'
import type { UIMessage } from 'ai'
import { z } from 'zod'

export type DraftEntry = { toolCallId: string; entry: FoodConfirmationEntry }
export type Clarification = {
  toolCallId: string
  question: string
  options?: { label: string; value: string }[]
  allowFreeform?: boolean
  context?: string
}
const nutrient = z.number().finite().nonnegative().max(10000)
const entrySchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().positive().max(2000),
  serving: z.object({
    amount: z.number().positive(),
    unit: z.string(),
    gramWeight: z.number().nonnegative(),
  }),
  nutrients: z.object({
    calories: nutrient,
    protein: nutrient,
    carbs: nutrient,
    fat: nutrient,
    fiber: nutrient.optional(),
    sugar: nutrient.optional(),
    sodium: nutrient.optional(),
  }),
  meal: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  fdcId: z.number().optional(),
  estimated: z.boolean().optional(),
})
type ToolPart = {
  type: string
  toolCallId: string
  state: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
}
function toolParts(messages: UIMessage[]) {
  return messages
    .filter((message) => message.role === 'assistant')
    .flatMap((message) => message.parts)
    .filter((part) => part.type.startsWith('tool-')) as unknown as ToolPart[]
}
/** Apply each completed tool exactly once, including failed or malformed results. */
export function reconcileDraft(
  messages: UIMessage[],
  entries: DraftEntry[],
  processed: string[],
) {
  const seen = new Set(processed)
  let next = entries
  for (const part of toolParts(messages)) {
    if (!part.toolCallId || seen.has(part.toolCallId) || part.state !== 'output-available')
      continue
    seen.add(part.toolCallId)
    const result = part.output
    if (!result?.success) continue
    if (part.type === 'tool-lookup_and_log_food') {
      const parsed = entrySchema.safeParse(result.entry)
      if (parsed.success)
        next = [
          ...next,
          {
            toolCallId: part.toolCallId,
            entry: { ...parsed.data, estimated: result.estimated === true },
          },
        ]
    } else if (typeof result.foodName === 'string') {
      const name = result.foodName.toLowerCase()
      if (part.type === 'tool-remove_food_entry') {
        const index = next.findIndex((item) => item.entry.name.toLowerCase() === name)
        if (index >= 0) next = next.filter((_, i) => i !== index)
      } else if (
        part.type === 'tool-update_food_servings' &&
        typeof result.newQuantity === 'number' &&
        result.newQuantity > 0 &&
        result.newQuantity <= 2000
      ) {
        next = next.map((item) =>
          item.entry.name.toLowerCase() === name
            ? { ...item, entry: { ...item.entry, quantity: result.newQuantity as number } }
            : item,
        )
      }
    }
  }
  return { entries: next, processed: [...seen], changed: seen.size !== processed.length }
}
export function pendingQuestion(messages: UIMessage[]): Clarification | null {
  const parts = toolParts(messages)
  const resolved = new Set(
    parts.filter((part) => part.state === 'output-available').map((part) => part.toolCallId),
  )
  const part = parts.findLast(
    (part) =>
      part.type === 'tool-ask_user' &&
      part.state === 'input-available' &&
      !resolved.has(part.toolCallId),
  )
  if (!part || typeof part.input?.question !== 'string') return null
  return {
    ...part.input,
    question: part.input.question,
    toolCallId: part.toolCallId,
  } as Clarification
}
export function latestToolActivity(messages: UIMessage[]) {
  const lastUser = messages.findLastIndex((message) => message.role === 'user')
  const part = toolParts(messages.slice(lastUser + 1)).at(-1)
  const query = part?.input?.foodQuery ?? part?.input?.foodName
  return {
    toolName: part?.type ?? null,
    toolState: part?.state ?? null,
    foodQuery: typeof query === 'string' ? query : null,
  }
}
