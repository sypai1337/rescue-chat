import { useEffect } from 'react'
import { useChatStore } from '../store/chatStore'

export default function MemberList({ serverId }) {
  const { members, fetchMembers } = useChatStore()

  useEffect(() => {
    if (serverId) fetchMembers(serverId)
  }, [serverId])

  if (!serverId) return null

  const online = members.filter(m => m.online)
  const offline = members.filter(m => !m.online)

  return (
    <div className="w-48 bg-slate-800 flex flex-col">
      <div className="p-4 border-b border-slate-700 font-semibold text-white text-sm">
        Участники
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {online.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold px-2 mb-1">
              В сети — {online.length}
            </p>
            {online.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-700">
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                    {m.username[0].toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-800" />
                </div>
                <span className="text-sm text-white truncate">{m.username}</span>
              </div>
            ))}
          </div>
        )}
        {offline.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold px-2 mb-1">
              Не в сети — {offline.length}
            </p>
            {offline.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-700">
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-slate-400 text-xs font-bold">
                    {m.username[0].toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-slate-500 rounded-full border-2 border-slate-800" />
                </div>
                <span className="text-sm text-slate-400 truncate">{m.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}