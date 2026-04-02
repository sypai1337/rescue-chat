import { useEffect, useRef, useState, useCallback } from 'react'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function ChatArea({ channelId, sendMessage }) {
  const [input, setInput] = useState('')
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const { messages, fetchMessages, fetchOlderMessages } = useChatStore()
  const { user } = useAuthStore()
  const scrollRef = useRef(null)
  const prevScrollHeight = useRef(null)

  useEffect(() => {
    if (channelId) {
      fetchMessages(channelId)
      setHasMore(true)
    }
  }, [channelId])

  // скролл вниз только при первой загрузке и новых сообщениях
  const isLoadingOlderRef = useRef(false)

    useEffect(() => {
        if (isLoadingOlderRef.current) {
            const el = scrollRef.current
            if (el && prevScrollHeight.current) {
                el.scrollTop = el.scrollHeight - prevScrollHeight.current
            }
            prevScrollHeight.current = null
            isLoadingOlderRef.current = false
        } else {
            setTimeout(() => {
                const el = scrollRef.current
                if (el) el.scrollTop = el.scrollHeight
            }, 50)
        }
    }, [messages])

    const handleScroll = useCallback(async (e) => {
        const el = e.currentTarget
        if (el.scrollTop > 100 || isLoadingOlder || !hasMore) return

        setIsLoadingOlder(true)
        isLoadingOlderRef.current = true
        prevScrollHeight.current = el.scrollHeight

        const loaded = await fetchOlderMessages(channelId)
        if (loaded === 0 || loaded === undefined) setHasMore(false)

        setIsLoadingOlder(false)
    }, [channelId, isLoadingOlder, hasMore])

//   useEffect(() => {
//     const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]')
//     if (!el) return
//     el.addEventListener('scroll', handleScroll)
//     return () => el.removeEventListener('scroll', handleScroll)
//   }, [handleScroll])

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!channelId) return (
    <div className="flex-1 flex items-center justify-center text-slate-400">
      Выбери канал
    </div>
  )

  return (
    <div className="flex-1 flex flex-col bg-slate-700 min-w-0">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        <div className="space-y-3">
          {isLoadingOlder && (
            <div className="text-center text-slate-400 text-sm py-2">
              Загрузка...
            </div>
          )}
          {!hasMore && (
            <div className="text-center text-slate-400 text-sm py-2">
              Начало истории
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {msg.author?.username?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={`text-sm font-semibold ${msg.author?.id === user?.id ? 'text-indigo-400' : 'text-white'}`}>
                    {msg.author?.username}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-slate-200 text-sm" style={{ overflowWrap: 'anywhere' }}>{msg.content}</p>
              </div>
            </div>
          ))}
          <div/>
        </div>
      </div>
      <div className="p-4 flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Написать сообщение..."
          className="bg-slate-600 border-slate-500 text-white placeholder:text-slate-400"
        />
        <Button onClick={handleSend}>Отправить</Button>
      </div>
    </div>
  )
}