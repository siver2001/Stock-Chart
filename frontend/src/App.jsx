import React, { useEffect, useRef, useState, useCallback } from 'react'
import { init, dispose } from 'klinecharts'
import { registerAllCustomIndicators } from './indicators'
import { VNStockDatafeed } from './datafeed/vnDatafeed'

import TradingViewHeader from './components/TradingViewHeader'
import DrawingToolbar from './components/DrawingToolbar'
import SymbolSearchModal from './components/SymbolSearchModal'
import IndicatorsModal, { AVAILABLE_INDICATORS } from './components/IndicatorsModal'
import TradingViewWatchlist from './components/TradingViewWatchlist'
import BottomBacktestDock from './components/BottomBacktestDock'
import ActiveIndicatorsBar from './components/ActiveIndicatorsBar'
import SelectedOverlayToolbar from './components/SelectedOverlayToolbar'
import RealtimeMarketBar from './components/RealtimeMarketBar'
import IndicatorSettingsModal from './components/IndicatorSettingsModal'

const getThemeStyles = (theme, chartType = 'candle_solid') => {
  const isDark = theme === 'dark'
  return {
    grid: {
      horizontal: { color: isDark ? '#1f2937' : '#f0f3f6', style: 'dash' },
      vertical: { color: isDark ? '#1f2937' : '#f0f3f6', style: 'dash' },
    },
    candle: {
      type: chartType,
      bar: {
        upColor: chartType === 'candle_stroke' ? 'transparent' : '#089981',
        downColor: '#f23645',
        noChangeColor: '#888888',
        upBorderColor: '#089981',
        downBorderColor: '#f23645',
        noChangeBorderColor: '#888888',
        upWickColor: '#089981',
        downWickColor: '#f23645',
        noChangeWickColor: '#888888',
      },
      area: {
        lineSize: 2,
        lineColor: '#2962ff',
        value: 'close',
        smooth: true,
        backgroundColor: [
          { offset: 0, color: isDark ? 'rgba(41, 98, 255, 0.4)' : 'rgba(41, 98, 255, 0.25)' },
          { offset: 1, color: isDark ? 'rgba(41, 98, 255, 0.02)' : 'rgba(41, 98, 255, 0.01)' },
        ],
        point: {
          show: true,
          color: '#2962ff',
          radius: 3,
          rippleColor: 'rgba(41, 98, 255, 0.3)',
          rippleRadius: 6,
          animation: true,
          animationDuration: 1000,
        },
      },
      priceMark: {
        show: true,
        high: {
          show: true,
          color: '#089981',
          textOffset: 5,
          textSize: 10,
        },
        low: {
          show: true,
          color: '#f23645',
          textOffset: 5,
          textSize: 10,
        },
        last: {
          show: true,
          upColor: '#089981',
          downColor: '#f23645',
          noChangeColor: '#888888',
          line: {
            show: true,
            style: 'dash',
            dashedValue: [4, 4],
            size: 1,
          },
          text: {
            show: true,
            style: 'fill',
            color: '#ffffff',
            size: 11,
            paddingLeft: 4,
            paddingTop: 3,
            paddingRight: 4,
            paddingBottom: 3,
            borderRadius: 2,
          },
        },
      },
    },
    xAxis: {
      show: true,
      size: 'auto',
      axisLine: { show: true, color: isDark ? '#374151' : '#d1d5db', size: 1 },
      tickLine: { show: true, size: 1, length: 3, color: isDark ? '#374151' : '#d1d5db' },
      tickText: { show: true, color: isDark ? '#9ca3af' : '#6b7280', size: 11, family: 'Inter, sans-serif' },
    },
    yAxis: {
      show: true,
      size: 'auto',
      position: 'right',
      inside: false,
      axisLine: { show: true, color: isDark ? '#374151' : '#d1d5db', size: 1 },
      tickLine: { show: true, size: 1, length: 3, color: isDark ? '#374151' : '#d1d5db' },
      tickText: { show: true, color: isDark ? '#9ca3af' : '#6b7280', size: 11, family: 'Inter, sans-serif' },
    },
    crosshair: {
      horizontal: {
        line: { color: isDark ? '#6b7280' : '#9ca3af', style: 'dash' },
        text: { backgroundColor: isDark ? '#374151' : '#4b5563', color: '#ffffff' },
      },
      vertical: {
        line: { color: isDark ? '#6b7280' : '#9ca3af', style: 'dash' },
        text: { backgroundColor: isDark ? '#374151' : '#4b5563', color: '#ffffff' },
      },
    },
    indicator: {
      ohlc: {
        upColor: 'rgba(8, 153, 129, 0.7)',
        downColor: 'rgba(242, 54, 69, 0.7)',
        noChangeColor: 'rgba(136, 136, 136, 0.7)',
      },
      bars: [
        {
          style: 'fill',
          borderStyle: 'solid',
          borderSize: 1,
          borderDashedValue: [2, 2],
          upColor: 'rgba(8, 153, 129, 0.35)',
          downColor: 'rgba(242, 54, 69, 0.35)',
          noChangeColor: 'rgba(136, 136, 136, 0.35)',
          upBorderColor: 'rgba(8, 153, 129, 0.65)',
          downBorderColor: 'rgba(242, 54, 69, 0.65)',
          noChangeBorderColor: 'rgba(136, 136, 136, 0.65)',
        },
      ],
      lines: [
        { color: '#f59e0b', size: 1.5 },
        { color: '#3b82f6', size: 1.5 },
        { color: '#ec4899', size: 1.5 },
        { color: '#8b5cf6', size: 1.5 },
      ],
    },
  }
}

