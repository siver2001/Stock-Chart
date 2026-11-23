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
    const item = this._cache.get(key)
    if (!item) return null
    const isDaily = key.endsWith('1D') || key.endsWith('1W') || key.endsWith('1M')
    const ttl = isDaily ? 180000 : 30000 // 3 min for daily, 30s for intraday
    if (Date.now() - item.timestamp < ttl) {
      return item.bars
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

  async getHistoryKLineData(symbol, period, from, to) {
    const interval = mapPeriodToInterval(period)
    const ticker = (symbol?.ticker || symbol || 'VNINDEX').toUpperCase()
    const key = `${ticker}_${interval}`

    // 1. Instant cache hit check (nếu không có from/to đặc biệt)
    if (!from && !to) {
      const cached = this.getCachedData(symbol, period)
      if (cached && cached.length > 0) {
        if (this.onDataOriginChange) {
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
          const startDate = from ? new Date(from).toISOString().slice(0, 10) : '2023-01-01'
          const endDate = to ? new Date(to).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)

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

        if (this.onDataOriginChange) {
          this.onDataOriginChange(origin, ticker)
        }

        if (bars && bars.length > 0 && !from && !to) {
          this._cache.set(key, {
            timestamp: Date.now(),
            bars,
            origin,
          })
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
          this.getHistoryKLineData(ticker, period).catch(() => {})
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
        if (latest && callback) {
          callback({
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
