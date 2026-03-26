import { useEffect, useRef } from 'react'
import { useChatStore } from '../store/chatStore'
import { WS_URL } from '../config'

export function useWebSocket(channelId) {
  const ws = useRef(null)
  const reconnectTimeout = useRef(null)
  const isUnmounted = useRef(false)
  const { addMessage, setMemberOnline } = useChatStore()

  const connect = () => {
    if (isUnmounted.current || !channelId) return

    const token = localStorage.getItem('access_token')
    ws.current = new WebSocket(`${WS_URL}/api/v1/ws/${channelId}?token=${token}`)

    ws.current.onopen = () => console.log('WS connected')

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'message') addMessage(data)
      if (data.type === 'user_online') setMemberOnline(data.user_id, true)
      if (data.type === 'user_offline') setMemberOnline(data.user_id, false)
    }

    ws.current.onclose = (e) => {
      console.log('WS closed, code:', e.code)
      if (isUnmounted.current || e.code === 4001 || e.code === 4003) return
      console.log('Reconnecting in 3s...')
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

  return { sendMessage }
}