export default function App() {
  const chartElRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const datafeedRef = useRef(null)

  const [theme, setTheme] = useState(() => localStorage.getItem('vn_theme') || 'dark')
  const [activeSymbol, setActiveSymbol] = useState(() => localStorage.getItem('vn_last_symbol') || 'VNINDEX')
  const [activePeriod, setActivePeriod] = useState({ multiplier: 1, timespan: 'day', text: '1D' })
  const activePeriodRef = useRef(activePeriod)
  activePeriodRef.current = activePeriod
  const [chartType, setChartType] = useState('candle_solid')

  // Modals & Drawers state
  const [isSymbolModalOpen, setIsSymbolModalOpen] = useState(false)
  const [isIndicatorsModalOpen, setIsIndicatorsModalOpen] = useState(false)
  const [showWatchlist, setShowWatchlist] = useState(true)
  const [showBacktest, setShowBacktest] = useState(false)
  const [settingsIndicator, setSettingsIndicator] = useState(null)
  const [, setSettingsUpdateTick] = useState(0)

  // Active indicators on chart: array of { name, paneId, isOverlay }
  const [activeIndicators, setActiveIndicators] = useState([])
  const [hiddenIndicators, setHiddenIndicators] = useState([])
  const [latestBar, setLatestBar] = useState(null)

  // Selected Overlay (Drawing) & Active Drawing Tool
  const [activeDrawingTool, setActiveDrawingTool] = useState('crosshair')
  const [selectedOverlay, setSelectedOverlay] = useState(null)
  const selectedOverlayRef = useRef(null)
  selectedOverlayRef.current = selectedOverlay

  const inProgressOverlayIdRef = useRef(null)

  // Cancel currently drawing overlay or deselect
  const cancelCurrentDrawing = useCallback(() => {
    if (!chartInstanceRef.current) return

    // 1. Remove in-progress overlay from KlineCharts internal store if currently drawing
    try {
      const overlayStore = chartInstanceRef.current._chartStore?.getOverlayStore?.()
      const progressInfo = overlayStore?.getProgressInstanceInfo?.()
      if (progressInfo?.instance?.id) {
        chartInstanceRef.current.removeOverlay(progressInfo.instance.id)
      }
    } catch (err) {
      console.warn('Error clearing progress overlay:', err)
    }

    // 2. Remove by tracked ID if still exists
    if (inProgressOverlayIdRef.current) {
      try {
        chartInstanceRef.current.removeOverlay(inProgressOverlayIdRef.current)
      } catch (e) {}
      inProgressOverlayIdRef.current = null
    }

    // 3. Reset state
    setSelectedOverlay(null)
    setActiveDrawingTool('crosshair')
  }, [])

  // Keyboard shortcut listener (Delete/Backspace to delete selected drawing, Escape to cancel drawing/deselect)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedOverlayRef.current && chartInstanceRef.current) {
          chartInstanceRef.current.removeOverlay(selectedOverlayRef.current.id)
          setSelectedOverlay(null)
        }
      } else if (e.key === 'Escape') {
        // Pressing Escape cancels whatever tool is currently active/drawing or deselects
        cancelCurrentDrawing()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cancelCurrentDrawing])

  // Right-click on chart cancels active drawing tool without drawing
  useEffect(() => {
    const el = chartElRef.current
    if (!el) return

    const handleContextMenu = (e) => {
      const overlayStore = chartInstanceRef.current?._chartStore?.getOverlayStore?.()
      const isDrawingInProgress =
        Boolean(overlayStore?.getProgressInstanceInfo?.()) || Boolean(inProgressOverlayIdRef.current)
      if (activeDrawingTool !== 'crosshair' || isDrawingInProgress) {
        e.preventDefault()
        cancelCurrentDrawing()
      }
    }

    el.addEventListener('contextmenu', handleContextMenu)
    return () => el.removeEventListener('contextmenu', handleContextMenu)
  }, [activeDrawingTool, cancelCurrentDrawing])

  // Sync theme class with body
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('theme-light')
    } else {
      document.body.classList.remove('theme-light')
    }
    localStorage.setItem('vn_theme', theme)
    if (chartInstanceRef.current) {
      chartInstanceRef.current.setStyles(getThemeStyles(theme, chartType))
    }
  }, [theme, chartType])

  // Save last symbol
  useEffect(() => {
    localStorage.setItem('vn_last_symbol', activeSymbol)
  }, [activeSymbol])

  // Initialize KlineCharts
  useEffect(() => {
    registerAllCustomIndicators()

    if (!chartElRef.current) return
    chartElRef.current.innerHTML = ''

    const chart = init(chartElRef.current)
    chartInstanceRef.current = chart
    window.__chart = chart

    const isInitIndex = activeSymbol.includes('INDEX') || activeSymbol.includes('VN30')
    chart.setPriceVolumePrecision(isInitIndex ? 2 : 0, 0)
    chart.setTimezone('Asia/Ho_Chi_Minh')
    chart.setStyles(getThemeStyles(theme, chartType))

    // Formatter for Timeline milestones (X-Axis) and Crosshair Hover Time
    chart.setCustomApi({
      formatDate: (dateTimeFormat, timestamp, format, type) => {
        const d = new Date(timestamp)
        const pad = (n) => String(n).padStart(2, '0')
        const day = pad(d.getDate())
        const month = pad(d.getMonth() + 1)
        const year = d.getFullYear()
        const hours = pad(d.getHours())
        const minutes = pad(d.getMinutes())
        const seconds = pad(d.getSeconds())

        if (type === 1) {
          // Crosshair tooltip: exact seconds
          return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
        }
        if (type === 2) {
          // Bottom timeline milestones (X-Axis)
          const pText = activePeriodRef.current?.text?.toLowerCase() || '1d'
          const isIntraday = ['1m', '3m', '5m', '15m', '30m', '45m', '1h', '2h', '3h', '4h'].includes(pText)
          return isIntraday ? `${day}/${month} ${hours}:${minutes}` : `${day}/${month}/${year}`
        }
        return `${day}/${month}/${year} ${hours}:${minutes}`
      },
    })

    const datafeed = new VNStockDatafeed((origin, ticker) => {
      if (ticker) setActiveSymbol(ticker)
    })
    datafeedRef.current = datafeed

    // Load initial data
    const loadData = async () => {
      const bars = await datafeed.getHistoryKLineData(activeSymbol, activePeriod)
      if (bars && bars.length > 0) {
        chart.applyNewData(bars)
        setLatestBar(bars[bars.length - 1])
      }

      // Add default indicators: MA and VOL overlayed directly on the main candlestick chart like TradingView!
      const maPaneId = chart.createIndicator('MA', true, { id: 'candle_pane' })
      const volPaneId = chart.createIndicator('VOL', true, { id: 'candle_pane' })
      const initInds = []
      if (maPaneId) initInds.push({ name: 'MA', paneId: maPaneId, isOverlay: true })
      if (volPaneId) initInds.push({ name: 'VOL', paneId: volPaneId, isOverlay: true })
      setActiveIndicators(initInds)

      // Subscribe for live polling
      datafeed.subscribe(activeSymbol, activePeriod, (bar) => {
        chart.updateData(bar)
        setLatestBar(bar)
      })
    }

    loadData()

    // Handle window resize
    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (datafeedRef.current) {
        datafeedRef.current.unsubscribe(activeSymbol, activePeriod)
      }
      dispose(chartElRef.current)
    }
  }, [])

  // Resize chart when sidebars / bottom docks toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.resize()
      }
    }, 120)
    return () => clearTimeout(timer)
  }, [showWatchlist, showBacktest])

  // Switch Symbol
  const handleSelectSymbol = useCallback(async (sym) => {
    const ticker = sym.toUpperCase()
    setActiveSymbol(ticker)
    if (!chartInstanceRef.current || !datafeedRef.current) return

    datafeedRef.current.unsubscribe(activeSymbol, activePeriod)
    const isIndex = ticker.includes('INDEX') || ticker.includes('VN30')
    chartInstanceRef.current.setPriceVolumePrecision(isIndex ? 2 : 0, 0)

    const bars = await datafeedRef.current.getHistoryKLineData(ticker, activePeriod)
    if (bars && bars.length > 0) {
      chartInstanceRef.current.applyNewData(bars)
      setLatestBar(bars[bars.length - 1])
    }
    datafeedRef.current.subscribe(ticker, activePeriod, (bar) => {
      chartInstanceRef.current.updateData(bar)
      setLatestBar(bar)
    })
  }, [activePeriod, activeSymbol])

  // Switch Period
  const handlePeriodChange = useCallback(async (period) => {
    setActivePeriod(period)
    if (!chartInstanceRef.current || !datafeedRef.current) return

    datafeedRef.current.unsubscribe(activeSymbol, activePeriod)
    const bars = await datafeedRef.current.getHistoryKLineData(activeSymbol, period)
    if (bars && bars.length > 0) {
      chartInstanceRef.current.applyNewData(bars)
      setLatestBar(bars[bars.length - 1])
    }
    datafeedRef.current.subscribe(activeSymbol, period, (bar) => {
      chartInstanceRef.current.updateData(bar)
      setLatestBar(bar)
    })
  }, [activeSymbol, activePeriod])

  // Switch Chart Type (Candles, Hollow, Bars OHLC, Area)
  const handleChartTypeChange = (type) => {
    setChartType(type)
    if (chartInstanceRef.current) {
      chartInstanceRef.current.setStyles(getThemeStyles(theme, type))
    }
  }

  // Add / Remove Indicator
  const handleToggleIndicator = (indicatorName) => {
    if (!chartInstanceRef.current) return

    const existing = activeIndicators.find((i) => i.name === indicatorName)
    if (existing) {
      // Remove indicator
      if (!hiddenIndicators.includes(indicatorName)) {
        chartInstanceRef.current.removeIndicator(existing.paneId, existing.name)
      }
      setActiveIndicators((prev) => prev.filter((i) => i.name !== indicatorName))
      setHiddenIndicators((prev) => prev.filter((name) => name !== indicatorName))
    } else {
      // Add indicator
      const meta = AVAILABLE_INDICATORS.find((i) => i.name === indicatorName)
      const isOverlay = meta ? meta.isOverlay : false
      let paneId = null

      if (isOverlay) {
        paneId = chartInstanceRef.current.createIndicator(indicatorName, true, {
          id: 'candle_pane',
        })
      } else {
        const paneHeight = 120
        paneId = chartInstanceRef.current.createIndicator(indicatorName, false, {
          height: paneHeight,
        })
      }

      if (paneId) {
        setActiveIndicators((prev) => [...prev, { name: indicatorName, paneId, isOverlay }])
      }
    }
  }

  // Remove indicator directly from active pills ([X] button)
  const handleRemoveIndicator = (indicatorName) => {
    if (!chartInstanceRef.current) return
    const existing = activeIndicators.find((i) => i.name === indicatorName)
    if (existing) {
      if (!hiddenIndicators.includes(indicatorName)) {
        chartInstanceRef.current.removeIndicator(existing.paneId, existing.name)
      }
      setActiveIndicators((prev) => prev.filter((i) => i.name !== indicatorName))
      setHiddenIndicators((prev) => prev.filter((name) => name !== indicatorName))
    }
  }

  // Toggle visibility of an indicator (Eye button on legend pill)
  const handleToggleVisibility = (indicatorName) => {
    if (!chartInstanceRef.current) return
    const isCurrentlyHidden = hiddenIndicators.includes(indicatorName)
    const existing = activeIndicators.find((i) => i.name === indicatorName)
    if (!existing) return

    if (isCurrentlyHidden) {
      // Re-create in KlineCharts and keep in activeIndicators
      const meta = AVAILABLE_INDICATORS.find((i) => i.name === indicatorName)
      const isOverlay = meta ? meta.isOverlay : existing.isOverlay
      let newPaneId = null
      if (isOverlay) {
        newPaneId = chartInstanceRef.current.createIndicator(indicatorName, true, { id: 'candle_pane' })
      } else {
        newPaneId = chartInstanceRef.current.createIndicator(indicatorName, false, { height: 120 })
      }
      setActiveIndicators((prev) =>
        prev.map((ind) => (ind.name === indicatorName ? { ...ind, paneId: newPaneId || ind.paneId } : ind))
      )
      setHiddenIndicators((prev) => prev.filter((n) => n !== indicatorName))
    } else {
      // Hide in KlineCharts, but KEEP pill in activeIndicators with isHidden flag!
      chartInstanceRef.current.removeIndicator(existing.paneId, existing.name)
      setHiddenIndicators((prev) => [...prev, indicatorName])
    }
  }

  // Apply Presets
  const handleApplyPreset = (indicatorNames) => {
    if (!chartInstanceRef.current) return
    // Remove all current
    activeIndicators.forEach((i) => {
      chartInstanceRef.current.removeIndicator(i.paneId, i.name)
    })
    setActiveIndicators([])
    setHiddenIndicators([])

    // Add preset indicators
    const newActive = []
    indicatorNames.forEach((name) => {
      const meta = AVAILABLE_INDICATORS.find((i) => i.name === name)
      const isOverlay = meta ? meta.isOverlay : false
      let paneId = null
      if (isOverlay) {
        paneId = chartInstanceRef.current.createIndicator(name, true, { id: 'candle_pane' })
      } else {
        const h = name === 'VOL' ? 95 : 120
        paneId = chartInstanceRef.current.createIndicator(name, false, { height: h })
      }
      if (paneId) {
        newActive.push({ name, paneId, isOverlay })
      }
    })
    setActiveIndicators(newActive)
  }

  // Drawing Tools
  const handleSelectOverlay = (overlayName) => {
    if (!chartInstanceRef.current) return
    if (overlayName && overlayName !== 'crosshair') {
      // Hủy công cụ vẽ trước đó nếu có
      cancelCurrentDrawing()

      const createdId = chartInstanceRef.current.createOverlay({
        name: overlayName,
        onDrawStart: (event) => {
          if (event?.overlay?.id) {
            inProgressOverlayIdRef.current = event.overlay.id
          }
        },
        onDrawing: (event) => {
          if (event?.overlay?.id) {
            inProgressOverlayIdRef.current = event.overlay.id
          }
        },
        onDrawEnd: (event) => {
          inProgressOverlayIdRef.current = null
          setActiveDrawingTool('crosshair')
          if (event && event.overlay) {
            setSelectedOverlay(event.overlay)
          }
        },
        onSelected: (event) => {
          setSelectedOverlay(event.overlay)
        },
        onDeselected: () => {
          setSelectedOverlay(null)
        },
        onRightClick: (event) => {
          if (event?.overlay?.id) {
            chartInstanceRef.current.removeOverlay(event.overlay.id)
          }
          setSelectedOverlay(null)
          return true
        },
      })

      if (typeof createdId === 'string') {
        inProgressOverlayIdRef.current = createdId
      }
      setActiveDrawingTool(overlayName)
    } else {
      cancelCurrentDrawing()
    }
  }

  const handleDeleteOverlay = (overlayId) => {
    if (!chartInstanceRef.current) return
    chartInstanceRef.current.removeOverlay(overlayId)
    setSelectedOverlay(null)
  }

  const handleUpdateOverlayStyle = (styles) => {
    if (!chartInstanceRef.current || !selectedOverlayRef.current) return
    chartInstanceRef.current.overrideOverlay({
      id: selectedOverlayRef.current.id,
      styles,
    })
  }

  const handleToggleOverlayLock = () => {
    if (!chartInstanceRef.current || !selectedOverlayRef.current) return
    const nextLock = !selectedOverlayRef.current.lock
    chartInstanceRef.current.overrideOverlay({
      id: selectedOverlayRef.current.id,
      lock: nextLock,
    })
    setSelectedOverlay((prev) => (prev ? { ...prev, lock: nextLock } : null))
  }

  const handleClearOverlays = () => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.removeOverlay()
      setSelectedOverlay(null)
    }
  }

  // Screenshot / Camera
  const handleScreenshot = () => {
    if (!chartInstanceRef.current) return
    try {
      const canvasList = chartElRef.current.querySelectorAll('canvas')
      if (canvasList.length === 0) return
      // Create offscreen merged canvas
      const totalWidth = canvasList[0].width
      let totalHeight = 0
      canvasList.forEach((c) => {
        totalHeight += c.height
      })
      const merged = document.createElement('canvas')
      merged.width = totalWidth
      merged.height = totalHeight
      const mctx = merged.getContext('2d')
      let y = 0
      canvasList.forEach((c) => {
        mctx.drawImage(c, 0, y)
        y += c.height
      })
      const link = document.createElement('a')
      link.download = `VNStock_${activeSymbol}_${activePeriod.text}_${new Date().toISOString().slice(0, 10)}.png`
      link.href = merged.toDataURL('image/png')
      link.click()
    } catch {
      alert('Không thể lưu ảnh biểu đồ.')
    }
  }

  return (
    <div className="tv-app-root">
      {/* Top Header */}
      <TradingViewHeader
        activeSymbol={activeSymbol}
        activePeriod={activePeriod}
        onPeriodChange={handlePeriodChange}
        chartType={chartType}
        onChartTypeChange={handleChartTypeChange}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenSymbolSearch={() => setIsSymbolModalOpen(true)}
        onOpenIndicators={() => setIsIndicatorsModalOpen(true)}
        activeIndicatorsCount={activeIndicators.length}
        onApplyPreset={handleApplyPreset}
        showWatchlist={showWatchlist}
        onToggleWatchlist={() => setShowWatchlist((s) => !s)}
        showBacktest={showBacktest}
        onToggleBacktest={() => setShowBacktest((s) => !s)}
        onScreenshot={handleScreenshot}
      />

      {/* Main Workspace */}
      <div className="tv-main-workspace">
        {/* Left Drawing Toolbar */}
        <DrawingToolbar
          activeTool={activeDrawingTool}
          onSelectTool={setActiveDrawingTool}
          onSelectOverlay={handleSelectOverlay}
          onClearOverlays={handleClearOverlays}
        />

        {/* Center: Chart Workspace */}
        <div className="tv-chart-viewport">
          {/* Top Realtime Market & Live Ticking Clock Bar */}
          <RealtimeMarketBar
            activeSymbol={activeSymbol}
            activePeriod={activePeriod}
            latestBar={latestBar}
          />

          {/* Active indicators legend pills with direct [✕] close buttons */}
          <ActiveIndicatorsBar
            activeIndicators={activeIndicators}
            onRemoveIndicator={handleRemoveIndicator}
            onToggleVisibility={handleToggleVisibility}
            hiddenIndicators={hiddenIndicators}
            onOpenSettings={(ind) => setSettingsIndicator(ind)}
            chartInstance={chartInstanceRef.current}
          />

          {/* Selected Overlay Toolbar (Mini popup with delete button) */}
          <SelectedOverlayToolbar
            selectedOverlay={selectedOverlay}
            onDeleteOverlay={handleDeleteOverlay}
            onUpdateStyle={handleUpdateOverlayStyle}
            onToggleLock={handleToggleOverlayLock}
          />

          {/* KlineCharts Mount Element */}
          <div ref={chartElRef} className="tv-klinechart-dom" />

          {/* Bottom Dock: Backtest Strategy Tester */}
          <BottomBacktestDock
            activeSymbol={activeSymbol}
            isOpen={showBacktest}
            onClose={() => setShowBacktest(false)}
          />
        </div>

        {/* Right Sidebar: Watchlist */}
        {showWatchlist && (
          <TradingViewWatchlist
            activeSymbol={activeSymbol}
            onSelectSymbol={handleSelectSymbol}
            onClose={() => setShowWatchlist(false)}
            latestBar={latestBar}
          />
        )}
      </div>

      {/* Modals */}
      <SymbolSearchModal
        isOpen={isSymbolModalOpen}
        onClose={() => setIsSymbolModalOpen(false)}
        onSelect={handleSelectSymbol}
        currentSymbol={activeSymbol}
      />

      <IndicatorsModal
        isOpen={isIndicatorsModalOpen}
        onClose={() => setIsIndicatorsModalOpen(false)}
        activeIndicators={activeIndicators}
        onToggleIndicator={handleToggleIndicator}
      />

      {/* Indicator Settings Modal */}
      <IndicatorSettingsModal
        isOpen={Boolean(settingsIndicator)}
        onClose={() => setSettingsIndicator(null)}
        indicator={settingsIndicator}
        chartInstance={chartInstanceRef.current}
        onApplySettings={() => {
          setSettingsUpdateTick((t) => t + 1)
        }}
      />
    </div>
  )
}
