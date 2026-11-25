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

const VPS_INDEX_CODE_TO_SYM = {
  '10': 'VNINDEX',
  '11': 'VN30',
  '02': 'HNXINDEX',
  '03': 'UPCOMINDEX',
}
const INDEX_SYMBOLS = new Set(['VNINDEX', 'VN30', 'HNXINDEX', 'HNX30', 'UPCOMINDEX'])

// Short-lived cache for unlisted/fallback symbols so dead tickers don't slow down 3s polling
const _fallbackQuoteCache = new Map()
const FALLBACK_CACHE_TTL_MS = 60000

function createTimeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(), ms)
  return ctrl.signal
}

async function fetchDirectDChartQuote(sym) {
  const nowSec = Math.floor(Date.now() / 1000)
  const fromSec = nowSec - 7 * 86400
  const url = `https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=${encodeURIComponent(sym)}&from=${fromSec}&to=${nowSec}`
  const resp = await fetch(url, { signal: createTimeoutSignal(3000) })
  if (!resp.ok) return null
  const data = await resp.json()
  if (!data || data.s !== 'ok' || !Array.isArray(data.t) || data.t.length === 0) return null

  const lastIdx = data.t.length - 1
  const isIndex = INDEX_SYMBOLS.has(sym)
  const rawC = Number(data.c[lastIdx])
  const rawO = Number(data.o[lastIdx])
  const rawH = Number(data.h[lastIdx])
  const rawL = Number(data.l[lastIdx])
  const rawV = Number(data.v[lastIdx])
  const rawRef = lastIdx >= 1 ? Number(data.c[lastIdx - 1]) : rawO

  const mul = !isIndex && rawC < 500 ? 1000 : 1
  const dec = isIndex ? 2 : 0
  const roundVal = (n) => Number((n * mul).toFixed(dec))

  const close = roundVal(rawC)
  const refPrice = roundVal(rawRef)
  const diff = Number((close - refPrice).toFixed(dec))
  const pct = refPrice !== 0 ? Number(((diff / refPrice) * 100).toFixed(2)) : 0

  return {
    symbol: sym,
    close,
    open: roundVal(rawO),
    high: roundVal(rawH),
    low: roundVal(rawL),
    volume: rawV,
    timestamp: Number(data.t[lastIdx]) * 1000,
    ref_price: refPrice,
    change: diff,
    pct_change: pct,
  }
}

