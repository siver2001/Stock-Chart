import React, { useState, useEffect, useRef } from 'react'
import { Search, X, TrendingUp, Building2 } from 'lucide-react'
import { searchSymbols } from '../api/stockApi'

export default function SymbolSearchModal({ isOpen, onClose, onSelect, currentSymbol }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [symbols, setSymbols] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
      loadSymbols('')
    }
  }, [isOpen])

  const loadSymbols = async (q) => {
    setLoading(true)
    try {
      const list = await searchSymbols(q)
      setSymbols(list)
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }

  const handleQueryChange = (e) => {
    const val = e.target.value
    setQuery(val)
    loadSymbols(val)
  }

  if (!isOpen) return null

  const filteredSymbols = symbols.filter((s) => {
    if (filter === 'ALL') return true
    if (filter === 'INDEX') return s.ticker === 'VNINDEX' || s.ticker === 'VN30'
    if (filter === 'HOSE') return s.exchange === 'HOSE' && s.ticker !== 'VNINDEX' && s.ticker !== 'VN30'
    if (filter === 'HNX') return s.exchange === 'HNX'
    if (filter === 'UPCOM') return s.exchange === 'UPCOM'
    return true
  })

  return (
    <div className="tv-modal-backdrop" onClick={onClose}>
      <div className="tv-modal-box tv-symbol-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tv-modal-header">
          <div className="tv-search-input-wrap">
            <Search size={18} className="tv-search-icon" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Tìm kiếm mã cổ phiếu, chỉ số (VD: FPT, HPG, VNINDEX, VIX, DIG)..."
              value={query}
              onChange={handleQueryChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (filteredSymbols.length > 0) {
                    onSelect(filteredSymbols[0].ticker)
                    onClose()
                  } else if (query.trim()) {
                    onSelect(query.trim().toUpperCase())
                    onClose()
                  }
                }
              }}
              className="tv-symbol-input"
            />
            {query && (
              <button className="tv-icon-btn" onClick={() => { setQuery(''); loadSymbols(''); }}>
                <X size={16} />
              </button>
            )}
          </div>
          <button className="tv-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="tv-modal-tabs">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'HOSE', label: 'Cổ phiếu HOSE' },
            { id: 'HNX', label: 'HNX' },
            { id: 'UPCOM', label: 'UPCOM' },
            { id: 'INDEX', label: 'Chỉ số' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tv-tab-btn ${filter === tab.id ? 'active' : ''}`}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tv-symbol-list">
          {loading && <div className="tv-list-empty">Đang tìm kiếm...</div>}
          {!loading && filteredSymbols.length === 0 && query.trim() && (
            <div
              className="tv-symbol-row"
              style={{ cursor: 'pointer', padding: '12px 14px', backgroundColor: 'rgba(41, 98, 255, 0.12)' }}
              onClick={() => {
                onSelect(query.trim().toUpperCase())
                onClose()
              }}
            >
              <div className="tv-symbol-row-left">
                <div className="tv-ticker-badge">
                  <Building2 size={14} color="#2962ff" />
                </div>
                <div className="tv-ticker-info">
                  <div className="tv-ticker-code" style={{ color: '#2962ff' }}>{query.trim().toUpperCase()}</div>
                  <div className="tv-ticker-desc">Mở biểu đồ trực tiếp mã này trên thị trường</div>
                </div>
              </div>
              <div className="tv-symbol-row-right">
                <span className="tv-exchange-tag" style={{ backgroundColor: '#2962ff', color: '#fff' }}>Mở mã này [Enter]</span>
              </div>
            </div>
          )}
          {!loading && filteredSymbols.length === 0 && !query.trim() && (
            <div className="tv-list-empty">Không có mã nào phù hợp</div>
          )}
          {!loading &&
            filteredSymbols.map((item) => {
              const isSelected = item.ticker === currentSymbol
              const isIndex = item.ticker === 'VNINDEX' || item.ticker === 'VN30'
              return (
                <div
                  key={item.ticker}
                  className={`tv-symbol-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelect(item.ticker)
                    onClose()
                  }}
                >
                  <div className="tv-symbol-row-left">
                    <div className={`tv-ticker-badge ${isIndex ? 'index-badge' : ''}`}>
                      {isIndex ? <TrendingUp size={14} /> : <Building2 size={14} />}
                    </div>
                    <div className="tv-ticker-info">
                      <div className="tv-ticker-code">{item.ticker}</div>
                      <div className="tv-ticker-desc">{item.name}</div>
                    </div>
                  </div>
                  <div className="tv-symbol-row-right">
                    <span className="tv-exchange-tag">{item.exchange || 'HOSE'}</span>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
