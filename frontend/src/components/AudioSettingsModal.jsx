import { useEffect, useRef, useState } from 'react'
import { useAudioStore } from '../store/audioStore'

function MicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  )
}

function HeadphonesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}

function VolumeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

export default function AudioSettingsModal() {
  const [isOpen, setIsOpen] = useState(false)

  const [mics, setMics] = useState([])
  const [speakers, setSpeakers] = useState([])
  // idle | granted | denied
  const [permStatus, setPermStatus] = useState('idle')

  const store = useAudioStore()
  const [draft, setDraft] = useState({
    micDeviceId: store.micDeviceId,
    spkDeviceId: store.spkDeviceId,
    micVolume: store.micVolume,
    spkVolume: store.spkVolume,
  })

  const [micTesting, setMicTesting] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const micStreamRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    setDraft({
      micDeviceId: store.micDeviceId,
      spkDeviceId: store.spkDeviceId,
      micVolume: store.micVolume,
      spkVolume: store.spkVolume,
    })
    loadDevices()
  }, [isOpen])

  useEffect(() => {
    return () => stopMicTest()
  }, [])

  async function loadDevices() {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      tempStream.getTracks().forEach(t => t.stop())
      const devices = await navigator.mediaDevices.enumerateDevices()
      setMics(devices.filter(d => d.kind === 'audioinput'))
      setSpeakers(devices.filter(d => d.kind === 'audiooutput'))
      setPermStatus('granted')
    } catch {
      setPermStatus('denied')
    }
  }

  async function startMicTest() {
    try {
      const constraints = draft.micDeviceId && draft.micDeviceId !== 'default'
        ? { audio: { deviceId: { exact: draft.micDeviceId } } }
        : { audio: true }

      micStreamRef.current = await navigator.mediaDevices.getUserMedia(constraints)
      audioCtxRef.current = new AudioContext()
      analyserRef.current = audioCtxRef.current.createAnalyser()
      analyserRef.current.fftSize = 256

      const src = audioCtxRef.current.createMediaStreamSource(micStreamRef.current)
      src.connect(analyserRef.current)

      drawMeter()
      setMicTesting(true)
    } catch {
      // нет доступа
    }
  }

  function stopMicTest() {
    cancelAnimationFrame(animFrameRef.current)
    micStreamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close()
    micStreamRef.current = null
    audioCtxRef.current = null
    analyserRef.current = null
    setMicTesting(false)
    setMicLevel(0)
  }

  function toggleMicTest() {
    micTesting ? stopMicTest() : startMicTest()
  }

  function drawMeter() {
    if (!analyserRef.current) return
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    const avg = data.reduce((a, b) => a + b, 0) / data.length
    setMicLevel(Math.min(100, Math.round(avg * 2.5)))
    animFrameRef.current = requestAnimationFrame(drawMeter)
  }

  function testSpeaker() {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
    setTimeout(() => ctx.close(), 800)
  }

  function handleSave() {
    store.setAudioSettings(draft)
    stopMicTest()
    setIsOpen(false)
  }

  function handleClose() {
    stopMicTest()
    setIsOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        title="Настройки голоса и видео"
        className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
      >
        <SettingsIcon />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onMouseDown={e => e.target === e.currentTarget && handleClose()}
        >
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">

            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-700">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Настройки голоса и видео
                </h2>
                <p className="text-xs mt-0.5 text-slate-400">
                  {permStatus === 'granted' && '● Устройства подключены'}
                  {permStatus === 'denied' && '⚠ Нет доступа — разреши микрофон в браузере'}
                  {permStatus === 'idle' && 'Запрашиваем доступ...'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-500 hover:text-slate-200 transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-6">

              {/* ── Микрофон ── */}
              <section>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Микрофон
                </p>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 shrink-0"><MicIcon /></span>
                  <select
                    value={draft.micDeviceId}
                    onChange={e => {
                      setDraft(d => ({ ...d, micDeviceId: e.target.value }))
                      if (micTesting) {
                        stopMicTest()
                        setTimeout(startMicTest, 100)
                      }
                    }}
                    disabled={permStatus !== 'granted'}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 h-9 text-sm text-white focus:outline-none focus:border-slate-400 disabled:opacity-50"
                  >
                    {mics.length === 0
                      ? <option value="default">По умолчанию</option>
                      : mics.map((d, i) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Микрофон ${i + 1}`}
                          </option>
                        ))
                    }
                  </select>
                  <button
                    onClick={toggleMicTest}
                    disabled={permStatus !== 'granted'}
                    className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${
                      micTesting
                        ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${micTesting ? 'bg-red-400 animate-pulse' : 'bg-slate-400'}`} />
                    {micTesting ? 'Стоп' : 'Тест'}
                  </button>
                </div>

                {/* Уровень сигнала */}
                <div className="mt-3 flex items-center gap-3 pl-5">
                  <span className="text-xs text-slate-500 w-14 shrink-0">Уровень</span>
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-75"
                      style={{ width: `${micLevel}%` }}
                    />
                  </div>
                </div>

                {/* Громкость микрофона */}
                <div className="mt-3 flex items-center gap-3 pl-5">
                  <span className="text-slate-500 shrink-0"><MicIcon /></span>
                  <input
                    type="range" min="0" max="100" step="1"
                    value={draft.micVolume}
                    onChange={e => setDraft(d => ({ ...d, micVolume: Number(e.target.value) }))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="text-xs text-slate-400 w-9 text-right tabular-nums">
                    {draft.micVolume}%
                  </span>
                </div>
              </section>

              <div className="border-t border-slate-700" />

              {/* ── Наушники / Динамики ── */}
              <section>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Наушники / Динамики
                </p>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 shrink-0"><HeadphonesIcon /></span>
                  <select
                    value={draft.spkDeviceId}
                    onChange={e => setDraft(d => ({ ...d, spkDeviceId: e.target.value }))}
                    disabled={permStatus !== 'granted'}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 h-9 text-sm text-white focus:outline-none focus:border-slate-400 disabled:opacity-50"
                  >
                    {speakers.length === 0
                      ? <option value="default">По умолчанию</option>
                      : speakers.map((d, i) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Динамик ${i + 1}`}
                          </option>
                        ))
                    }
                  </select>
                  <button
                    onClick={testSpeaker}
                    disabled={permStatus !== 'granted'}
                    className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-40"
                  >
                    ▶ Тест
                  </button>
                </div>

                {/* Громкость наушников */}
                <div className="mt-3 flex items-center gap-3 pl-5">
                  <span className="text-slate-500 shrink-0"><VolumeIcon /></span>
                  <input
                    type="range" min="0" max="100" step="1"
                    value={draft.spkVolume}
                    onChange={e => setDraft(d => ({ ...d, spkVolume: Number(e.target.value) }))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="text-xs text-slate-400 w-9 text-right tabular-nums">
                    {draft.spkVolume}%
                  </span>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 pt-2 flex justify-end gap-2 border-t border-slate-700">
              <button
                onClick={handleClose}
                className="px-4 h-9 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="px-4 h-9 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
