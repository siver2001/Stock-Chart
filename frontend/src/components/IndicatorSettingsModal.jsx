import React, { useState, useEffect } from 'react'
import { X, Settings, RotateCcw, Check, Plus, Trash2, Info, Sliders } from 'lucide-react'
import { volumeOverlayConfig } from '../indicators/volumeOverlay'

// Màu sắc mặc định cho các đường MA/EMA
const DEFAULT_LINE_COLORS = ['#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#06b6d4']

export default function IndicatorSettingsModal({
  isOpen,
  onClose,
  indicator,
  chartInstance,
  onApplySettings,
}) {
  if (!isOpen || !indicator) return null

  const indName = indicator.name
  const paneId = indicator.paneId || 'candle_pane'

  // Tab: 'inputs' | 'about'
  const [activeTab, setActiveTab] = useState('inputs')

  // Lấy thông tin chỉ báo hiện tại từ KlineCharts
  const currentIndInstance = chartInstance?.getIndicatorByPaneId?.(paneId, indName)

  // Khởi tạo state params
  const [calcParams, setCalcParams] = useState(() => {
    if (currentIndInstance?.calcParams && currentIndInstance.calcParams.length > 0) {
      return [...currentIndInstance.calcParams]
    }
    try {
      const raw = localStorage.getItem('vn_indicator_calc_params')
      if (raw) {
        const pMap = JSON.parse(raw)
        if (pMap && pMap[indName] && Array.isArray(pMap[indName])) {
          return [...pMap[indName]]
        }
      }
    } catch {}
    if (indName === 'MA') return [10, 20, 50, 100]
    if (indName === 'EMA') return [12, 26, 50]
    if (indName === 'BOLL') return [20, 2]
    if (indName === 'RSI') return [14]
    if (indName === 'MACD') return [12, 26, 9]
    if (indName === 'KDJ') return [9, 3, 3]
    if (indName === 'WEIS_WAVE') return [2, 0]
    if (indName === 'ADX_DI' || indName === 'ADX_DI_BO') return [14, 20]
    if (indName === 'SUPERTREND') return [10, 3]
    if (indName === 'ICHIMOKU') return [9, 26, 52]
    if (indName === 'MFI') return [14]
    if (indName === 'VWAP') return [1, 2]
    return []
  })

  // State riêng cho Volume Overlay
  const [volHeightRatio, setVolHeightRatio] = useState(
    Math.round((volumeOverlayConfig.maxHeightRatio || 0.18) * 100)
  )
  const [volOpacity, setVolOpacity] = useState(
    Math.round((volumeOverlayConfig.opacity || 0.65) * 100)
  )

  useEffect(() => {
    if (currentIndInstance?.calcParams) {
      setCalcParams([...currentIndInstance.calcParams])
    }
    setVolHeightRatio(Math.round((volumeOverlayConfig.maxHeightRatio || 0.18) * 100))
    setVolOpacity(Math.round((volumeOverlayConfig.opacity || 0.65) * 100))
    setActiveTab('inputs')
  }, [indicator, currentIndInstance])

  const handleParamChange = (index, val) => {
    const num = Number(val)
    if (isNaN(num)) return
    setCalcParams((prev) => {
      const next = [...prev]
      next[index] = num
      return next
    })
  }

  const handleAddParam = (defaultVal = 50) => {
    if (calcParams.length >= 6) return
    const lastVal = calcParams[calcParams.length - 1] || defaultVal
    setCalcParams([...calcParams, lastVal * 2])
  }

  const handleRemoveParam = (index) => {
    if (calcParams.length <= 1) return
    setCalcParams(calcParams.filter((_, i) => i !== index))
  }

  const handleResetDefault = () => {
    try {
      const raw = localStorage.getItem('vn_indicator_calc_params')
      if (raw) {
        const pMap = JSON.parse(raw)
        delete pMap[indName]
        localStorage.setItem('vn_indicator_calc_params', JSON.stringify(pMap))
      }
    } catch {}

    if (indName === 'MA') {
      setCalcParams([10, 20, 50, 100])
    } else if (indName === 'EMA') {
      setCalcParams([12, 26, 50])
    } else if (indName === 'BOLL') {
      setCalcParams([20, 2])
    } else if (indName === 'RSI') {
      setCalcParams([14])
    } else if (indName === 'MACD') {
      setCalcParams([12, 26, 9])
    } else if (indName === 'VOL') {
      setVolHeightRatio(18)
      setVolOpacity(65)
    } else if (indName === 'WEIS_WAVE') {
      setCalcParams([2, 0])
    } else if (indName === 'SUPERTREND') {
      setCalcParams([10, 3])
    } else if (indName === 'ICHIMOKU') {
      setCalcParams([9, 26, 52])
    } else if (indName === 'MFI') {
      setCalcParams([14])
    } else if (indName === 'VWAP') {
      setCalcParams([1, 2])
    }
  }

  const handleApply = () => {
    if (indName === 'VOL') {
      const cfg = {
        maxHeightRatio: volHeightRatio / 100,
        opacity: volOpacity / 100,
      }
      volumeOverlayConfig.maxHeightRatio = cfg.maxHeightRatio
      volumeOverlayConfig.opacity = cfg.opacity
      try {
        const raw = localStorage.getItem('vn_indicator_calc_params')
        const pMap = raw ? JSON.parse(raw) : {}
        pMap['VOL'] = cfg
        localStorage.setItem('vn_indicator_calc_params', JSON.stringify(pMap))
      } catch {}

      if (chartInstance?._chartStore) {
        chartInstance.applyNewData(chartInstance._chartStore.getDataList())
      }
    } else {
      const validParams = calcParams.map((p) => Math.max(1, Math.round(Number(p))))
      try {
        const raw = localStorage.getItem('vn_indicator_calc_params')
        const pMap = raw ? JSON.parse(raw) : {}
        pMap[indName] = validParams
        localStorage.setItem('vn_indicator_calc_params', JSON.stringify(pMap))
      } catch {}

      if (chartInstance) {
        chartInstance.overrideIndicator(
          {
            name: indName,
            calcParams: validParams,
          },
          paneId,
          () => {
            if (onApplySettings) {
              onApplySettings(indName, validParams)
            }
          }
        )
      }
    }
    onClose()
  }

  // Tên hiển thị đầy đủ
  const getIndicatorFullName = () => {
    switch (indName) {
      case 'MA': return 'Đường trung bình động (MA)'
      case 'EMA': return 'Đường trung bình hàm mũ (EMA)'
      case 'BOLL': return 'Dải băng Bollinger Bands'
      case 'RSI': return 'Chỉ số sức mạnh tương đối (RSI)'
      case 'MACD': return 'Chỉ báo xu hướng MACD'
      case 'VOL': return 'Khối lượng giao dịch (Volume chân nến)'
      case 'WEIS_WAVE': return 'Sóng tích lũy Weis Wave Volume'
      case 'SUPERTREND': return 'Chỉ báo xu hướng SuperTrend (Olivier Seban)'
      case 'VOLUME_PROFILE': return 'Vùng khối lượng kháng cự & hỗ trợ (Volume Profile)'
      case 'ICHIMOKU': return 'Hệ thống Mây Ichimoku Kinko Hyo'
      case 'VWAP': return 'Giá bình quân khối lượng (VWAP)'
      case 'MFI': return 'Chỉ số dòng tiền (Money Flow Index)'
      case 'OBV': return 'Chỉ số khối lượng cân bằng (OBV)'
      default: return `Chỉ báo ${indName}`
    }
  }

  return (
    <div className="tv-modal-backdrop" onClick={onClose}>
      <div className="tv-settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tv-settings-header">
          <div className="tv-settings-title">
            <Settings size={18} color="#2962ff" />
            <span>{getIndicatorFullName()}</span>
          </div>
          <button className="tv-modal-close-btn" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="tv-settings-tabs">
          <button
            type="button"
            className={`tv-settings-tab ${activeTab === 'inputs' ? 'active' : ''}`}
            onClick={() => setActiveTab('inputs')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={14} />
              Đầu vào (Inputs)
            </span>
          </button>
          <button
            type="button"
            className={`tv-settings-tab ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} />
              Hướng dẫn & Ý nghĩa
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="tv-settings-body">
          {activeTab === 'inputs' ? (
            <>
              {/* Cài đặt MA */}
              {indName === 'MA' && (
                <div>
                  <div className="tv-section-label">Gợi ý chu kỳ phiên phổ biến:</div>
                  <div className="tv-preset-chips">
                    <button
                      type="button"
                      className="tv-preset-chip"
                      onClick={() => setCalcParams([10, 20, 50, 100])}
                    >
                      Chuẩn: [10, 20, 50, 100]
                    </button>
                    <button
                      type="button"
                      className="tv-preset-chip"
                      onClick={() => setCalcParams([20, 50, 100, 200])}
                    >
                      Trend Dài: [20, 50, 100, 200]
                    </button>
                    <button
                      type="button"
                      className="tv-preset-chip"
                      onClick={() => setCalcParams([5, 10, 20, 50])}
                    >
                      Lướt sóng: [5, 10, 20, 50]
                    </button>
                    <button
                      type="button"
                      className="tv-preset-chip"
                      onClick={() => setCalcParams([9, 21, 50, 200])}
                    >
                      Fibonacci: [9, 21, 50, 200]
                    </button>
                  </div>

                  <div className="tv-section-label" style={{ marginTop: '12px' }}>
                    Danh sách các đường MA ({calcParams.length}/6 đường):
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {calcParams.map((p, idx) => (
                      <div key={idx} className="tv-setting-row">
                        <div className="tv-setting-label-group">
                          <div
                            className="tv-color-indicator"
                            style={{
                              backgroundColor: DEFAULT_LINE_COLORS[idx % DEFAULT_LINE_COLORS.length],
                            }}
                          />
                          <div>
                            <div className="tv-setting-label">Đường MA {idx + 1}</div>
                            <div className="tv-setting-sublabel">
                              {p <= 20 ? 'Ngắn hạn' : p <= 50 ? 'Trung hạn' : 'Dài hạn'}
                            </div>
                          </div>
                        </div>

                        <div className="tv-setting-input-group">
                          <span className="tv-setting-unit">Chu kỳ:</span>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            className="tv-setting-input"
                            value={p}
                            onChange={(e) => handleParamChange(idx, e.target.value)}
                          />
                          {calcParams.length > 1 && (
                            <button
                              type="button"
                              className="tv-delete-btn"
                              onClick={() => handleRemoveParam(idx)}
                              title="Xóa đường này"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {calcParams.length < 6 && (
                    <button
                      type="button"
                      className="tv-add-btn"
                      onClick={() => handleAddParam(50)}
                    >
                      <Plus size={16} />
                      <span>Thêm đường MA mới</span>
                    </button>
                  )}
                </div>
              )}

              {/* Cài đặt EMA */}
              {indName === 'EMA' && (
                <div>
                  <div className="tv-section-label">Gợi ý chu kỳ EMA:</div>
                  <div className="tv-preset-chips">
                    <button
                      type="button"
                      className="tv-preset-chip"
                      onClick={() => setCalcParams([12, 26, 50])}
                    >
                      Mặc định: [12, 26, 50]
                    </button>
                    <button
                      type="button"
                      className="tv-preset-chip"
                      onClick={() => setCalcParams([9, 21, 55, 200])}
                    >
                      Sóng Elliot: [9, 21, 55, 200]
                    </button>
                    <button
                      type="button"
                      className="tv-preset-chip"
                      onClick={() => setCalcParams([5, 13, 34, 89])}
                    >
                      Fibonacci: [5, 13, 34, 89]
                    </button>
                  </div>

                  <div className="tv-section-label" style={{ marginTop: '12px' }}>
                    Danh sách các đường EMA ({calcParams.length}/6 đường):
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {calcParams.map((p, idx) => (
                      <div key={idx} className="tv-setting-row">
                        <div className="tv-setting-label-group">
                          <div
                            className="tv-color-indicator"
                            style={{
                              backgroundColor: DEFAULT_LINE_COLORS[idx % DEFAULT_LINE_COLORS.length],
                            }}
                          />
                          <div>
                            <div className="tv-setting-label">Đường EMA {idx + 1}</div>
                            <div className="tv-setting-sublabel">
                              {p <= 20 ? 'Phản ứng nhanh' : 'Bám xu hướng'}
                            </div>
                          </div>
                        </div>

                        <div className="tv-setting-input-group">
                          <span className="tv-setting-unit">Chu kỳ:</span>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            className="tv-setting-input"
                            value={p}
                            onChange={(e) => handleParamChange(idx, e.target.value)}
                          />
                          {calcParams.length > 1 && (
                            <button
                              type="button"
                              className="tv-delete-btn"
                              onClick={() => handleRemoveParam(idx)}
                              title="Xóa đường này"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {calcParams.length < 6 && (
                    <button
                      type="button"
                      className="tv-add-btn"
                      onClick={() => handleAddParam(50)}
                    >
                      <Plus size={16} />
                      <span>Thêm đường EMA mới</span>
                    </button>
                  )}
                </div>
              )}

              {/* Cài đặt BOLL */}
              {indName === 'BOLL' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="tv-section-label">Thông số Dải băng Bollinger:</div>
                  <div className="tv-setting-row">
                    <div>
                      <div className="tv-setting-label">Chu kỳ MA giữa (Period)</div>
                      <div className="tv-setting-sublabel">Số phiên tính đường trung bình trục chính</div>
                    </div>
                    <div className="tv-setting-input-group">
                      <input
                        type="number"
                        min="5"
                        max="200"
                        className="tv-setting-input"
                        value={calcParams[0] || 20}
                        onChange={(e) => handleParamChange(0, e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="tv-setting-row">
                    <div>
                      <div className="tv-setting-label">Hệ số độ lệch chuẩn (StdDev)</div>
                      <div className="tv-setting-sublabel">Độ rộng dải trên và dải dưới (chuẩn: 2.0)</div>
                    </div>
                    <div className="tv-setting-input-group">
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="10"
                        className="tv-setting-input"
                        value={calcParams[1] || 2}
                        onChange={(e) => handleParamChange(1, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Cài đặt RSI */}
              {indName === 'RSI' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="tv-section-label">Gợi ý chu kỳ RSI:</div>
                  <div className="tv-preset-chips">
                    <button type="button" className="tv-preset-chip" onClick={() => setCalcParams([7])}>
                      7 (Nhạy cao)
                    </button>
                    <button type="button" className="tv-preset-chip active" onClick={() => setCalcParams([14])}>
                      14 (Chuẩn mực)
                    </button>
                    <button type="button" className="tv-preset-chip" onClick={() => setCalcParams([21])}>
                      21 (Trung hạn)
                    </button>
                  </div>

                  <div className="tv-setting-row">
                    <div>
                      <div className="tv-setting-label">Chiều dài chu kỳ (Length)</div>
                      <div className="tv-setting-sublabel">Khung phiên tính quá mua (&gt;70) và quá bán (&lt;30)</div>
                    </div>
                    <div className="tv-setting-input-group">
                      <input
                        type="number"
                        min="2"
                        max="100"
                        className="tv-setting-input"
                        value={calcParams[0] || 14}
                        onChange={(e) => handleParamChange(0, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Cài đặt MACD */}
              {indName === 'MACD' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="tv-section-label">Gợi ý cấu hình MACD:</div>
                  <div className="tv-preset-chips">
                    <button type="button" className="tv-preset-chip active" onClick={() => setCalcParams([12, 26, 9])}>
                      12, 26, 9 (Tiêu chuẩn)
                    </button>
                    <button type="button" className="tv-preset-chip" onClick={() => setCalcParams([5, 35, 5])}>
                      5, 35, 5 (Lướt sóng nhanh)
                    </button>
                    <button type="button" className="tv-preset-chip" onClick={() => setCalcParams([24, 52, 18])}>
                      24, 52, 18 (Dài hạn)
                    </button>
                  </div>

                  <div className="tv-setting-row">
                    <div>
                      <div className="tv-setting-label">EMA Nhanh (Fast Length)</div>
                      <div className="tv-setting-sublabel">Chu kỳ đường trung bình nhanh</div>
                    </div>
                    <div className="tv-setting-input-group">
                      <input
                        type="number"
                        min="2"
                        max="100"
                        className="tv-setting-input"
                        value={calcParams[0] || 12}
                        onChange={(e) => handleParamChange(0, e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="tv-setting-row">
                    <div>
                      <div className="tv-setting-label">EMA Chậm (Slow Length)</div>
                      <div className="tv-setting-sublabel">Chu kỳ đường trung bình chậm</div>
                    </div>
                    <div className="tv-setting-input-group">
                      <input
                        type="number"
                        min="5"
                        max="200"
                        className="tv-setting-input"
                        value={calcParams[1] || 26}
                        onChange={(e) => handleParamChange(1, e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="tv-setting-row">
                    <div>
                      <div className="tv-setting-label">Đường Tín hiệu (Signal Length)</div>
                      <div className="tv-setting-sublabel">Đường trung bình làm mịn Signal Line</div>
                    </div>
                    <div className="tv-setting-input-group">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        className="tv-setting-input"
                        value={calcParams[2] || 9}
                        onChange={(e) => handleParamChange(2, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Cài đặt VOL (Volume Overlay) */}
              {indName === 'VOL' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="tv-section-label">Tùy biến hiển thị Volume chân nến:</div>

                  <div className="tv-slider-card">
                    <div className="tv-slider-header">
                      <div>
                        <div className="tv-setting-label">Chiều cao cột Volume:</div>
                        <div className="tv-setting-sublabel">Tỷ lệ so với chiều cao biểu đồ nến</div>
                      </div>
                      <span className="tv-slider-badge">{volHeightRatio}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="35"
                      step="1"
                      value={volHeightRatio}
                      onChange={(e) => setVolHeightRatio(Number(e.target.value))}
                      className="tv-slider-input"
                    />
                    <div className="tv-slider-ticks">
                      <span>10% (Gọn gàng)</span>
                      <span>18% (Chuẩn TradingView)</span>
                      <span>35% (Lớn)</span>
                    </div>
                  </div>

                  <div className="tv-slider-card">
                    <div className="tv-slider-header">
                      <div>
                        <div className="tv-setting-label">Độ đậm / Độ trong suốt:</div>
                        <div className="tv-setting-sublabel">Giúp nhìn xuyên thấu nến hoặc nổi bật cột vol</div>
                      </div>
                      <span className="tv-slider-badge">{volOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="100"
                      step="5"
                      value={volOpacity}
                      onChange={(e) => setVolOpacity(Number(e.target.value))}
                      className="tv-slider-input"
                    />
                    <div className="tv-slider-ticks">
                      <span>30% (Mờ nhẹ)</span>
                      <span>65% (Rõ nét cân đối)</span>
                      <span>100% (Đậm đặc)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Các chỉ báo khác */}
              {!['MA', 'EMA', 'BOLL', 'RSI', 'MACD', 'VOL'].includes(indName) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="tv-section-label">Tham số cấu hình ({indName}):</div>
                  {calcParams.map((p, idx) => (
                    <div key={idx} className="tv-setting-row">
                      <div className="tv-setting-label">Tham số {idx + 1}</div>
                      <div className="tv-setting-input-group">
                        <input
                          type="number"
                          className="tv-setting-input"
                          value={p}
                          onChange={(e) => handleParamChange(idx, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Tab Hướng dẫn & Ý nghĩa */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: '1.6', color: '#b2b5be' }}>
              <div style={{ padding: '12px', backgroundColor: '#181b24', borderRadius: '8px', border: '1px solid #2a2e39' }}>
                <div style={{ color: '#2962ff', fontWeight: '700', marginBottom: '6px' }}>
                  {getIndicatorFullName()}
                </div>
                {indName === 'MA' && (
                  <div>
                    Đường <strong>Moving Average (MA)</strong> làm mượt dữ liệu giá trong quá khứ để xác định xu hướng thị trường:
                    <ul style={{ paddingLeft: '20px', marginTop: '6px', listStyleType: 'disc' }}>
                      <li><strong>MA10 / MA20:</strong> Xác định xu hướng ngắn hạn, hỗ trợ lướt sóng.</li>
                      <li><strong>MA50:</strong> Ngưỡng hỗ trợ/kháng cự trung hạn rất quan trọng đối với cổ phiếu VN.</li>
                      <li><strong>MA100 / MA200:</strong> Xác định xu hướng dài hạn (Golden Cross / Death Cross).</li>
                    </ul>
                  </div>
                )}
                {indName === 'EMA' && (
                  <div>
                    <strong>Exponential Moving Average (EMA)</strong> đặt trọng số cao hơn vào các phiên gần nhất, phản ứng nhanh hơn MA thông thường và giảm độ trễ khi thị trường biến động mạnh.
                  </div>
                )}
                {indName === 'BOLL' && (
                  <div>
                    <strong>Bollinger Bands</strong> kết hợp dải trung bình động ở giữa và 2 dải biên độ lệch chuẩn:
                    <ul style={{ paddingLeft: '20px', marginTop: '6px', listStyleType: 'disc' }}>
                      <li>Khi dải thắt nút cổ chai: Báo hiệu sắp có biến động giá cực mạnh bùng nổ.</li>
                      <li>Giá chạm dải trên: Vùng kháng cự; Chạm dải dưới: Vùng hỗ trợ quá bán.</li>
                    </ul>
                  </div>
                )}
                {indName === 'RSI' && (
                  <div>
                    <strong>RSI (Chỉ số sức mạnh tương đối)</strong> đo lường tốc độ và sự thay đổi của biến động giá:
                    <ul style={{ paddingLeft: '20px', marginTop: '6px', listStyleType: 'disc' }}>
                      <li><strong>Trên 70:</strong> Vùng Quá mua (Overbought) - Cảnh báo khả năng đảo chiều giảm.</li>
                      <li><strong>Dưới 30:</strong> Vùng Quá bán (Oversold) - Cơ hội hồi phục bắt đáy.</li>
                    </ul>
                  </div>
                )}
                {indName === 'MACD' && (
                  <div>
                    <strong>MACD</strong> gồm đường MACD, đường Signal và Histogram:
                    <ul style={{ paddingLeft: '20px', marginTop: '6px', listStyleType: 'disc' }}>
                      <li>Đường MACD cắt lên trên Signal: Tín hiệu Mua (Bullish).</li>
                      <li>Đường MACD cắt xuống dưới Signal: Tín hiệu Bán (Bearish).</li>
                    </ul>
                  </div>
                )}
                {indName === 'VOL' && (
                  <div>
                    <strong>Khối lượng chân nến:</strong> Vẽ trực tiếp cột Volume ở 18% chân nến tương tự TradingView, cho phép đọc khối lượng kèm hành động giá Price Action trực quan mà không chiếm diện tích màn hình.
                  </div>
                )}
                {indName === 'SUPERTREND' && (
                  <div>
                    <strong>SuperTrend (Olivier Seban):</strong>
                    <ul style={{ paddingLeft: '20px', marginTop: '6px', listStyleType: 'disc' }}>
                      <li><strong>Dải Xanh (#089981) nằm dưới nến:</strong> Xu hướng TĂNG chủ đạo. Báo hiệu Mua và nắm giữ cổ phiếu.</li>
                      <li><strong>Dải Đỏ (#f23645) nằm trên nến:</strong> Xu hướng GIẢM chủ đạo. Báo hiệu Bán hoặc chốt lời / cắt lỗ.</li>
                    </ul>
                  </div>
                )}
                {indName === 'VOLUME_PROFILE' && (
                  <div>
                    <strong>Volume Profile (Kháng cự &amp; Hỗ trợ Volume):</strong>
                    <ul style={{ paddingLeft: '20px', marginTop: '6px', listStyleType: 'disc' }}>
                      <li><strong>Đường POC (Vàng nét đứt):</strong> Mức giá có khối lượng giao dịch lớn nhất (vùng hỗ trợ / kháng cự cực mạnh).</li>
                      <li><strong>Dải VAH - VAL:</strong> Vùng giá trị tập trung 70% khối lượng giao dịch của toàn bộ phiên quan sát.</li>
                    </ul>
                  </div>
                )}
                {indName === 'ICHIMOKU' && (
                  <div>
                    <strong>Mây Ichimoku Kinko Hyo:</strong>
                    <ul style={{ paddingLeft: '20px', marginTop: '6px', listStyleType: 'disc' }}>
                      <li><strong>Giá nằm trên Mây Kumo:</strong> Xu hướng Tăng mạnh (Bullish).</li>
                      <li><strong>Giá nằm dưới Mây Kumo:</strong> Xu hướng Giảm mạnh (Bearish).</li>
                      <li><strong>Đường Tenkan cắt lên Kijun:</strong> Điểm mua gia tăng tỷ trọng.</li>
                    </ul>
                  </div>
                )}
                {indName === 'VWAP' && (
                  <div>
                    <strong>VWAP (Volume Weighted Average Price):</strong> Giá bình quân gia quyền theo khối lượng. Giá trên VWAP thể hiện phe Mua kiểm soát; Giá dưới VWAP thể hiện phe Bán chiếm ưu thế.
                  </div>
                )}
                {indName === 'MFI' && (
                  <div>
                    <strong>MFI (Chỉ số dòng tiền):</strong> Kết hợp Giá và Khối lượng để phát hiện phân kỳ dòng tiền. MFI &gt; 80 là vùng Quá mua, MFI &lt; 20 là vùng Quá bán tích lũy.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="tv-settings-footer">
          <button
            type="button"
            className="tv-btn-ghost"
            onClick={handleResetDefault}
            title="Khôi phục thông số chuẩn"
          >
            <RotateCcw size={14} />
            <span>Mặc định</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="tv-btn-outline"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="button"
              className="tv-btn-primary"
              onClick={handleApply}
            >
              <Check size={16} />
              <span>Áp dụng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
