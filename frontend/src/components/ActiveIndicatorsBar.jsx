import React from 'react'
import { Eye, EyeOff, X, Settings2 } from 'lucide-react'

export default function ActiveIndicatorsBar({
  activeIndicators,
  onRemoveIndicator,
  onToggleVisibility,
  hiddenIndicators = [],
  onOpenSettings,
  chartInstance,
}) {
  if (!activeIndicators || activeIndicators.length === 0) return null

  return (
    <div className="tv-active-indicators-bar">
      {activeIndicators.map((ind) => {
        const isHidden = hiddenIndicators.includes(ind.name)
        const instance = chartInstance?.getIndicatorByPaneId?.(ind.paneId || 'candle_pane', ind.name)
        let paramLabel = ''
        if (instance?.calcParams && instance.calcParams.length > 0) {
          paramLabel = ` (${instance.calcParams.join(', ')})`
        }

        return (
          <div key={ind.name} className={`tv-ind-pill ${isHidden ? 'hidden' : ''}`}>
            <span
              className="tv-ind-pill-name cursor-pointer"
              onClick={() => onOpenSettings && onOpenSettings(ind)}
              title="Bấm để cài đặt thông số chỉ báo"
            >
              {ind.name}
              {paramLabel}
            </span>

            {/* Nút Cài đặt thông số (Settings) */}
            <button
              className="tv-ind-pill-btn"
              onClick={() => onOpenSettings && onOpenSettings(ind)}
              title={`Cài đặt thay đổi số liệu chỉ báo ${ind.name}`}
            >
              <Settings2 size={12} />
            </button>

            {/* Nút Ẩn / Hiện */}
            <button
              className="tv-ind-pill-btn"
              onClick={() => onToggleVisibility(ind.name)}
              title={isHidden ? `Hiện ${ind.name}` : `Ẩn tạm thời ${ind.name}`}
            >
              {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>

            {/* Nút Xóa */}
            <button
              className="tv-ind-pill-btn tv-ind-pill-close"
              onClick={() => onRemoveIndicator(ind.name)}
              title={`Tắt và xóa chỉ báo ${ind.name} khỏi biểu đồ`}
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
