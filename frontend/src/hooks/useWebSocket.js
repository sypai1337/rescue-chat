import { useEffect, useRef } from 'react'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { WS_URL } from '../config'
import { getToken } from '../store/tokenStore'

export function useWebSocket(channelId) {
  const ws = useRef(null)
  const reconnectTimeout = useRef(null)
  const isUnmounted = useRef(false)
  const { addMessage, setMemberOnline } = useChatStore()

  const connect = () => {
    if (isUnmounted.current || !channelId) return
    const token = getToken()
    if (!token) return

    ws.current = new WebSocket(`${WS_URL}/api/v1/ws/${channelId}?token=${token}`)

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'message') addMessage(data)
      if (data.type === 'user_online') setMemberOnline(data.user_id, true)
      if (data.type === 'user_offline') setMemberOnline(data.user_id, false)
      if (['voice_participants', 'user_joined_voice', 'user_left_voice',
          'offer', 'answer', 'ice_candidate'].includes(data.type)) {
        handleVoiceMessage?.(data)
      }
    }

    ws.current.onclose = (e) => {
      if (isUnmounted.current || e.code === 4001 || e.code === 4003) return
      reconnectTimeout.current = setTimeout(connect, 3000)
    }

    ws.current.onerror = () => ws.current.close()
  }

  useEffect(() => {
    isUnmounted.current = false
    connect()
    return () => {
      isUnmounted.current = true
      clearTimeout(reconnectTimeout.current)
      ws.current?.close()
    }
  }, [channelId])

  const sendMessage = (content) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'message', content }))
    }
  }
  const sendRaw = (data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data))
    }
  }
  return { sendMessage, sendRaw }
}