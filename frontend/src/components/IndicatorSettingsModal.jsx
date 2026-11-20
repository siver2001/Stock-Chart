import React, { useState, useEffect } from 'react'
import { X, Settings, RotateCcw, Check, Plus, Trash2 } from 'lucide-react'
import { volumeOverlayConfig } from '../indicators/volumeOverlay'

// Màu sắc mặc định cho các đường MA
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

  // Lấy thông tin chỉ báo hiện tại từ KlineCharts
  const currentIndInstance = chartInstance?.getIndicatorByPaneId?.(paneId, indName)

  // Khởi tạo state params
  const [calcParams, setCalcParams] = useState(() => {
    if (currentIndInstance?.calcParams && currentIndInstance.calcParams.length > 0) {
      return [...currentIndInstance.calcParams]
    }
    // Giá trị khởi tạo mặc định theo từng loại
    if (indName === 'MA') return [10, 20, 50, 100]
    if (indName === 'EMA') return [12, 26, 50]
    if (indName === 'BOLL') return [20, 2]
    if (indName === 'RSI') return [14]
    if (indName === 'MACD') return [12, 26, 9]
    if (indName === 'KDJ') return [9, 3, 3]
    if (indName === 'WEIS_WAVE') return [2, 0]
    if (indName === 'ADX_DI' || indName === 'ADX_DI_BO') return [14]
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
  }, [indicator, currentIndInstance])

  // Cập nhật giá trị trong mảng calcParams
  const handleParamChange = (index, val) => {
    const num = Number(val)
    if (isNaN(num)) return
    setCalcParams((prev) => {
      const next = [...prev]
      next[index] = num
      return next
    })
  }

  // Thêm một đường MA mới
  const handleAddMaParam = () => {
    if (calcParams.length >= 6) return
    const lastVal = calcParams[calcParams.length - 1] || 50
    setCalcParams([...calcParams, lastVal * 2])
  }

  // Xóa một đường MA
  const handleRemoveMaParam = (index) => {
    if (calcParams.length <= 1) return
    setCalcParams(calcParams.filter((_, i) => i !== index))
  }

  // Đặt lại mặc định
  const handleResetDefault = () => {
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
    }
  }

  // Áp dụng lưu thông số
  const handleApply = () => {
    if (indName === 'VOL') {
      volumeOverlayConfig.maxHeightRatio = volHeightRatio / 100
      volumeOverlayConfig.opacity = volOpacity / 100
      if (chartInstance?._chartStore) {
        chartInstance.applyNewData(chartInstance._chartStore.getDataList())
      }
    } else {
      const validParams = calcParams.map((p) => Math.max(1, Math.round(Number(p))))
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

  return (
    <div className="tv-modal-backdrop" onClick={onClose}>
      <div className="tv-modal-box tv-settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tv-modal-header">
          <div className="tv-modal-title">
            <Settings size={18} className="text-blue-500 mr-2" />
            <span>Cài đặt thông số chỉ báo: {indName}</span>
          </div>
          <button className="tv-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="tv-modal-body p-4 space-y-4">
          {/* Cài đặt MA */}
          {indName === 'MA' && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Các đường trung bình động MA (Chu kỳ phiên):
              </div>

              {/* Nút gợi ý Preset nhanh */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  className="px-2.5 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
                  onClick={() => setCalcParams([10, 20, 50, 100])}
                >
                  Chuẩn: [10, 20, 50, 100]
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
                  onClick={() => setCalcParams([20, 50, 100, 200])}
                >
                  Trend Dài: [20, 50, 100, 200]
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
                  onClick={() => setCalcParams([5, 10, 20, 50])}
                >
                  Ngắn hạn: [5, 10, 20, 50]
                </button>
              </div>

              {/* Danh sách các đường MA */}
              <div className="space-y-2">
                {calcParams.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-800/60 p-2 rounded border border-gray-700/60"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{
                          backgroundColor: DEFAULT_LINE_COLORS[idx % DEFAULT_LINE_COLORS.length],
                        }}
                      />
                      <span className="text-sm font-medium text-gray-200">Đường MA {idx + 1}:</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Chu kỳ:</span>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        className="w-20 px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-center text-white focus:outline-none focus:border-blue-500"
                        value={p}
                        onChange={(e) => handleParamChange(idx, e.target.value)}
                      />
                      {calcParams.length > 1 && (
                        <button
                          type="button"
                          className="p-1 hover:text-red-400 text-gray-500 transition"
                          onClick={() => handleRemoveMaParam(idx)}
                          title="Xóa đường MA này"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {calcParams.length < 6 && (
                <button
                  type="button"
                  className="mt-3 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition"
                  onClick={handleAddMaParam}
                >
                  <Plus size={14} />
                  <span>Thêm đường MA mới</span>
                </button>
              )}
            </div>
          )}

          {/* Cài đặt EMA */}
          {indName === 'EMA' && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Chu kỳ các đường hàm mũ EMA:
              </div>
              <div className="space-y-2">
                {calcParams.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-800/60 p-2 rounded border border-gray-700/60"
                  >
                    <span className="text-sm text-gray-200">Đường EMA {idx + 1}:</span>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      className="w-20 px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-center text-white focus:outline-none focus:border-blue-500"
                      value={p}
                      onChange={(e) => handleParamChange(idx, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cài đặt BOLL */}
          {indName === 'BOLL' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gray-800/60 p-2.5 rounded border border-gray-700/60">
                <span className="text-sm text-gray-200">Chu kỳ MA giữa (Period):</span>
                <input
                  type="number"
                  min="5"
                  max="200"
                  className="w-20 px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-center text-white"
                  value={calcParams[0] || 20}
                  onChange={(e) => handleParamChange(0, e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between bg-gray-800/60 p-2.5 rounded border border-gray-700/60">
                <span className="text-sm text-gray-200">Độ lệch chuẩn (StdDev Multiplier):</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10"
                  className="w-20 px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-center text-white"
                  value={calcParams[1] || 2}
                  onChange={(e) => handleParamChange(1, e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Cài đặt RSI */}
          {indName === 'RSI' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gray-800/60 p-2.5 rounded border border-gray-700/60">
                <span className="text-sm text-gray-200">Chu kỳ RSI (Period):</span>
                <input
                  type="number"
                  min="2"
                  max="100"
                  className="w-20 px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-center text-white"
                  value={calcParams[0] || 14}
                  onChange={(e) => handleParamChange(0, e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Cài đặt MACD */}
          {indName === 'MACD' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gray-800/60 p-2 rounded border border-gray-700/60">
                <span className="text-sm text-gray-200">EMA Nhanh (Fast Length):</span>
                <input
                  type="number"
                  min="2"
                  max="100"
                  className="w-20 px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-center text-white"
                  value={calcParams[0] || 12}
                  onChange={(e) => handleParamChange(0, e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between bg-gray-800/60 p-2 rounded border border-gray-700/60">
                <span className="text-sm text-gray-200">EMA Chậm (Slow Length):</span>
                <input
                  type="number"
                  min="5"
                  max="200"
                  className="w-20 px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-center text-white"
                  value={calcParams[1] || 26}
                  onChange={(e) => handleParamChange(1, e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between bg-gray-800/60 p-2 rounded border border-gray-700/60">
                <span className="text-sm text-gray-200">Đường Tín hiệu (Signal Length):</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className="w-20 px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-center text-white"
                  value={calcParams[2] || 9}
                  onChange={(e) => handleParamChange(2, e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Cài đặt VOL (Volume Overlay) */}
          {indName === 'VOL' && (
            <div className="space-y-4">
              <div className="bg-gray-800/60 p-3 rounded border border-gray-700/60 space-y-2">
                <div className="flex justify-between items-center text-sm text-gray-200">
                  <span>Chiều cao tối đa ở chân nến:</span>
                  <span className="font-semibold text-blue-400">{volHeightRatio}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="35"
                  step="1"
                  value={volHeightRatio}
                  onChange={(e) => setVolHeightRatio(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>10% (Rất nhỏ)</span>
                  <span>18% (Chuẩn TradingView)</span>
                  <span>35% (Lớn)</span>
                </div>
              </div>

              <div className="bg-gray-800/60 p-3 rounded border border-gray-700/60 space-y-2">
                <div className="flex justify-between items-center text-sm text-gray-200">
                  <span>Độ đậm rõ nét cột volume:</span>
                  <span className="font-semibold text-blue-400">{volOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="5"
                  value={volOpacity}
                  onChange={(e) => setVolOpacity(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>30% (Mờ nhẹ)</span>
                  <span>65% (Rõ nét)</span>
                  <span>100% (Đậm đặc)</span>
                </div>
              </div>
            </div>
          )}

          {/* Các chỉ báo khác */}
          {!['MA', 'EMA', 'BOLL', 'RSI', 'MACD', 'VOL'].includes(indName) && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Tham số tính toán ({indName}):
              </div>
              {calcParams.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-800/60 p-2 rounded border border-gray-700/60"
                >
                  <span className="text-sm text-gray-200">Tham số {idx + 1}:</span>
                  <input
                    type="number"
                    className="w-20 px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-center text-white"
                    value={p}
                    onChange={(e) => handleParamChange(idx, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="tv-modal-footer flex items-center justify-between p-3 border-t border-gray-700">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded transition"
            onClick={handleResetDefault}
          >
            <RotateCcw size={13} />
            <span>Mặc định</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded border border-gray-600 transition"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 rounded font-medium transition shadow-sm"
              onClick={handleApply}
            >
              <Check size={14} />
              <span>Áp dụng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
