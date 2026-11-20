import axios from 'axios'

// Tự động nhận diện URL:
// 1. Nếu có biến môi trường VITE_API_URL (ví dụ chạy backend riêng domain) -> dùng URL đó
// 2. Mặc định dùng relative '/api' -> cùng domain trên Vercel hoặc qua Vite proxy localhost
const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim()
const resolvedBaseUrl = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api`)
  : '/api'

const api = axios.create({
  baseURL: resolvedBaseUrl,
  timeout: 30000,
})

export async function searchSymbols(query = '') {
  const { data } = await api.get('/symbols', { params: { q: query } })
  if (Array.isArray(data)) return data
  return data.symbols || []
}

export async function fetchHistory({ symbol, interval = '1D', from, to }) {
  const params = { symbol, interval }
  if (from) params.from = from
  if (to) params.to = to
  const { data } = await api.get('/history', { params })
  return Array.isArray(data) ? data : []
}

export async function fetchLatest({ symbol, interval = '1D' }) {
  const { data } = await api.get('/latest', { params: { symbol, interval } })
  return data
}

export async function fetchQuotes(symbols) {
  const symStr = Array.isArray(symbols) ? symbols.join(',') : symbols
  const { data } = await api.get('/quotes', { params: { symbols: symStr } })
  return data || {}
}

export async function fetchKLines({ symbol, interval = '1D', startDate, endDate }) {
  const { data } = await api.get('/klines', {
    params: {
      symbol,
      interval,
      start_date: startDate,
      end_date: endDate,
    },
  })
  return data
}

export async function executeBacktest(payload) {
  const { data } = await api.post('/backtest', payload)
  return data
}
