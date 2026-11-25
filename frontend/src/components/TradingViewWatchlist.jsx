import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Plus,
  Trash2,
  X,
  ListFilter,
  TrendingUp,
  TrendingDown,
  Bookmark,
  Check,
  ChevronDown,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sliders,
  FolderPlus,
  GripVertical,
  AlertCircle,
  Eye,
  ExternalLink,
} from 'lucide-react'
import { fetchQuotes, searchSymbols } from '../api/stockApi'
import { syncWatchlistCloud, fetchWatchlistCloud } from '../services/cloudStorage'
import { isCloudEnabled } from '../lib/supabase'

export const PRESET_WATCHLISTS = {
  DEFAULT: {
    id: 'DEFAULT',
    name: 'Danh sách theo dõi',
    symbols: ['CEC', 'SSI', 'VCE', 'VIX', 'CTG', 'MBS', 'VTP', 'KDH', 'BID', 'BCM', 'CII', 'CMC', 'CTS', 'SHS', 'VPB', 'TPB', 'VDS'],
  },
  VN30: {
    id: 'VN30',
    name: 'VN30 Index',
    symbols: ['ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG', 'MBB', 'MSN', 'MWG', 'PLX', 'POW', 'SAB', 'SHB', 'SSB', 'SSI', 'STB', 'TCB', 'TPB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE'],
  },
  SECURITIES: {
    id: 'SECURITIES',
    name: 'Ngành Chứng khoán',
    symbols: ['SSI', 'VIX', 'VND', 'HCM', 'VCI', 'MBS', 'SHS', 'CTS', 'FTS', 'BSI', 'AGR', 'VDS'],
  },
  BANKING: {
    id: 'BANKING',
    name: 'Ngành Ngân hàng',
    symbols: ['VCB', 'BID', 'CTG', 'TCB', 'MBB', 'ACB', 'VPB', 'HDB', 'STB', 'TPB', 'VIB', 'SHB', 'LPB'],
  },
  REAL_ESTATE: {
    id: 'REAL_ESTATE',
    name: 'Ngành Bất động sản',
    symbols: ['VHM', 'VIC', 'VRE', 'NVL', 'PDR', 'DIG', 'DXG', 'KDH', 'NLG', 'CEO', 'BCM'],
  },
  STEEL: {
    id: 'STEEL',
    name: 'Ngành Thép',
    symbols: ['HPG', 'HSG', 'NKG', 'VGS', 'TLH'],
  },
}

const STORAGE_KEY = 'vn_stock_watchlist'
const FLAGS_STORAGE_KEY = 'vn_watchlist_flags'
const COLUMNS_STORAGE_KEY = 'vn_watchlist_columns'
const EXPANDED_STORAGE_KEY = 'vn_watchlist_expanded'
const ACTIVE_LIST_KEY = 'vn_watchlist_active_preset'
const WIDTH_STORAGE_KEY = 'vn_watchlist_custom_width'
const QUOTES_STORAGE_KEY = 'vn_watchlist_quotes_cache'

export const FLAG_COLORS = [
  { id: 'red', name: 'Đỏ (Cắt lỗ / Chú ý)', hex: '#f23645' },
  { id: 'blue', name: 'Xanh dương (Trụ / Bluechip)', hex: '#2962ff' },
  { id: 'green', name: 'Xanh lá (Điểm mua / Tăng)', hex: '#089981' },
  { id: 'yellow', name: 'Vàng (Theo dõi tín hiệu)', hex: '#e3b341' },
  { id: 'purple', name: 'Tím (Tiềm năng / Siêu cổ)', hex: '#a855f7' },
  { id: 'orange', name: 'Cam (Biến động / Lướt)', hex: '#f97316' },
]

export const STOCK_BRANDS = {
  SSI: { bg: '#c4161c', text: '#ffffff', label: 'SSI' },
  CEC: { bg: '#0284c7', text: '#ffffff', label: 'CEC' },
  VCE: { bg: '#089981', text: '#ffffff', label: 'VCE' },
  VIX: { bg: '#2962ff', text: '#ffffff', label: 'VIX' },
  CTG: { bg: '#0066b3', text: '#ffffff', label: 'CTG' },
  MBS: { bg: '#b91c1c', text: '#ffffff', label: '★' },
  VTP: { bg: '#e11d48', text: '#ffffff', label: 'V' },
  KDH: { bg: '#15803d', text: '#ffffff', label: 'K' },
  BID: { bg: '#1e3a8a', text: '#ffffff', label: 'BID' },
  BCM: { bg: '#ea580c', text: '#ffffff', label: '⌂' },
  CII: { bg: '#0284c7', text: '#ffffff', label: 'CII' },
  CMC: { bg: '#7c3aed', text: '#ffffff', label: 'CMC' },
  CTS: { bg: '#0284c7', text: '#ffffff', label: 'CTS' },
  SHS: { bg: '#ea580c', text: '#ffffff', label: 'SHS' },
  VPB: { bg: '#059669', text: '#ffffff', label: 'VPB' },
  TPB: { bg: '#7c3aed', text: '#ffffff', label: 'TPB' },
  VDS: { bg: '#dc2626', text: '#ffffff', label: 'VDS' },
  VCB: { bg: '#047857', text: '#ffffff', label: 'VCB' },
  FPT: { bg: '#f97316', text: '#ffffff', label: 'FPT' },
  HPG: { bg: '#0369a1', text: '#ffffff', label: 'HPG' },
  TCB: { bg: '#dc2626', text: '#ffffff', label: 'TCB' },
  MWG: { bg: '#ca8a04', text: '#ffffff', label: 'MWG' },
  VHM: { bg: '#b45309', text: '#ffffff', label: 'VHM' },
  VIC: { bg: '#b91c1c', text: '#ffffff', label: 'VIC' },
  VND: { bg: '#f59e0b', text: '#ffffff', label: 'VND' },
  MBB: { bg: '#1d4ed8', text: '#ffffff', label: 'MBB' },
  ACB: { bg: '#0284c7', text: '#ffffff', label: 'ACB' },
  STB: { bg: '#0369a1', text: '#ffffff', label: 'STB' },
  GAS: { bg: '#0284c7', text: '#ffffff', label: 'GAS' },
  DGC: { bg: '#047857', text: '#ffffff', label: 'DGC' },
  PVD: { bg: '#0369a1', text: '#ffffff', label: 'PVD' },
  NVL: { bg: '#b45309', text: '#ffffff', label: 'NVL' },
  PDR: { bg: '#b91c1c', text: '#ffffff', label: 'PDR' },
  DIG: { bg: '#0284c7', text: '#ffffff', label: 'DIG' },
  DXG: { bg: '#059669', text: '#ffffff', label: 'DXG' },
  VNINDEX: { bg: '#2962ff', text: '#ffffff', label: 'VN' },
  VN30: { bg: '#a855f7', text: '#ffffff', label: '30' },
}

