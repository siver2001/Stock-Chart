import React, { useState, useEffect } from 'react'
import { Plus, Trash2, ListFilter, X } from 'lucide-react'

const DEFAULT_WATCHLIST = ['VNINDEX', 'VN30', 'FPT', 'HPG', 'VCB', 'SSI', 'MWG', 'TCB']
const STORAGE_KEY = 'vn_stock_watchlist'

export default function Watchlist({ activeSymbol, onSelectSymbol, onClose }) {
  const [symbols, setSymbols] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return DEFAULT_WATCHLIST
  })
  const [newTicker, setNewTicker] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols))
    } catch {}
  }, [symbols])

  const handleAdd = (e) => {
    e.preventDefault()
    const clean = newTicker.trim().toUpperCase()
    if (!clean) return
    if (!symbols.includes(clean)) {
      setSymbols([...symbols, clean])
    }
    setNewTicker('')
  }

  const handleRemove = (tickerToRemove, e) => {
    e.stopPropagation()
    setSymbols(symbols.filter((s) => s !== tickerToRemove))
  }

  return (
    <div className="watchlist-drawer">
      <div className="panel-title">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ListFilter size={16} color="#58a6ff" />
          Watchlist VN
        </span>
        <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose} title="Đóng Watchlist">
          <X size={14} />
        </button>
      </div>

      <form onSubmit={handleAdd} className="watchlist-add-form">
        <input
          type="text"
          placeholder="Thêm mã (VD: DGC, VND)..."
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
          className="watchlist-input"
        />
        <button type="submit" className="btn btn-secondary" style={{ padding: '6px 10px' }}>
          <Plus size={14} />
        </button>
      </form>

      <div className="watchlist-items">
        {symbols.map((sym) => {
          const isActive = sym.toUpperCase() === (activeSymbol || '').toUpperCase()
          return (
            <div
              key={sym}
              className={`watchlist-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectSymbol(sym)}
            >
              <div className="watchlist-item-name">
                <span className="ticker-bold">{sym}</span>
                <span className="ticker-sub">
                  {sym === 'VNINDEX' || sym === 'VN30' ? 'Index' : 'HOSE / HNX'}
                </span>
              </div>
              <button
                type="button"
                className="btn-icon-subtle"
                onClick={(e) => handleRemove(sym, e)}
                title={`Xóa ${sym}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
