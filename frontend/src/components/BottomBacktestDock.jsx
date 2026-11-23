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

export default function BottomBacktestDock({
  activeSymbol,
  isOpen,
  onClose,
}) {
  const [windowMode, setWindowMode] = useState('normal') // 'normal', 'minimized', 'maximized'
  const [activeTab, setActiveTab] = useState('OVERVIEW') // 'OVERVIEW', 'TRADES', 'EQUITY', 'SETTINGS'

  const [form, setForm] = useState({
    symbol: activeSymbol || 'VNINDEX',
    start_date: '2023-01-01',
    end_date: '2026-11-01',
    initial_capital: 100000000,
    adx_threshold: 20,
    stop_loss_pct: 7,
    take_profit_pct: 20,
    exit_mode: 'macd_or_di',
    enforce_t_plus_2: true,
    use_macd: true,
    use_adx: true,
    use_weis_wave: true,
    use_supertrend: false,
    st_period: 10,
    st_mult: 3.0,
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

  const applyPreset = (presetType) => {
    if (presetType === 'supertrend_pure') {
      setForm((prev) => ({
        ...prev,
        use_supertrend: true,
        use_macd: false,
        use_adx: false,
        use_weis_wave: false,
        st_period: 10,
        st_mult: 3.0,
        exit_mode: 'supertrend',
      }))
    } else if (presetType === 'supertrend_macd') {
      setForm((prev) => ({
        ...prev,
        use_supertrend: true,
        use_macd: true,
        use_adx: false,
        use_weis_wave: false,
        st_period: 10,
        st_mult: 3.0,
        exit_mode: 'supertrend',
      }))
    } else if (presetType === 'combo_classic') {
      setForm((prev) => ({
        ...prev,
        use_supertrend: false,
        use_macd: true,
        use_adx: true,
        use_weis_wave: true,
        exit_mode: 'macd_or_di',
      }))
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
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #363a45', cursor: 'pointer' }}
                onClick={() => applyPreset('combo_classic')}
              >
                1. Combo MACD + ADX + Weis Wave
              </button>
              <button
                type="button"
                className="tv-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #363a45', cursor: 'pointer', color: '#58a6ff' }}
                onClick={() => applyPreset('supertrend_macd')}
              >
                2. SuperTrend + CM MACD
              </button>
              <button
                type="button"
                className="tv-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #363a45', cursor: 'pointer', color: '#089981' }}
                onClick={() => applyPreset('supertrend_pure')}
              >
                3. SuperTrend Thuần Túy (ATR 10, 3.0)
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
                  <option value="supertrend">SuperTrend: Bán khi dải chuyển sang Đỏ</option>
                  <option value="macd_cross">Bảo thủ: Chỉ khi MACD cắt xuống Signal</option>
                  <option value="any_bearish">Nhạy bén: Bất kỳ chỉ báo nào đảo chiều</option>
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
          </div>
        )}
      </div>
    </div>
  )
}
