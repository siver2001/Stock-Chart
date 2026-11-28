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

function parseIntervalSpec(interval = '1D') {
  const s = String(interval || '1D').trim()
  const match = s.match(/^(\d+)([a-zA-Z]+)$/)
  if (!match) {
    if (s.toUpperCase() === 'D') return { mult: 1, unit: 'D' }
    if (s.toUpperCase() === 'W') return { mult: 1, unit: 'W' }
    return { mult: 1, unit: 'D' }
  }
  const mult = Math.max(1, parseInt(match[1], 10))
  const rawUnit = match[2]
  if (rawUnit === 'M' || rawUnit === 'mo' || rawUnit === 'MO') return { mult, unit: 'M' }
  const lower = rawUnit.toLowerCase()
  if (lower.startsWith('m')) return { mult, unit: 'm' }
  if (lower.startsWith('h')) return { mult, unit: 'h' }
  if (lower.startsWith('w')) return { mult, unit: 'W' }
  return { mult, unit: 'D' }
}

function getDChartSourceSpec(interval) {
  const { mult, unit } = parseIntervalSpec(interval)
  if (unit === 'm') {
    if (mult >= 15 && mult % 15 === 0) {
      return { res: '15', lookbackDays: 365, targetUnit: 'm', targetMult: mult }
    }
    return { res: '1', lookbackDays: mult === 1 ? 45 : 60, targetUnit: 'm', targetMult: mult }
  }
  if (unit === 'h') {
    return { res: '60', lookbackDays: mult >= 6 ? 730 : 365, targetUnit: 'h', targetMult: mult }
  }
  if (unit === 'W') {
    return { res: 'D', lookbackDays: 2555, targetUnit: 'W', targetMult: mult }
  }
  if (unit === 'M') {
    return { res: 'D', lookbackDays: mult >= 3 ? 5475 : 3650, targetUnit: 'M', targetMult: mult }
  }
  // Daily (1D, 2D, 3D, 5D...)
  return { res: 'D', lookbackDays: mult > 1 ? 2555 : 1825, targetUnit: 'D', targetMult: mult }
}

export function getBucketTimestamp(tsMs, unit, mult) {
  const VN_OFFSET_MS = 7 * 3600 * 1000
  if (unit === 'm') {
    const stepMs = mult * 60 * 1000
    const vn = new Date(tsMs + VN_OFFSET_MS)
    const dayStartMs = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - VN_OFFSET_MS
    const sessionAnchor = dayStartMs + 9 * 3600 * 1000 // 09:00 GMT+7 VN market open
    if (tsMs >= sessionAnchor) {
      return sessionAnchor + Math.floor((tsMs - sessionAnchor) / stepMs) * stepMs
    }
    return Math.floor(tsMs / stepMs) * stepMs
  }
  if (unit === 'h') {
    // Session-aware VN trading hour buckets anchored at 09:00 VN market open
    const vn = new Date(tsMs + VN_OFFSET_MS)
    const dayStartMs = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - VN_OFFSET_MS
    const vnHour = vn.getUTCHours()
    const anchorHour = 9
    const relHours = Math.max(0, vnHour - anchorHour)
    const bucketIndex = Math.floor(relHours / mult)
    return dayStartMs + (anchorHour + bucketIndex * mult) * 3600 * 1000
  }
  const vn = new Date(tsMs + VN_OFFSET_MS)
  const y = vn.getUTCFullYear()
  const m = vn.getUTCMonth()
  const d = vn.getUTCDate()
  if (unit === 'D') {
    if (mult === 1) return tsMs
    const dayNum = Math.floor(Date.UTC(y, m, d) / 86400000)
    return Math.floor(dayNum / mult) * mult * 86400000
  }
  if (unit === 'W') {
    // Monday start of ISO week (UTC midnight matching DChart daily convention)
    // Unix epoch day 0 (1970-01-01) was Thursday, so Monday 1970-01-05 is +4 days
    const dayOfWeek = (vn.getUTCDay() + 6) % 7 // Monday = 0 .. Sunday = 6
    const mondayMs = Date.UTC(y, m, d - dayOfWeek)
    if (mult === 1) return mondayMs
    const MONDAY_EPOCH_MS = 4 * 86400000
    const weekNum = Math.floor((mondayMs - MONDAY_EPOCH_MS) / (7 * 86400000))
    return MONDAY_EPOCH_MS + Math.floor(weekNum / mult) * mult * 7 * 86400000
  }
  if (unit === 'M') {
    const monthIndex = y * 12 + m
    const bucketMonth = Math.floor(monthIndex / mult) * mult
    const by = Math.floor(bucketMonth / 12)
    const bm = bucketMonth % 12
    return Date.UTC(by, bm, 1)
  }
  return tsMs
}

