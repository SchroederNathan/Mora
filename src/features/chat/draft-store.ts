import { getJSON, setJSON } from '@/lib/storage'
import type { UIMessage } from 'ai'
import { create } from 'zustand'
import { reconcileDraft, type DraftEntry } from './transcript'

type DraftState = {
  entries: DraftEntry[]
  processed: string[]
  reconcile: (messages: UIMessage[]) => void
  update: (fn: (entries: DraftEntry[]) => DraftEntry[]) => void
  take: () => DraftEntry[]
}
export const useDraftStore = create<DraftState>((set, get) => {
  const persist = (entries: DraftEntry[], processed = get().processed) => {
    // Persist together so a restart cannot replay an already confirmed tool.
    setJSON('chat:draft-state', { entries, processed })
    set({ entries, processed })
  }
  const saved = getJSON<{ entries: DraftEntry[]; processed: string[] }>('chat:draft-state')
  return {
    entries: saved?.entries ?? getJSON<DraftEntry[]>('chat:draft') ?? [],
    processed: saved?.processed ?? getJSON<string[]>('chat:processed-tools') ?? [],
    reconcile: (messages) => {
      const result = reconcileDraft(messages, get().entries, get().processed)
      if (result.changed) persist(result.entries, result.processed)
    },
    update: (fn) => persist(fn(get().entries)),
    take: () => {
      const entries = get().entries
      persist([])
      return entries
    },
  }
})
