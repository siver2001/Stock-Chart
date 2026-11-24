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

function formatBigVal(num) {
  if (num == null || isNaN(num)) return null
  const abs = Math.abs(num)
  if (abs >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return (num / 1e3).toFixed(1) + 'K'
  if (Number.isInteger(num)) return String(num)
  return num.toFixed(2)
}

function formatNumber(num, precision = 2) {
  if (num == null || isNaN(num)) return null
  return Number(num).toFixed(precision)
}

// Single Indicator Legend Row Item (TradingView muted/chìm style)
function IndicatorLegendRow({
  indicator,
  isHidden,
  onOpenSettings,
  onToggleVisibility,
  onRemoveIndicator,
  chartInstance,
  crosshairData,
  latestBar,
}) {
  const pid = indicator.paneId || 'candle_pane'
  const indInstance = chartInstance?.getIndicatorByPaneId?.(pid, indicator.name)
  let paramLabel = ''
  if (indInstance?.calcParams && indInstance.calcParams.length > 0) {
    paramLabel = `${indInstance.calcParams.join(', ')}`
  }

  const title = getIndicatorTitle(indicator.name)

  // Compute live values
  const values = useMemo(() => {
    if (isHidden || !chartInstance || !indInstance) return []

    try {
      // 1. Special formatting for Volume (VOL)
      if (indicator.name === 'VOL') {
        const bar = crosshairData?.kLineData || latestBar
        const volVal = bar?.volume
        const isUp = bar ? (bar.close >= bar.open) : true
        const volFormatted = formatBigVal(volVal)

        const vals = []
        if (volFormatted) {
          vals.push({
            title: '',
            value: volFormatted,
            color: isUp ? '#089981' : '#f23645',
          })
        }

        const res = indInstance.result
        if (res && res.length > 0) {
          const idx = typeof crosshairData?.dataIndex === 'number' && crosshairData.dataIndex >= 0
            ? crosshairData.dataIndex
            : (res.length - 1)
          const row = res[idx]
          if (row && row.ma1 != null) {
            vals.push({
              title: 'MA: ',
              value: formatBigVal(row.ma1),
              color: '#f59e0b',
            })
          }
        }
        return vals
      }

      // 2. Generic indicators (MA, EMA, MACD, RSI, BOLL, etc.)
      const res = indInstance.result
      if (!res || res.length === 0) return []
      const idx = typeof crosshairData?.dataIndex === 'number' && crosshairData.dataIndex >= 0
        ? crosshairData.dataIndex
        : (res.length - 1)
      const row = res[idx]
      if (!row) return []

      const figures = indInstance.figures || []
      const defaultLineColors = ['#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#06b6d4']
      let lineColors = defaultLineColors
      try {
        const styles = chartInstance.getStyles?.()?.indicator
        if (styles?.lines) {
          lineColors = styles.lines.map((l) => l.color).filter(Boolean)
        }
      } catch {}

      const vals = []
      figures.forEach((fig, fIdx) => {
        const val = row[fig.key]
        if (val != null && !isNaN(val)) {
          let color = lineColors[fIdx % lineColors.length]
          // Special case for MACD histogram
          if (fig.key === 'macd') {
            color = val >= 0 ? '#089981' : '#f23645'
          }
          vals.push({
            title: fig.title ? `${fig.title}: ` : '',
            value: formatNumber(val, indInstance.precision || 2),
            color,
          })
        }
      })

      return vals
    } catch {
      return []
    }
  }, [isHidden, chartInstance, indInstance, indicator.name, crosshairData, latestBar])

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

      {/* Real-time Indicator Values with distinct colors */}
      {!isHidden && values && values.length > 0 && (
        <div className="tv-ind-legend-values">
          {values.map((v, i) => (
            <span key={i} className="tv-ind-legend-val" style={{ color: v.color }}>
              {v.title}{v.value}
            </span>
          ))}
        </div>
      )}
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
  latestBar,
}) {
  // Crosshair state for live synchronization
  const [crosshairData, setCrosshairData] = useState(null)

  useEffect(() => {
    if (!chartInstance) return

    const handleCrosshair = (param) => {
      setCrosshairData(param || null)
    }

    try {
      chartInstance.subscribeAction('onCrosshairChange', handleCrosshair)
    } catch {}

    return () => {
      try {
        chartInstance.unsubscribeAction('onCrosshairChange', handleCrosshair)
      } catch {}
    }
  }, [chartInstance])

  // Track real top coordinate of each sub-pane in KlineCharts
  const [paneTops, setPaneTops] = useState({})
  const prevTopsRef = useRef({})

  const updatePanePositions = useCallback(() => {
    if (!chartInstance) return

    const tops = {}
    let changed = false

    activeIndicators.forEach((ind) => {
      const pid = ind.paneId
      if (!pid || pid === 'candle_pane') return

      let topVal = null

      // 1. Try official chartInstance.getSize(pid)
      try {
        const size = chartInstance.getSize?.(pid)
        if (size && typeof size.top === 'number' && size.top >= 0) {
          topVal = size.top
        }
      } catch {}

      // 2. Try chartInstance.getDom(pid)
      if (topVal == null) {
        try {
          const dom = chartInstance.getDom?.(pid)
          if (dom && typeof dom.offsetTop === 'number' && dom.offsetTop >= 0) {
            topVal = dom.offsetTop
          }
        } catch {}
      }

      // 3. Fallback to _drawPanes internal inspection
      if (topVal == null && Array.isArray(chartInstance._drawPanes)) {
        try {
          const p = chartInstance._drawPanes.find((pane) => pane.getId?.() === pid)
          const b = p?.getBounding?.()
          if (b && typeof b.top === 'number' && b.top >= 0) {
            topVal = b.top
          }
        } catch {}
      }

      if (topVal != null) {
        tops[pid] = topVal
        if (prevTopsRef.current[pid] !== topVal) {
          changed = true
        }
      }
    })

    if (changed || Object.keys(tops).length !== Object.keys(prevTopsRef.current).length) {
      prevTopsRef.current = tops
      setPaneTops(tops)
    }
  }, [chartInstance, activeIndicators])

  useEffect(() => {
    updatePanePositions()
    const t1 = setTimeout(updatePanePositions, 50)
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

  // Group indicators:
  // - Overlays: isOverlay or paneId === 'candle_pane' OR indicators whose subpane is hidden / not currently mounted
  // - SubPanes: indicators that are active, not hidden, and whose subpane has a valid topPx
  const overlayIndicators = useMemo(() => {
    return activeIndicators.filter((ind) => {
      const isCandlePane = ind.isOverlay || ind.paneId === 'candle_pane'
      const isHidden = hiddenIndicators.includes(ind.name)
      const hasSubpaneTop = ind.paneId && typeof paneTops[ind.paneId] === 'number'
      // If candle pane, or if hidden / waiting for subpane, keep in overlay list at top!
      return isCandlePane || isHidden || !hasSubpaneTop
    })
  }, [activeIndicators, hiddenIndicators, paneTops])

  const subPaneIndicators = useMemo(() => {
    return activeIndicators.filter((ind) => {
      const isCandlePane = ind.isOverlay || ind.paneId === 'candle_pane'
      const isHidden = hiddenIndicators.includes(ind.name)
      const hasSubpaneTop = ind.paneId && typeof paneTops[ind.paneId] === 'number'
      return !isCandlePane && !isHidden && hasSubpaneTop
    })
  }, [activeIndicators, hiddenIndicators, paneTops])

  // Group visible sub-pane indicators by paneId
  const subPanesMap = useMemo(() => {
    const map = {}
    subPaneIndicators.forEach((ind) => {
      const pid = ind.paneId
      if (!pid) return
      if (!map[pid]) map[pid] = []
      map[pid].push(ind)
    })
    return map
  }, [subPaneIndicators])

  if (!activeIndicators || activeIndicators.length === 0) return null

  return (
    <>
      {/* 1. Main Candle Chart Overlays (Located cleanly on the main price chart) */}
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
              crosshairData={crosshairData}
              latestBar={latestBar}
            />
          ))}
        </div>
      )}

      {/* 2. Sub-Pane Indicators (Placed directly on top-left of EACH respective sub-pane) */}
      {Object.entries(subPanesMap).map(([paneId, indicators]) => {
        const topPx = paneTops[paneId]
        if (typeof topPx !== 'number') return null // NEVER fallback to bottom: 10px!

        return (
          <div
            key={paneId}
            className="tv-subpane-indicators-legend"
            style={{ top: `${topPx + 6}px` }}
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
                crosshairData={crosshairData}
                latestBar={latestBar}
              />
            ))}
          </div>
        )
      })}
    </>
  )
}
