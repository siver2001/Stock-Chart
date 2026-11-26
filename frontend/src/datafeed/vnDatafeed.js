import { searchSymbols, fetchKLines, fetchHistory, fetchLatest } from '../api/stockApi'

function mapPeriodToInterval(period) {
  if (!period) return '1D'
  const { multiplier = 1, timespan = 'day' } = period
  if (timespan === 'minute') return `${multiplier}m`
  if (timespan === 'hour') return `${multiplier}H`
  if (timespan === 'day') return multiplier > 1 ? `${multiplier}D` : '1D'
  if (timespan === 'week') return multiplier > 1 ? `${multiplier}W` : '1W'
  if (timespan === 'month') return multiplier > 1 ? `${multiplier}M` : '1M'
  return '1D'
}

const SESSION_KEY_LIST = 'vn_kline_sess_keys'
const SESSION_KEY_PREFIX = 'vn_kline_sess_'
const MAX_SESSION_CHARTS = 5

function readSessionKlineCache(key, ttlMs) {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && Array.isArray(parsed.bars) && parsed.bars.length > 0 && Date.now() - parsed.timestamp < ttlMs) {
      return parsed
    }
  } catch {}
  return null
}

function writeSessionKlineCache(key, bars, origin) {
  try {
    if (!Array.isArray(bars) || bars.length === 0) return
    let keys = []
    try {
      const rawKeys = sessionStorage.getItem(SESSION_KEY_LIST)
      if (rawKeys) keys = JSON.parse(rawKeys) || []
    } catch {}
    keys = keys.filter((k) => k !== key)
    keys.push(key)
    while (keys.length > MAX_SESSION_CHARTS) {
      const oldest = keys.shift()
      sessionStorage.removeItem(SESSION_KEY_PREFIX + oldest)
    }
    sessionStorage.setItem(SESSION_KEY_LIST, JSON.stringify(keys))
    sessionStorage.setItem(
      SESSION_KEY_PREFIX + key,
      JSON.stringify({ timestamp: Date.now(), bars, origin })
    )
  } catch {}
}

export class VNStockDatafeed {
  constructor(onDataOriginChange) {
    this.onDataOriginChange = onDataOriginChange
    this._subscribers = new Map()
    // In-memory cache: key -> { timestamp, bars, origin }
    this._cache = new Map()
    // In-flight deduplication: key -> Promise
    this._inflight = new Map()
  }

  getCacheKey(symbol, period) {
    const interval = mapPeriodToInterval(period)
    const ticker = (symbol?.ticker || symbol || 'VNINDEX').toUpperCase()
    return `${ticker}_${interval}`
  }

  getCachedData(symbol, period) {
    const key = this.getCacheKey(symbol, period)
    const isDaily = key.endsWith('1D') || key.endsWith('1W') || key.endsWith('1M')
    const ttl = isDaily ? 180000 : 30000 // 3 min for daily, 30s for intraday
    const item = this._cache.get(key)
    if (item && Date.now() - item.timestamp < ttl) {
      return item.bars
    }
    const sessItem = readSessionKlineCache(key, ttl)
    if (sessItem) {
      this._cache.set(key, sessItem)
      return sessItem.bars
    }
    return null
  }

  async searchSymbols(search = '') {
    const list = await searchSymbols(search)
    return list.map((item) => {
      const isIndex = ['VNINDEX', 'VN30', 'HNXINDEX', 'HNX30', 'UPCOMINDEX'].includes(item.ticker)
      return {
        ticker: item.ticker,
        name: item.name || item.ticker,
        shortName: item.shortName || item.ticker,
        exchange: item.exchange || 'HOSE',
        market: item.market || 'stocks',
        priceCurrency: item.priceCurrency || 'VND',
        type: item.type || 'CS',
        pricePrecision: isIndex ? 2 : 0,
        volumePrecision: 0,
      }
    })
  }

