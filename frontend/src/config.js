const isProd = import.meta.env.PROD

export const API_URL = isProd ? '' : 'http://localhost:8000'
export const WS_URL = isProd ? `ws://${window.location.host}` : 'ws://localhost:8000'