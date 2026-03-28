import axios from 'axios'
import { API_URL } from '../config'
import { getToken, setToken, clearToken } from '../store/tokenStore'

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
})

api.interceptors.request.use(config => {
  if (config.skipAuthRefresh) return config
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshPromise = null

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && !original.skipAuthRefresh) {
      original._retry = true
      try {
        // если рефреш уже идёт — ждём его вместо нового запроса
        if (!refreshPromise) {
          refreshPromise = api.post('/auth/refresh', {}, {
            withCredentials: true,
            skipAuthRefresh: true,
          }).finally(() => { refreshPromise = null })
        }

        const { data } = await refreshPromise
        setToken(data.access_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        clearToken()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api