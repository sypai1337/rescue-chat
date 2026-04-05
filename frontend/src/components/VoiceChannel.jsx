import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useVoice } from '../hooks/useVoice'
import { useWebSocket } from '../hooks/useWebSocket'

export default function VoiceChannel({ channelId, onLeave }) {
  const { user } = useAuthStore()
  const sendRawRef = useRef(null)

  const { participants, isMuted, joinVoice, leaveVoice, toggleMute, handleVoiceMessage } = useVoice(
    user.id,
    (data) => sendRawRef.current?.(data)
  )
  const { sendRaw } = useWebSocket(channelId, handleVoiceMessage)

  useEffect(() => {
    joinVoice(channelId)
    return () => leaveVoice(channelId)
  }, [channelId])

  if (!channelId) return null

  sendRawRef.current = sendRaw

  return (
    <div className="bg-slate-900 border-t border-slate-700 p-3">
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
          onClick={() => {
            leaveVoice(channelId)
            onLeave()
          }}
          className="flex-1 py-1.5 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        >
          Выйти
        </button>
      </div>
    </div>
  )
}