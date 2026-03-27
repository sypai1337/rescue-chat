import { useEffect, useRef } from 'react'
import { WS_URL } from '../config'
import { useChatStore } from '../store/chatStore'

export function usePresence(serverIds) {
  const connections = useRef({})
  const isUnmounted = useRef(false)
  const { setMemberOnline } = useChatStore()

  useEffect(() => {
    if (!serverIds?.length) return
    isUnmounted.current = false

    const token = localStorage.getItem('access_token')

    serverIds.forEach(serverId => {
      if (connections.current[serverId]) return

      const connect = () => {
        if (isUnmounted.current) return
        const ws = new WebSocket(`${WS_URL}/api/v1/ws/presence/${serverId}?token=${token}`)

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.type === 'user_online') setMemberOnline(data.user_id, true)
            if (data.type === 'user_offline') setMemberOnline(data.user_id, false)
        }
        ws.onclose = () => {
          delete connections.current[serverId]
          if (!isUnmounted.current) setTimeout(connect, 3000)
        }

        connections.current[serverId] = ws
      }

      connect()
    })

    return () => {
      isUnmounted.current = true
      Object.values(connections.current).forEach(ws => ws.close())
      connections.current = {}
    }
  }, [serverIds?.join(',')])
}