import { useEffect, useRef } from 'react'
import { WS_URL } from '../config'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { getToken } from '../store/tokenStore'




export function usePresence(serverIds) {
  const connections = useRef({})
  const isUnmounted = useRef(false)

  useEffect(() => {
    if (!serverIds?.length) return
    isUnmounted.current = false

    serverIds.forEach(serverId => {
      if (connections.current[serverId]) return

      const connect = () => {
        if (isUnmounted.current) return
        const token = getToken()
        if (!token) return

        const ws = new WebSocket(`${WS_URL}/api/v1/ws/presence/${serverId}?token=${token}`)

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data)
          const { membersByServer, setMemberOnline, fetchMembers, removeMember } = useChatStore.getState()
          const members = membersByServer[serverId] || []

          if (data.type === 'user_online') {
            const exists = members.some(m => m.id === data.user_id)
            exists ? setMemberOnline(data.user_id, true) : fetchMembers(serverId)
          }
          if (data.type === 'user_offline') setMemberOnline(data.user_id, false)
          if (data.type === 'user_left') removeMember(data.user_id)
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