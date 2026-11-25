import React, { useState } from 'react'
import {
  Play,
  X,
  Minus,
  Maximize2,
  Minimize2,
  TrendingUp,
  Sliders,
  FileText,
  LineChart,
  CheckCircle2,
} from 'lucide-react'
import { executeBacktest } from '../api/stockApi'

function formatVND(val) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0))
}

function EquitySparkline({ curve }) {
  if (!curve || curve.length < 2) return null
  const width = 800
  const height = 150
  const values = curve.map((c) => c.equity)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values
    .map((v, idx) => {
      const x = (idx / (values.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 24) - 12
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const isProfit = values[values.length - 1] >= values[0]
  return (
    <div className="tv-equity-chart-box">
      <div className="tv-sparkline-title">
        <span>Đường cong vốn tài khoản (Equity Curve: {formatVND(values[0])} ➔ {formatVND(values[values.length - 1])} VND)</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="tv-equity-svg">
        <polyline
          fill="none"
          stroke={isProfit ? '#089981' : '#f23645'}
          strokeWidth="2.5"
          points={points}
        />
      </svg>
    </div>
  )
}

export const BACKTEST_EXTRA_INDICATORS = [
  { id: 'STOCH_RSI', label: 'StochRSI' },
  { id: 'WILLIAMS_VIX_FIX', label: 'CM VixFix (Bắt đáy)' },
  { id: 'STC', label: 'Schaff Trend Cycle' },
  { id: 'CMF', label: 'Chaikin Money Flow' },
  { id: 'TSI', label: 'True Strength Index' },
  { id: 'UO', label: 'Ultimate Osc' },
  { id: 'ELDER_RAY', label: 'Elder-Ray' },
  { id: 'CMO', label: 'Chande Mom (CMO)' },
  { id: 'FORCE_INDEX', label: 'Force Index (EFI)' },
  { id: 'CHOP', label: 'Choppiness (CHOP)' },
  { id: 'VORTEX', label: 'Vortex (VI+/VI-)' },
  { id: 'RVI', label: 'Relative Vigor (RVI)' },
  { id: 'ATR', label: 'ATR Volatility' },
  { id: 'CCI', label: 'CCI (20)' },
  { id: 'WR', label: 'Williams %R' },
  { id: 'AO', label: 'Awesome Osc (AO)' },
  { id: 'ROC', label: 'Rate of Change' },
  { id: 'TRIX', label: 'TRIX' },
  { id: 'RSI', label: 'RSI (14)' },
  { id: 'MFI', label: 'MFI (Dòng tiền)' },
  { id: 'OBV', label: 'OBV' },
  { id: 'KDJ', label: 'KDJ' },
]

export default function BottomBacktestDock({
  activeSymbol,
  isOpen,
  onClose,
  activeIndicators = [],
}) {
  const [windowMode, setWindowMode] = useState('normal') // 'normal', 'minimized', 'maximized'
  const [activeTab, setActiveTab] = useState('OVERVIEW') // 'OVERVIEW', 'TRADES', 'EQUITY', 'SETTINGS'

  const [form, setForm] = useState({
    symbol: activeSymbol || 'VNINDEX',
    start_date: '2023-01-01',
    end_date: new Date().toISOString().slice(0, 10),
    initial_capital: 100000000,
    adx_threshold: 20,
    stop_loss_pct: 7,
    take_profit_pct: 20,
    exit_mode: 'macd_or_di',
    combine_mode: 'AND',
    extra_indicators: [],
    enforce_t_plus_2: true,
    use_macd: true,
    use_adx: true,
    use_weis_wave: true,
    use_supertrend: false,
    use_squeeze: false,
    use_wavetrend: false,
    st_period: 10,
    st_mult: 3.0,
    sqz_length: 20,
    wt_chlen: 10,
    wt_avglen: 21,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  // Update symbol when activeSymbol changes
  React.useEffect(() => {
    if (activeSymbol) {
      setForm((prev) => ({ ...prev, symbol: activeSymbol }))
    }
  }, [activeSymbol])

  if (!isOpen) return null

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleExtraIndicator = (id) => {
    setForm((prev) => {
      const exists = (prev.extra_indicators || []).includes(id)
      const next = exists
        ? prev.extra_indicators.filter((x) => x !== id)
        : [...(prev.extra_indicators || []), id]
      return { ...prev, extra_indicators: next }
    })
  }

  const syncFromActiveChart = () => {
    const names = (activeIndicators || []).map((i) => i.name)
    const extraSet = new Set(BACKTEST_EXTRA_INDICATORS.map((x) => x.id))
    const nextExtra = names.filter((n) => extraSet.has(n))
    const hasMacd = names.includes('CM_MACD_MTF') || names.includes('MACD')
    const hasAdx = names.includes('ADX_DI') || names.includes('ADX_DI_BO')
    const hasWw = names.includes('WEIS_WAVE') || names.includes('WEIS_WAVE_VOL')
    const hasSt = names.includes('SUPERTREND')
    const hasSqz = names.includes('SQUEEZE_MOMENTUM')
    const hasWt = names.includes('WAVETREND')

    setForm((prev) => ({
      ...prev,
      use_macd: hasMacd,
      use_adx: hasAdx,
      use_weis_wave: hasWw,
      use_supertrend: hasSt,
      use_squeeze: hasSqz,
      use_wavetrend: hasWt,
      extra_indicators: nextExtra,
      exit_mode: nextExtra.length > 0 && !hasMacd && !hasAdx && !hasSt && !hasSqz && !hasWt ? 'selected_bearish' : prev.exit_mode,
    }))
  }

  const applyPreset = (presetType) => {
    const baseOff = {
      use_squeeze: false,
      use_supertrend: false,
      use_wavetrend: false,
      use_macd: false,
      use_adx: false,
      use_weis_wave: false,
      extra_indicators: [],
    }
    if (presetType === 'squeeze_pure') {
      setForm((prev) => ({ ...prev, ...baseOff, use_squeeze: true, sqz_length: 20, exit_mode: 'squeeze' }))
    } else if (presetType === 'wavetrend_pure') {
      setForm((prev) => ({ ...prev, ...baseOff, use_wavetrend: true, exit_mode: 'wavetrend' }))
    } else if (presetType === 'squeeze_supertrend') {
      setForm((prev) => ({ ...prev, ...baseOff, use_squeeze: true, use_supertrend: true, exit_mode: 'supertrend' }))
    } else if (presetType === 'supertrend_pure') {
      setForm((prev) => ({ ...prev, ...baseOff, use_supertrend: true, st_period: 10, st_mult: 3.0, exit_mode: 'supertrend' }))
    } else if (presetType === 'combo_classic') {
      setForm((prev) => ({ ...prev, ...baseOff, use_macd: true, use_adx: true, use_weis_wave: true, exit_mode: 'macd_or_di' }))
    } else if (presetType === 'stoch_rsi') {
      setForm((prev) => ({ ...prev, ...baseOff, extra_indicators: ['STOCH_RSI'], exit_mode: 'selected_bearish' }))
    } else if (presetType === 'vix_fix') {
      setForm((prev) => ({ ...prev, ...baseOff, extra_indicators: ['WILLIAMS_VIX_FIX'], exit_mode: 'selected_bearish' }))
    } else if (presetType === 'stc_cmf') {
      setForm((prev) => ({ ...prev, ...baseOff, extra_indicators: ['STC', 'CMF'], exit_mode: 'selected_bearish' }))
    } else if (presetType === 'vortex_chop') {
      setForm((prev) => ({ ...prev, ...baseOff, extra_indicators: ['VORTEX', 'CHOP'], exit_mode: 'selected_bearish' }))
    } else if (presetType === 'elder_ao') {
      setForm((prev) => ({ ...prev, ...baseOff, extra_indicators: ['AO', 'ELDER_RAY'], exit_mode: 'selected_bearish' }))
    } else if (presetType === 'cci_wr') {
      setForm((prev) => ({ ...prev, ...baseOff, extra_indicators: ['CCI', 'WR'], exit_mode: 'selected_bearish' }))
    }
  }

  const handleRun = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        symbol: (form.symbol || activeSymbol || 'VNINDEX').toUpperCase(),
        initial_capital: Number(form.initial_capital),
        adx_threshold: Number(form.adx_threshold),
        st_period: Number(form.st_period) || 10,
        st_mult: Number(form.st_mult) || 3.0,
        sqz_length: Number(form.sqz_length) || 20,
        wt_chlen: Number(form.wt_chlen) || 10,
        wt_avglen: Number(form.wt_avglen) || 21,
        stop_loss_pct: Number(form.stop_loss_pct) / 100,
        take_profit_pct: Number(form.take_profit_pct) / 100,
      }
      const data = await executeBacktest(payload)
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Lỗi chạy backtest')
    } finally {
      setLoading(false)
    }
  }

  const m = result?.metrics

  // Minimized Bar View
  if (windowMode === 'minimized') {
    return (
      <div className="tv-dock-minimized" onClick={() => setWindowMode('normal')}>
        <div className="tv-dock-min-left">
          <TrendingUp size={15} color="#58a6ff" />
          <span className="tv-dock-min-title">Strategy Tester (Backtest TTCK VN)</span>
          <span className="tv-dock-min-badge">Mã: {form.symbol}</span>
          {m && (
            <span className={`tv-dock-min-stat ${m.total_return_pct >= 0 ? 'pos' : 'neg'}`}>
              Lợi nhuận: {m.total_return_pct > 0 ? '+' : ''}{m.total_return_pct}% | Win: {m.win_rate_pct}% ({m.total_trades} lệnh)
            </span>
          )}
        </div>
        <div className="tv-dock-min-right">
          <button
            className="tv-dock-btn"
            onClick={(e) => {
              e.stopPropagation()
              setWindowMode('normal')
            }}
            title="Mở rộng bảng"
          >
            <Maximize2 size={13} />
          </button>
          <button
            className="tv-dock-btn"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            title="Đóng bảng"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`tv-bottom-dock ${windowMode === 'maximized' ? 'maximized' : ''}`}>
      {/* Header Bar */}
      <div className="tv-dock-header">
        <div className="tv-dock-tabs">
          <div className="tv-dock-title-label">
            <TrendingUp size={15} color="#58a6ff" />
            <span>Strategy Tester</span>
          </div>

          <button
            className={`tv-dock-tab-btn ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
            onClick={() => setActiveTab('OVERVIEW')}
          >
            <CheckCircle2 size={13} />
            <span>Tổng quan hiệu suất</span>
          </button>

          <button
            className={`tv-dock-tab-btn ${activeTab === 'TRADES' ? 'active' : ''}`}
            onClick={() => setActiveTab('TRADES')}
          >
            <FileText size={13} />
            <span>Nhật ký lệnh ({result?.trades?.length || 0})</span>
          </button>

          <button
            className={`tv-dock-tab-btn ${activeTab === 'EQUITY' ? 'active' : ''}`}
            onClick={() => setActiveTab('EQUITY')}
          >
            <LineChart size={13} />
            <span>Đường cong vốn</span>
          </button>

          <button
            className={`tv-dock-tab-btn ${activeTab === 'SETTINGS' ? 'active' : ''}`}
            onClick={() => setActiveTab('SETTINGS')}
          >
            <Sliders size={13} />
            <span>Cài đặt tham số</span>
          </button>
        </div>

        {/* Window controls (Minimize, Maximize, Close) */}
        <div className="tv-dock-controls">
          <button
            className="tv-dock-action-btn tv-btn-run-fast"
            onClick={handleRun}
            disabled={loading}
          >
            <Play size={13} />
            {loading ? 'Đang tính...' : 'Chạy Backtest'}
          </button>

          <button
            className="tv-dock-action-btn"
            onClick={() => setWindowMode('minimized')}
            title="Thu nhỏ xuống thanh đáy"
          >
            <Minus size={14} />
          </button>

          <button
            className="tv-dock-action-btn"
            onClick={() => setWindowMode(windowMode === 'maximized' ? 'normal' : 'maximized')}
            title={windowMode === 'maximized' ? 'Khôi phục kích thước' : 'Phóng to toàn màn hình'}
          >
            {windowMode === 'maximized' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            className="tv-dock-action-btn tv-dock-close"
            onClick={onClose}
            title="Đóng bảng Backtest (✕)"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Dock Content Body */}
      <div className="tv-dock-content">
        {error && <div className="tv-error-banner">{error}</div>}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="tv-tab-overview">
            {m ? (
              <>
                <div className="tv-metrics-summary-bar">
                  <div className="tv-metric-card">
                    <span className="tv-metric-title">Tổng lợi nhuận (Chiến lược)</span>
                    <span className={`tv-metric-big ${m.total_return_pct >= 0 ? 'pos' : 'neg'}`}>
                      {m.total_return_pct > 0 ? '+' : ''}{m.total_return_pct}%
                    </span>
                    <span className="tv-metric-sub">
                      Lãi/Lỗ: {formatVND(m.net_profit)} VND
                    </span>
                  </div>

                  <div className="tv-metric-card">
                    <span className="tv-metric-title">Mua &amp; Nắm giữ (Buy &amp; Hold)</span>
                    <span className={`tv-metric-big ${m.buy_hold_return_pct >= 0 ? 'pos' : 'neg'}`}>
                      {m.buy_hold_return_pct > 0 ? '+' : ''}{m.buy_hold_return_pct}%
                    </span>
                    <span className="tv-metric-sub">Lợi nhuận cơ sở</span>
                  </div>

                  <div className="tv-metric-card">
                    <span className="tv-metric-title">Vốn cuối kỳ (Net Equity)</span>
                    <span className="tv-metric-big">{formatVND(m.final_equity)}</span>
                    <span className="tv-metric-sub">Vốn đầu: {formatVND(m.initial_capital)}</span>
                  </div>

                  <div className="tv-metric-card">
                    <span className="tv-metric-title">Sụt giảm tối đa (Max Drawdown)</span>
                    <span className="tv-metric-big neg">-{m.max_drawdown_pct}%</span>
                    <span className="tv-metric-sub">Rủi ro lớn nhất</span>
                  </div>

                  <div className="tv-metric-card">
                    <span className="tv-metric-title">Tỷ lệ thắng (Win Rate)</span>
                    <span className="tv-metric-big">{m.win_rate_pct}%</span>
                    <span className="tv-metric-sub">Tổng: {m.total_trades} lệnh</span>
                  </div>

                  <div className="tv-metric-card">
                    <span className="tv-metric-title">Profit Factor / Sharpe</span>
                    <span className="tv-metric-big">{m.profit_factor} / {m.sharpe_ratio}</span>
                    <span className="tv-metric-sub">Hiệu quả rủi ro</span>
                  </div>
                </div>

                <div className="tv-overview-sparkline-row">
                  <EquitySparkline curve={result.equity_curve} />
                </div>
              </>
            ) : (
              <div className="tv-empty-prompt">
                <p>Chưa có dữ liệu kiểm thử. Bấm nút <b>"Chạy Backtest"</b> ở góc phải để phân tích hiệu suất chiến lược!</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TRADES LOG */}
        {activeTab === 'TRADES' && (
          <div className="tv-tab-trades">
            {result?.trades && result.trades.length > 0 ? (
              <table className="tv-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Ngày Mua</th>
                    <th>Ngày Bán</th>
                    <th>Khối Lượng</th>
                    <th>Giá Mua</th>
                    <th>Giá Bán</th>
                    <th>Phí &amp; Thuế</th>
                    <th>Lãi / Lỗ (VND)</th>
                    <th>Tỷ suất %</th>
                    <th>Số ngày nắm</th>
                    <th>Lý do thoát lệnh</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, idx) => (
                    <tr key={idx}>
                      <td>#{idx + 1}</td>
                      <td>{t.entry_date}</td>
                      <td>{t.exit_date}</td>
                      <td>{t.shares.toLocaleString()}</td>
                      <td>{formatVND(t.entry_price)}</td>
                      <td>{formatVND(t.exit_price)}</td>
                      <td>{formatVND(t.fees_and_tax)}</td>
                      <td className={t.net_pnl >= 0 ? 'pos' : 'neg'}>
                        {t.net_pnl > 0 ? '+' : ''}{formatVND(t.net_pnl)}
                      </td>
                      <td className={t.pnl_pct >= 0 ? 'pos' : 'neg'}>
                        {t.pnl_pct > 0 ? '+' : ''}{t.pnl_pct}%
                      </td>
                      <td>{t.holding_bars} phiên</td>
                      <td>
                        <span className="tv-exit-badge">{t.exit_reason}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="tv-empty-prompt">Chưa có danh sách lệnh. Vui lòng bấm "Chạy Backtest".</div>
            )}
          </div>
        )}

        {/* TAB 3: EQUITY CURVE */}
        {activeTab === 'EQUITY' && (
          <div className="tv-tab-equity">
            {result?.equity_curve ? (
              <EquitySparkline curve={result.equity_curve} />
            ) : (
              <div className="tv-empty-prompt">Chưa có dữ liệu đường cong vốn.</div>
            )}
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === 'SETTINGS' && (
          <div className="tv-tab-settings">
            <div className="tv-presets-row" style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#787b86', fontWeight: 600 }}>Chiến lược mẫu:</span>
              <button
                type="button"
                className="tv-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #363a45', cursor: 'pointer', color: '#f59e0b' }}
                onClick={() => applyPreset('squeeze_pure')}
              >
                ★ 1. Squeeze Mom (Top 1 TV)
              </button>
              <button
                type="button"
                className="tv-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #363a45', cursor: 'pointer', color: '#00e676' }}
                onClick={() => applyPreset('wavetrend_pure')}
              >
                ★ 2. WaveTrend (Top 3 TV)
              </button>
              <button
                type="button"
                className="tv-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #363a45', cursor: 'pointer', color: '#38bdf8' }}
                onClick={() => applyPreset('squeeze_supertrend')}
              >
                ★ 3. Squeeze + SuperTrend
              </button>
              <button
                type="button"
                className="tv-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #363a45', cursor: 'pointer' }}
                onClick={() => applyPreset('supertrend_pure')}
              >
                4. SuperTrend Thuần Túy
              </button>
              <button
                type="button"
                className="tv-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #363a45', cursor: 'pointer' }}
                onClick={() => applyPreset('combo_classic')}
              >
                5. Combo MACD + ADX
              </button>
              <button
                type="button"
                className="tv-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #363a45', cursor: 'pointer', color: '#2962ff' }}
                onClick={() => applyPreset('stoch_rsi')}
              >
                6. StochRSI
              </button>
              <button
                type="button"
                className="tv-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #363a45', cursor: 'pointer', color: '#00e676' }}
                onClick={() => applyPreset('vix_fix')}
              >
                7. CM VixFix (Bắt đáy)
              </button>
              <button
                type="button"
                className="tv-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #363a45', cursor: 'pointer', color: '#38bdf8' }}
                onClick={() => applyPreset('stc_cmf')}
              >
                8. STC + CMF
              </button>
              <button
                type="button"
                className="tv-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #363a45', cursor: 'pointer', color: '#a855f7' }}
                onClick={() => applyPreset('vortex_chop')}
              >
                9. Vortex + CHOP
              </button>
              <button
                type="button"
                className="tv-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #363a45', cursor: 'pointer', color: '#f59e0b' }}
                onClick={() => applyPreset('elder_ao')}
              >
                10. AO + Elder-Ray
              </button>
              <button
                type="button"
                className="tv-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #363a45', cursor: 'pointer', color: '#ec4899' }}
                onClick={() => applyPreset('cci_wr')}
              >
                11. CCI + Williams %R
              </button>
              <button
                type="button"
                className="tv-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '4px', border: '1px solid #2962ff', background: 'rgba(41,98,255,0.12)', cursor: 'pointer', color: '#60a5fa', fontWeight: 600 }}
                onClick={syncFromActiveChart}
                title="Tự động lấy toàn bộ chỉ báo đang bật trên biểu đồ đưa vào Backtest"
              >
                ✨ Nạp từ biểu đồ ({activeIndicators.length})
              </button>
            </div>

            <div className="tv-form-grid-3col">
              <div className="tv-field">
                <label>Mã cổ phiếu</label>
                <input
                  type="text"
                  value={form.symbol}
                  onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
                />
              </div>

              <div className="tv-field">
                <label>Vốn ban đầu (VND)</label>
                <input
                  type="number"
                  value={form.initial_capital}
                  onChange={(e) => handleChange('initial_capital', e.target.value)}
                />
              </div>

              <div className="tv-field">
                <label>Ngưỡng ADX xác nhận sóng</label>
                <input
                  type="number"
                  value={form.adx_threshold}
                  onChange={(e) => handleChange('adx_threshold', e.target.value)}
                />
              </div>

              <div className="tv-field">
                <label>Từ ngày</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                />
              </div>

              <div className="tv-field">
                <label>Đến ngày</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                />
              </div>

              <div className="tv-field">
                <label>Chế độ thoát lệnh</label>
                <select value={form.exit_mode} onChange={(e) => handleChange('exit_mode', e.target.value)}>
                  <option value="macd_or_di">Cân bằng: MACD cắt xuống hoặc DI- &gt; DI+</option>
                  <option value="selected_bearish">Theo chỉ báo phụ đang chọn đảo chiều</option>
                  <option value="squeeze">Squeeze Momentum: Bán khi động lượng suy yếu</option>
                  <option value="wavetrend">WaveTrend: Bán khi Death Cross vùng quá mua</option>
                  <option value="supertrend">SuperTrend: Bán khi dải chuyển sang Đỏ</option>
                  <option value="macd_cross">Bảo thủ: Chỉ khi MACD cắt xuống Signal</option>
                  <option value="any_bearish">Nhạy bén: Bất kỳ chỉ báo nào đảo chiều</option>
                </select>
              </div>

              <div className="tv-field">
                <label>Quy tắc gộp nhiều chỉ báo</label>
                <select value={form.combine_mode} onChange={(e) => handleChange('combine_mode', e.target.value)}>
                  <option value="AND">AND (Phải khớp TẤT CẢ chỉ báo đã bật)</option>
                  <option value="OR">OR (Chỉ cần 1 chỉ báo cho điểm Mua)</option>
                </select>
              </div>

              <div className="tv-field">
                <label>Cắt lỗ Stop-Loss (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.stop_loss_pct}
                  onChange={(e) => handleChange('stop_loss_pct', e.target.value)}
                />
              </div>

              <div className="tv-field">
                <label>Chốt lời Take-Profit (%)</label>
                <input
                  type="number"
                  step="1"
                  value={form.take_profit_pct}
                  onChange={(e) => handleChange('take_profit_pct', e.target.value)}
                />
              </div>

              {form.use_supertrend && (
                <>
                  <div className="tv-field">
                    <label>SuperTrend Chu kỳ ATR (Period)</label>
                    <input
                      type="number"
                      value={form.st_period}
                      onChange={(e) => handleChange('st_period', Number(e.target.value))}
                    />
                  </div>
                  <div className="tv-field">
                    <label>SuperTrend Hệ số nhân (Multiplier)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.st_mult}
                      onChange={(e) => handleChange('st_mult', Number(e.target.value))}
                    />
                  </div>
                </>
              )}

              <div className="tv-field tv-checkboxes-block">
                <label className="tv-chk-label">
                  <input
                    type="checkbox"
                    checked={form.enforce_t_plus_2}
                    onChange={(e) => handleChange('enforce_t_plus_2', e.target.checked)}
                  />
                  <span>Áp dụng quy định T+2.5 TTCK VN</span>
                </label>
                <label className="tv-chk-label">
                  <input
                    type="checkbox"
                    checked={form.use_squeeze}
                    onChange={(e) => handleChange('use_squeeze', e.target.checked)}
                  />
                  <span>Dùng Squeeze Momentum [LazyBear] (Top 1 TV)</span>
                </label>
                <label className="tv-chk-label">
                  <input
                    type="checkbox"
                    checked={form.use_wavetrend}
                    onChange={(e) => handleChange('use_wavetrend', e.target.checked)}
                  />
                  <span>Dùng WaveTrend Oscillator [LazyBear] (Top 3 TV)</span>
                </label>
                <label className="tv-chk-label">
                  <input
                    type="checkbox"
                    checked={form.use_supertrend}
                    onChange={(e) => handleChange('use_supertrend', e.target.checked)}
                  />
                  <span>Dùng SuperTrend (Olivier Seban ATR)</span>
                </label>
                <label className="tv-chk-label">
                  <input
                    type="checkbox"
                    checked={form.use_macd}
                    onChange={(e) => handleChange('use_macd', e.target.checked)}
                  />
                  <span>Dùng CM MACD MTF</span>
                </label>
                <label className="tv-chk-label">
                  <input
                    type="checkbox"
                    checked={form.use_adx}
                    onChange={(e) => handleChange('use_adx', e.target.checked)}
                  />
                  <span>Dùng ADX &amp; DI</span>
                </label>
                <label className="tv-chk-label">
                  <input
                    type="checkbox"
                    checked={form.use_weis_wave}
                    onChange={(e) => handleChange('use_weis_wave', e.target.checked)}
                  />
                  <span>Dùng Weis Wave Volume</span>
                </label>
              </div>
            </div>

            {/* Extra 22 TradingView Sub-pane Indicators Selector */}
            <div style={{ marginTop: '14px', padding: '10px 12px', background: '#181b24', borderRadius: '6px', border: '1px solid #2a2e39' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#d1d4dc' }}>
                  Chọn thêm Chỉ báo phụ TradingView vào Backtest ({(form.extra_indicators || []).length} đang chọn):
                </span>
                {(form.extra_indicators || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleChange('extra_indicators', [])}
                    style={{ background: 'transparent', border: 'none', color: '#f23645', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Bỏ chọn hết
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {BACKTEST_EXTRA_INDICATORS.map((ind) => {
                  const selected = (form.extra_indicators || []).includes(ind.id)
                  return (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => toggleExtraIndicator(ind.id)}
                      style={{
                        padding: '4px 9px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        border: selected ? '1px solid #2962ff' : '1px solid #2a2e39',
                        background: selected ? 'rgba(41, 98, 255, 0.22)' : '#131722',
                        color: selected ? '#60a5fa' : '#9ca3af',
                        fontWeight: selected ? 600 : 400,
                      }}
                    >
                      {selected ? '✓ ' : '+ '}{ind.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
