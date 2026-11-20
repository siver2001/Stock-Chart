import React, { useState, useEffect, useRef } from 'react'
import {
  Plus,
  Trash2,
  X,
  ListFilter,
  TrendingUp,
  TrendingDown,
  Bookmark,
  Check,
  ArrowUpDown,
} from 'lucide-react'
import { fetchQuotes } from '../api/stockApi'

const DEFAULT_WATCHLIST = ['VNINDEX', 'VN30', 'FPT', 'HPG', 'VCB', 'SSI', 'MWG', 'TCB']
const STORAGE_KEY = 'vn_stock_watchlist'
const FLAGS_STORAGE_KEY = 'vn_watchlist_flags'

export const FLAG_COLORS = [
  { id: 'red', name: 'Đỏ (Cắt lỗ / Chú ý)', hex: '#f23645' },
  { id: 'blue', name: 'Xanh dương (Bluechip / Trụ)', hex: '#2962ff' },
  { id: 'green', name: 'Xanh lá (Tăng trưởng / Điểm mua)', hex: '#089981' },
  { id: 'yellow', name: 'Vàng (Theo dõi tín hiệu)', hex: '#e3b341' },
  { id: 'purple', name: 'Tím (Tiềm năng / Siêu cổ)', hex: '#a855f7' },
  { id: 'orange', name: 'Cam (Biến động / Lướt sóng)', hex: '#f97316' },
]

