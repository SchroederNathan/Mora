import { createContext } from 'react'

export const PagerNavigationContext = createContext<{
  navigateToPage: (page: number) => void
  onLeaveChat: (listener: () => void) => () => void
} | null>(null)
