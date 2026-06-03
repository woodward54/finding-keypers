'use client'

import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * The ids of every moment this browser has captured, newest first. Persisted to
 * localStorage so a returning explorer can find their own portraits again.
 */
type MyMomentsState = {
  ids: string[]
  add: (id: string) => void
  remove: (id: string) => void
}

export const useMyMoments = create<MyMomentsState>()(
  persist(
    (set) => ({
      ids: [],
      add: (id) => set((s) => (s.ids.includes(id) ? s : { ids: [id, ...s.ids] })),
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
    }),
    { name: 'finding-keypers:my-moments' }
  )
)

const noopSubscribe = () => () => {}

/**
 * False during SSR and the first client render, true thereafter. Gate any UI
 * that depends on the persisted `ids` on this so the server and client markup
 * match — the store only carries its localStorage values on the client, which
 * it rehydrates synchronously, so the values are ready by the time this flips.
 *
 * We can't ask the persist API directly (`useMyMoments.persist`) because that
 * API is only attached when a storage backend exists; on the server there is
 * no `localStorage`, so it's undefined.
 */
export function useMyMomentsHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
}
