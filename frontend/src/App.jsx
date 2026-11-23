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
import { volumeOverlayConfig } from './indicators/volumeOverlay'
import { syncDrawingsCloud, fetchDrawingsCloud, deleteDrawingsCloud } from './services/cloudStorage'
import { isCloudEnabled } from './lib/supabase'

export const STORAGE_KEYS = {
  THEME: 'vn_theme',
  LAST_SYMBOL: 'vn_last_symbol',
  LAST_PERIOD: 'vn_last_period',
  CHART_TYPE: 'vn_chart_type',
  SHOW_WATCHLIST: 'vn_show_watchlist',
  ACTIVE_INDICATORS: 'vn_active_indicators',
  HIDDEN_INDICATORS: 'vn_hidden_indicators',
  INDICATOR_PARAMS: 'vn_indicator_calc_params',
}

/**
 * Tự động căn chỉnh thang đo (Auto-Scale / Auto-Fit) chuẩn 100% TradingView
 * - Reset cờ autoCalcTickFlag cho toàn bộ panes (Candle pane & Indicator sub-panes)
 * - Tự động tính toán lại min/max giá chính xác theo mã cổ phiếu mới
 * - Giữ zoom chuẩn 9px và lề phải 60px
 */
export const resetChartScale = (chart, resetHorizontal = true) => {
  if (!chart) return
  try {
    const panes = typeof chart.getAllDrawPanes === 'function' ? chart.getAllDrawPanes() : (chart._drawPanes || [])
    panes.forEach((pane) => {
      try {
        const axis = pane?.getAxisComponent?.()
        if (axis && typeof axis.setAutoCalcTickFlag === 'function') {
          axis.setAutoCalcTickFlag(true)
        }
      } catch {}
    })

    if (typeof chart.adjustPaneViewport === 'function') {
      chart.adjustPaneViewport(true, true, true, true, true)
    }

    if (resetHorizontal) {
      chart.setBarSpace?.(9)
      chart.setOffsetRightDistance?.(60)
      chart.scrollToRealTime?.()
    }
  } catch (err) {
    console.warn('resetChartScale error:', err)
  }
}

const getThemeStyles = (theme, chartType = 'candle_solid') => {
  const isDark = theme === 'dark'
  return {
    grid: {
      horizontal: { color: isDark ? '#1f2937' : '#f0f3f6', style: 'dash' },
      vertical: { color: isDark ? '#1f2937' : '#f0f3f6', style: 'dash' },
    },
    separator: {
      size: 2,
      color: isDark ? '#2a2e39' : '#e0e3eb',
      fill: true,
      activeBackgroundColor: isDark ? 'rgba(41, 98, 255, 0.45)' : 'rgba(37, 99, 235, 0.35)',
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
        upColor: '#089981',
        downColor: '#f23645',
        noChangeColor: '#888888',
      },
      lastValueMark: {
        show: true,
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
      bars: [
        {
          style: 'fill',
          borderStyle: 'solid',
          borderSize: 1,
          borderDashedValue: [2, 2],
          upColor: 'rgba(8, 153, 129, 0.75)',
          downColor: 'rgba(242, 54, 69, 0.75)',
          noChangeColor: 'rgba(136, 136, 136, 0.75)',
          upBorderColor: '#089981',
          downBorderColor: '#f23645',
          noChangeBorderColor: '#888888',
        },
      ],
      lines: [
        { color: '#f59e0b', size: 1.5 },
        { color: '#3b82f6', size: 1.5 },
        { color: '#ec4899', size: 1.5 },
        { color: '#8b5cf6', size: 1.5 },
        { color: '#10b981', size: 1.5 },
        { color: '#06b6d4', size: 1.5 },
      ],
    },
  }
}

