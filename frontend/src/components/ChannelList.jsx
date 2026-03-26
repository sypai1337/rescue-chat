import { useEffect, useState } from 'react'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { Button } from '@/components/ui/button'
import CreateChannelDialog from './CreateChannelDialog'

export default function ChannelList({ serverId, onSelectChannel, activeChannelId }) {
  const { channels, fetchChannels, servers, deleteChannel } = useChatStore()
  const { user, logout } = useAuthStore()
  const [contextMenu, setContextMenu] = useState(null)

  useEffect(() => {
    if (serverId) fetchChannels(serverId)
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [serverId])

  const activeServer = servers.find(s => s.id === serverId)

  const handleContextMenu = (e, channelId) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, channelId })
  }

  const handleDelete = async () => {
    if (!contextMenu) return
    await deleteChannel(contextMenu.channelId)
    setContextMenu(null)
  }

  if (!serverId) return (
    <div className="w-56 bg-slate-800 flex items-center justify-center text-slate-400 text-sm">
      Выбери сервер
    </div>
  )

  return (
    <div className="w-56 bg-slate-800 flex flex-col">
      <div className="p-4 border-b border-slate-700 font-semibold text-white" style={{ overflowWrap: 'anywhere' }}>
        {activeServer?.name}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Каналы</span>
          <CreateChannelDialog serverId={serverId} />
        </div>
        {channels.map(channel => (
          <button
            key={channel.id}
            onContextMenu={e => handleContextMenu(e, channel.id)}
            onClick={() => onSelectChannel(channel.id)}
            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors truncate
                ${activeChannelId === channel.id
                ? 'bg-slate-600 text-white'
                : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
            >
            # {channel.name}
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-slate-700 flex items-center justify-between">
        <span className="text-sm text-slate-300 truncate">{user?.username}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-slate-400 hover:text-white shrink-0"
        >
          Выйти
        </Button>
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 bg-slate-900 border border-slate-700 rounded shadow-lg py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-700 text-left"
          >
            Удалить канал
          </button>
        </div>
      )}
    </div>
  )
}