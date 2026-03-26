import { useState } from 'react'
import { useChatStore } from '../store/chatStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function JoinServerDialog() {
  const [serverId, setServerId] = useState('')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const { joinServer } = useChatStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await joinServer(Number(serverId))
      setServerId('')
      setOpen(false)
    } catch {
      setError('Сервер не найден или ты уже состоишь в нём')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-10 h-10 rounded-full bg-slate-700 hover:bg-blue-500 hover:rounded-2xl transition-all flex items-center justify-center text-slate-400 hover:text-white text-xl font-bold">
          →
        </button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Вступить в сервер</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-200">ID сервера</Label>
            <Input
              type="number"
              value={serverId}
              onChange={e => setServerId(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="123"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" className="w-full">Вступить</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}