import React, { useState, useEffect } from 'react'
import {
  Search,
  CandlestickChart,
  Sun,
  Moon,
  Camera,
  ListFilter,
  TrendingUp,
  ChevronDown,
  Layers,
  Sparkles,
  Clock,
  Star,
  Plus,
  Cloud,
} from 'lucide-react'

export const ALL_TIMEFRAME_GROUPS = [
  {
    group: '⏱️ PHÚT (MINUTES)',
    periods: [
      { multiplier: 1, timespan: 'minute', text: '1m' },
      { multiplier: 3, timespan: 'minute', text: '3m' },
      { multiplier: 5, timespan: 'minute', text: '5m' },
      { multiplier: 10, timespan: 'minute', text: '10m' },
      { multiplier: 15, timespan: 'minute', text: '15m' },
      { multiplier: 30, timespan: 'minute', text: '30m' },
      { multiplier: 45, timespan: 'minute', text: '45m' },
    ],
  },
  {
    group: '🕒 GIỜ (HOURS)',
    periods: [
      { multiplier: 1, timespan: 'hour', text: '1h' },
      { multiplier: 2, timespan: 'hour', text: '2h' },
      { multiplier: 3, timespan: 'hour', text: '3h' },
      { multiplier: 4, timespan: 'hour', text: '4h' },
      { multiplier: 6, timespan: 'hour', text: '6h' },
      { multiplier: 8, timespan: 'hour', text: '8h' },
      { multiplier: 12, timespan: 'hour', text: '12h' },
    ],
  },
  {
    group: '📅 NGÀY (DAILY)',
    periods: [
      { multiplier: 1, timespan: 'day', text: '1D' },
      { multiplier: 2, timespan: 'day', text: '2D' },
      { multiplier: 3, timespan: 'day', text: '3D' },
      { multiplier: 5, timespan: 'day', text: '5D' },
    ],
  },
  {
    group: '📆 TUẦN (WEEKLY)',
    periods: [
      { multiplier: 1, timespan: 'week', text: '1W' },
      { multiplier: 2, timespan: 'week', text: '2W' },
    ],
  },
  {
    group: '🗓️ THÁNG & NĂM (MONTHLY)',
    periods: [
      { multiplier: 1, timespan: 'month', text: '1M' },
      { multiplier: 3, timespan: 'month', text: '3M' },
      { multiplier: 6, timespan: 'month', text: '6M' },
      { multiplier: 12, timespan: 'month', text: '12M' },
    ],
  },
]

// Flatten all default periods
export const ALL_PERIODS_FLAT = ALL_TIMEFRAME_GROUPS.flatMap((g) => g.periods)

const FAV_STORAGE_KEY = 'vn_fav_periods'
const DEFAULT_FAVORITES = ['15m', '1h', '2h', '3h', '4h', '1D', '1W', '1M']