async function fetchQuotesDirectVPS(symList) {
  const results = {}
  const indexSyms = symList.filter((s) => INDEX_SYMBOLS.has(s))
  const stockSyms = symList.filter((s) => !INDEX_SYMBOLS.has(s))

  const stockChunks = []
  for (let i = 0; i < stockSyms.length; i += 70) {
    stockChunks.push(stockSyms.slice(i, i + 70))
  }

  const nowMs = Date.now()
  const needVpsIdx = indexSyms.some((s) => Object.values(VPS_INDEX_CODE_TO_SYM).includes(s))

  const tasks = stockChunks.map(async (chunk) => {
    const resp = await fetch(`https://bgapidatafeed.vps.com.vn/getliststockdata/${chunk.join(',')}`, {
      signal: createTimeoutSignal(3000),
    })
    if (!resp.ok) throw new Error(`VPS HTTP ${resp.status}`)
    const items = await resp.json()
    if (!Array.isArray(items)) return
    for (const item of items) {
      if (!item || !item.sym) continue
      const sym = String(item.sym).trim().toUpperCase()
      const rRaw = Number(item.r) || 0
      const closeVnd = Number(item.closePrice) || 0
      const refPrice = rRaw > 0 ? Math.round(rRaw * 1000) : Math.round(closeVnd)
      const lastRaw = Number(item.lastPrice) || 0
      const close = lastRaw > 0 ? Math.round(lastRaw * 1000) : refPrice
      if (close <= 0) continue

      const finalRef = refPrice > 0 ? refPrice : close
      const openRaw = Number(item.openPrice) || 0
      const highRaw = Number(item.highPrice) || 0
      const lowRaw = Number(item.lowPrice) || 0
      const diff = Math.round(close - finalRef)
      const pct = finalRef !== 0 ? Number(((diff / finalRef) * 100).toFixed(2)) : 0

      results[sym] = {
        symbol: sym,
        close,
        open: openRaw > 0 ? Math.round(openRaw * 1000) : close,
        high: highRaw > 0 ? Math.round(highRaw * 1000) : close,
        low: lowRaw > 0 ? Math.round(lowRaw * 1000) : close,
        volume: Math.round((Number(item.lot) || 0) * 10),
        timestamp: nowMs,
        ref_price: finalRef,
        change: diff,
        pct_change: pct,
      }
    }
  })

  if (needVpsIdx) {
    tasks.push(
      (async () => {
        const resp = await fetch('https://bgapidatafeed.vps.com.vn/getlistindexdetail/10,11,02,03', {
          signal: createTimeoutSignal(3000),
        })
        if (!resp.ok) throw new Error(`VPS Idx HTTP ${resp.status}`)
        const items = await resp.json()
        if (!Array.isArray(items)) return
        for (const item of items) {
          if (!item) continue
          const mc = String(item.mc || item.hashValue || '').trim()
          const sym = VPS_INDEX_CODE_TO_SYM[mc]
          if (!sym) continue
          const close = Number((Number(item.cIndex) || 0).toFixed(2))
          const oIdx = Number((Number(item.oIndex) || 0).toFixed(2))
          if (close <= 0) continue
          const refPrice = oIdx > 0 ? oIdx : close
          const diff = Number((close - refPrice).toFixed(2))
          const pct = refPrice !== 0 ? Number(((diff / refPrice) * 100).toFixed(2)) : 0
          results[sym] = {
            symbol: sym,
            close,
            open: refPrice,
            high: Math.max(close, refPrice),
            low: Math.min(close, refPrice),
            volume: Math.round(Number(item.vol) || 0),
            timestamp: nowMs,
            ref_price: refPrice,
            change: diff,
            pct_change: pct,
          }
        }
      })()
    )
  }

  await Promise.all(tasks)

  // Only check direct DChart / cached backend fallback for the tiny handful missing from VPS
  const missing = symList.filter((s) => !results[s])
  if (missing.length > 0) {
    const stillMissing = []
    await Promise.all(
      missing.map(async (sym) => {
        const cached = _fallbackQuoteCache.get(sym)
        if (cached && cached.expiresAt > nowMs) {
          if (cached.data) results[sym] = cached.data
          return
        }
        try {
          const dq = await fetchDirectDChartQuote(sym)
          if (dq) {
            results[sym] = dq
            _fallbackQuoteCache.set(sym, { expiresAt: nowMs + 10000, data: dq })
            return
          }
        } catch {}
        stillMissing.push(sym)
      })
    )

    if (stillMissing.length > 0 && stillMissing.length <= 15) {
      try {
        const { data } = await api.get('/quotes', { params: { symbols: stillMissing.join(',') } })
        if (data && typeof data === 'object') {
          for (const sym of stillMissing) {
            const q = data[sym] || null
            if (q) results[sym] = q
            _fallbackQuoteCache.set(sym, { expiresAt: nowMs + FALLBACK_CACHE_TTL_MS, data: q })
          }
        }
      } catch {}
    }
  }

  return results
}

export async function fetchQuotes(symbols) {
  const symList = (Array.isArray(symbols) ? symbols : String(symbols || '').split(','))
    .map((s) => String(s || '').trim().toUpperCase())
    .filter(Boolean)

  if (symList.length === 0) return {}

  // Try ultra-fast client-direct VPS bulk feed first (~150ms for 127+ stocks)
  try {
    const directRes = await fetchQuotesDirectVPS(symList)
    if (directRes && Object.keys(directRes).length > 0) {
      return directRes
    }
  } catch {
    // Fallback to backend API if browser blocks CORS or VPS fails
  }

  const { data } = await api.get('/quotes', { params: { symbols: symList.join(',') } })
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
