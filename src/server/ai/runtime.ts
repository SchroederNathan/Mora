import { validTrackingAction, type TrackingAction } from '@/features/tracking/action'
import { executeLookupAndLogFood } from '@/server/nutrition/lookup'
import { filterHistory } from '@/utils/tracking'
import { z } from 'zod'
import {
  assistantToolDescriptions,
  assistantToolSchemas,
  type AssistantRuntimeContext,
  type GetFoodHistoryInput,
  type RemoveFoodEntryInput,
  type UpdateFoodServingsInput,
} from './schemas'
export { buildAssistantSystemPrompt } from './prompt'
export {
  assistantToolSchemas,
  type AssistantGoals,
  type AssistantHistoryDay,
  type AssistantRuntimeContext,
} from './schemas'

async function executeRemoveFoodEntry({ foodName }: RemoveFoodEntryInput) {
  return {
    success: true,
    action: 'remove',
    foodName,
    message: `Removed ${foodName} from the draft.`,
  }
}

async function executeUpdateFoodServings({ foodName, newQuantity }: UpdateFoodServingsInput) {
  return {
    success: true,
    action: 'update_servings',
    foodName,
    newQuantity,
    message: `Updated ${foodName} to ${newQuantity} serving${newQuantity !== 1 ? 's' : ''}.`,
  }
}

async function executeGetFoodHistory(
  { period }: GetFoodHistoryInput,
  context: AssistantRuntimeContext,
) {
  const today = context.todayDateKey || new Date().toISOString().slice(0, 10)
  const history = context.foodHistory || []
  const filtered = filterHistory(history, today, period)

  if (filtered.length === 0) {
    return {
      period,
      daysWithData: 0,
      message: `No food logged for ${period}.`,
    }
  }

  const aggregate = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
  }

  for (const day of filtered) {
    aggregate.calories += day.totals.calories
    aggregate.protein += day.totals.protein
    aggregate.carbs += day.totals.carbs
    aggregate.fat += day.totals.fat
    aggregate.fiber += day.totals.fiber ?? 0
    aggregate.sugar += day.totals.sugar ?? 0
  }

  const daysWithData = filtered.length
  const averages = {
    calories: Math.round(aggregate.calories / daysWithData),
    protein: Math.round((aggregate.protein / daysWithData) * 10) / 10,
    carbs: Math.round((aggregate.carbs / daysWithData) * 10) / 10,
    fat: Math.round((aggregate.fat / daysWithData) * 10) / 10,
    fiber: Math.round((aggregate.fiber / daysWithData) * 10) / 10,
    sugar: Math.round((aggregate.sugar / daysWithData) * 10) / 10,
  }

  return {
    period,
    daysWithData,
    days: filtered,
    totals: aggregate,
    dailyAverages: daysWithData > 1 ? averages : undefined,
  }
}

async function executeGetUserGoals(context: AssistantRuntimeContext) {
  const defaults = {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
  }
  const goals = context.userGoals || defaults
  return {
    goals,
    isCustom: !!context.userGoals,
  }
}

export function buildAssistantTools(context: AssistantRuntimeContext) {
  return {
    prepare_tracking_entry: {
      description: assistantToolDescriptions.prepare_tracking_entry,
      inputSchema: assistantToolSchemas.prepare_tracking_entry,
      execute: (input: TrackingAction) => prepareTracking(input, context),
    },
    lookup_and_log_food: {
      description: assistantToolDescriptions.lookup_and_log_food,
      inputSchema: assistantToolSchemas.lookup_and_log_food,
      execute: executeLookupAndLogFood,
    },
    remove_food_entry: {
      description: assistantToolDescriptions.remove_food_entry,
      inputSchema: assistantToolSchemas.remove_food_entry,
      execute: executeRemoveFoodEntry,
    },
    update_food_servings: {
      description: assistantToolDescriptions.update_food_servings,
      inputSchema: assistantToolSchemas.update_food_servings,
      execute: executeUpdateFoodServings,
    },
    get_food_history: {
      description: assistantToolDescriptions.get_food_history,
      inputSchema: assistantToolSchemas.get_food_history,
      execute: (input: GetFoodHistoryInput) => executeGetFoodHistory(input, context),
    },
    get_user_goals: {
      description: assistantToolDescriptions.get_user_goals,
      inputSchema: assistantToolSchemas.get_user_goals,
      execute: () => executeGetUserGoals(context),
    },
    ask_user: {
      description: assistantToolDescriptions.ask_user,
      inputSchema: assistantToolSchemas.ask_user,
    },
  }
}

export async function executeAssistantTool(
  toolName: keyof typeof assistantToolSchemas,
  input: unknown,
  context: AssistantRuntimeContext,
) {
  switch (toolName) {
    case 'prepare_tracking_entry':
      return prepareTracking(assistantToolSchemas.prepare_tracking_entry.parse(input), context)
    case 'lookup_and_log_food':
      return executeLookupAndLogFood(assistantToolSchemas.lookup_and_log_food.parse(input))
    case 'remove_food_entry':
      return executeRemoveFoodEntry(assistantToolSchemas.remove_food_entry.parse(input))
    case 'update_food_servings':
      return executeUpdateFoodServings(assistantToolSchemas.update_food_servings.parse(input))
    case 'get_food_history':
      return executeGetFoodHistory(assistantToolSchemas.get_food_history.parse(input), context)
    case 'get_user_goals':
      return executeGetUserGoals(context)
    case 'ask_user':
      return assistantToolSchemas.ask_user.parse(input)
    default:
      throw new Error(`Unsupported tool: ${toolName satisfies never}`)
  }
}

function prepareTracking(input: TrackingAction, context: AssistantRuntimeContext) {
  const today = context.todayDateKey ?? new Date().toISOString().slice(0, 10)
  const action = { ...input, date: input.date ?? today }
  if (!validTrackingAction(action, today))
    return {
      success: false,
      message: 'Ask the user for a valid amount, date, and exercise duration if applicable.',
    }
  return {
    success: true,
    action,
    message:
      'Prepared for confirmation. The user must tap Save to journal before this is saved.',
  }
}

export function getAssistantFunctionDeclarations() {
  return (
    Object.entries(assistantToolSchemas) as [keyof typeof assistantToolSchemas, z.ZodTypeAny][]
  ).map(([name, schema]) => ({
    name,
    description: assistantToolDescriptions[name],
    parametersJsonSchema: z.toJSONSchema(schema),
  }))
}