function resampleBars(bars, unit, mult) {
  if (!Array.isArray(bars) || bars.length === 0) return []
  const isNative =
    (unit === 'D' && mult === 1) ||
    (unit === 'h' && mult === 1) ||
    (unit === 'm' && (mult === 1 || mult === 15))
  if (isNative) return bars

  const out = []
  let cur = null
  let curBucket = null
  for (const b of bars) {
    const bucket = getBucketTimestamp(b.timestamp, unit, mult)
    if (cur === null || bucket !== curBucket) {
      if (cur !== null) out.push(cur)
      curBucket = bucket
      cur = {
        timestamp: bucket,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume || 0,
      }
    } else {
      if (b.high > cur.high) cur.high = b.high
      if (b.low < cur.low) cur.low = b.low
      cur.close = b.close
      cur.volume += b.volume || 0
    }
  }
  if (cur !== null) out.push(cur)
  return out
}

function normalizeEpochSec(val) {
  const num = Number(val)
  if (!Number.isFinite(num) || num <= 0) return null
  return num > 10_000_000_000 ? Math.floor(num / 1000) : Math.floor(num)
}

function parseDChartBars(data, ticker) {
  if (!data || data.s !== 'ok' || !Array.isArray(data.t) || data.t.length === 0) return []
  const rawBars = []
  for (let i = 0; i < data.t.length; i++) {
    const t = Number(data.t[i])
    const o = Number(data.o?.[i])
    const h = Number(data.h?.[i])
    const l = Number(data.l?.[i])
    const c = Number(data.c?.[i])
    const v = Number(data.v?.[i]) || 0
    if (!Number.isFinite(t) || !Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c)) {
      continue
    }
    rawBars.push({ timestamp: t * 1000, open: o, high: h, low: l, close: c, volume: v })
  }
  if (rawBars.length === 0) return []

  const isIndex = INDEX_SYMBOLS.has(ticker)
  const sortedCloses = rawBars.map((b) => b.close).sort((a, b) => a - b)
  const medianClose = sortedCloses[Math.floor(sortedCloses.length / 2)]
  const mul = !isIndex && medianClose < 500 ? 1000 : 1
  const dec = isIndex ? 2 : 0
  const fmt = (n) => Number((n * mul).toFixed(dec))

  rawBars.sort((a, b) => a.timestamp - b.timestamp)
  const deduped = []
  let lastTs = -1
  for (const b of rawBars) {
    if (b.timestamp === lastTs) continue
    lastTs = b.timestamp
    deduped.push({
      timestamp: b.timestamp,
      open: fmt(b.open),
      high: fmt(b.high),
      low: fmt(b.low),
      close: fmt(b.close),
      volume: b.volume,
    })
  }
  return deduped
}

let _dchartBlockedUntil = 0

function isDChartSkippedInBrowser() {
  return typeof window !== 'undefined' && Date.now() < _dchartBlockedUntil
}

function noteDChartStatus(status) {
  if (typeof window !== 'undefined' && (status === 403 || status === 401)) {
    _dchartBlockedUntil = Date.now() + 60_000
  }
}