  async getHistoryKLineData(symbol, period, from, to, options = {}) {
    const { isPrefetch = false } = options
    const interval = mapPeriodToInterval(period)
    const ticker = (symbol?.ticker || symbol || 'VNINDEX').toUpperCase()
    const key = `${ticker}_${interval}`

    // 1. Instant cache hit check (nếu không có from/to đặc biệt)
    if (!from && !to) {
      const cached = this.getCachedData(symbol, period)
      if (cached && cached.length > 0) {
        if (!isPrefetch && this.onDataOriginChange) {
          const item = this._cache.get(key)
          this.onDataOriginChange(item?.origin || 'cache', ticker)
        }
        return cached
      }
    }

    // 2. In-flight request deduplication: nếu đang fetch dở cho cùng mã & khung, dùng lại promise
    if (!from && !to && this._inflight.has(key)) {
      return this._inflight.get(key)
    }

    const fetchPromise = (async () => {
      try {
        let bars = null
        let origin = 'VND / vnstock'

        try {
          const historyBars = await fetchHistory({
            symbol: ticker,
            interval,
            from,
            to,
          })

          if (historyBars && historyBars.length > 0) {
            bars = historyBars.map((bar) => ({
              timestamp: Number(bar.timestamp),
              open: Number(bar.open),
              high: Number(bar.high),
              low: Number(bar.low),
              close: Number(bar.close),
              volume: Number(bar.volume),
            }))
          }
        } catch {
          // Fallback to fetchKLines
        }

        if (!bars || bars.length === 0) {
          const defaultLookbackDays = interval.endsWith('m')
            ? 14
            : interval.endsWith('H') || interval.endsWith('h')
            ? 120
            : interval.endsWith('W') || interval.endsWith('M')
            ? 1825
            : 730
          const endMs = to || Date.now()
          const startMs = from || endMs - defaultLookbackDays * 86400000
          const startDate = new Date(startMs).toISOString().slice(0, 10)
          const endDate = new Date(endMs).toISOString().slice(0, 10)

          const res = await fetchKLines({
            symbol: ticker,
            interval,
            startDate,
            endDate,
          })

          origin = res.data_origin || 'unknown'
          bars = (res.data || []).map((bar) => ({
            timestamp: Number(bar.timestamp),
            open: Number(bar.open),
            high: Number(bar.high),
            low: Number(bar.low),
            close: Number(bar.close),
            volume: Number(bar.volume),
          }))
        }

        if (!isPrefetch && this.onDataOriginChange) {
          this.onDataOriginChange(origin, ticker)
        }

        if (bars && bars.length > 0 && !from && !to) {
          this._cache.set(key, {
            timestamp: Date.now(),
            bars,
            origin,
          })
          writeSessionKlineCache(key, bars, origin)
        }

        return bars || []
      } finally {
        this._inflight.delete(key)
      }
    })()

    if (!from && !to) {
      this._inflight.set(key, fetchPromise)
    }

    return fetchPromise
  }

  // Pre-fetch watchlist symbols in the background during idle time
  prefetchSymbols(symbols = [], period) {
    if (!Array.isArray(symbols) || symbols.length === 0) return

    let delay = 100
    for (const sym of symbols) {
      const ticker = (sym || '').toUpperCase().trim()
      if (!ticker) continue
      const key = this.getCacheKey(ticker, period)
      // Bỏ qua nếu đã có sẵn trong cache
      if (this._cache.has(key)) continue

      setTimeout(() => {
        // Chỉ nạp nếu vẫn chưa có
        if (!this._cache.has(key)) {
          this.getHistoryKLineData(ticker, period, undefined, undefined, { isPrefetch: true }).catch(() => {})
        }
      }, delay)

      delay += 120 // Giãn cách 120ms giữa mỗi request để không nghẽn mạng
    }
  }

  subscribe(symbol, period, callback) {
    const interval = mapPeriodToInterval(period)
    const ticker = (symbol?.ticker || symbol || 'VNINDEX').toUpperCase()
    const subKey = `${ticker}_${interval}`

    // Always clear ALL previous subscriptions so polling timers don't collide across symbols
    this.unsubscribeAll()

    const timer = setInterval(async () => {
      try {
        const latest = await fetchLatest({ symbol: ticker, interval })
        // Verify this subscription is still active before firing callback
        if (latest && callback && this._subscribers.get(subKey) === timer) {
          callback({
            symbol: ticker,
            timestamp: Number(latest.timestamp),
            open: Number(latest.open),
            high: Number(latest.high),
            low: Number(latest.low),
            close: Number(latest.close),
            volume: Number(latest.volume),
            ref_price: latest.ref_price ? Number(latest.ref_price) : undefined,
            change: latest.change ? Number(latest.change) : undefined,
            pct_change: latest.pct_change ? Number(latest.pct_change) : undefined,
          })
        }
      } catch {
        // silent polling ignore
      }
    }, 2000)

    this._subscribers.set(subKey, timer)
  }

  unsubscribe(symbol, period) {
    const interval = mapPeriodToInterval(period)
    const ticker = (symbol?.ticker || symbol || 'VNINDEX').toUpperCase()
    const subKey = `${ticker}_${interval}`
    if (this._subscribers.has(subKey)) {
      clearInterval(this._subscribers.get(subKey))
      this._subscribers.delete(subKey)
    }
  }

  unsubscribeAll() {
    for (const [key, timer] of this._subscribers.entries()) {
      clearInterval(timer)
    }
    this._subscribers.clear()
  }
}