export function getStockBrand(sym = '') {
  if (STOCK_BRANDS[sym]) {
    const b = STOCK_BRANDS[sym]
    return {
      bg: b.bg,
      text: b.text,
      label: b.label,
      bgColor: b.bg,
      color: b.text,
      initials: b.label,
      name: sym,
    }
  }
  let hash = 0
  for (let i = 0; i < sym.length; i++) {
    hash = sym.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  const bg = `hsl(${hue}, 65%, 42%)`
  return {
    bg,
    text: '#ffffff',
    label: sym.slice(0, 3),
    bgColor: bg,
    color: '#ffffff',
    initials: sym.slice(0, 3),
    name: sym,
  }
}

// Real Company Logo Component with high-fidelity fallback to brand circle
export function StockLogo({ symbol = '', size = 'normal', className = '' }) {
  const [loadFailed, setLoadFailed] = useState(false)
  const cleanSym = (symbol || '').trim().toUpperCase()
  const brand = getStockBrand(cleanSym)

  useEffect(() => {
    setLoadFailed(false)
  }, [cleanSym])

  if (!cleanSym) return null

  if (loadFailed) {
    return (
      <div
        className={`tv-wl-logo-avatar ${size} ${className}`}
        style={{
          backgroundColor: brand.bg || brand.bgColor || '#1e222d',
          color: brand.text || brand.color || '#ffffff',
        }}
        title={`${cleanSym} - ${brand.name || cleanSym}`}
      >
        <span>{brand.label || brand.initials || cleanSym.slice(0, 3)}</span>
      </div>
    )
  }

  return (
    <div className={`tv-wl-logo-avatar ${size} ${className} has-img`} title={cleanSym}>
      <img
        src={`https://cdn.simplize.vn/simplizevn/logo/${cleanSym}.jpeg`}
        alt={cleanSym}
        className="tv-wl-logo-img"
        loading="lazy"
        onError={() => setLoadFailed(true)}
      />
    </div>
  )
}

// Helper to verify if Vietnam stock market is currently in open trading hours
export function isVietnamMarketOpen() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const vnTime = new Date(utc + 3600000 * 7)
  const day = vnTime.getDay()
  if (day === 0 || day === 6) return false // Weekend
  const mins = vnTime.getHours() * 60 + vnTime.getMinutes()
  return (mins >= 540 && mins <= 690) || (mins >= 780 && mins <= 900)
}

