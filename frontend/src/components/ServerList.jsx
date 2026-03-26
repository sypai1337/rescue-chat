import { useEffect, useState } from 'react'
import { useChatStore } from '../store/chatStore'
import { Separator } from '@/components/ui/separator'
import CreateServerDialog from './CreateServerDialog'
import JoinServerDialog from './JoinServerDialog'

export default function ServerList({ onSelectServer, activeServerId }) {
  const { servers, fetchServers, deleteServer } = useChatStore()
  const [contextMenu, setContextMenu] = useState(null)

  useEffect(() => {
    fetchServers()
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const handleContextMenu = (e, serverId) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, serverId })
  }

  const handleDelete = async () => {
    if (!contextMenu) return
    await deleteServer(contextMenu.serverId)
    setContextMenu(null)
  }

  return (
    <div className="flex flex-col items-center w-16 bg-slate-900 py-3 gap-2">
      {servers.map(server => (
        <button
          key={server.id}
          onClick={() => onSelectServer(server.id)}
          onContextMenu={e => handleContextMenu(e, server.id)}
          title={server.name}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm transition-all
            ${activeServerId === server.id
              ? 'bg-indigo-500 rounded-2xl'
              : 'bg-slate-700 hover:bg-indigo-500 hover:rounded-2xl'}`}
        >
          {server.name[0].toUpperCase()}
        </button>
      ))}
      <Separator className="bg-slate-700 w-8" />
      <CreateServerDialog />
      <JoinServerDialog />
      {contextMenu && (
        <div
          className="fixed z-50 bg-slate-900 border border-slate-700 rounded shadow-lg py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-700 text-left"
          >
            Удалить сервер
          </button>
        </div>
      )}
    </div>
  )
}