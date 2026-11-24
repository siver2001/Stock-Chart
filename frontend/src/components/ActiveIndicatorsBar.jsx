import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Eye, EyeOff, X, Settings2 } from 'lucide-react'

// Friendly indicator names matching TradingView in Vietnam
const INDICATOR_TITLES = {
  VOL: 'Khối lượng',
  MA: 'MA',
  EMA: 'EMA',
  BOLL: 'Bollinger Bands',
  MACD: 'MACD',
  RSI: 'RSI',
  KDJ: 'KDJ',
  ICHIMOKU: 'Mây Ichimoku',
  VWAP: 'VWAP',
  SUPERTREND: 'SuperTrend',
  WEIS_WAVE: 'Weis Wave',
  CM_MACD_MTF: 'CM MACD MTF',
  SQUEEZE_MOMENTUM: 'Squeeze Momentum',
  WAVETREND: 'WaveTrend',
  ADX_DI: 'ADX / DI',
  MFI: 'MFI',
  SAR: 'SAR',
  BBI: 'BBI',
  ATR: 'ATR',
  OBV: 'OBV',
  VOLUME_PROFILE: 'Volume Profile',
}

function getIndicatorTitle(name) {
  return INDICATOR_TITLES[name] || name
}

// Single Indicator Legend Row Item (TradingView muted/chìm style)
function IndicatorLegendRow({
  indicator,
  isHidden,
  onOpenSettings,
  onToggleVisibility,
  onRemoveIndicator,
  chartInstance,
}) {
  const instance = chartInstance?.getIndicatorByPaneId?.(indicator.paneId || 'candle_pane', indicator.name)
  let paramLabel = ''
  if (instance?.calcParams && instance.calcParams.length > 0) {
    paramLabel = `${instance.calcParams.join(', ')}`
  }

  const title = getIndicatorTitle(indicator.name)

  return (
    <div
      className={`tv-ind-legend-row ${isHidden ? 'is-hidden' : ''}`}
      title={`${title} ${paramLabel ? `(${paramLabel})` : ''} - Bấm để cài đặt`}
    >
      {/* Title & Parameters */}
      <div
        className="tv-ind-legend-label"
        onClick={() => onOpenSettings && onOpenSettings(indicator)}
      >
        <span className="tv-ind-legend-name">{title}</span>
        {paramLabel && <span className="tv-ind-legend-params">{paramLabel}</span>}
      </div>

      {/* Action buttons (Eye, Settings, X) - Muted & smoothly reveal on hover */}
      <div className="tv-ind-legend-actions">
        {/* Toggle Hide/Show */}
        <button
          type="button"
          className={`tv-ind-legend-btn ${isHidden ? 'is-off' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisibility(indicator.name)
          }}
          title={isHidden ? `Hiện ${indicator.name}` : `Ẩn ${indicator.name}`}
        >
          {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>

        {/* Settings (Gear) */}
        <button
          type="button"
          className="tv-ind-legend-btn"
          onClick={(e) => {
            e.stopPropagation()
            onOpenSettings && onOpenSettings(indicator)
          }}
          title={`Cài đặt thông số ${indicator.name}`}
        >
          <Settings2 size={13} />
        </button>

        {/* Remove (X) */}
        <button
          type="button"
          className="tv-ind-legend-btn tv-ind-btn-remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemoveIndicator(indicator.name)
          }}
          title={`Xóa ${indicator.name} khỏi biểu đồ`}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}

export default function ActiveIndicatorsBar({
  activeIndicators = [],
  onRemoveIndicator,
  onToggleVisibility,
  hiddenIndicators = [],
  onOpenSettings,
  chartInstance,
}) {
  // 1. Group indicators into:
  // - Overlays on the main candle chart
  // - Sub-pane indicators on their own respective sub-windows
  const overlayIndicators = useMemo(() => {
    return activeIndicators.filter((ind) => ind.isOverlay || ind.paneId === 'candle_pane')
  }, [activeIndicators])

  const subPaneIndicators = useMemo(() => {
    return activeIndicators.filter((ind) => !ind.isOverlay && ind.paneId !== 'candle_pane')
  }, [activeIndicators])

  // Group sub-pane indicators by paneId
  const subPanesMap = useMemo(() => {
    const map = {}
    subPaneIndicators.forEach((ind) => {
      const pid = ind.paneId || 'pane_unknown'
      if (!map[pid]) map[pid] = []
      map[pid].push(ind)
    })
    return map
  }, [subPaneIndicators])

  // Track real top coordinate of each sub-pane in KlineCharts
  const [paneTops, setPaneTops] = useState({})
  const prevTopsRef = useRef({})

  const updatePanePositions = useCallback(() => {
    if (!chartInstance) return

    let panes = []
    try {
      if (typeof chartInstance.getAllDrawPanes === 'function') {
        panes = chartInstance.getAllDrawPanes() || []
      } else if (Array.isArray(chartInstance._drawPanes)) {
        panes = chartInstance._drawPanes
      }
    } catch {}

    if (!panes || panes.length === 0) return

    const tops = {}
    let changed = false
    panes.forEach((p) => {
      try {
        const id = p.getId?.()
        const b = p.getBounding?.()
        if (id && b && typeof b.top === 'number') {
          tops[id] = b.top
          if (prevTopsRef.current[id] !== b.top) {
            changed = true
          }
        }
      } catch {}
    })

    if (changed || Object.keys(tops).length !== Object.keys(prevTopsRef.current).length) {
      prevTopsRef.current = tops
      setPaneTops(tops)
    }
  }, [chartInstance])

  useEffect(() => {
    updatePanePositions()
    const t1 = setTimeout(updatePanePositions, 60)
    const t2 = setTimeout(updatePanePositions, 200)
    const t3 = setTimeout(updatePanePositions, 500)

    const handleWindowResize = () => updatePanePositions()
    const handleMouseUp = () => updatePanePositions()

    window.addEventListener('resize', handleWindowResize)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('pointerup', handleMouseUp)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      window.removeEventListener('resize', handleWindowResize)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('pointerup', handleMouseUp)
    }
  }, [updatePanePositions, activeIndicators, chartInstance])

  if (!activeIndicators || activeIndicators.length === 0) return null

  return (
    <>
      {/* 1. Main Candle Chart Overlays (Located on the main price chart) */}
      {overlayIndicators.length > 0 && (
        <div className="tv-overlay-indicators-legend">
          {overlayIndicators.map((ind) => (
            <IndicatorLegendRow
              key={ind.name}
              indicator={ind}
              isHidden={hiddenIndicators.includes(ind.name)}
              onOpenSettings={onOpenSettings}
              onToggleVisibility={onToggleVisibility}
              onRemoveIndicator={onRemoveIndicator}
              chartInstance={chartInstance}
            />
          ))}
        </div>
      )}

      {/* 2. Sub-Pane Indicators (Placed directly on top-left of EACH respective sub-pane) */}
      {Object.entries(subPanesMap).map(([paneId, indicators]) => {
        const topPx = paneTops[paneId]
        // If coordinate is calculated, place directly over that subpane
        const style = typeof topPx === 'number'
          ? { top: `${topPx + 6}px` }
          : { top: 'auto', bottom: '10px' }

        return (
          <div
            key={paneId}
            className="tv-subpane-indicators-legend"
            style={style}
          >
            {indicators.map((ind) => (
              <IndicatorLegendRow
                key={ind.name}
                indicator={ind}
                isHidden={hiddenIndicators.includes(ind.name)}
                onOpenSettings={onOpenSettings}
                onToggleVisibility={onToggleVisibility}
                onRemoveIndicator={onRemoveIndicator}
                chartInstance={chartInstance}
              />
            ))}
          </div>
        )
      })}
    </>
  )
}