export default function App() {
  const chartElRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const datafeedRef = useRef(null)

  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEYS.THEME) || 'dark')
  const [activeSymbol, setActiveSymbol] = useState(() => localStorage.getItem(STORAGE_KEYS.LAST_SYMBOL) || 'VNINDEX')
  const [activePeriod, setActivePeriod] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LAST_PERIOD)
      if (saved) return JSON.parse(saved)
    } catch {}
    return { multiplier: 1, timespan: 'day', text: '1D' }
  })
  const activePeriodRef = useRef(activePeriod)
  activePeriodRef.current = activePeriod
  const [chartType, setChartType] = useState(() => localStorage.getItem(STORAGE_KEYS.CHART_TYPE) || 'candle_solid')

  // Modals & Drawers state
  const [isSymbolModalOpen, setIsSymbolModalOpen] = useState(false)
  const [isIndicatorsModalOpen, setIsIndicatorsModalOpen] = useState(false)
  const [showWatchlist, setShowWatchlist] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHOW_WATCHLIST)
    return saved !== null ? saved === 'true' : true
  })
  const [showBacktest, setShowBacktest] = useState(false)
  const [settingsIndicator, setSettingsIndicator] = useState(null)
  const [, setSettingsUpdateTick] = useState(0)

  // Active indicators on chart: array of { name, paneId, isOverlay }
  const [activeIndicators, setActiveIndicators] = useState([])
  const [hiddenIndicators, setHiddenIndicators] = useState([])
  const [latestBar, setLatestBar] = useState(null)
  const [isChartLoading, setIsChartLoading] = useState(false)
  const switchRequestIdRef = useRef(0)

  // Selected Overlay (Drawing) & Active Drawing Tool
  const [activeDrawingTool, setActiveDrawingTool] = useState('crosshair')
  const [selectedOverlay, setSelectedOverlay] = useState(null)
  const selectedOverlayRef = useRef(null)
  selectedOverlayRef.current = selectedOverlay

  const inProgressOverlayIdRef = useRef(null)

  // Persistent drawings state
  const [drawingsCount, setDrawingsCount] = useState(0)
  const [cloudSyncStatus, setCloudSyncStatus] = useState(() => (isCloudEnabled() ? 'synced' : 'local'))
  const cloudDebounceTimerRef = useRef(null)
  const activeSymbolRef = useRef(activeSymbol)
  activeSymbolRef.current = activeSymbol

  // Save all completed drawings for a specific symbol to localStorage & Supabase Cloud
  const saveDrawingsForSymbol = useCallback((symbol) => {
    const sym = symbol || activeSymbolRef.current
    if (!chartInstanceRef.current || !sym) return
    try {
      const overlayStore = chartInstanceRef.current._chartStore?.getOverlayStore?.()
      if (!overlayStore) return
      const instances = overlayStore.getInstances() || []

      const validOverlays = instances
        .filter(
          (inst) =>
            inst &&
            inst.name &&
            inst.points &&
            inst.points.length > 0 &&
            inst.id !== inProgressOverlayIdRef.current
        )
        .map((inst) => ({
          id: inst.id,
          name: inst.name,
          groupId: inst.groupId,
          paneId: inst.paneId || 'candle_pane',
          points: inst.points.map((pt) => ({
            timestamp: pt.timestamp,
            dataIndex: pt.dataIndex,
            value: pt.value,
          })),
          styles: inst.styles || {},
          lock: Boolean(inst.lock),
          visible: inst.visible !== false,
          mode: inst.mode,
          extendData: inst.extendData,
        }))

      const storageKey = `vn_drawings_${sym.toUpperCase()}`
      localStorage.setItem(storageKey, JSON.stringify(validOverlays))
      setDrawingsCount(validOverlays.length)

      // Debounced Cloud Sync (1.2s after last drawing edit)
      if (isCloudEnabled()) {
        if (cloudDebounceTimerRef.current) {
          clearTimeout(cloudDebounceTimerRef.current)
        }
        setCloudSyncStatus('saving')
        cloudDebounceTimerRef.current = setTimeout(async () => {
          try {
            const res = await syncDrawingsCloud(sym, validOverlays)
            if (res && res.success) {
              setCloudSyncStatus('synced')
            } else {
              setCloudSyncStatus('local')
            }
          } catch {
            setCloudSyncStatus('local')
          }
        }, 1200)
      } else {
        setCloudSyncStatus('local')
      }
    } catch (err) {
      console.warn('Failed to save drawings:', err)
    }
  }, [])

  // Restore saved drawings for a symbol from localStorage & Supabase Cloud
  const restoreDrawingsForSymbol = useCallback(
    (symbol) => {
      const sym = symbol || activeSymbolRef.current
      if (!chartInstanceRef.current || !sym) return
      try {
        const storageKey = `vn_drawings_${sym.toUpperCase()}`
        const raw = localStorage.getItem(storageKey)
        let list = []
        if (raw) {
          try {
            list = JSON.parse(raw)
          } catch {}
        }

        const renderOverlays = (overlayList) => {
          if (!chartInstanceRef.current || !Array.isArray(overlayList)) return
          chartInstanceRef.current.removeOverlay()
          overlayList.forEach((item) => {
            if (!item.name || !item.points || item.points.length === 0) return
            chartInstanceRef.current.createOverlay(
              {
                id: item.id,
                name: item.name,
                groupId: item.groupId,
                points: item.points,
                styles: item.styles,
                lock: item.lock,
                visible: item.visible,
                mode: item.mode,
                extendData: item.extendData,
                onSelected: (event) => setSelectedOverlay(event.overlay),
                onDeselected: () => setSelectedOverlay(null),
                onRightClick: (event) => {
                  if (event?.overlay?.id) {
                    chartInstanceRef.current.removeOverlay(event.overlay.id)
                    setTimeout(() => saveDrawingsForSymbol(sym), 60)
                  }
                  setSelectedOverlay(null)
                  return true
                },
                onPressedMoveEnd: () => {
                  setTimeout(() => saveDrawingsForSymbol(sym), 60)
                },
              },
              item.paneId || 'candle_pane'
            )
          })
          setDrawingsCount(overlayList.length)
        }

        // 1. Khôi phục tức thì từ localStorage (0ms độ trễ)
        if (Array.isArray(list) && list.length > 0) {
          renderOverlays(list)
        } else {
          setDrawingsCount(0)
        }

        // 2. Kiểm tra ngầm trên Supabase Cloud
        if (isCloudEnabled()) {
          fetchDrawingsCloud(sym)
            .then((cloudData) => {
              if (cloudData && Array.isArray(cloudData.overlays)) {
                // Nếu Cloud có nét vẽ mà local chưa có hoặc số lượng khác
                if (cloudData.overlays.length > 0 && (!list || list.length === 0)) {
                  localStorage.setItem(storageKey, JSON.stringify(cloudData.overlays))
                  if (activeSymbolRef.current.toUpperCase() === sym.toUpperCase()) {
                    renderOverlays(cloudData.overlays)
                  }
                }
              }
              setCloudSyncStatus('synced')
            })
            .catch(() => {
              setCloudSyncStatus('local')
            })
        } else {
          setCloudSyncStatus('local')
        }
      } catch (err) {
        console.warn('Failed to restore drawings:', err)
        setDrawingsCount(0)
      }
    },
    [saveDrawingsForSymbol]
  )

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
          setTimeout(() => {
            saveDrawingsForSymbol(activeSymbolRef.current)
          }, 60)
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

  // Mượt mà hóa thao tác kéo lên/kéo xuống & zoom trục giá Y như TradingView:
  // - Kéo dọc thước đo Y: Tốc độ co giãn nhạy, đồng đều cho cả nến và tất cả chỉ báo (không bị chậm ở đáy màn hình)
  // - Kéo dọc trực tiếp trên biểu đồ: Tự động mở khóa autoCalcTickFlag để pan dọc mượt mà
  // - Cuộn chuột trên thước đo giá Y (bên phải): Zoom co giãn thang đo giá mượt mà
  // - Double-click trên thước đo của chỉ báo nào: Reset căn chỉnh tự động cho chỉ báo đó; trên biểu đồ: reset tất cả
  useEffect(() => {
    const el = chartElRef.current
    if (!el) return

    let isPointerDown = false
    let startX = 0
    let startY = 0
    let hasUnlockedVertical = false

    // State cho việc kéo chuột co giãn trực tiếp trên thước đo Y
    let isYAxisDragging = false
    let yAxisDragStartY = 0
    let yAxisDragPane = null
    let yAxisInitialRange = null

    const handlePointerDown = (e) => {
      if (e.button !== 0) return
      const chart = chartInstanceRef.current
      if (!chart) return

      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const isOverYAxis = mouseX >= rect.width - 80

      if (isOverYAxis) {
        // Người dùng bấm trực tiếp vào thước đo giá Y (của nến hoặc chỉ báo)
        const panes = typeof chart.getAllDrawPanes === 'function' ? chart.getAllDrawPanes() : (chart._drawPanes || [])
        let targetPane = null
        for (const p of panes) {
          const b = p.getBounding ? p.getBounding() : null
          if (b && mouseY >= b.top && mouseY <= b.top + b.height) {
            targetPane = p
            break
          }
        }
        if (!targetPane) targetPane = chart._candlePane || panes[0]
        const axis = targetPane?.getAxisComponent?.()
        const r = axis?.getRange?.()

        if (axis && r && isFinite(r.from) && isFinite(r.to)) {
          isYAxisDragging = true
          yAxisDragStartY = e.clientY
          yAxisDragPane = targetPane
          yAxisInitialRange = { ...r }
          e.preventDefault()
        }
        return
      }

      isPointerDown = true
      startX = e.clientX
      startY = e.clientY
      hasUnlockedVertical = false
    }

    const handlePointerMove = (e) => {
      const chart = chartInstanceRef.current
      if (!chart) return

      // 1. Xử lý kéo co giãn trục Y mượt mà, phản hồi ngay lập tức chuẩn TradingView (Độc lập tọa độ màn hình)
      if (isYAxisDragging && yAxisDragPane && yAxisInitialRange) {
        e.preventDefault()
        const axis = yAxisDragPane.getAxisComponent?.()
        if (!axis) return

        const dy = e.clientY - yAxisDragStartY
        // Công thức co giãn hàm số mũ chuẩn TradingView: di chuyển chuột 30-50px là co giãn rõ rệt, mượt mà ở mọi vị trí
        const factor = Math.exp(-dy * 0.007)
        const mid = (yAxisInitialRange.from + yAxisInitialRange.to) / 2
        const half = ((yAxisInitialRange.to - yAxisInitialRange.from) * factor) / 2
        const newFrom = mid - half
        const newTo = mid + half

        axis.setRange({
          from: newFrom,
          to: newTo,
          range: newTo - newFrom,
          realFrom: axis.convertToRealValue(newFrom),
          realTo: axis.convertToRealValue(newTo),
          realRange: axis.convertToRealValue(newTo) - axis.convertToRealValue(newFrom),
        })

        if (typeof chart.adjustPaneViewport === 'function') {
          chart.adjustPaneViewport(false, true, true, true, true)
        }
        return
      }

      if (!isPointerDown) return

      // Không can thiệp nếu người dùng đang dùng công cụ vẽ
      const overlayStore = chart._chartStore?.getOverlayStore?.()
      const isDrawing =
        Boolean(overlayStore?.getProgressInstanceInfo?.()) ||
        Boolean(inProgressOverlayIdRef.current) ||
        (activeDrawingTool && activeDrawingTool !== 'crosshair')
      if (isDrawing) return

      const rect = el.getBoundingClientRect()
      const isInsideChartBody = startX < rect.right - 80 // Không phải click trực tiếp trên Y-axis

      const dy = Math.abs(e.clientY - startY)
      const dx = Math.abs(e.clientX - startX)

      // Khi người dùng kéo lên/kéo xuống trên thân biểu đồ, mở khóa để KlineCharts pan tự do cả 2 trục X & Y
      if (isInsideChartBody && !hasUnlockedVertical && dy > 5 && dy >= dx * 0.4) {
        hasUnlockedVertical = true
        const panes = typeof chart.getAllDrawPanes === 'function' ? chart.getAllDrawPanes() : (chart._drawPanes || [])
        panes.forEach((pane) => {
          try {
            const axis = pane?.getAxisComponent?.()
            if (axis && typeof axis.setAutoCalcTickFlag === 'function') {
              axis.setAutoCalcTickFlag(false)
            }
          } catch {}
        })
      }
    }

    const handlePointerUp = () => {
      isPointerDown = false
      hasUnlockedVertical = false
      isYAxisDragging = false
      yAxisDragPane = null
      yAxisInitialRange = null
    }

    // Double-click: nếu double-click trên thước đo giá của chỉ báo nào thì reset riêng chỉ báo đó; còn lại reset tất cả
    const handleDblClick = (e) => {
      const chart = chartInstanceRef.current
      if (!chart) return

      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const chartWidth = rect.width
      const isOverYAxis = mouseX >= chartWidth - 80

      if (isOverYAxis) {
        const panes = typeof chart.getAllDrawPanes === 'function' ? chart.getAllDrawPanes() : (chart._drawPanes || [])
        for (const p of panes) {
          const b = p.getBounding ? p.getBounding() : null
          if (b && mouseY >= b.top && mouseY <= b.top + b.height) {
            try {
              const axis = p.getAxisComponent?.()
              if (axis && typeof axis.setAutoCalcTickFlag === 'function') {
                axis.setAutoCalcTickFlag(true)
              }
            } catch {}
            break
          }
        }
        try {
          chart.adjustPaneViewport(false, true, true, true, true)
        } catch {}
      } else {
        resetChartScale(chart, false)
      }
    }

    // Cuộn chuột mượt mà trên thước đo giá Y hoặc Ctrl + Wheel
    const handleWheel = (e) => {
      const chart = chartInstanceRef.current
      if (!chart) return

      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const chartWidth = rect.width
      const isOverYAxis = mouseX >= chartWidth - 80

      if (isOverYAxis || e.ctrlKey) {
        e.preventDefault()
        e.stopPropagation()

        const panes = typeof chart.getAllDrawPanes === 'function' ? chart.getAllDrawPanes() : (chart._drawPanes || [])
        let targetPane = null
        for (const p of panes) {
          const b = p.getBounding ? p.getBounding() : null
          if (b && mouseY >= b.top && mouseY <= b.top + b.height) {
            targetPane = p
            break
          }
        }
        if (!targetPane) {
          targetPane = chart._candlePane || panes[0]
        }
        if (!targetPane) return

        const yAxis = targetPane.getAxisComponent?.()
        if (!yAxis) return

        const zoomFactor = e.deltaY > 0 ? 1.10 : 0.90
        const range = yAxis.getRange?.()
        if (!range || !isFinite(range.from) || !isFinite(range.to)) return

        const mid = (range.from + range.to) / 2
        const half = ((range.to - range.from) * zoomFactor) / 2
        const newFrom = mid - half
        const newTo = mid + half

        yAxis.setRange({
          from: newFrom,
          to: newTo,
          range: newTo - newFrom,
          realFrom: yAxis.convertToRealValue(newFrom),
          realTo: yAxis.convertToRealValue(newTo),
          realRange: yAxis.convertToRealValue(newTo) - yAxis.convertToRealValue(newFrom),
        })

        if (typeof chart.adjustPaneViewport === 'function') {
          chart.adjustPaneViewport(false, true, true, true, true)
        }
      }
    }

    el.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    el.addEventListener('dblclick', handleDblClick)
    el.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      el.removeEventListener('dblclick', handleDblClick)
      el.removeEventListener('wheel', handleWheel)
    }
  }, [activeDrawingTool])

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

    const isInitIndex = ['VNINDEX', 'VN30', 'HNXINDEX', 'HNX30', 'UPCOMINDEX'].includes(activeSymbol)
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
        chart.applyNewData(bars, false, () => {
          resetChartScale(chart, true)
          restoreDrawingsForSymbol(activeSymbol)
        })
        const last = bars[bars.length - 1]
        const prev = bars.length >= 2 ? bars[bars.length - 2] : null
        const ref = prev ? prev.close : last.open
        const diff = last.close - ref
        const pct = ref ? (diff / ref) * 100 : 0
        setLatestBar({
          ...last,
          ref_price: ref,
          change: diff,
          pct_change: pct,
        })
      }

      // Restore saved indicators from localStorage (only what user kept active!)
      let savedInds = null
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_INDICATORS)
        if (raw !== null) {
          savedInds = JSON.parse(raw)
        }
      } catch {}

      // Default for brand new visitors: MA and VOL
      if (!Array.isArray(savedInds)) {
        savedInds = [
          { name: 'MA', isOverlay: true },
          { name: 'VOL', isOverlay: true },
        ]
      }

      let savedHidden = []
      try {
        const rawH = localStorage.getItem(STORAGE_KEYS.HIDDEN_INDICATORS)
        if (rawH) savedHidden = JSON.parse(rawH) || []
      } catch {}

      let savedParamsMap = {}
      try {
        const rawP = localStorage.getItem(STORAGE_KEYS.INDICATOR_PARAMS)
        if (rawP) savedParamsMap = JSON.parse(rawP) || {}
      } catch {}

      if (savedParamsMap['VOL']?.maxHeightRatio) {
        volumeOverlayConfig.maxHeightRatio = savedParamsMap['VOL'].maxHeightRatio
        volumeOverlayConfig.opacity = savedParamsMap['VOL'].opacity
      }

      const createdActive = []
      for (const item of savedInds) {
        if (!item || !item.name) continue
        const indName = item.name
        const meta = AVAILABLE_INDICATORS.find((i) => i.name === indName)
        const isOverlay = meta ? meta.isOverlay : (item.isOverlay ?? true)
        const isHidden = savedHidden.includes(indName)

        if (!isHidden) {
          let paneId = null
          if (isOverlay) {
            paneId = chart.createIndicator(indName, true, { id: 'candle_pane' })
          } else {
            const paneHeight = indName === 'VOL' ? 95 : 105
            paneId = chart.createIndicator(indName, false, {
              height: paneHeight,
              dragEnabled: true,
              minHeight: 40,
              gap: { top: 0.12, bottom: 0.08 },
            })
          }
          if (paneId) {
            const customParams = savedParamsMap[indName]
            if (customParams && Array.isArray(customParams)) {
              try {
                chart.overrideIndicator({ name: indName, calcParams: customParams }, paneId)
              } catch (e) {
                console.warn(`Failed to override params for ${indName}:`, e)
              }
            }
            createdActive.push({ name: indName, paneId, isOverlay })
          }
        } else {
          createdActive.push({ name: indName, paneId: null, isOverlay })
        }
      }

      setActiveIndicators(createdActive)
      setHiddenIndicators(savedHidden)

      // Subscribe for live polling
      datafeed.subscribe(activeSymbol, activePeriod, (bar) => {
        chart.updateData(bar)
        setLatestBar((prev) => {
          const ref = bar.ref_price || prev?.ref_price || (bars.length >= 2 ? bars[bars.length - 2].close : bar.open)
          const diff = bar.close - ref
          const pct = ref ? (diff / ref) * 100 : 0
          return {
            ...bar,
            ref_price: ref,
            change: diff,
            pct_change: pct,
          }
        })
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

  // Switch Symbol (Chuyển mã cổ phiếu siêu tốc, mượt mà chuẩn TradingView 60fps)
  const handleSelectSymbol = useCallback(async (sym) => {
    const ticker = sym.toUpperCase()
    if (!chartInstanceRef.current || !datafeedRef.current) return
    if (ticker === activeSymbolRef.current) return

    const requestId = ++switchRequestIdRef.current

    // 1. Tự động lưu bản vẽ của mã cổ phiếu hiện tại
    saveDrawingsForSymbol(activeSymbolRef.current)

    // 2. Ngắt polling thời gian thực của mã cũ
    datafeedRef.current.unsubscribe(activeSymbolRef.current, activePeriodRef.current)

    // 3. Cập nhật state active symbol
    setActiveSymbol(ticker)
    activeSymbolRef.current = ticker

    const isNextIndex = ['VNINDEX', 'VN30', 'HNXINDEX', 'HNX30', 'UPCOMINDEX'].includes(ticker)

    // 4. Chuẩn bị định dạng giá & mở khóa tính toán tự động thang đo Y cho mã mới
    try {
      chartInstanceRef.current.setPriceVolumePrecision(isNextIndex ? 2 : 0, 0)
      chartInstanceRef.current.removeOverlay()
      setSelectedOverlay(null)

      const panes = typeof chartInstanceRef.current.getAllDrawPanes === 'function'
        ? chartInstanceRef.current.getAllDrawPanes()
        : (chartInstanceRef.current._drawPanes || [])
      panes.forEach((p) => {
        try { p?.getAxisComponent?.()?.setAutoCalcTickFlag(true) } catch {}
      })
    } catch {}

    // 5. Nạp tức thì từ RAM Cache nếu đã có (0ms instant transition, không bao giờ nháy trắng)
    const cachedBars = datafeedRef.current.getCachedData(ticker, activePeriodRef.current)
    if (cachedBars && cachedBars.length > 0) {
      chartInstanceRef.current.applyNewData(cachedBars, false, () => {
        if (requestId !== switchRequestIdRef.current) return
        resetChartScale(chartInstanceRef.current, true)
        restoreDrawingsForSymbol(ticker)
      })

      const last = cachedBars[cachedBars.length - 1]
      const prev = cachedBars.length >= 2 ? cachedBars[cachedBars.length - 2] : null
      const ref = prev ? prev.close : last.open
      const diff = last.close - ref
      const pct = ref ? (diff / ref) * 100 : 0
      setLatestBar({
        ...last,
        ref_price: ref,
        change: diff,
        pct_change: pct,
      })
    } else {
      setIsChartLoading(true)
    }

    // 6. Tải dữ liệu lịch sử chuẩn xác
    try {
      const bars = await datafeedRef.current.getHistoryKLineData(ticker, activePeriodRef.current)
      if (requestId !== switchRequestIdRef.current) return

      if (bars && bars.length > 0) {
        if (!cachedBars || cachedBars.length !== bars.length) {
          chartInstanceRef.current.applyNewData(bars, false, () => {
            if (requestId !== switchRequestIdRef.current) return
            resetChartScale(chartInstanceRef.current, true)
            restoreDrawingsForSymbol(ticker)
          })

          const last = bars[bars.length - 1]
          const prev = bars.length >= 2 ? bars[bars.length - 2] : null
          const ref = prev ? prev.close : last.open
          const diff = last.close - ref
          const pct = ref ? (diff / ref) * 100 : 0
          setLatestBar({
            ...last,
            ref_price: ref,
            change: diff,
            pct_change: pct,
          })
        }
      }
    } finally {
      if (requestId === switchRequestIdRef.current) {
        setIsChartLoading(false)
      }
    }

    // 7. Kết nối polling thời gian thực cho mã mới
    datafeedRef.current.subscribe(ticker, activePeriodRef.current, (bar) => {
      if (requestId !== switchRequestIdRef.current) return
      chartInstanceRef.current.updateData(bar)
      setLatestBar((prev) => {
        const ref = bar.ref_price || prev?.ref_price || bar.open
        const diff = bar.close - ref
        const pct = ref ? (diff / ref) * 100 : 0
        return {
          ...bar,
          ref_price: ref,
          change: diff,
          pct_change: pct,
        }
      })
    })
  }, [saveDrawingsForSymbol, restoreDrawingsForSymbol])

  // Switch Period (Chuyển khung thời gian mượt mà, không khựng)
  const handlePeriodChange = useCallback(async (period) => {
    setActivePeriod(period)
    activePeriodRef.current = period
    localStorage.setItem(STORAGE_KEYS.LAST_PERIOD, JSON.stringify(period))
    if (!chartInstanceRef.current || !datafeedRef.current) return

    const requestId = ++switchRequestIdRef.current

    saveDrawingsForSymbol(activeSymbolRef.current)
    datafeedRef.current.unsubscribe(activeSymbolRef.current, activePeriodRef.current)

    try {
      chartInstanceRef.current.removeOverlay()
      setSelectedOverlay(null)
      const panes = typeof chartInstanceRef.current.getAllDrawPanes === 'function'
        ? chartInstanceRef.current.getAllDrawPanes()
        : (chartInstanceRef.current._drawPanes || [])
      panes.forEach((p) => {
        try { p?.getAxisComponent?.()?.setAutoCalcTickFlag(true) } catch {}
      })
    } catch {}

    const cachedBars = datafeedRef.current.getCachedData(activeSymbolRef.current, period)
    if (cachedBars && cachedBars.length > 0) {
      chartInstanceRef.current.applyNewData(cachedBars, false, () => {
        if (requestId !== switchRequestIdRef.current) return
        resetChartScale(chartInstanceRef.current, true)
        restoreDrawingsForSymbol(activeSymbolRef.current)
      })
      const last = cachedBars[cachedBars.length - 1]
      const prev = cachedBars.length >= 2 ? cachedBars[cachedBars.length - 2] : null
      const ref = prev ? prev.close : last.open
      const diff = last.close - ref
      const pct = ref ? (diff / ref) * 100 : 0
      setLatestBar({
        ...last,
        ref_price: ref,
        change: diff,
        pct_change: pct,
      })
    } else {
      setIsChartLoading(true)
    }

    try {
      const bars = await datafeedRef.current.getHistoryKLineData(activeSymbolRef.current, period)
      if (requestId !== switchRequestIdRef.current) return

      if (bars && bars.length > 0) {
        if (!cachedBars || cachedBars.length !== bars.length) {
          chartInstanceRef.current.applyNewData(bars, false, () => {
            if (requestId !== switchRequestIdRef.current) return
            resetChartScale(chartInstanceRef.current, true)
            restoreDrawingsForSymbol(activeSymbolRef.current)
          })
          const last = bars[bars.length - 1]
          const prev = bars.length >= 2 ? bars[bars.length - 2] : null
          const ref = prev ? prev.close : last.open
          const diff = last.close - ref
          const pct = ref ? (diff / ref) * 100 : 0
          setLatestBar({
            ...last,
            ref_price: ref,
            change: diff,
            pct_change: pct,
          })
        }
      }
    } finally {
      if (requestId === switchRequestIdRef.current) {
        setIsChartLoading(false)
      }
    }

    datafeedRef.current.subscribe(activeSymbolRef.current, period, (bar) => {
      if (requestId !== switchRequestIdRef.current) return
      chartInstanceRef.current.updateData(bar)
      setLatestBar((prev) => {
        const ref = bar.ref_price || prev?.ref_price || bar.open
        const diff = bar.close - ref
        const pct = ref ? (diff / ref) * 100 : 0
        return {
          ...bar,
          ref_price: ref,
          change: diff,
          pct_change: pct,
        }
      })
    })
  }, [saveDrawingsForSymbol, restoreDrawingsForSymbol])

  // Background pre-cache watchlist symbols for instant 0ms switching
  useEffect(() => {
    if (!datafeedRef.current) return
    let symbolsToPreload = ['VNINDEX', 'VN30', 'FPT', 'HPG', 'VCB', 'SSI', 'MWG', 'TCB']
    try {
      const saved = localStorage.getItem('vn_watchlist_symbols')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          symbolsToPreload = parsed
        }
      }
    } catch {}

    const timer = setTimeout(() => {
      datafeedRef.current?.prefetchSymbols?.(symbolsToPreload, activePeriodRef.current)
    }, 600)

    return () => clearTimeout(timer)
  }, [activePeriod])

  // Switch Chart Type (Candles, Hollow, Bars OHLC, Area)
  const handleChartTypeChange = (type) => {
    setChartType(type)
    localStorage.setItem(STORAGE_KEYS.CHART_TYPE, type)
    if (chartInstanceRef.current) {
      chartInstanceRef.current.setStyles(getThemeStyles(theme, type))
    }
  }

  // Persist Active & Hidden Indicators to localStorage (cái gì đang bật thì lưu, cái gì tắt rồi thì không lưu)
  const persistActiveIndicators = (indicators, hidden) => {
    try {
      const toSave = indicators.map((i) => ({ name: i.name, isOverlay: i.isOverlay }))
      localStorage.setItem(STORAGE_KEYS.ACTIVE_INDICATORS, JSON.stringify(toSave))
      if (hidden !== undefined) {
        localStorage.setItem(STORAGE_KEYS.HIDDEN_INDICATORS, JSON.stringify(hidden))
      }
    } catch (e) {
      console.warn('Failed to persist active indicators:', e)
    }
  }

  // Add / Remove Indicator
  const handleToggleIndicator = (indicatorName) => {
    if (!chartInstanceRef.current) return

    const existing = activeIndicators.find((i) => i.name === indicatorName)
    if (existing) {
      // Remove indicator (TURN OFF - Cái gì tắt rồi thì không lưu!)
      if (!hiddenIndicators.includes(indicatorName) && existing.paneId) {
        chartInstanceRef.current.removeIndicator(existing.paneId, existing.name)
      }
      const nextActive = activeIndicators.filter((i) => i.name !== indicatorName)
      const nextHidden = hiddenIndicators.filter((name) => name !== indicatorName)
      setActiveIndicators(nextActive)
      setHiddenIndicators(nextHidden)
      persistActiveIndicators(nextActive, nextHidden)
    } else {
      // Add indicator (TURN ON - Thêm chỉ báo thì lưu lại!)
      const meta = AVAILABLE_INDICATORS.find((i) => i.name === indicatorName)
      const isOverlay = meta ? meta.isOverlay : false
      let paneId = null

      if (isOverlay) {
        paneId = chartInstanceRef.current.createIndicator(indicatorName, true, {
          id: 'candle_pane',
        })
      } else {
        const paneHeight = indicatorName === 'VOL' ? 95 : 105
        paneId = chartInstanceRef.current.createIndicator(indicatorName, false, {
          height: paneHeight,
          dragEnabled: true,
          minHeight: 40,
          gap: { top: 0.12, bottom: 0.08 },
        })
      }

      if (paneId) {
        // Áp dụng tham số tùy chỉnh đã lưu nếu có
        try {
          const rawP = localStorage.getItem(STORAGE_KEYS.INDICATOR_PARAMS)
          if (rawP) {
            const pMap = JSON.parse(rawP)
            if (pMap && pMap[indicatorName] && Array.isArray(pMap[indicatorName])) {
              chartInstanceRef.current.overrideIndicator(
                { name: indicatorName, calcParams: pMap[indicatorName] },
                paneId
              )
            }
          }
        } catch {}

        const nextActive = [...activeIndicators, { name: indicatorName, paneId, isOverlay }]
        setActiveIndicators(nextActive)
        persistActiveIndicators(nextActive)
      }
    }
  }

  // Remove indicator directly from active pills ([X] button)
  const handleRemoveIndicator = (indicatorName) => {
    if (!chartInstanceRef.current) return
    const existing = activeIndicators.find((i) => i.name === indicatorName)
    if (existing) {
      if (!hiddenIndicators.includes(indicatorName) && existing.paneId) {
        chartInstanceRef.current.removeIndicator(existing.paneId, existing.name)
      }
      const nextActive = activeIndicators.filter((i) => i.name !== indicatorName)
      const nextHidden = hiddenIndicators.filter((name) => name !== indicatorName)
      setActiveIndicators(nextActive)
      setHiddenIndicators(nextHidden)
      persistActiveIndicators(nextActive, nextHidden)
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
        const paneHeight = indicatorName === 'VOL' ? 95 : 105
        newPaneId = chartInstanceRef.current.createIndicator(indicatorName, false, {
          height: paneHeight,
          dragEnabled: true,
          minHeight: 40,
          gap: { top: 0.12, bottom: 0.08 },
        })
      }

      // Áp dụng tham số đã lưu
      try {
        const rawP = localStorage.getItem(STORAGE_KEYS.INDICATOR_PARAMS)
        if (rawP && newPaneId) {
          const pMap = JSON.parse(rawP)
          if (pMap && pMap[indicatorName] && Array.isArray(pMap[indicatorName])) {
            chartInstanceRef.current.overrideIndicator(
              { name: indicatorName, calcParams: pMap[indicatorName] },
              newPaneId
            )
          }
        }
      } catch {}

      const nextActive = activeIndicators.map((ind) =>
        ind.name === indicatorName ? { ...ind, paneId: newPaneId || ind.paneId } : ind
      )
      const nextHidden = hiddenIndicators.filter((n) => n !== indicatorName)
      setActiveIndicators(nextActive)
      setHiddenIndicators(nextHidden)
      persistActiveIndicators(nextActive, nextHidden)
    } else {
      // Hide in KlineCharts, but KEEP pill in activeIndicators with isHidden flag!
      if (existing.paneId) {
        chartInstanceRef.current.removeIndicator(existing.paneId, existing.name)
      }
      const nextHidden = [...hiddenIndicators, indicatorName]
      setHiddenIndicators(nextHidden)
      persistActiveIndicators(activeIndicators, nextHidden)
    }
  }

  // Apply Presets
  const handleApplyPreset = (indicatorNames) => {
    if (!chartInstanceRef.current) return
    // Remove all current
    activeIndicators.forEach((i) => {
      if (i.paneId) {
        chartInstanceRef.current.removeIndicator(i.paneId, i.name)
      }
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
        const h = name === 'VOL' ? 95 : 105
        paneId = chartInstanceRef.current.createIndicator(name, false, {
          height: h,
          dragEnabled: true,
          minHeight: 40,
          gap: { top: 0.12, bottom: 0.08 },
        })
      }
      if (paneId) {
        newActive.push({ name, paneId, isOverlay })
      }
    })
    setActiveIndicators(newActive)
    persistActiveIndicators(newActive, [])
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
          setTimeout(() => {
            saveDrawingsForSymbol(activeSymbolRef.current)
          }, 60)
        },
        onPressedMoveEnd: () => {
          setTimeout(() => {
            saveDrawingsForSymbol(activeSymbolRef.current)
          }, 60)
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
            setTimeout(() => {
              saveDrawingsForSymbol(activeSymbolRef.current)
            }, 60)
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
    setTimeout(() => {
      saveDrawingsForSymbol(activeSymbolRef.current)
    }, 60)
  }

  const handleUpdateOverlayStyle = (styles) => {
    if (!chartInstanceRef.current || !selectedOverlayRef.current) return
    chartInstanceRef.current.overrideOverlay({
      id: selectedOverlayRef.current.id,
      styles,
    })
    setSelectedOverlay((prev) => ({
      ...prev,
      styles: { ...prev?.styles, ...styles },
    }))
    setTimeout(() => {
      saveDrawingsForSymbol(activeSymbolRef.current)
    }, 60)
  }

  const handleToggleOverlayLock = () => {
    if (!chartInstanceRef.current || !selectedOverlayRef.current) return
    const nextLock = !selectedOverlayRef.current.lock
    chartInstanceRef.current.overrideOverlay({
      id: selectedOverlayRef.current.id,
      lock: nextLock,
    })
    setSelectedOverlay((prev) => (prev ? { ...prev, lock: nextLock } : null))
    setTimeout(() => {
      saveDrawingsForSymbol(activeSymbolRef.current)
    }, 60)
  }

  const handleClearOverlays = () => {
    if (chartInstanceRef.current) {
      const sym = activeSymbolRef.current.toUpperCase()
      chartInstanceRef.current.removeOverlay()
      setSelectedOverlay(null)
      localStorage.removeItem(`vn_drawings_${sym}`)
      deleteDrawingsCloud(sym)
      setDrawingsCount(0)
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
        onToggleWatchlist={() => {
          setShowWatchlist((s) => {
            const next = !s
            localStorage.setItem(STORAGE_KEYS.SHOW_WATCHLIST, String(next))
            return next
          })
        }}
        showBacktest={showBacktest}
        onToggleBacktest={() => setShowBacktest((s) => !s)}
        onScreenshot={handleScreenshot}
        drawingsCount={drawingsCount}
        cloudSyncStatus={cloudSyncStatus}
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

          {/* Top Seamless Loading Bar */}
          {isChartLoading && <div className="tv-chart-top-loader" />}

          {/* KlineCharts Mount Element */}
          <div ref={chartElRef} className="tv-klinechart-dom" />

          {/* TradingView Floating Auto-Scale (Auto-Fit) Button */}
          <button
            className="tv-auto-scale-btn"
            title="Tự động căn chỉnh thang đo giá (Auto Scale) - Phím tắt: Double-click vào biểu đồ"
            onClick={() => resetChartScale(chartInstanceRef.current, true)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            <span>Auto</span>
          </button>

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
            onClose={() => {
              setShowWatchlist(false)
              localStorage.setItem(STORAGE_KEYS.SHOW_WATCHLIST, 'false')
            }}
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
