import { router } from 'expo-router'

/** Direct links and browser reloads may have no in-app back stack. */
export function backToJournal() {
  if (router.canGoBack()) router.back()
  else router.replace('/')
}
