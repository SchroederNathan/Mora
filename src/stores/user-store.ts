import { getUserGoals, saveUserGoals } from '@/lib/storage'
import { type UserGoals, DEFAULT_USER_GOALS } from '@/types/nutrition'
import { create } from 'zustand'

// ============================================
// Types
// ============================================

interface UserState {
  /** User's nutrition goals */
  goals: UserGoals
  /** Loading state */
  isLoading: boolean
}

interface UserActions {
  /** Load goals from storage */
  load: () => void
  /** Update user goals */
  setGoals: (goals: Partial<UserGoals>) => void
  /** Reset to default goals */
  resetGoals: () => void
}

type UserStore = UserState & UserActions

// ============================================
// Store
// ============================================

export const useUserStore = create<UserStore>((set, get) => ({
  // Initial state with defaults
  goals: getUserGoals() ?? { ...DEFAULT_USER_GOALS },
  isLoading: false,

  // Actions
  load: () => {
    set({ isLoading: true })

    const savedGoals = getUserGoals()
    const goals = savedGoals ?? { ...DEFAULT_USER_GOALS }

    set({ goals, isLoading: false })
  },

  setGoals: (partialGoals) => {
    const { goals } = get()
    const newGoals: UserGoals = {
      ...goals,
      ...partialGoals,
    }

    // Persist to MMKV
    saveUserGoals(newGoals)
    set({ goals: newGoals })
  },

  resetGoals: () => {
    const newGoals = { ...DEFAULT_USER_GOALS }
    saveUserGoals(newGoals)
    set({ goals: newGoals })
  },
}))
