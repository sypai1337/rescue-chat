import { create } from 'zustand'
import api from '../api/axios'

export const useChatStore = create((set, get) => ({
  servers: [],
  channels: [],
  messages: [],
  activeServer: null,
  activeChannel: null,

  fetchServers: async () => {
    const { data } = await api.get('/servers')
    set({ servers: data })
  },

  fetchChannels: async (serverId) => {
    const { data } = await api.get(`/servers/${serverId}/channels`)
    set({ channels: data, activeServer: serverId })
  },

  fetchMessages: async (channelId) => {
    const { data } = await api.get(`/channels/${channelId}/messages`)
    set({ messages: data, activeChannel: channelId })
  },

  addMessage: (message) => {
    set(state => ({ messages: [...state.messages, message] }))
  },

  createServer: async (name) => {
    const { data } = await api.post('/servers', { name })
    set(state => ({ servers: [...state.servers, data] }))
  },

  createChannel: async (serverId, name, type = 'text') => {
    const { data } = await api.post(`/servers/${serverId}/channels`, { name, type })
    set(state => ({ channels: [...state.channels, data] }))
  },

  deleteServer: async (serverId) => {
    await api.delete(`/servers/${serverId}`)
    set(state => ({
        servers: state.servers.filter(s => s.id !== serverId),
        channels: state.activeServer === serverId ? [] : state.channels,
        activeServer: state.activeServer === serverId ? null : state.activeServer,
    }))
  },

  deleteChannel: async (channelId) => {
    await api.delete(`/channels/${channelId}`)
    set(state => ({
      channels: state.channels.filter(c => c.id !== channelId),
      activeChannel: state.activeChannel === channelId ? null : state.activeChannel,
      messages: state.activeChannel === channelId ? [] : state.messages,
    }))
  },

  joinServer: async (serverId) => {
    const { data } = await api.post(`/servers/${serverId}/join`)
    set(state => ({ servers: [...state.servers, data] }))
  },

  fetchOlderMessages: async (channelId) => {
    const { messages } = get()
    if (messages.length === 0) return

    const oldestId = messages[0].id
    const { data } = await api.get(`/channels/${channelId}/messages?before_id=${oldestId}&limit=50`)

    if (data.length === 0) return

    set(state => ({ messages: [...data, ...state.messages] }))
    return data.length
  },

  membersByServer: {},

  fetchMembers: async (serverId) => {
    const { data } = await api.get(`/servers/${serverId}/members`)
    set(state => ({
      membersByServer: { ...state.membersByServer, [serverId]: data }
    }))
  },

  setMemberOnline: (userId, online) => {
    set(state => ({
      membersByServer: Object.fromEntries(
        Object.entries(state.membersByServer).map(([sid, members]) => [
          sid,
          members.map(m => m.id === userId ? { ...m, online } : m)
        ])
      )
    }))
  },

  removeMember: (userId) => {
    set(state => ({
      membersByServer: Object.fromEntries(
        Object.entries(state.membersByServer).map(([sid, members]) => [
          sid,
          members.filter(m => m.id !== userId)
        ])
      )
    }))
  },

  leaveServer: async (serverId) => {
    await api.post(`/servers/${serverId}/leave`)
    set(state => ({
      servers: state.servers.filter(s => s.id !== serverId),
      channels: state.activeServer === serverId ? [] : state.channels,
      messages: state.activeServer === serverId ? [] : state.messages,
      activeServer: state.activeServer === serverId ? null : state.activeServer,
    }))
  },
}))