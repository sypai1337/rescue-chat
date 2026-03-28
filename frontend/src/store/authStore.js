import { create } from 'zustand'
import api from '../api/axios'
import { getToken, setToken, clearToken } from '../store/tokenStore'

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    setToken(data.access_token)
    const me = await api.get('/auth/me')
    set({ user: me.data })
  },

  register: async (username, email, password) => {
    await api.post('/auth/register', { username, email, password })
  },

  logout: async () => {
    await api.post('/auth/logout')
    clearToken()
    set({ user: null })
  },

  fetchMe: async () => {
    try {
      const { data: refreshData } = await api.post('/auth/refresh', {}, {
        withCredentials: true,
        skipAuthRefresh: true,
      })
      setToken(refreshData.access_token)

      const { data } = await api.get('/auth/me')
      set({ user: data, isLoading: false })
    } catch (e) {
      console.log('fetchMe failed:', e.response?.status)
      clearToken()
      set({ user: null, isLoading: false })
    }
  },
}))