export default function TradingViewHeader({
  activeSymbol,
  activePeriod,
  onPeriodChange,
  chartType,
  onChartTypeChange,
  theme,
  onToggleTheme,
  onOpenSymbolSearch,
  onOpenIndicators,
  activeIndicatorsCount,
  onApplyPreset,
  showWatchlist,
  onToggleWatchlist,
  showBacktest,
  onToggleBacktest,
  onScreenshot,
  drawingsCount = 0,
}) {
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false)
  const [showChartTypeDropdown, setShowChartTypeDropdown] = useState(false)
  const [showPresetDropdown, setShowPresetDropdown] = useState(false)

  // Starred / Pinned favorite timeframes
  const [favPeriodTexts, setFavPeriodTexts] = useState(() => {
    try {
      const saved = localStorage.getItem(FAV_STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return DEFAULT_FAVORITES
  })

  // Custom timeframe form
  const [customNum, setCustomNum] = useState('10')
  const [customUnit, setCustomUnit] = useState('minute')

  useEffect(() => {
    try {
      localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(favPeriodTexts))
    } catch {}
  }, [favPeriodTexts])

  const toggleFavorite = (text, e) => {
    e.stopPropagation()
    setFavPeriodTexts((prev) =>
      prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text]
    )
  }

  // Get period object from text
  const findPeriodObj = (text) => {
    const existing = ALL_PERIODS_FLAT.find((p) => p.text.toLowerCase() === text.toLowerCase())
    if (existing) return existing
    // Parse dynamic custom period e.g. "10m", "6h", "5D"
    const lower = text.toLowerCase()
    const digits = parseInt(lower.replace(/\D/g, ''), 10) || 1
    if (lower.endsWith('m') && !text.endsWith('M')) {
      return { multiplier: digits, timespan: 'minute', text }
    }
    if (lower.endsWith('h')) {
      return { multiplier: digits, timespan: 'hour', text }
    }
    if (lower.endsWith('d')) {
      return { multiplier: digits, timespan: 'day', text: `${digits}D` }
    }
    if (lower.endsWith('w')) {
      return { multiplier: digits, timespan: 'week', text: `${digits}W` }
    }
    if (text.endsWith('M')) {
      return { multiplier: digits, timespan: 'month', text: `${digits}M` }
    }
    return { multiplier: 1, timespan: 'day', text }
  }

  const handleAddCustom = (e) => {
    e.preventDefault()
    const num = parseInt(customNum, 10)
    if (!num || num <= 0) return
    let text = ''
    if (customUnit === 'minute') text = `${num}m`
    else if (customUnit === 'hour') text = `${num}h`
    else if (customUnit === 'day') text = `${num}D`
    else if (customUnit === 'month') text = `${num}M`

    const newObj = { multiplier: num, timespan: customUnit, text }
    onPeriodChange(newObj)
    if (!favPeriodTexts.includes(text)) {
      setFavPeriodTexts((prev) => [...prev, text])
    }
    setShowPeriodDropdown(false)
  }

  const chartTypes = [
    { id: 'candle_solid', label: 'Nến Nhật (Candles)' },
    { id: 'candle_stroke', label: 'Nến rỗng (Hollow Candles)' },
    { id: 'ohlc', label: 'Thanh giá (Bars OHLC)' },
    { id: 'area', label: 'Vùng giá (Area)' },
  ]

  const presets = [
    {
      id: 'default',
      label: 'Cơ bản (Nến + Volume + MA)',
      indicators: ['MA', 'VOL'],
    },
    {
      id: 'custom3',
      label: '🇻🇳 Bộ 3 chỉ báo Custom VN (MACD MTF + ADX DI + Weis Wave)',
      indicators: ['MA', 'VOL', 'CM_MACD_MTF', 'ADX_DI', 'WEIS_WAVE'],
    },
    {
      id: 'trend',
      label: '📈 Xu hướng & Động lượng (EMA + RSI + MACD)',
      indicators: ['VOL', 'EMA', 'RSI', 'MACD'],
    },
    {
      id: 'boll',
      label: '📊 Dải Bollinger Bands + Weis Wave',
      indicators: ['MA', 'VOL', 'BOLL', 'WEIS_WAVE'],
    },
  ]

  const isPeriodActive = (p) => p.text.toLowerCase() === activePeriod?.text.toLowerCase()

  // Topbar favorite objects
  const topbarPeriods = favPeriodTexts.map(findPeriodObj)
  const isCurrentInTopbar = topbarPeriods.some((p) => isPeriodActive(p))

  return (
    <header className="tv-header">
      {/* Left: Brand & Symbol */}
      <div className="tv-header-left">
        <div className="tv-brand">
          <TrendingUp size={18} className="tv-brand-icon" />
          <span className="tv-brand-text">VN Stock Pro</span>
        </div>

        <div className="tv-divider" />

        {/* Symbol Search Trigger Button */}
        <button
          className="tv-symbol-btn"
          onClick={onOpenSymbolSearch}
          title="Tìm kiếm mã chứng khoán (Ctrl+K)"
        >
          <Search size={14} className="tv-icon-dim" />
          <span className="tv-symbol-ticker">{activeSymbol}</span>
          <span className="tv-symbol-exchange">HOSE</span>
          <ChevronDown size={13} className="tv-icon-dim" />
        </button>

        <div className="tv-divider" />

        {/* Dynamic Timeframe Selector with Star Favorites (TradingView Style) */}
        <div className="tv-period-group">
          {topbarPeriods.map((p) => (
            <button
              key={p.text}
              className={`tv-period-btn ${isPeriodActive(p) ? 'active' : ''}`}
              onClick={() => onPeriodChange(p)}
              title={`Khung thời gian ${p.text}`}
            >
              {p.text}
            </button>
          ))}

          {/* If current active period is not in starred, show it as active button */}
          {!isCurrentInTopbar && (
            <button
              className="tv-period-btn active"
              onClick={() => onPeriodChange(activePeriod)}
            >
              {activePeriod.text}
            </button>
          )}

          {/* Timeframe Dropdown (All Groups + Star to Pin + Custom Interval) */}
          <div className="tv-dropdown-wrap">
            <button
              className={`tv-period-btn tv-dropdown-arrow-btn ${showPeriodDropdown ? 'open' : ''}`}
              onClick={() => setShowPeriodDropdown((s) => !s)}
              title="Mở tất cả khung thời gian (Phút, Giờ, Ngày, Tuần, Tháng, Tùy chỉnh...)"
            >
              <Clock size={13} style={{ marginRight: 2 }} />
              <ChevronDown size={11} />
            </button>

            {showPeriodDropdown && (
              <div
                className="tv-dropdown-menu tv-period-menu-large"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="tv-period-menu-scroll">
                  {ALL_TIMEFRAME_GROUPS.map((grp) => (
                    <div key={grp.group} className="tv-timeframe-section">
                      <div className="tv-timeframe-header">{grp.group}</div>
                      <div className="tv-timeframe-grid">
                        {grp.periods.map((p) => {
                          const isFav = favPeriodTexts.includes(p.text)
                          const isActive = isPeriodActive(p)
                          return (
                            <div
                              key={p.text}
                              className={`tv-tf-card ${isActive ? 'active' : ''}`}
                              onClick={() => {
                                onPeriodChange(p)
                                setShowPeriodDropdown(false)
                              }}
                            >
                              <span className="tv-tf-name">{p.text}</span>
                              <button
                                type="button"
                                className={`tv-tf-star-btn ${isFav ? 'starred' : ''}`}
                                onClick={(e) => toggleFavorite(p.text, e)}
                                title={isFav ? 'Bỏ ghim khỏi thanh trên' : 'Ghim vào thanh trên (Yêu thích)'}
                              >
                                <Star
                                  size={11}
                                  fill={isFav ? '#e3b341' : 'none'}
                                  color={isFav ? '#e3b341' : '#787b86'}
                                />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom Timeframe Form */}
                <div className="tv-timeframe-custom-bar">
                  <div className="tv-custom-tf-title">Tùy chỉnh khung thời gian:</div>
                  <form onSubmit={handleAddCustom} className="tv-custom-tf-form">
                    <input
                      type="number"
                      min="1"
                      max="360"
                      value={customNum}
                      onChange={(e) => setCustomNum(e.target.value)}
                      className="tv-custom-tf-input"
                    />
                    <select
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      className="tv-custom-tf-select"
                    >
                      <option value="minute">Phút</option>
                      <option value="hour">Giờ</option>
                      <option value="day">Ngày</option>
                      <option value="month">Tháng</option>
                    </select>
                    <button type="submit" className="tv-custom-tf-submit" title="Thêm khung thời gian">
                      <Plus size={12} />
                      <span>Thêm</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="tv-divider" />

        {/* Chart Type Selector */}
        <div className="tv-dropdown-wrap">
          <button
            className="tv-tool-btn"
            onClick={() => setShowChartTypeDropdown((s) => !s)}
            title="Kiểu biểu đồ (Nến, Thanh, Đường, Vùng)"
          >
            <CandlestickChart size={16} />
            <ChevronDown size={11} className="tv-icon-dim" />
          </button>
          {showChartTypeDropdown && (
            <div className="tv-dropdown-menu" onClick={() => setShowChartTypeDropdown(false)}>
              {chartTypes.map((t) => (
                <button
                  key={t.id}
                  className={`tv-dropdown-item ${chartType === t.id ? 'active' : ''}`}
                  onClick={() => onChartTypeChange(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="tv-divider" />

        {/* Indicators fx Modal Button */}
        <button
          className="tv-fx-btn"
          onClick={onOpenIndicators}
          title="Mở bảng chỉ báo kỹ thuật & chiến lược (Indicators)"
        >
          <span className="tv-fx-icon">fx</span>
          <span className="tv-fx-label">Các chỉ báo</span>
          {activeIndicatorsCount > 0 && (
            <span className="tv-badge-count">{activeIndicatorsCount}</span>
          )}
        </button>

        {/* Presets Dropdown */}
        <div className="tv-dropdown-wrap">
          <button
            className="tv-tool-btn"
            onClick={() => setShowPresetDropdown((s) => !s)}
            title="Bộ mẫu chỉ báo (Presets)"
          >
            <Layers size={15} />
            <span style={{ fontSize: 12 }}>Mẫu chỉ báo</span>
            <ChevronDown size={11} className="tv-icon-dim" />
          </button>
          {showPresetDropdown && (
            <div className="tv-dropdown-menu tv-preset-menu" onClick={() => setShowPresetDropdown(false)}>
              <div className="tv-dropdown-header">Bộ mẫu chỉ báo khuyên dùng</div>
              {presets.map((pr) => (
                <button
                  key={pr.id}
                  className="tv-dropdown-item tv-preset-item"
                  onClick={() => onApplyPreset(pr.indicators)}
                >
                  <Sparkles size={13} color="#2962ff" />
                  <span>{pr.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="tv-header-right">
        {/* Auto-saved Drawings Indicator */}
        <div
          className="tv-drawings-save-status"
          title={`Tất cả hình vẽ phân tích kỹ thuật của mã ${activeSymbol} được tự động lưu vào bộ nhớ trình duyệt`}
        >
          <Cloud size={14} color="#089981" />
          <span>{drawingsCount > 0 ? `Đã lưu (${drawingsCount})` : 'Tự động lưu'}</span>
        </div>

        <div className="tv-divider" />

        {/* Screenshot Camera */}
        <button
          className="tv-icon-btn"
          onClick={onScreenshot}
          title="Chụp ảnh biểu đồ (Screenshot)"
        >
          <Camera size={16} />
        </button>

        {/* Theme Toggle */}
        <button
          className="tv-icon-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="tv-divider" />

        {/* Watchlist Toggle */}
        <button
          className={`tv-header-btn tv-watchlist-trigger ${showWatchlist ? 'active' : ''}`}
          onClick={onToggleWatchlist}
          title="Bật/Tắt thanh Watchlist theo dõi mã chứng khoán"
        >
          <ListFilter size={15} />
          <span>Watchlist</span>
        </button>

        {/* Strategy Tester (Backtest Engine) */}
        <button
          className={`tv-header-btn tv-backtest-trigger ${showBacktest ? 'active' : ''}`}
          onClick={onToggleBacktest}
          title="Mở / Đóng bảng kiểm thử chiến lược Backtest TTCK VN"
        >
          <Sparkles size={15} color="#e3b341" />
          <span>Backtest Engine</span>
        </button>
      </div>
    </header>
  )
}
