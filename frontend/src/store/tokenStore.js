let accessToken = null

export const getToken = () => accessToken
export const setToken = (token) => { accessToken = token }
export const clearToken = () => { accessToken = null }