import { create } from 'zustand'
import api from '../api/axios'

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('access_token', data.access_token)
    const me = await api.get('/auth/me')
    set({ user: me.data })
  },

  register: async (username, email, password) => {
    await api.post('/auth/register', { username, email, password })
  },

  logout: async () => {
    await api.post('/auth/logout')
    localStorage.removeItem('access_token')
    set({ user: null })
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data, isLoading: false })
    } catch {
      set({ user: null, isLoading: false })
    }
  },
}))