import React, { useState } from 'react'
import { Play, X, TrendingUp } from 'lucide-react'
import { executeBacktest } from '../api/stockApi'

function formatVND(val) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0))
}

function EquitySparkline({ curve }) {
  if (!curve || curve.length < 2) return null
  const width = 420
  const height = 110
  const values = curve.map((c) => c.equity)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values
    .map((v, idx) => {
      const x = (idx / (values.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 16) - 8
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const isProfit = values[values.length - 1] >= values[0]
  return (
    <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: 8 }}>
      <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>Đường cong vốn (Equity Curve)</div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 100 }}>
        <polyline
          fill="none"
          stroke={isProfit ? '#3fb950' : '#f85149'}
          strokeWidth="2"
          points={points}
        />
      </svg>
    </div>
  )
}

export default function BacktestPanel({ activeSymbol, onClose }) {
  const [form, setForm] = useState({
    symbol: activeSymbol || 'MWG',
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
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleRun = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        symbol: (form.symbol || activeSymbol || 'MWG').toUpperCase(),
        initial_capital: Number(form.initial_capital),
        adx_threshold: Number(form.adx_threshold),
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

  return (
    <div className="backtest-drawer">
      <div className="panel-title">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={16} color="#58a6ff" />
          Backtest Engine (Chuẩn TTCK VN)
        </span>
        <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label>Mã cổ phiếu</label>
          <input value={form.symbol} onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())} />
        </div>
        <div className="form-field">
          <label>Vốn ban đầu (VND)</label>
          <input
            type="number"
            value={form.initial_capital}
            onChange={(e) => handleChange('initial_capital', e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>Từ ngày</label>
          <input type="date" value={form.start_date} onChange={(e) => handleChange('start_date', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Đến ngày</label>
          <input type="date" value={form.end_date} onChange={(e) => handleChange('end_date', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Ngưỡng ADX</label>
          <input
            type="number"
            value={form.adx_threshold}
            onChange={(e) => handleChange('adx_threshold', e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>Chế độ thoát lệnh</label>
          <select value={form.exit_mode} onChange={(e) => handleChange('exit_mode', e.target.value)}>
            <option value="macd_or_di">MACD cắt xuống hoặc DI- &gt; DI+</option>
            <option value="macd_cross">Chỉ khi MACD cắt xuống</option>
            <option value="any_bearish">Bất kỳ chỉ báo nào đảo chiều</option>
          </select>
        </div>
        <div className="form-field">
          <label>Cắt lỗ SL (%)</label>
          <input
            type="number"
            step="0.5"
            value={form.stop_loss_pct}
            onChange={(e) => handleChange('stop_loss_pct', e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>Chốt lời TP (%)</label>
          <input
            type="number"
            step="1"
            value={form.take_profit_pct}
            onChange={(e) => handleChange('take_profit_pct', e.target.value)}
          />
        </div>
      </div>

      <div className="checkbox-row">
        <label>
          <input type="checkbox" checked={form.use_macd} onChange={(e) => handleChange('use_macd', e.target.checked)} />
          CM MACD
        </label>
        <label>
          <input type="checkbox" checked={form.use_adx} onChange={(e) => handleChange('use_adx', e.target.checked)} />
          ADX &amp; DI
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.use_weis_wave}
            onChange={(e) => handleChange('use_weis_wave', e.target.checked)}
          />
          Weis Wave
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.enforce_t_plus_2}
            onChange={(e) => handleChange('enforce_t_plus_2', e.target.checked)}
          />
          Luật T+2.5
        </label>
      </div>

      <button className="btn" onClick={handleRun} disabled={loading} style={{ justifyContent: 'center' }}>
        <Play size={14} />
        {loading ? 'Đang tính toán...' : 'Chạy Backtest (Khớp giá Open T+1)'}
      </button>

      {error && <div style={{ color: '#f85149', fontSize: 12 }}>{error}</div>}

      {m && (
        <>
          <div style={{ fontSize: 11, color: '#8b949e' }}>
            Nguồn dữ liệu: <b>{result.data_origin}</b> | Phí mua/bán 0.15% + Thuế bán 0.1% + Lô 100 CP
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Tổng lợi nhuận (Chiến lược)</div>
              <div className={`metric-value ${m.total_return_pct >= 0 ? 'pos' : 'neg'}`}>
                {m.total_return_pct > 0 ? '+' : ''}{m.total_return_pct}%
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">So với Buy &amp; Hold</div>
              <div className={`metric-value ${m.buy_hold_return_pct >= 0 ? 'pos' : 'neg'}`}>
                {m.buy_hold_return_pct > 0 ? '+' : ''}{m.buy_hold_return_pct}%
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Vốn cuối kỳ (VND)</div>
              <div className="metric-value">{formatVND(m.final_equity)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Max Drawdown</div>
              <div className="metric-value neg">-{m.max_drawdown_pct}%</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Win Rate ({m.total_trades} lệnh)</div>
              <div className="metric-value">{m.win_rate_pct}%</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Profit Factor / Sharpe</div>
              <div className="metric-value">{m.profit_factor} / {m.sharpe_ratio}</div>
            </div>
          </div>

          <EquitySparkline curve={result.equity_curve} />

          <div className="trades-table-wrap">
            <table className="trades-table">
              <thead>
                <tr>
                  <th>Mua → Bán</th>
                  <th>KL</th>
                  <th>Lãi/Lỗ %</th>
                  <th>Lý do thoát</th>
                </tr>
              </thead>
              <tbody>
                {result.trades.map((t, idx) => (
                  <tr key={idx}>
                    <td>{t.entry_date} → {t.exit_date}</td>
                    <td>{t.shares}</td>
                    <td className={t.pnl_pct >= 0 ? 'pos' : 'neg'}>
                      {t.pnl_pct > 0 ? '+' : ''}{t.pnl_pct}%
                    </td>
                    <td>{t.exit_reason}</td>
                  </tr>
                ))}
                {result.trades.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#8b949e' }}>
                      Không có lệnh nào khớp với bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
