import { trackingActionSchema } from '@/features/tracking/action'
import { z } from 'zod'

export type AssistantHistoryDay = {
  date: string
  entries: {
    name: string
    quantity: number
    meal?: string
    nutrients: {
      calories: number
      protein: number
      carbs: number
      fat: number
      fiber?: number
      sugar?: number
    }
  }[]
  totals: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber?: number
    sugar?: number
  }
}

export type AssistantGoals = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type AssistantRuntimeContext = {
  voiceMode?: boolean
  foodHistory?: AssistantHistoryDay[]
  userGoals?: AssistantGoals | null
  todayDateKey?: string
}

export const assistantToolSchemas = {
  prepare_tracking_entry: trackingActionSchema,
  lookup_and_log_food: z.object({
    foodQuery: z
      .string()
      .describe('The food to search for (e.g., "banana", "grilled chicken breast")'),
    displayName: z
      .string()
      .describe(
        'A friendly, human-readable name for the food (e.g., "Banana", "Grilled Chicken Breast", "Greek Yogurt")',
      ),
    quantity: z
      .number()
      .positive()
      .max(2000)
      .default(1)
      .describe('Number of servings (default 1)'),
    meal: z
      .enum(['breakfast', 'lunch', 'dinner', 'snack'])
      .optional()
      .describe('Meal type if mentioned'),
    estimatedCalories: z
      .number()
      .finite()
      .nonnegative()
      .max(10000)
      .optional()
      .describe('Your estimated calories per serving if USDA lookup fails'),
    estimatedProtein: z
      .number()
      .finite()
      .nonnegative()
      .max(10000)
      .optional()
      .describe('Your estimated protein (g) per serving if USDA lookup fails'),
    estimatedCarbs: z
      .number()
      .finite()
      .nonnegative()
      .max(10000)
      .optional()
      .describe('Your estimated carbs (g) per serving if USDA lookup fails'),
    estimatedFat: z
      .number()
      .finite()
      .nonnegative()
      .max(10000)
      .optional()
      .describe('Your estimated fat (g) per serving if USDA lookup fails'),
    estimatedFiber: z
      .number()
      .finite()
      .nonnegative()
      .max(10000)
      .optional()
      .describe('Your estimated fiber (g) per serving if USDA lookup fails'),
    estimatedSugar: z
      .number()
      .finite()
      .nonnegative()
      .max(10000)
      .optional()
      .describe('Your estimated sugar (g) per serving if USDA lookup fails'),
    servingUnit: z
      .string()
      .optional()
      .describe(
        'The serving unit the user specified (e.g., "cup", "oz", "slice", "tbsp"). Extract from user input like "1 cup milk" → "cup".',
      ),
  }),
  remove_food_entry: z.object({
    foodName: z
      .string()
      .describe(
        'The exact display name of the food to remove (e.g., "Banana", "Grilled Chicken Breast")',
      ),
  }),
  update_food_servings: z.object({
    foodName: z
      .string()
      .describe(
        'The exact display name of the food to update (e.g., "Banana", "Grilled Chicken Breast")',
      ),
    newQuantity: z.number().positive().max(2000).describe('The new number of servings'),
  }),
  get_food_history: z.object({
    period: z
      .enum(['today', 'yesterday', 'week', 'two_weeks'])
      .describe('Time period to retrieve'),
  }),
  get_user_goals: z.object({}),
  ask_user: z.object({
    question: z.string().describe('The question to ask'),
    options: z
      .array(
        z.object({
          label: z.string().describe('Display text'),
          value: z.string().describe('Value when selected'),
        }),
      )
      .optional()
      .describe('Quick-select options'),
    allowFreeform: z.boolean().default(true).describe('Show text input for custom answers'),
    context: z.string().optional().describe('Additional context for display'),
  }),
} as const

export const assistantToolDescriptions: Record<keyof typeof assistantToolSchemas, string> = {
  prepare_tracking_entry:
    'Prepare water, total steps, body weight, or an exercise for user confirmation. Does NOT save anything. Water adds to the day; steps and weight replace that date’s value. Exercise calories must be explicitly provided or clearly marked as an estimate.',
  lookup_and_log_food:
    'Look up a food and prepare a draft for user confirmation. This tool does NOT save to the food log. Use this when the user says they ate something. If the food is not found in USDA, provide your best estimate for the macros.',
  remove_food_entry:
    'Remove a food item from the pending draft. Use when the user says "remove the X", "delete X", "take off the X", or "nevermind on the X".',
  update_food_servings:
    'Update the quantity/servings of a food item in the pending draft. Use when the user says "I had 2, not 3", "change to 1 serving", "actually just 1", or any quantity correction.',
  get_food_history:
    "Get the user's food log history. Use when the user asks about what they ate, their intake, progress, or trends.",
  get_user_goals:
    "Get the user's daily nutrition goals/targets. Use when comparing intake to goals or answering questions about targets.",
  ask_user:
    'Ask the user a clarifying question when more information is needed to accurately look up food. Use when food is ambiguous (e.g., "sushi roll", "sandwich", "coffee").',
}

export type LookupAndLogFoodInput = z.infer<typeof assistantToolSchemas.lookup_and_log_food>
export type RemoveFoodEntryInput = z.infer<typeof assistantToolSchemas.remove_food_entry>
export type UpdateFoodServingsInput = z.infer<typeof assistantToolSchemas.update_food_servings>
export type GetFoodHistoryInput = z.infer<typeof assistantToolSchemas.get_food_history>