export default function TradingViewWatchlist({
  activeSymbol,
  onSelectSymbol,
  onClose,
  latestBar,
}) {
  const [symbols, setSymbols] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return DEFAULT_WATCHLIST
  })

  const [symbolFlags, setSymbolFlags] = useState(() => {
    try {
      const saved = localStorage.getItem(FLAGS_STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return {}
  })

  const [colorFilter, setColorFilter] = useState('ALL')
  const [activeColorPickerSym, setActiveColorPickerSym] = useState(null)
  const [newTicker, setNewTicker] = useState('')
  const [quotes, setQuotes] = useState({})
  const [flashes, setFlashes] = useState({})
  const [sortBy, setSortBy] = useState('default') // 'default', 'pct_desc', 'pct_asc'
  const colorPickerRef = useRef(null)

  // Persist symbols
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols))
    } catch {}
  }, [symbols])

  // Persist flags
  useEffect(() => {
    try {
      localStorage.setItem(FLAGS_STORAGE_KEY, JSON.stringify(symbolFlags))
    } catch {}
  }, [symbolFlags])

  // Close color picker popover on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setActiveColorPickerSym(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Batch fetch quotes for ALL watchlist symbols
  useEffect(() => {
    let isMounted = true
    const loadQuotes = async () => {
      if (!symbols || symbols.length === 0) return
      try {
        const data = await fetchQuotes(symbols)
        if (isMounted && data) {
          setQuotes((prev) => {
            const nextFlashes = {}
            let hasFlash = false
            for (const [sym, q] of Object.entries(data)) {
              const oldQ = prev[sym]
              if (oldQ && oldQ.close != null && q.close != null) {
                if (q.close > oldQ.close) {
                  nextFlashes[sym] = 'up'
                  hasFlash = true
                } else if (q.close < oldQ.close) {
                  nextFlashes[sym] = 'down'
                  hasFlash = true
                }
              }
            }
            if (hasFlash) {
              setFlashes((f) => ({ ...f, ...nextFlashes }))
              setTimeout(() => {
                if (isMounted) {
                  setFlashes((f) => {
                    const cleaned = { ...f }
                    Object.keys(nextFlashes).forEach((k) => delete cleaned[k])
                    return cleaned
                  })
                }
              }, 800)
            }
            return { ...prev, ...data }
          })
        }
      } catch (err) {
        console.warn('Could not fetch quotes batch:', err)
      }
    }

    loadQuotes()
    const interval = setInterval(loadQuotes, 2000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [symbols])

  // Instantly reflect activeSymbol realtime latestBar
  useEffect(() => {
    if (activeSymbol && latestBar && latestBar.close != null) {
      setQuotes((prev) => {
        const existing = prev[activeSymbol]
        const refPrice = latestBar.ref_price || existing?.ref_price || latestBar.open || latestBar.close
        const diff = latestBar.close - refPrice
        const pct = refPrice ? (diff / refPrice) * 100 : 0
        return {
          ...prev,
          [activeSymbol]: {
            ...existing,
            symbol: activeSymbol,
            close: latestBar.close,
            open: latestBar.open,
            high: latestBar.high,
            low: latestBar.low,
            volume: latestBar.volume,
            ref_price: refPrice,
            change: diff,
            pct_change: Number(pct.toFixed(2)),
            timestamp: latestBar.timestamp,
          },
        }
      })
    }
  }, [activeSymbol, latestBar])

  const handleAdd = (e) => {
    e.preventDefault()
    const clean = newTicker.trim().toUpperCase()
    if (!clean) return
    if (!symbols.includes(clean)) {
      setSymbols([...symbols, clean])
    }
    setNewTicker('')
  }

  const handleRemove = (sym, e) => {
    e.stopPropagation()
    setSymbols(symbols.filter((s) => s !== sym))
    if (symbolFlags[sym]) {
      const nextFlags = { ...symbolFlags }
      delete nextFlags[sym]
      setSymbolFlags(nextFlags)
    }
  }

  const handleSetFlag = (sym, colorId) => {
    if (!colorId) {
      const next = { ...symbolFlags }
      delete next[sym]
      setSymbolFlags(next)
    } else {
      setSymbolFlags({ ...symbolFlags, [sym]: colorId })
    }
    setActiveColorPickerSym(null)
  }

  const formatPrice = (val, sym) => {
    if (val == null) return '--'
    const isIndex = sym === 'VNINDEX' || sym === 'VN30'
    return new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: isIndex ? 2 : 0,
      maximumFractionDigits: isIndex ? 2 : 0,
    }).format(val)
  }

  const formatNum = (n) => (n != null ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '--')

  // Filtered and Sorted Symbols
  const filteredSymbols = symbols.filter((sym) => {
    if (colorFilter === 'ALL') return true
    return symbolFlags[sym] === colorFilter
  })

  const sortedSymbols = [...filteredSymbols].sort((a, b) => {
    if (sortBy === 'pct_desc') {
      const pctA = quotes[a]?.pct_change ?? -999
      const pctB = quotes[b]?.pct_change ?? -999
      return pctB - pctA
    }
    if (sortBy === 'pct_asc') {
      const pctA = quotes[a]?.pct_change ?? 999
      const pctB = quotes[b]?.pct_change ?? 999
      return pctA - pctB
    }
    return 0
  })

  // Active symbol quote or latest bar
  const activeQuote = quotes[activeSymbol]
  const activePriceChange = activeQuote
    ? activeQuote.pct_change
    : latestBar && (latestBar.ref_price || latestBar.open)
    ? ((latestBar.close - (latestBar.ref_price || latestBar.open)) / (latestBar.ref_price || latestBar.open)) * 100
    : 0
  const isActiveUp = activePriceChange >= 0

  return (
    <aside className="tv-watchlist-drawer">
      {/* Header */}
      <div className="tv-watchlist-header">
        <div className="tv-watchlist-title">
          <ListFilter size={15} color="#58a6ff" />
          <span>Danh mục theo dõi</span>
          <span className="tv-live-sync-badge" title="Dữ liệu giá nhảy realtime đồng bộ tất cả mã">
            <span className="tv-live-sync-dot"></span>
            Realtime
          </span>
        </div>
        <button className="tv-icon-btn" onClick={onClose} title="Thu nhỏ / Đóng Watchlist">
          <X size={15} />
        </button>
      </div>

      {/* Color Filter Bar (TradingView Filter Flags) */}
      <div className="tv-wl-filter-row">
        <button
          type="button"
          className={`tv-wl-chip ${colorFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setColorFilter('ALL')}
          title="Tất cả mã trong danh mục"
        >
          Tất cả ({symbols.length})
        </button>

        {FLAG_COLORS.map((c) => {
          const count = symbols.filter((s) => symbolFlags[s] === c.id).length
          if (count === 0 && colorFilter !== c.id) return null
          return (
            <button
              key={c.id}
              type="button"
              className={`tv-wl-chip color-chip ${colorFilter === c.id ? 'active' : ''}`}
              style={{
                borderColor: colorFilter === c.id ? c.hex : 'transparent',
                backgroundColor: colorFilter === c.id ? `${c.hex}22` : 'transparent',
              }}
              onClick={() => setColorFilter(colorFilter === c.id ? 'ALL' : c.id)}
              title={`${c.name}: ${count} mã`}
            >
              <span className="tv-wl-color-dot" style={{ backgroundColor: c.hex }} />
              <span style={{ color: c.hex, fontWeight: 700 }}>{count}</span>
            </button>
          )
        })}

        <button
          type="button"
          className="tv-wl-sort-btn"
          onClick={() =>
            setSortBy((prev) =>
              prev === 'default' ? 'pct_desc' : prev === 'pct_desc' ? 'pct_asc' : 'default'
            )
          }
          title={`Sắp xếp: ${
            sortBy === 'pct_desc'
              ? 'Tăng nhiều nhất (Giảm dần)'
              : sortBy === 'pct_asc'
              ? 'Giảm nhiều nhất (Tăng dần)'
              : 'Mặc định'
          }`}
        >
          <ArrowUpDown size={12} />
          {sortBy === 'pct_desc' && <span className="tv-sort-tag">▲ %</span>}
          {sortBy === 'pct_asc' && <span className="tv-sort-tag">▼ %</span>}
        </button>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="tv-watchlist-add-form">
        <input
          type="text"
          placeholder="Thêm mã (VD: VHM, VIC, DGC, BSR)..."
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
          className="tv-watchlist-input"
        />
        <button type="submit" className="tv-btn-add-ticker" title="Thêm mã vào Watchlist">
          <Plus size={14} />
        </button>
      </form>

      {/* Symbol List with Realtime % and Color Flags */}
      <div className="tv-watchlist-list">
        {sortedSymbols.length === 0 ? (
          <div className="tv-wl-empty">
            <span>Không có mã nào trong bộ lọc cờ màu này.</span>
          </div>
        ) : (
          sortedSymbols.map((sym) => {
            const isActive = sym.toUpperCase() === (activeSymbol || '').toUpperCase()
            const isIndex = sym === 'VNINDEX' || sym === 'VN30'
            const flagId = symbolFlags[sym]
            const flagColor = FLAG_COLORS.find((c) => c.id === flagId)
            const quote = quotes[sym]

            let priceStr = '--'
            let pctStr = '--'
            let isUp = true

            if (quote && quote.close != null) {
              priceStr = formatPrice(quote.close, sym)
              const pct = quote.pct_change || 0
              isUp = pct >= 0
              pctStr = `${isUp ? '+' : ''}${pct.toFixed(2)}%`
            } else if (isActive && latestBar && latestBar.close != null) {
              priceStr = formatPrice(latestBar.close, sym)
              const refPrice = latestBar.ref_price || quote?.ref_price || latestBar.open || latestBar.close
              const diff = latestBar.close - refPrice
              const pct = refPrice ? (diff / refPrice) * 100 : 0
              isUp = pct >= 0
              pctStr = `${isUp ? '+' : ''}${pct.toFixed(2)}%`
            }

            return (
              <div
                key={sym}
                className={`tv-watchlist-item ${isActive ? 'active' : ''}`}
                style={{
                  borderLeft: flagColor ? `3px solid ${flagColor.hex}` : '3px solid transparent',
                }}
                onClick={() => onSelectSymbol(sym)}
              >
                {/* Left: Color flag button + Ticker + Exchange */}
                <div className="tv-watchlist-item-left">
                  {/* Flag Tag Button */}
                  <div
                    className="tv-wl-flag-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className={`tv-wl-flag-btn ${flagColor ? 'has-flag' : ''}`}
                      style={{ color: flagColor ? flagColor.hex : '#787b86' }}
                      onClick={() =>
                        setActiveColorPickerSym((curr) => (curr === sym ? null : sym))
                      }
                      title={
                        flagColor
                          ? `Đang gắn cờ ${flagColor.name} (Bấm để đổi/xóa màu)`
                          : `Gắn cờ màu chú ý cho ${sym}`
                      }
                    >
                      <Bookmark
                        size={13}
                        fill={flagColor ? flagColor.hex : 'none'}
                        strokeWidth={flagColor ? 2 : 1.6}
                      />
                    </button>

                    {/* Mini Color Picker Popover */}
                    {activeColorPickerSym === sym && (
                      <div
                        ref={colorPickerRef}
                        className="tv-wl-color-popover"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="tv-popover-header">Gắn cờ màu chú ý ({sym})</div>
                        <div className="tv-popover-palette">
                          {FLAG_COLORS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className={`tv-popover-color-dot ${flagId === c.id ? 'active' : ''}`}
                              style={{ backgroundColor: c.hex }}
                              onClick={() => handleSetFlag(sym, c.id)}
                              title={c.name}
                            >
                              {flagId === c.id && <Check size={11} color="#ffffff" />}
                            </button>
                          ))}
                        </div>
                        {flagId && (
                          <button
                            type="button"
                            className="tv-popover-clear-btn"
                            onClick={() => handleSetFlag(sym, null)}
                          >
                            Xóa gắn cờ
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="tv-wl-sym-meta">
                    <span className="tv-wl-ticker">{sym}</span>
                    <span className="tv-wl-exchange">{isIndex ? 'Index' : 'HOSE'}</span>
                  </div>
                </div>

                {/* Right: Live Price + Growth % Badge + Delete */}
                <div className="tv-watchlist-item-right">
                  <div className={`tv-wl-price-col ${flashes[sym] ? `tv-flash-${flashes[sym]}` : ''}`}>
                    <span className="tv-wl-price-val">{priceStr}</span>
                    <span className={`tv-wl-pct-badge ${isUp ? 'up' : 'down'}`}>
                      {pctStr}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="tv-wl-delete-btn"
                    onClick={(e) => handleRemove(sym, e)}
                    title={`Xóa ${sym} khỏi danh mục`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Selected Stock Detail Card */}
      {latestBar && (
        <div className="tv-watchlist-detail-card">
          <div className="tv-detail-title-row">
            <span className="tv-detail-ticker">{activeSymbol}</span>
            <span className={`tv-detail-change ${isActiveUp ? 'up' : 'down'}`}>
              {isActiveUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {isActiveUp ? '+' : ''}
              {activePriceChange.toFixed(2)}%
            </span>
          </div>

          <div className="tv-detail-grid">
            <div className="tv-detail-item">
              <span className="tv-detail-lbl">Giá đóng cửa</span>
              <span className="tv-detail-val">{formatNum(latestBar.close)}</span>
            </div>
            <div className="tv-detail-item">
              <span className="tv-detail-lbl">Giá mở cửa</span>
              <span className="tv-detail-val">{formatNum(latestBar.open)}</span>
            </div>
            <div className="tv-detail-item">
              <span className="tv-detail-lbl">Cao nhất (High)</span>
              <span className="tv-detail-val up">{formatNum(latestBar.high)}</span>
            </div>
            <div className="tv-detail-item">
              <span className="tv-detail-lbl">Thấp nhất (Low)</span>
              <span className="tv-detail-val down">{formatNum(latestBar.low)}</span>
            </div>
            <div className="tv-detail-item" style={{ gridColumn: 'span 2' }}>
              <span className="tv-detail-lbl">Khối lượng (Volume)</span>
              <span className="tv-detail-val">{formatNum(latestBar.volume)} CP</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
