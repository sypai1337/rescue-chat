import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAudioStore = create(
  persist(
    (set) => ({
      micDeviceId: 'default',
      spkDeviceId: 'default',
      micVolume: 80,
      spkVolume: 100,
      setAudioSettings: (settings) => set(settings),
    }),
    { name: 'audio-settings' }
  )
)
