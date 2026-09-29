import {
  trackingActionSchema,
  validTrackingAction,
  type TrackingAction,
} from '@/features/tracking/action'
import { getJSON, setJSON } from '@/lib/storage'
import { formatDateKey, generateEntryId, type FoodLogEntry } from '@/types/nutrition'
import { create } from 'zustand'

export type SavedMeal = {
  id: string
  name: string
  entries: Omit<FoodLogEntry, 'id' | 'consumedAt'>[]
}
export type Exercise = {
  id: string
  name: string
  minutes: number
  calories: number
  estimated: boolean
}
export type ActivityDay = {
  water: number
  steps: number
  healthCalories?: number
  exercises: Exercise[]
}
export type Profile = {
  name: string
  heightCm: number | null
  goalWeightKg: number | null
  units: 'metric' | 'imperial'
  goal: 'maintain' | 'lose' | 'gain'
}
export type Preferences = {
  appearance: 'system' | 'light' | 'dark'
  waterServing: number
  waterGoal: number
  stepGoal: number
  addBurned: boolean
  rollover: boolean
  reminders: boolean
}
type TrackingData = {
  profile: Profile
  preferences: Preferences
  days: Record<string, ActivityDay>
  weights: { date: string; kg: number }[]
  savedMeals: SavedMeal[]
  onboardingComplete: boolean
  chatActions: Record<string, 'saved' | 'dismissed'>
}
const defaults: TrackingData = {
  profile: { name: '', heightCm: null, goalWeightKg: null, units: 'metric', goal: 'maintain' },
  preferences: {
    appearance: 'system',
    waterServing: 250,
    waterGoal: 2000,
    stepGoal: 10000,
    addBurned: false,
    rollover: false,
    reminders: false,
  },
  days: {},
  weights: [],
  savedMeals: [],
  onboardingComplete: false,
  chatActions: {},
}
export const emptyActivity: ActivityDay = { water: 0, steps: 0, exercises: [] }
const persisted = getJSON<Partial<TrackingData>>('tracking:v1')
const initial: TrackingData = {
  ...defaults,
  ...persisted,
  profile: { ...defaults.profile, ...persisted?.profile },
  preferences: { ...defaults.preferences, ...persisted?.preferences },
}
type Actions = {
  resolveChatAction: (id: string, action: TrackingAction, save: boolean) => boolean
  setProfile: (profile: Partial<Profile>) => void
  setPreferences: (preferences: Partial<Preferences>) => void
  completeOnboarding: () => void
  changeWater: (date: string, delta: number) => void
  setSteps: (date: string, steps: number) => void
  setHealthCalories: (date: string, calories: number) => void
  addExercise: (date: string, exercise: Omit<Exercise, 'id'>) => void
  removeExercise: (date: string, id: string) => void
  logWeight: (kg: number, date?: string) => void
  removeWeight: (date: string) => void
  saveMeal: (name: string, entries: SavedMeal['entries']) => void
  removeSavedMeal: (id: string) => void
  reset: () => void
}
export const useTrackingStore = create<TrackingData & Actions>((set, get) => {
  const commit = (patch: Partial<TrackingData>) => {
    const { profile, preferences, days, weights, savedMeals, onboardingComplete, chatActions } =
      {
        ...get(),
        ...patch,
      }
    setJSON('tracking:v1', {
      profile,
      preferences,
      days,
      weights,
      savedMeals,
      onboardingComplete,
      chatActions,
    })
    set(patch)
  }
  const updateDay = (date: string, fn: (day: ActivityDay) => ActivityDay) =>
    commit({ days: { ...get().days, [date]: fn(get().days[date] ?? emptyActivity) } })
  return {
    ...initial,
    resolveChatAction: (id, input, save) => {
      const parsed = trackingActionSchema.safeParse(input)
      if (
        get().chatActions[id] ||
        !parsed.success ||
        !validTrackingAction(parsed.data, formatDateKey())
      )
        return false
      const action = parsed.data
      const date = action.date ?? formatDateKey()
      const day = get().days[date] ?? emptyActivity
      let patch: Partial<TrackingData> = {}
      if (save) {
        if (action.kind === 'weight')
          patch.weights = [
            ...get().weights.filter((entry) => entry.date !== date),
            { date, kg: action.value },
          ].sort((a, b) => a.date.localeCompare(b.date))
        else {
          const updated =
            action.kind === 'water'
              ? { ...day, water: day.water + action.value }
              : action.kind === 'steps'
                ? { ...day, steps: action.value }
                : {
                    ...day,
                    exercises: [
                      ...day.exercises,
                      {
                        id: generateEntryId(),
                        name: action.name!,
                        minutes: action.minutes!,
                        calories: action.value,
                        estimated: action.estimated ?? false,
                      },
                    ],
                  }
          patch.days = { ...get().days, [date]: updated }
        }
      }
      // The action and its acknowledgement share one durable write, preventing replay.
      commit({
        ...patch,
        chatActions: { ...get().chatActions, [id]: save ? 'saved' : 'dismissed' },
      })
      return true
    },
    setProfile: (profile) => commit({ profile: { ...get().profile, ...profile } }),
    setPreferences: (preferences) =>
      commit({ preferences: { ...get().preferences, ...preferences } }),
    completeOnboarding: () => commit({ onboardingComplete: true }),
    changeWater: (date, delta) => {
      if (Number.isFinite(delta))
        updateDay(date, (day) => ({ ...day, water: Math.max(0, day.water + delta) }))
    },
    setHealthCalories: (date, calories) => {
      if (Number.isFinite(calories) && calories >= 0)
        updateDay(date, (day) => ({ ...day, healthCalories: Math.round(calories) }))
    },
    setSteps: (date, steps) => {
      if (Number.isFinite(steps) && steps >= 0)
        updateDay(date, (day) => ({ ...day, steps: Math.round(steps) }))
    },
    addExercise: (date, exercise) => {
      if (!exercise.name.trim() || !Number.isFinite(exercise.calories) || exercise.calories < 0)
        return
      updateDay(date, (day) => ({
        ...day,
        exercises: [...day.exercises, { ...exercise, id: generateEntryId() }],
      }))
    },
    removeExercise: (date, id) =>
      updateDay(date, (day) => ({
        ...day,
        exercises: day.exercises.filter((exercise) => exercise.id !== id),
      })),
    logWeight: (kg, date = formatDateKey()) => {
      if (!Number.isFinite(kg) || kg <= 0 || kg > 500) return
      commit({
        weights: [...get().weights.filter((entry) => entry.date !== date), { date, kg }].sort(
          (a, b) => a.date.localeCompare(b.date),
        ),
      })
    },
    removeWeight: (date) =>
      commit({ weights: get().weights.filter((entry) => entry.date !== date) }),
    saveMeal: (name, entries) => {
      if (name.trim() && entries.length)
        commit({
          savedMeals: [
            ...get().savedMeals,
            { id: generateEntryId(), name: name.trim(), entries },
          ],
        })
    },
    removeSavedMeal: (id) =>
      commit({ savedMeals: get().savedMeals.filter((meal) => meal.id !== id) }),
    reset: () => commit(defaults),
  }
})
