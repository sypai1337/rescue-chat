import { useState } from 'react'
import { useChatStore } from '../store/chatStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function CreateChannelDialog({ serverId }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('text')
  const [open, setOpen] = useState(false)
  const { createChannel } = useChatStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await createChannel(serverId, name.trim(), type)
    setName('')
    setType('text')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-slate-400 hover:text-white text-lg leading-none">+</button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Создать канал</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-200">Тип канала</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('text')}
                className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                  type === 'text'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                # Текстовый
              </button>
              <button
                type="button"
                onClick={() => setType('voice')}
                className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                  type === 'voice'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                🔊 Голосовой
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">Название</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder={type === 'text' ? 'general' : 'голосовой'}
              maxLength={50}
              required
            />
          </div>
          <Button type="submit" className="w-full">Создать</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}