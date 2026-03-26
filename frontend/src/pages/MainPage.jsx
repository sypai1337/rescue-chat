import { useState } from 'react'
import ServerList from '../components/ServerList'
import ChannelList from '../components/ChannelList'
import ChatArea from '../components/ChatArea'
import MemberList from '../components/MemberList'

export default function MainPage() {
  const [activeServer, setActiveServer] = useState(null)
  const [activeChannel, setActiveChannel] = useState(null)

  const handleSelectServer = (serverId) => {
    setActiveServer(serverId)
    setActiveChannel(null)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-700">
      <ServerList
        onSelectServer={handleSelectServer}
        activeServerId={activeServer}
      />
      <ChannelList
        serverId={activeServer}
        onSelectChannel={setActiveChannel}
        activeChannelId={activeChannel}
      />
      <ChatArea channelId={activeChannel} />
      <MemberList serverId={activeServer} />
    </div>
  )
}