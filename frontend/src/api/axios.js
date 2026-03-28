import axios from 'axios'
import { API_URL } from '../config'

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
})

// автоматически добавляем access токен в каждый запрос
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// если получили 401 — пробуем обновить токен
api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { data } = await api.post('/auth/refresh', {}, {
          withCredentials: true
        })
        localStorage.setItem('access_token', data.access_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch (e) {
        console.log('refresh failed:', e.response?.status)
        localStorage.removeItem('access_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api