export async function fetchHistory({ symbol, interval = '1D', from, to }) {
  const ticker = String(symbol || 'VNINDEX').trim().toUpperCase()
  const intKey = String(interval || '1D').trim()
  const spec = getDChartSourceSpec(intKey)

  // Ultra-fast client-direct VNDIRECT DChart + JS resampling for ALL timeframes (~130-450ms)
  if (!isDChartSkippedInBrowser()) {
    try {
      const nowSec = Math.floor(Date.now() / 1000)
      const toSec = normalizeEpochSec(to) || nowSec
      const fromSec = normalizeEpochSec(from) || (toSec - spec.lookbackDays * 86400)
      const url = `https://dchart-api.vndirect.com.vn/dchart/history?resolution=${spec.res}&symbol=${encodeURIComponent(ticker)}&from=${fromSec}&to=${toSec}`
      const resp = await fetch(url, { signal: createTimeoutSignal(6000) })
      if (resp.ok) {
        const json = await resp.json()
        const rawBars = parseDChartBars(json, ticker)
        if (rawBars.length > 0) {
          const resampled = resampleBars(rawBars, spec.targetUnit, spec.targetMult)
          if (resampled.length > 0) return resampled
        }
      } else {
        noteDChartStatus(resp.status)
      }
    } catch {
      // Fall back transparently to FastAPI /api/history
    }
  }

  const params = { symbol: ticker, interval: intKey }
  if (from) params.from = from
  if (to) params.to = to
  const { data } = await api.get('/history', { params })
  return Array.isArray(data) ? data : []
}

export async function fetchLatest({ symbol, interval = '1D' }) {
  const ticker = String(symbol || 'VNINDEX').trim().toUpperCase()
  const intKey = String(interval || '1D').trim()
  const spec = getDChartSourceSpec(intKey)

  // Fast client-direct path for Daily / Weekly / Monthly quotes (reuses ultra-fast VPS/DChart)
  if (spec.targetUnit === 'D' || spec.targetUnit === 'W' || spec.targetUnit === 'M') {
    try {
      const qMap = await fetchQuotes([ticker])
      const q = qMap?.[ticker]
      if (q && q.close != null) {
        return {
          symbol: ticker,
          timestamp: q.timestamp,
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          volume: q.volume,
          ref_price: q.ref_price,
          change: q.change,
          pct_change: q.pct_change,
        }
      }
    } catch {}
  } else if (!isDChartSkippedInBrowser()) {
    // Fast client-direct path for any intraday timeframe (1m..45m, 1h..12h)
    try {
      const nowSec = Math.floor(Date.now() / 1000)
      const fromSec = nowSec - (spec.targetUnit === 'h' ? 5 : 2) * 86400
      const url = `https://dchart-api.vndirect.com.vn/dchart/history?resolution=${spec.res}&symbol=${encodeURIComponent(ticker)}&from=${fromSec}&to=${nowSec}`
      const resp = await fetch(url, { signal: createTimeoutSignal(3500) })
      if (resp.ok) {
        const json = await resp.json()
        const rawBars = parseDChartBars(json, ticker)
        const bars = resampleBars(rawBars, spec.targetUnit, spec.targetMult)
        if (bars.length > 0) {
          const lastBar = bars[bars.length - 1]
          const refPrice = bars.length >= 2 ? bars[bars.length - 2].close : lastBar.open
          const dec = INDEX_SYMBOLS.has(ticker) ? 2 : 0
          const diff = Number((lastBar.close - refPrice).toFixed(dec))
          const pct = refPrice !== 0 ? Number(((diff / refPrice) * 100).toFixed(2)) : 0
          return { ...lastBar, ref_price: refPrice, change: diff, pct_change: pct }
        }
      } else {
        noteDChartStatus(resp.status)
      }
    } catch {}
  }

  const { data } = await api.get('/latest', { params: { symbol: ticker, interval: intKey } })
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
  if (isDChartSkippedInBrowser()) return null
  const nowSec = Math.floor(Date.now() / 1000)
  const fromSec = nowSec - 7 * 86400
  const url = `https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=${encodeURIComponent(sym)}&from=${fromSec}&to=${nowSec}`
  const resp = await fetch(url, { signal: createTimeoutSignal(3000) })
  if (!resp.ok) {
    noteDChartStatus(resp.status)
    return null
  }
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

function getVnDayUtcMidnightMs(nowMs = Date.now()) {
  const vnDate = new Date(nowMs + 7 * 3600 * 1000)
  return Date.UTC(vnDate.getUTCFullYear(), vnDate.getUTCMonth(), vnDate.getUTCDate())
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
  const dayTsMs = getVnDayUtcMidnightMs(nowMs)
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
        timestamp: dayTsMs,
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
            timestamp: dayTsMs,
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
