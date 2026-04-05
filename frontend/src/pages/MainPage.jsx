import { useState } from 'react'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { usePresence } from '../hooks/usePresence'
import { useWebSocket } from '../hooks/useWebSocket'
import ServerList from '../components/ServerList'
import ChannelList from '../components/ChannelList'
import ChatArea from '../components/ChatArea'
import MemberList from '../components/MemberList'

export default function MainPage() {
  const [activeServer, setActiveServer] = useState(null)
  const [activeTextChannel, setActiveTextChannel] = useState(null)
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null)
  const { servers } = useChatStore()
  const { user } = useAuthStore()
  const { sendMessage, sendRaw } = useWebSocket(activeTextChannel, null)

  usePresence(servers.map(s => s.id))

  const handleSelectServer = (serverId) => {
    setActiveServer(serverId)
    setActiveTextChannel(null)
  }

  const handleSelectChannel = (id, type) => {
    if (type === 'text') setActiveTextChannel(id)
    if (type === 'voice') setActiveVoiceChannel(id)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-700">
      <ServerList
        onSelectServer={handleSelectServer}
        activeServerId={activeServer}
      />
      <ChannelList
        serverId={activeServer}
        onSelectChannel={handleSelectChannel}
        activeChannelId={activeTextChannel}
        activeVoiceChannel={activeVoiceChannel}
        onLeaveVoice={() => setActiveVoiceChannel(null)}
      />
      <ChatArea channelId={activeTextChannel} sendMessage={sendMessage} />
      <MemberList serverId={activeServer} />
    </div>
  )
}