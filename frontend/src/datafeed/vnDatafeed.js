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
  }

  async searchSymbols(search = '') {
    const list = await searchSymbols(search)
    return list.map((item) => ({
      ticker: item.ticker,
      name: item.name || item.ticker,
      shortName: item.shortName || item.ticker,
      exchange: item.exchange || 'HOSE',
      market: item.market || 'stocks',
      priceCurrency: item.priceCurrency || 'VND',
      type: item.type || 'CS',
      pricePrecision: 2,
      volumePrecision: 0,
    }))
  }

  async getHistoryKLineData(symbol, period, from, to) {
    const interval = mapPeriodToInterval(period)
    const ticker = symbol?.ticker || symbol || 'VNINDEX'

    try {
      const historyBars = await fetchHistory({
        symbol: ticker,
        interval,
        from,
        to,
      })

      if (this.onDataOriginChange) {
        this.onDataOriginChange('VND / vnstock', ticker)
      }

      if (historyBars && historyBars.length > 0) {
        return historyBars.map((bar) => ({
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

    const startDate = from ? new Date(from).toISOString().slice(0, 10) : '2023-01-01'
    const endDate = to ? new Date(to).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)

    const res = await fetchKLines({
      symbol: ticker,
      interval,
      startDate,
      endDate,
    })

    if (this.onDataOriginChange) {
      this.onDataOriginChange(res.data_origin || 'unknown', ticker)
    }

    return (res.data || []).map((bar) => ({
      timestamp: Number(bar.timestamp),
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
      volume: Number(bar.volume),
    }))
  }

  subscribe(symbol, period, callback) {
    const interval = mapPeriodToInterval(period)
    const ticker = symbol?.ticker || symbol || 'VNINDEX'
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
    const ticker = symbol?.ticker || symbol || 'VNINDEX'
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