export default function TradingViewWatchlist({
  activeSymbol,
  onSelectSymbol,
  onClose,
  latestBar,
}) {
  const [activePresetId, setActivePresetId] = useState(() => {
    return localStorage.getItem(ACTIVE_LIST_KEY) || 'DEFAULT'
  })

  const [symbols, setSymbols] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return PRESET_WATCHLISTS.DEFAULT.symbols
  })

  const [symbolFlags, setSymbolFlags] = useState(() => {
    try {
      const saved = localStorage.getItem(FLAGS_STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      VCE: 'red', // Match red flag in user screenshot
    }
  })

  // Visible columns configuration
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(COLUMNS_STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      lastPrice: true, // Lần cuối
      change: true,    // Th.đổi
      pctChange: true, // %ThĐổi
      volume: false,   // Khối lượng
      logo: true,      // Logo công ty
      flags: true,     // Cờ đánh dấu
    }
  })

  const [isExpanded, setIsExpanded] = useState(() => {
    return localStorage.getItem(EXPANDED_STORAGE_KEY) === 'true'
  })

  // Resizable drawer width state & handle
  const [drawerWidth, setDrawerWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(WIDTH_STORAGE_KEY)
      if (saved) {
        const num = Number(saved)
        if (num >= 220 && num <= 700) return num
      }
    } catch {}
    return isExpanded ? 440 : 330
  })
  const [isResizing, setIsResizing] = useState(false)
  const isResizingRef = useRef(false)

  // Autocomplete and ticker validation states
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [addError, setAddError] = useState('')
  const allKnownSymbolsRef = useRef(new Set())
  const searchDebounceRef = useRef(null)
  const suggestionsRef = useRef(null)

  // Drag and drop reordering states
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const [colorFilter, setColorFilter] = useState('ALL')
  const [activeColorPickerSym, setActiveColorPickerSym] = useState(null)
  const [newTicker, setNewTicker] = useState('')
  const [showAddInput, setShowAddInput] = useState(false)
  const [showPresetDropdown, setShowPresetDropdown] = useState(false)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [quotes, setQuotes] = useState(() => {
    try {
      const saved = localStorage.getItem(QUOTES_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') return parsed
      }
    } catch {}
    return {}
  })
  const [flashes, setFlashes] = useState({})

  // Sorting: { column: 'symbol' | 'lastPrice' | 'change' | 'pctChange' | 'volume', direction: 'asc' | 'desc' | 'default' }
  const [sortConfig, setSortConfig] = useState({ column: 'default', direction: 'default' })

  const colorPickerRef = useRef(null)
  const presetDropdownRef = useRef(null)
  const optionsMenuRef = useRef(null)
  const addInputRef = useRef(null)

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols))
    } catch {}
  }, [symbols])

  useEffect(() => {
    try {
      localStorage.setItem(FLAGS_STORAGE_KEY, JSON.stringify(symbolFlags))
    } catch {}
  }, [symbolFlags])

  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns))
    } catch {}
  }, [visibleColumns])

  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_STORAGE_KEY, String(isExpanded))
    } catch {}
  }, [isExpanded])

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_LIST_KEY, activePresetId)
    } catch {}
  }, [activePresetId])

  useEffect(() => {
    try {
      localStorage.setItem(WIDTH_STORAGE_KEY, String(drawerWidth))
    } catch {}
  }, [drawerWidth])

  // Preload known symbols list for instant O(1) existence validation
  useEffect(() => {
    let isMounted = true
    searchSymbols('').then((list) => {
      if (isMounted && Array.isArray(list)) {
        const s = new Set(list.map((it) => (it.ticker || it.symbol || '').toUpperCase()))
        allKnownSymbolsRef.current = s
      }
    }).catch(() => {})
    return () => {
      isMounted = false
    }
  }, [])

  // Background Cloud Restore on mount & Sync Key change listener
  const hasLoadedCloudRef = useRef(false)
  const isFirstRenderRef = useRef(true)

  const reloadFromCloud = useCallback(() => {
    if (!isCloudEnabled()) {
      hasLoadedCloudRef.current = true
      return
    }
    fetchWatchlistCloud().then((cloudData) => {
      if (!cloudData) {
        hasLoadedCloudRef.current = true
        return
      }
      if (Array.isArray(cloudData.symbols) && cloudData.symbols.length > 0) {
        setSymbols(cloudData.symbols)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData.symbols)) } catch {}
      }
      if (cloudData.flags && typeof cloudData.flags === 'object') {
        setSymbolFlags(cloudData.flags)
        try { localStorage.setItem(FLAGS_STORAGE_KEY, JSON.stringify(cloudData.flags)) } catch {}
      }
      hasLoadedCloudRef.current = true
    }).catch(() => {
      hasLoadedCloudRef.current = true
    })
  }, [])

  useEffect(() => {
    reloadFromCloud()

    const handleSyncEvent = () => reloadFromCloud()
    window.addEventListener('vn_stock_reload_cloud_watchlist', handleSyncEvent)
    return () => {
      window.removeEventListener('vn_stock_reload_cloud_watchlist', handleSyncEvent)
    }
  }, [reloadFromCloud])

  // Debounced Cloud Sync for Watchlist (only after initial load has completed)
  const watchlistCloudTimerRef = useRef(null)
  useEffect(() => {
    if (!isCloudEnabled()) return
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      return
    }
    if (!hasLoadedCloudRef.current) return

    if (watchlistCloudTimerRef.current) clearTimeout(watchlistCloudTimerRef.current)
    watchlistCloudTimerRef.current = setTimeout(() => {
      syncWatchlistCloud(symbols, symbolFlags)
    }, 1500)
    return () => {
      if (watchlistCloudTimerRef.current) clearTimeout(watchlistCloudTimerRef.current)
    }
  }, [symbols, symbolFlags])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setActiveColorPickerSym(null)
      }
      if (presetDropdownRef.current && !presetDropdownRef.current.contains(e.target)) {
        setShowPresetDropdown(false)
      }
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target)) {
        setShowOptionsMenu(false)
      }
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus add input when opened
  useEffect(() => {
    if (showAddInput && addInputRef.current) {
      addInputRef.current.focus()
    }
  }, [showAddInput])

  // Persist cached quotes to localStorage (debounced so UI stays 60fps & next reload is 0ms instant)
  const quotesCacheTimerRef = useRef(null)
  useEffect(() => {
    if (!quotes || Object.keys(quotes).length === 0) return
    if (quotesCacheTimerRef.current) clearTimeout(quotesCacheTimerRef.current)
    quotesCacheTimerRef.current = setTimeout(() => {
      try {
        const compact = {}
        const allowed = new Set((symbols || []).map((s) => s.toUpperCase()))
        for (const [sym, q] of Object.entries(quotes)) {
          if (allowed.size > 0 && !allowed.has(sym.toUpperCase())) continue
          if (q && q.close != null) {
            compact[sym] = {
              symbol: q.symbol || sym,
              close: q.close,
              ref_price: q.ref_price,
              change: q.change,
              pct_change: q.pct_change,
              volume: q.volume,
              timestamp: q.timestamp,
            }
          }
        }
        localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(compact))
      } catch {}
    }, 450)
    return () => {
      if (quotesCacheTimerRef.current) clearTimeout(quotesCacheTimerRef.current)
    }
  }, [quotes, symbols])

  // Batch fetch quotes for watchlist symbols (progressive chunking + overlap guard)
  const quoteFetchSeqRef = useRef(0)
  const isFetchingQuotesRef = useRef(false)
  useEffect(() => {
    let isMounted = true

    const applyQuoteChunk = (data) => {
      if (!isMounted || !data || Object.keys(data).length === 0) return
      const marketOpen = isVietnamMarketOpen()
      setQuotes((prev) => {
        const nextFlashes = {}
        let hasFlash = false
        // Only trigger flash animations if the market is actually OPEN
        if (marketOpen) {
          for (const [sym, q] of Object.entries(data)) {
            const oldQ = prev[sym]
            if (oldQ && oldQ.close != null && q.close != null && oldQ.close !== q.close) {
              if (q.close > oldQ.close) {
                nextFlashes[sym] = 'up'
                hasFlash = true
              } else if (q.close < oldQ.close) {
                nextFlashes[sym] = 'down'
                hasFlash = true
              }
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

    const loadQuotes = async (force = false) => {
      if (!symbols || symbols.length === 0) return
      if (!force && isFetchingQuotesRef.current) return
      isFetchingQuotesRef.current = true
      const seq = ++quoteFetchSeqRef.current
      // Split into first 60 (visible viewport priority) and remaining chunks
      const CHUNK_SIZE = 70
      const chunks = []
      for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
        chunks.push(symbols.slice(i, i + CHUNK_SIZE))
      }

      try {
        await Promise.all(
          chunks.map(async (chunk) => {
            try {
              const data = await fetchQuotes(chunk)
              if (isMounted && seq === quoteFetchSeqRef.current && data) {
                applyQuoteChunk(data)
              }
            } catch (err) {
              console.warn('Chunk quote fetch failed:', err)
            }
          })
        )
      } catch (err) {
        console.warn('Could not fetch quotes batch:', err)
      } finally {
        if (seq === quoteFetchSeqRef.current) {
          isFetchingQuotesRef.current = false
        }
      }
    }

    loadQuotes(true)
    // Poll every 3s during market hours, or 20s when market is closed to prevent unnecessary churn
    const pollInterval = isVietnamMarketOpen() ? 3000 : 20000
    const interval = setInterval(() => loadQuotes(false), pollInterval)
    return () => {
      isMounted = false
      isFetchingQuotesRef.current = false
      clearInterval(interval)
    }
  }, [symbols])

  // Instantly reflect activeSymbol realtime latestBar (STRICTLY matching symbol to prevent cross-stock bleeding!)
  useEffect(() => {
    if (
      activeSymbol &&
      latestBar &&
      latestBar.symbol &&
      latestBar.symbol.toUpperCase() === activeSymbol.toUpperCase() &&
      latestBar.close != null
    ) {
      setQuotes((prev) => {
        const existing = prev[activeSymbol]
        // If close price and volume haven't changed, skip re-render to avoid any UI jitter
        if (existing && existing.close === latestBar.close && existing.volume === latestBar.volume) {
          return prev
        }
        const refPrice = latestBar.ref_price || existing?.ref_price || latestBar.open || latestBar.close
        const diff = latestBar.change != null ? latestBar.change : latestBar.close - refPrice
        const pct = latestBar.pct_change != null ? latestBar.pct_change : (refPrice ? (diff / refPrice) * 100 : 0)
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

  // Drawer width resizing logic
  const handleResizeStart = (e) => {
    e.preventDefault()
    isResizingRef.current = true
    setIsResizing(true)
    const startX = e.clientX
    const startWidth = drawerWidth

    const onMouseMove = (moveEv) => {
      if (!isResizingRef.current) return
      // Moving mouse left increases width (since drawer is docked to the right edge)
      const delta = startX - moveEv.clientX
      const nextW = Math.max(220, Math.min(650, startWidth + delta))
      setDrawerWidth(nextW)
    }

    const onMouseUp = () => {
      isResizingRef.current = false
      setIsResizing(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const handleToggleExpand = () => {
    setIsExpanded((prev) => {
      const next = !prev
      const nextW = next ? 460 : 330
      setDrawerWidth(nextW)
      try {
        localStorage.setItem(WIDTH_STORAGE_KEY, String(nextW))
        localStorage.setItem(EXPANDED_STORAGE_KEY, String(next))
      } catch {}
      return next
    })
  }

  // Autocomplete and search input change
  const handleTickerInputChange = (e) => {
    const val = e.target.value.toUpperCase()
    setNewTicker(val)
    setAddError('')

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)

    if (!val.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        setIsSearching(true)
        const list = await searchSymbols(val.trim())
        if (Array.isArray(list)) {
          const filtered = list.filter((item) => {
            const symCode = (item.ticker || item.symbol || '').toUpperCase()
            const symName = (item.name || '').toUpperCase()
            const query = val.trim()
            return symCode.includes(query) || symName.includes(query)
          })
          setSuggestions(filtered.slice(0, 8))
          setShowSuggestions(filtered.length > 0)
        }
      } catch {
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 100)
  }

  // Strict symbol validation: only add if ticker exists on market!
  const addValidatedTicker = async (targetTicker) => {
    const clean = (targetTicker || '').trim().toUpperCase()
    if (!clean) return

    let exists = allKnownSymbolsRef.current.has(clean)

    // Check against suggestions if not in preloaded catalog
    if (!exists) {
      const foundInSug = suggestions.find(
        (s) => (s.ticker || s.symbol || '').toUpperCase() === clean
      )
      if (foundInSug) {
        exists = true
        allKnownSymbolsRef.current.add(clean)
      }
    }

    // Verify online via search if still unknown
    if (!exists) {
      try {
        const results = await searchSymbols(clean)
        const exactMatch = results.find(
          (r) => (r.ticker || r.symbol || '').toUpperCase() === clean
        )
        if (exactMatch) {
          exists = true
          allKnownSymbolsRef.current.add(clean)
        }
      } catch {}
    }

    if (!exists) {
      setAddError(`Mã "${clean}" không tồn tại hoặc không hợp lệ!`)
      return
    }

    if (!symbols.includes(clean)) {
      setSymbols((prev) => [clean, ...prev])
    }

    // Keep add bar open until user manually closes it, clear input & refocus for fast continuous addition
    setNewTicker('')
    setSuggestions([])
    setShowSuggestions(false)
    setAddError('')
    addInputRef.current?.focus()
  }

  // Quick view chart directly from search or click
  const handleViewStock = (targetTicker) => {
    const sym = (targetTicker || '').trim().toUpperCase()
    if (!sym) return
    onSelectSymbol(sym)
    setShowSuggestions(false)
    setSuggestions([])
    setNewTicker('')
    setAddError('')
    setTimeout(() => {
      const rowEl = document.getElementById(`tv-wl-row-${sym}`)
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 60)
  }

  const handleAdd = (e) => {
    e.preventDefault()
    const query = newTicker.trim().toUpperCase()
    if (!query) return

    // If the ticker already exists in watchlist, immediately view its chart!
    if (symbols.includes(query)) {
      handleViewStock(query)
      return
    }

    const exact = suggestions.find(
      (s) => (s.ticker || s.symbol || '').toUpperCase() === query
    )
    if (exact) {
      addValidatedTicker(exact.ticker || exact.symbol)
    } else {
      addValidatedTicker(query)
    }
  }

  const handleSelectSuggestion = (ticker) => {
    addValidatedTicker(ticker)
  }

  const handleCloseAddBar = () => {
    setShowAddInput(false)
    setNewTicker('')
    setSuggestions([])
    setShowSuggestions(false)
    setAddError('')
  }

  // Drag and Drop row reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    // Keep drag hover stable
  }

  const handleDrop = (e, targetIndex) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const draggedSym = sortedSymbols[draggedIndex]
    const targetSym = sortedSymbols[targetIndex]

    if (!draggedSym || !targetSym || draggedSym === targetSym) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    // Reset sort configuration to default so custom drag order is preserved
    if (sortConfig.column !== 'default') {
      setSortConfig({ column: 'default', direction: 'default' })
    }

    setSymbols((prevSymbols) => {
      const next = [...prevSymbols]
      const fromIdx = next.indexOf(draggedSym)
      const toIdx = next.indexOf(targetSym)
      if (fromIdx !== -1 && toIdx !== -1) {
        const [moved] = next.splice(fromIdx, 1)
        next.splice(toIdx, 0, moved)
      }
      return next
    })

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
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

  const handleSelectPreset = (presetKey) => {
    const preset = PRESET_WATCHLISTS[presetKey]
    if (preset) {
      setActivePresetId(presetKey)
      setSymbols(preset.symbols)
      setShowPresetDropdown(false)
    }
  }

  const toggleSort = (col) => {
    setSortConfig((prev) => {
      if (prev.column !== col) {
        return { column: col, direction: 'desc' }
      }
      if (prev.direction === 'desc') {
        return { column: col, direction: 'asc' }
      }
      return { column: 'default', direction: 'default' }
    })
  }

  const toggleColumnVisibility = (colKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [colKey]: !prev[colKey],
    }))
  }

  // Format helpers
  const formatPrice = (val, sym) => {
    if (val == null) return '--'
    const isIndex = ['VNINDEX', 'VN30', 'HNXINDEX', 'HNX30', 'UPCOMINDEX'].includes(sym)
    return new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: isIndex ? 2 : 0,
      maximumFractionDigits: isIndex ? 2 : 0,
    }).format(val)
  }

  const formatChange = (val, sym) => {
    if (val == null) return '0'
    const isIndex = ['VNINDEX', 'VN30', 'HNXINDEX', 'HNX30', 'UPCOMINDEX'].includes(sym)
    const sign = val > 0 ? '' : ''
    const num = new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: isIndex ? 2 : 0,
      maximumFractionDigits: isIndex ? 2 : 0,
    }).format(val)
    return `${sign}${num}`
  }

  const formatVol = (v) => {
    if (v == null) return '--'
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)} M`
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)} K`
    return new Intl.NumberFormat('vi-VN').format(Math.round(v))
  }

  // Filtered and Sorted Symbols
  const filteredSymbols = useMemo(() => {
    return symbols.filter((sym) => {
      if (colorFilter === 'ALL') return true
      return symbolFlags[sym] === colorFilter
    })
  }, [symbols, colorFilter, symbolFlags])

  const sortedSymbols = useMemo(() => {
    if (sortConfig.column === 'default' || sortConfig.direction === 'default') {
      return filteredSymbols
    }
    const { column, direction } = sortConfig
    const multiplier = direction === 'asc' ? 1 : -1

    return [...filteredSymbols].sort((a, b) => {
      const qA = quotes[a]
      const qB = quotes[b]

      if (column === 'symbol') {
        return a.localeCompare(b) * multiplier
      }
      if (column === 'lastPrice') {
        const pA = qA?.close ?? 0
        const pB = qB?.close ?? 0
        return (pA - pB) * multiplier
      }
      if (column === 'change') {
        const cA = qA?.change ?? 0
        const cB = qB?.change ?? 0
        return (cA - cB) * multiplier
      }
      if (column === 'pctChange') {
        const pctA = qA?.pct_change ?? 0
        const pctB = qB?.pct_change ?? 0
        return (pctA - pctB) * multiplier
      }
      if (column === 'volume') {
        const vA = qA?.volume ?? 0
        const vB = qB?.volume ?? 0
        return (vA - vB) * multiplier
      }
      return 0
    })
  }, [filteredSymbols, quotes, sortConfig])

  // Active Symbol Detail
  const activeQuote = quotes[activeSymbol]
  const isMatchingLatestBar = Boolean(
    latestBar &&
    latestBar.symbol &&
    latestBar.symbol.toUpperCase() === (activeSymbol || '').toUpperCase()
  )
  const activePriceChange = activeQuote
    ? activeQuote.pct_change
    : isMatchingLatestBar && (latestBar.ref_price || latestBar.open)
    ? ((latestBar.close - (latestBar.ref_price || latestBar.open)) / (latestBar.ref_price || latestBar.open)) * 100
    : 0
  const isActiveUp = activePriceChange >= 0

  const activePresetName = PRESET_WATCHLISTS[activePresetId]?.name || 'Danh sách theo dõi'

  return (
    <aside
      className={`tv-watchlist-drawer ${isExpanded ? 'tv-wl-expanded' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{ width: `${drawerWidth}px` }}
    >
      {/* Draggable border handle on the left edge to shrink or widen drawer */}
      <div
        className={`tv-wl-resize-handle ${isResizing ? 'active' : ''}`}
        onMouseDown={handleResizeStart}
        title="Kéo sang trái/phải để thu hẹp hoặc mở rộng danh sách"
      />

      {/* 1. Header Toolbar (TradingView exact styling) */}
      <div className="tv-watchlist-header">
        {/* Watchlist Preset Selector */}
        <div className="tv-wl-title-wrap" ref={presetDropdownRef}>
          <button
            type="button"
            className="tv-wl-dropdown-trigger"
            onClick={() => setShowPresetDropdown(!showPresetDropdown)}
            title="Đổi danh sách theo dõi"
          >
            <span className="tv-wl-title-text">{activePresetName}</span>
            <ChevronDown size={14} className={`tv-wl-chevron ${showPresetDropdown ? 'open' : ''}`} />
          </button>

          {/* Preset Dropdown Menu */}
          {showPresetDropdown && (
            <div className="tv-wl-preset-dropdown">
              <div className="tv-wl-dropdown-header">Danh sách mẫu</div>
              {Object.values(PRESET_WATCHLISTS).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`tv-wl-preset-item ${activePresetId === preset.id ? 'active' : ''}`}
                  onClick={() => handleSelectPreset(preset.id)}
                >
                  <span>{preset.name}</span>
                  <span className="tv-wl-preset-count">{preset.symbols.length} mã</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons: Add, Expand, Options, Close */}
        <div className="tv-wl-header-actions">
          {/* Add Symbol */}
          <button
            type="button"
            className={`tv-wl-header-btn ${showAddInput ? 'active' : ''}`}
            onClick={() => setShowAddInput(!showAddInput)}
            title="Thêm mã cổ phiếu (+)"
          >
            <Plus size={15} />
          </button>

          {/* Expand / Minimize Width */}
          <button
            type="button"
            className={`tv-wl-header-btn ${isExpanded ? 'active' : ''}`}
            onClick={handleToggleExpand}
            title={isExpanded ? 'Thu gọn chiều rộng (330px)' : 'Mở rộng hiển thị đầy đủ các cột (460px)'}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Three dots (...) Options menu */}
          <div className="tv-wl-options-wrap" ref={optionsMenuRef}>
            <button
              type="button"
              className={`tv-wl-header-btn ${showOptionsMenu ? 'active' : ''}`}
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              title="Cấu hình hiển thị các cột (Lần cuối, Th.đổi, %ThĐổi, Khối lượng...)"
            >
              <MoreHorizontal size={15} />
            </button>

            {/* Column Visibility Config Popover */}
            {showOptionsMenu && (
              <div className="tv-wl-options-popover">
                <div className="tv-wl-opt-header">Cột hiển thị</div>
                <label className="tv-wl-opt-item">
                  <input
                    type="checkbox"
                    checked={visibleColumns.lastPrice}
                    onChange={() => toggleColumnVisibility('lastPrice')}
                  />
                  <span>Lần cuối (Giá khớp)</span>
                </label>
                <label className="tv-wl-opt-item">
                  <input
                    type="checkbox"
                    checked={visibleColumns.change}
                    onChange={() => toggleColumnVisibility('change')}
                  />
                  <span>Th.đổi (Biến động giá)</span>
                </label>
                <label className="tv-wl-opt-item">
                  <input
                    type="checkbox"
                    checked={visibleColumns.pctChange}
                    onChange={() => toggleColumnVisibility('pctChange')}
                  />
                  <span>%ThĐổi (% Tăng/Giảm)</span>
                </label>
                <label className="tv-wl-opt-item">
                  <input
                    type="checkbox"
                    checked={visibleColumns.volume}
                    onChange={() => toggleColumnVisibility('volume')}
                  />
                  <span>Khối lượng (Volume)</span>
                </label>
                <div className="tv-wl-opt-divider" />
                <label className="tv-wl-opt-item">
                  <input
                    type="checkbox"
                    checked={visibleColumns.logo}
                    onChange={() => toggleColumnVisibility('logo')}
                  />
                  <span>Biểu tượng (Logo)</span>
                </label>
                <label className="tv-wl-opt-item">
                  <input
                    type="checkbox"
                    checked={visibleColumns.flags}
                    onChange={() => toggleColumnVisibility('flags')}
                  />
                  <span>Cờ màu phân loại</span>
                </label>
                <div className="tv-wl-opt-divider" />
                <button
                  type="button"
                  className="tv-wl-opt-action-btn"
                  onClick={() => {
                    setSymbols(PRESET_WATCHLISTS.DEFAULT.symbols)
                    setShowOptionsMenu(false)
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Khôi phục mặc định</span>
                </button>
              </div>
            )}
          </div>

          {/* Close Watchlist */}
          <button
            type="button"
            className="tv-wl-header-btn"
            onClick={onClose}
            title="Đóng thanh theo dõi"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. Color Filter Ribbon Chips */}
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
      </div>

      {/* 3. Inline Add Symbol Form with Autocomplete Suggestions */}
      {showAddInput && (
        <div className="tv-watchlist-add-container">
          <form onSubmit={handleAdd} className="tv-watchlist-add-form">
            <input
              ref={addInputRef}
              type="text"
              placeholder="Thêm mã (VD: VHM, HPG, SSI, FPT)..."
              value={newTicker}
              onChange={handleTickerInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleCloseAddBar()
                }
              }}
              className="tv-watchlist-input"
            />
            <button type="submit" className="tv-btn-add-ticker" title="Thêm mã vào danh sách [Enter]">
              <Plus size={14} />
            </button>
            <button
              type="button"
              className="tv-btn-close-add"
              onClick={handleCloseAddBar}
              title="Đóng thanh thêm mã (Esc)"
            >
              <X size={14} />
            </button>
          </form>

          {/* Error Message if invalid symbol */}
          {addError && (
            <div className="tv-wl-add-error">
              <AlertCircle size={12} />
              <span>{addError}</span>
            </div>
          )}

          {/* Autocomplete Suggestions Popover */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="tv-wl-suggestions-popover" ref={suggestionsRef}>
              <div className="tv-wl-sug-header">Gợi ý mã cổ phiếu ({suggestions.length})</div>
              {suggestions.map((item) => {
                const itemTicker = (item.ticker || item.symbol || '').toUpperCase()
                const isAlreadyInWatchlist = symbols.includes(itemTicker)
                return (
                  <div
                    key={itemTicker}
                    className={`tv-wl-sug-item ${isAlreadyInWatchlist ? 'is-in-list' : ''}`}
                    onClick={() => {
                      if (isAlreadyInWatchlist) {
                        handleViewStock(itemTicker)
                      } else {
                        handleSelectSuggestion(itemTicker)
                      }
                    }}
                  >
                    <div className="tv-wl-sug-left">
                      <StockLogo symbol={itemTicker} size="mini" />
                      <span className="tv-wl-sug-ticker">{itemTicker}</span>
                      <span className="tv-wl-sug-name">{item.name}</span>
                    </div>

                    <div className="tv-wl-sug-right">
                      <span className="tv-wl-sug-exchange">{item.exchange || 'HOSE'}</span>
                      {isAlreadyInWatchlist ? (
                        <div className="tv-wl-sug-actions">
                          <span className="tv-wl-sug-badge in-list" title="Mã này đã có trong danh sách theo dõi">
                            Đã có
                          </span>
                          <button
                            type="button"
                            className="tv-wl-sug-btn-view"
                            title={`Xem ngay biểu đồ ${itemTicker}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewStock(itemTicker)
                            }}
                          >
                            <Eye size={12} />
                            <span>Xem</span>
                          </button>
                        </div>
                      ) : (
                        <div className="tv-wl-sug-actions">
                          <button
                            type="button"
                            className="tv-wl-sug-btn-add"
                            title={`Thêm ${itemTicker} vào danh sách`}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectSuggestion(itemTicker)
                            }}
                          >
                            <Plus size={12} />
                            <span>Thêm</span>
                          </button>
                          <button
                            type="button"
                            className="tv-wl-sug-btn-view"
                            title={`Xem ngay biểu đồ ${itemTicker}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewStock(itemTicker)
                            }}
                          >
                            <Eye size={12} />
                            <span>Xem</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Table Column Headers Row (TradingView Style) */}
      <div className="tv-wl-table-header">
        {/* Symbol Column Header */}
        <div
          className="tv-wl-th tv-wl-th-symbol"
          onClick={() => toggleSort('symbol')}
          title="Sắp xếp theo mã giao dịch"
        >
          {visibleColumns.flags && <Bookmark size={11} className="tv-wl-th-ribbon-icon" />}
          <span>Mã giao dịch</span>
          {sortConfig.column === 'symbol' && (
            sortConfig.direction === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
          )}
        </div>

        {/* Last Price Column Header */}
        {visibleColumns.lastPrice && (
          <div
            className="tv-wl-th tv-wl-th-last"
            onClick={() => toggleSort('lastPrice')}
            title="Sắp xếp theo giá Lần cuối"
          >
            <span>Lần cuối</span>
            {sortConfig.column === 'lastPrice' && (
              sortConfig.direction === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
            )}
          </div>
        )}

        {/* Net Change Column Header */}
        {visibleColumns.change && (
          <div
            className="tv-wl-th tv-wl-th-change"
            onClick={() => toggleSort('change')}
            title="Sắp xếp theo mức Thay đổi tuyệt đối"
          >
            <span>Th.đổi</span>
            {sortConfig.column === 'change' && (
              sortConfig.direction === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
            )}
          </div>
        )}

        {/* % Change Column Header */}
        {visibleColumns.pctChange && (
          <div
            className="tv-wl-th tv-wl-th-pct"
            onClick={() => toggleSort('pctChange')}
            title="Sắp xếp theo % Thay đổi"
          >
            <span>%ThĐổi</span>
            {sortConfig.column === 'pctChange' && (
              sortConfig.direction === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
            )}
          </div>
        )}

        {/* Volume Column Header (Optional) */}
        {visibleColumns.volume && (
          <div
            className="tv-wl-th tv-wl-th-vol"
            onClick={() => toggleSort('volume')}
            title="Sắp xếp theo Khối lượng giao dịch"
          >
            <span>K.Lượng</span>
            {sortConfig.column === 'volume' && (
              sortConfig.direction === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
            )}
          </div>
        )}
      </div>

      {/* 5. Symbol Rows Table */}
      <div className="tv-watchlist-list">
        {sortedSymbols.length === 0 ? (
          <div className="tv-wl-empty">
            <span>Không có mã nào trong danh sách.</span>
          </div>
        ) : (
          sortedSymbols.map((sym, idx) => {
            const isActive = sym.toUpperCase() === (activeSymbol || '').toUpperCase()
            const flagId = symbolFlags[sym]
            const flagColor = FLAG_COLORS.find((c) => c.id === flagId)
            const brand = getStockBrand(sym)
            const quote = quotes[sym]

            let price = quote?.close
            let change = quote?.change ?? 0
            let pctChange = quote?.pct_change ?? 0
            let volume = quote?.volume

            // If active and we have fresh latestBar strictly belonging to this exact symbol
            if (
              isActive &&
              latestBar &&
              latestBar.symbol &&
              latestBar.symbol.toUpperCase() === sym.toUpperCase() &&
              latestBar.close != null
            ) {
              price = latestBar.close
              const ref = latestBar.ref_price || quote?.ref_price || latestBar.open || latestBar.close
              change = latestBar.change != null ? latestBar.change : price - ref
              pctChange = latestBar.pct_change != null ? latestBar.pct_change : (ref ? (change / ref) * 100 : 0)
              if (latestBar.volume != null) volume = latestBar.volume
            }

            const isUp = change > 0
            const isDown = change < 0
            const isZero = change === 0 || change == null

            const changeClass = isUp ? 'up' : isDown ? 'down' : 'zero'
            const formattedPrice = formatPrice(price, sym)
            const formattedChange = formatChange(change, sym)
            const formattedPct = `${isUp ? '' : ''}${Number(pctChange || 0).toFixed(2)}%`
            const formattedVol = formatVol(volume)

            return (
              <div
                key={sym}
                id={`tv-wl-row-${sym}`}
                className={`tv-wl-row ${isActive ? 'active' : ''} ${draggedIndex === idx ? 'dragging' : ''} ${dragOverIndex === idx && draggedIndex !== idx ? 'drag-over' : ''}`}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectSymbol(sym)}
              >
                {/* Drag Grip Handle */}
                <span className="tv-wl-drag-grip" title="Nắm giữ để kéo thả đổi vị trí">
                  <GripVertical size={12} />
                </span>

                {/* Symbol Col: Ribbon + Logo + Symbol + D + Dot */}
                <div className="tv-wl-col-symbol">
                  {/* Left Ribbon Bookmark Flag */}
                  {visibleColumns.flags && (
                    <div
                      className="tv-wl-ribbon-wrap"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveColorPickerSym((curr) => (curr === sym ? null : sym))
                      }}
                      title={flagColor ? `Đang gắn cờ ${flagColor.name}` : `Gắn cờ màu cho ${sym}`}
                    >
                      <Bookmark
                        size={13}
                        className={`tv-wl-ribbon ${flagColor ? 'has-flag' : ''}`}
                        fill={flagColor ? flagColor.hex : '#2e323e'}
                        color={flagColor ? flagColor.hex : '#363c4e'}
                        strokeWidth={1.5}
                      />

                      {/* Mini Color Picker Popover */}
                      {activeColorPickerSym === sym && (
                        <div
                          ref={colorPickerRef}
                          className="tv-wl-color-popover"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="tv-popover-header">Gắn cờ chú ý ({sym})</div>
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
                  )}

                  {/* Circular Real Logo Avatar */}
                  {visibleColumns.logo && (
                    <StockLogo symbol={sym} />
                  )}

                  {/* Symbol Ticker Name */}
                  <span className="tv-wl-ticker-name">{sym}</span>

                  {/* Timeframe Badge 'D' */}
                  <span className="tv-wl-tf-badge" title="Khung thời gian Ngày (Daily)">
                    D
                  </span>

                  {/* Market Status Dot */}
                  <span
                    className={`tv-wl-market-dot ${isUp ? 'dot-up' : isDown ? 'dot-down' : 'dot-neutral'}`}
                    title="Trạng thái phiên giao dịch"
                  />
                </div>

                {/* Last Price Column */}
                {visibleColumns.lastPrice && (
                  <div className={`tv-wl-col-last ${flashes[sym] ? `tv-flash-${flashes[sym]}` : ''}`}>
                    <span>{formattedPrice}</span>
                  </div>
                )}

                {/* Net Change Column */}
                {visibleColumns.change && (
                  <div className={`tv-wl-col-change ${changeClass}`}>
                    <span>{formattedChange}</span>
                  </div>
                )}

                {/* % Change Column */}
                {visibleColumns.pctChange && (
                  <div className={`tv-wl-col-pct ${changeClass}`}>
                    <span>{formattedPct}</span>
                  </div>
                )}

                {/* Volume Column (Optional) */}
                {visibleColumns.volume && (
                  <div className="tv-wl-col-vol">
                    <span>{formattedVol}</span>
                  </div>
                )}

                {/* Hover Delete Button */}
                <button
                  type="button"
                  className="tv-wl-row-delete-btn"
                  onClick={(e) => handleRemove(sym, e)}
                  title={`Xóa ${sym} khỏi danh sách`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* 6. Selected Stock Detail Card at Bottom */}
      {isMatchingLatestBar && latestBar && (
        <div className="tv-watchlist-detail-card">
          <div className="tv-detail-title-row">
            <div className="tv-detail-ticker-group">
              <StockLogo symbol={activeSymbol} size="card" />
              <div className="tv-detail-ticker-sub">
                <span className="tv-detail-ticker">{activeSymbol}</span>
                <span className="tv-detail-tf">1D · HOSE</span>
              </div>
            </div>
            <span className={`tv-detail-change ${isActiveUp ? 'up' : 'down'}`}>
              {isActiveUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {isActiveUp ? '+' : ''}
              {activePriceChange.toFixed(2)}%
            </span>
          </div>

          <div className="tv-detail-grid">
            <div className="tv-detail-item">
              <span className="tv-detail-lbl">Giá đóng cửa</span>
              <span className="tv-detail-val">{formatPrice(latestBar.close, activeSymbol)}</span>
            </div>
            <div className="tv-detail-item">
              <span className="tv-detail-lbl">Giá mở cửa</span>
              <span className="tv-detail-val">{formatPrice(latestBar.open, activeSymbol)}</span>
            </div>
            <div className="tv-detail-item">
              <span className="tv-detail-lbl">Cao nhất (High)</span>
              <span className="tv-detail-val up">{formatPrice(latestBar.high, activeSymbol)}</span>
            </div>
            <div className="tv-detail-item">
              <span className="tv-detail-lbl">Thấp nhất (Low)</span>
              <span className="tv-detail-val down">{formatPrice(latestBar.low, activeSymbol)}</span>
            </div>
            <div className="tv-detail-item" style={{ gridColumn: 'span 2' }}>
              <span className="tv-detail-lbl">Khối lượng (Volume)</span>
              <span className="tv-detail-val">{formatVol(latestBar.volume)} CP</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
