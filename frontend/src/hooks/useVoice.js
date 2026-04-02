import { useEffect, useRef, useState } from 'react'
import { getToken } from '../store/tokenStore'

const STUN_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}

export function useVoice(currentUserId, sendRaw) {
  const [participants, setParticipants] = useState([])
  const [isMuted, setIsMuted] = useState(false)
  const localStreamRef = useRef(null)
  const peersRef = useRef({}) // userId → RTCPeerConnection
  const createPeer = (targetUserId) => {
    const peer = new RTCPeerConnection(STUN_CONFIG)

    // добавляем локальные треки в соединение
    localStreamRef.current.getTracks().forEach(track => {
      peer.addTrack(track, localStreamRef.current)
    })

    // когда приходит удалённый аудиопоток — воспроизводим
    peer.ontrack = (e) => {
      const audio = new Audio()
      audio.srcObject = e.streams[0]
      audio.play()
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

  const joinVoice = async (channelId) => {
    localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    sendRaw({ type: 'join_voice', channel_id: channelId })
  }

  const leaveVoice = (channelId) => {
    sendRaw({ type: 'leave_voice', channel_id: channelId })
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    Object.values(peersRef.current).forEach(p => p.close())
    peersRef.current = {}
    localStreamRef.current = null
    setParticipants([])
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
      peersRef.current[data.user_id]?.close()
      delete peersRef.current[data.user_id]
    }

    if (data.type === 'offer') {
      const peer = createPeer(data.from)
      await peer.setRemoteDescription(data.sdp)
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      sendRaw({ type: 'answer', to: data.from, sdp: answer })
    }

    if (data.type === 'answer') {
      await peersRef.current[data.from]?.setRemoteDescription(data.sdp)
    }

    if (data.type === 'ice_candidate') {
      await peersRef.current[data.from]?.addIceCandidate(data.candidate)
    }
  }

  return { participants, isMuted, joinVoice, leaveVoice, toggleMute, handleVoiceMessage }
}