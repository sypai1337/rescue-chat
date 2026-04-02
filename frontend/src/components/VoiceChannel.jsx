import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useVoice } from '../hooks/useVoice'

export default function VoiceChannel({ channelId }) {
  if (!channelId) return null

  const { user } = useAuthStore()
  const { participants, isMuted, joinVoice, leaveVoice, toggleMute } = useVoice(channelId, user.id)

  useEffect(() => {
    joinVoice(channelId)
    return () => leaveVoice(channelId)
  }, [channelId])

  return (
    <div className="fixed bottom-0 left-16 w-56 bg-slate-900 border-t border-slate-700 p-3">
      <div className="text-xs text-slate-400 uppercase font-semibold mb-2">
        Голосовой канал
      </div>
      <div className="text-xs text-slate-300 mb-3">
        Участников: {participants.length}
      </div>
      <div className="flex gap-2">
        <button
          onClick={toggleMute}
          className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
            isMuted
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
        <button
          onClick={() => leaveVoice(channelId)}
          className="flex-1 py-1.5 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        >
          Выйти
        </button>
      </div>
    </div>
  )
}