import { useEffect, useRef, useState } from 'react'
import { getToken } from '../store/tokenStore'
import { useAudioStore } from '../store/audioStore'

const STUN_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}

export function useVoice(currentUserId, sendRaw) {
  const [participants, setParticipants] = useState([])
  const [isMuted, setIsMuted] = useState(false)
  const localStreamRef = useRef(null)
  const audioCtxRef = useRef(null)
  const audiosRef = useRef({})
  const peersRef = useRef({}) // userId → RTCPeerConnection
  const gainNodeRef = useRef(null)
  const iceCandidateQueueRef = useRef({}) 

  useEffect(() => {
    const unsub = useAudioStore.subscribe((state) => {
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = state.micVolume / 100
      }
      Object.values(audiosRef.current).forEach(audio => {
        audio.volume = state.spkVolume / 100
      })
    })
    return unsub
  }, [])

  const createPeer = (targetUserId) => {
    if (peersRef.current[targetUserId]) {
      peersRef.current[targetUserId].close()
      delete peersRef.current[targetUserId]
    }
    if (audiosRef.current[targetUserId]) {
      audiosRef.current[targetUserId].pause()
      audiosRef.current[targetUserId].srcObject = null
      delete audiosRef.current[targetUserId]
    }
    const peer = new RTCPeerConnection(STUN_CONFIG)

    // добавляем локальные треки в соединение
    localStreamRef.current.getTracks().forEach(track => {
      peer.addTrack(track, localStreamRef.current)
    })

    // когда приходит удалённый аудиопоток — воспроизводим
    peer.ontrack = (e) => {
      const { spkVolume } = useAudioStore.getState()
      const audio = new Audio()
      audio.srcObject = e.streams[0]
      audio.volume = spkVolume / 100
      audio.autoplay = true
      audio.play().catch(() => {})
      // сохраняем чтобы потом можно было менять громкость
      audiosRef.current[targetUserId] = audio
    }

    // ICE кандидаты отправляем через WebSocket
    peer.onicecandidate = (e) => {
      if (e.candidate) {
        sendRaw({
          type: 'ice_candidate',
          to: targetUserId,
          candidate: e.candidate
        })
      }
    }

    peersRef.current[targetUserId] = peer
    return peer
  }

  const flushCandidates = async (userId) => {
    const queue = iceCandidateQueueRef.current[userId] || []
    for (const candidate of queue) {
      await peersRef.current[userId]?.addIceCandidate(candidate)
    }
    delete iceCandidateQueueRef.current[userId]
  }

  const joinVoice = async (channelId) => {
    const { micDeviceId, micVolume } = useAudioStore.getState()
    const constraints = micDeviceId && micDeviceId !== 'default'
      ? { audio: { deviceId: { exact: micDeviceId }, noiseSuppression: true, echoCancellation: true } }
      : { audio: { noiseSuppression: true, echoCancellation: true } }
    
    
    localStreamRef.current = await navigator.mediaDevices.getUserMedia(constraints)

    // применяем громкость микрофона через GainNode
    const audioCtx = new AudioContext()
    const source = audioCtx.createMediaStreamSource(localStreamRef.current)
    const gainNode = audioCtx.createGain()
    gainNodeRef.current = gainNode
    gainNode.gain.value = micVolume / 100
    const destination = audioCtx.createMediaStreamDestination()
    source.connect(gainNode)
    gainNode.connect(destination)
    // используем обработанный стрим вместо оригинального
    localStreamRef.current = destination.stream
    audioCtxRef.current = audioCtx

    sendRaw({ type: 'join_voice', channel_id: channelId })
  }

  const leaveVoice = (channelId) => {
    sendRaw({ type: 'leave_voice', channel_id: channelId })
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    Object.values(peersRef.current).forEach(p => p.close())
    peersRef.current = {}
    localStreamRef.current = null
    setParticipants([])
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    Object.values(audiosRef.current).forEach(a => { a.pause(); a.srcObject = null })
    audiosRef.current = {}
    iceCandidateQueueRef.current = {}
  }

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled
    })
    setIsMuted(prev => !prev)
  }

  // обработка входящих WebRTC сообщений
  const handleVoiceMessage = async (data) => {
    if (data.type === 'voice_participants') {
      console.log('voice_participants:', data.user_ids)
    }
    if (data.type === 'user_joined_voice') {
      console.log('user_joined_voice:', data.user_id)
    }
    if (data.type === 'user_left_voice') {
      console.log('user_left_voice:', data.user_id)
    }
    if (data.type === 'offer') {
      console.log('got offer from:', data.from)
    }
    if (data.type === 'answer') {
      console.log('got answer from:', data.from)
    }
    if (data.type === 'ice_candidate') {
      console.log('got ice_candidate from:', data.from)
    }
    
    if (data.type === 'voice_participants') {
      // бэкенд прислал список уже присутствующих — инициируем offer к каждому
      setParticipants(data.user_ids)
      for (const uid of data.user_ids) {
        if (uid === currentUserId) continue
        const peer = createPeer(uid)
        const offer = await peer.createOffer()
        await peer.setLocalDescription(offer)
        sendRaw({ type: 'offer', to: uid, sdp: offer })
      }
    }

    if (data.type === 'user_joined_voice') {
      setParticipants(prev => [...prev, data.user_id])
      // новый участник сам пришлёт offer, мы только ждём
    }

    if (data.type === 'user_left_voice') {
      setParticipants(prev => prev.filter(id => id !== data.user_id))
      audiosRef.current[data.user_id]?.pause()
      delete audiosRef.current[data.user_id]
      peersRef.current[data.user_id]?.close()
      delete peersRef.current[data.user_id]
    }

    if (data.type === 'offer') {
      const peer = createPeer(data.from)
      await peer.setRemoteDescription(data.sdp)
      await flushCandidates(data.from)  // ← добавить
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      sendRaw({ type: 'answer', to: data.from, sdp: answer })
    }

    if (data.type === 'answer') {
      await peersRef.current[data.from]?.setRemoteDescription(data.sdp)
      await flushCandidates(data.from)  // ← добавить
    }


    if (data.type === 'ice_candidate') {
      const peer = peersRef.current[data.from]
      if (!peer) return
      
      if (peer.remoteDescription) {
        await peer.addIceCandidate(data.candidate)
      } else {
        // remote description ещё не установлен — ставим в очередь
        if (!iceCandidateQueueRef.current[data.from]) {
          iceCandidateQueueRef.current[data.from] = []
        }
        iceCandidateQueueRef.current[data.from].push(data.candidate)
      }
    }
  }

  return { participants, isMuted, joinVoice, leaveVoice, toggleMute, handleVoiceMessage }
}