import React, { useEffect, useRef, useState, useCallback } from 'react'
import { init, dispose } from 'klinecharts'
import { registerAllCustomIndicators } from './indicators'
import { VNStockDatafeed } from './datafeed/vnDatafeed'

import TradingViewHeader from './components/TradingViewHeader'
import DrawingToolbar, { ALL_DRAWING_TOOLS_MAP } from './components/DrawingToolbar'
import FloatingFavoriteToolbar from './components/FloatingFavoriteToolbar'
import SymbolSearchModal from './components/SymbolSearchModal'
import IndicatorsModal, { AVAILABLE_INDICATORS } from './components/IndicatorsModal'
import TradingViewWatchlist from './components/TradingViewWatchlist'
import BottomBacktestDock from './components/BottomBacktestDock'
import ActiveIndicatorsBar from './components/ActiveIndicatorsBar'
import SelectedOverlayToolbar from './components/SelectedOverlayToolbar'
import RealtimeMarketBar from './components/RealtimeMarketBar'
import IndicatorSettingsModal from './components/IndicatorSettingsModal'
import { volumeOverlayConfig } from './indicators/volumeOverlay'
import {
  syncDrawingsCloud,
  fetchDrawingsCloud,
  deleteDrawingsCloud,
  syncChartSettingsCloud,
  fetchChartSettingsCloud,
  subscribeRealtimeSync,
  reconnectRealtimeSync,
  broadcastDrawingSync,
  broadcastSettingsSync,
} from './services/cloudStorage'
import CloudSyncModal from './components/CloudSyncModal'
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
      tooltip: {
        showRule: 'none', // HTML ActiveIndicatorsBar renders cleanly without canvas duplicate overlap
      },
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
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false)
  const [showWatchlist, setShowWatchlist] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHOW_WATCHLIST)
    return saved !== null ? saved === 'true' : true
  })
  const [showBacktest, setShowBacktest] = useState(false)
  const [settingsIndicator, setSettingsIndicator] = useState(null)
  const [, setSettingsUpdateTick] = useState(0)

  // Active indicators on chart: array of { name, paneId, isOverlay }
  const [activeIndicators, setActiveIndicators] = useState([])
  const activeIndicatorsRef = useRef(activeIndicators)
  activeIndicatorsRef.current = activeIndicators
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

  // Starred / Favorite Drawing Tools (Persistent in localStorage)
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('vn_favorite_drawing_tools')
      if (saved) return JSON.parse(saved)
    } catch {}
    return [
      'segment',
      'fibonacciLine',
      'fibExtension',
      'fibTimeZone',
      'elliottImpulse',
      'longPosition',
      'priceRange',
      'datePriceRange',
      'callout',
    ]
  })

  const [showFavoriteToolbar, setShowFavoriteToolbar] = useState(() => {
    const saved = localStorage.getItem('vn_show_favorite_toolbar')
    return saved !== null ? saved === 'true' : true
  })

  // Auxiliary Drawing Modes: Continuous Drawing, Magnet Mode, Lock All, Hide All
  const [isContinuousDrawing, setIsContinuousDrawing] = useState(false)
  const isContinuousDrawingRef = useRef(false)
  isContinuousDrawingRef.current = isContinuousDrawing

  const [magnetMode, setMagnetMode] = useState(() => {
    return localStorage.getItem('vn_magnet_mode') || 'off'
  })

  const [isDrawingsLocked, setIsDrawingsLocked] = useState(false)
  const [isDrawingsHidden, setIsDrawingsHidden] = useState(false)

  // Handlers for Favorites & Auxiliary Modes
  const handleToggleFavorite = useCallback((toolId) => {
    setFavorites((prev) => {
      const next = prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
      try {
        localStorage.setItem('vn_favorite_drawing_tools', JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const handleToggleFavoriteToolbar = useCallback(() => {
    setShowFavoriteToolbar((prev) => {
      const next = !prev
      try {
        localStorage.setItem('vn_show_favorite_toolbar', String(next))
      } catch {}
      return next
    })
  }, [])

  const handleToggleContinuousDrawing = useCallback(() => {
    setIsContinuousDrawing((prev) => !prev)
  }, [])

  const handleToggleMagnetMode = useCallback(() => {
    setMagnetMode((prev) => {
      const next = prev === 'off' ? 'weak' : prev === 'weak' ? 'strong' : 'off'
      try {
        localStorage.setItem('vn_magnet_mode', next)
      } catch {}
      return next
    })
  }, [])

  // Persistent drawings state
  const [drawingsCount, setDrawingsCount] = useState(0)
  const [cloudSyncStatus, setCloudSyncStatus] = useState(() => (isCloudEnabled() ? 'synced' : 'local'))
  const cloudDebounceTimerRef = useRef(null)
  const broadcastDrawingTimerRef = useRef(null)
  const activeSymbolRef = useRef(activeSymbol)
  activeSymbolRef.current = activeSymbol

  // Save all completed drawings for a specific symbol to localStorage & Supabase Cloud (+ Realtime Broadcast)
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
      const prevJson = localStorage.getItem(storageKey)
      const nextJson = JSON.stringify(validOverlays)
      localStorage.setItem(storageKey, nextJson)
      setDrawingsCount(validOverlays.length)

      // Skip network broadcast & DB write when switching untouched symbols
      if (prevJson === nextJson && prevJson !== null) {
        return
      }

      if (isCloudEnabled()) {
        // 1. Instant Realtime Broadcast to other open devices (~120ms debounce)
        if (broadcastDrawingTimerRef.current) {
          clearTimeout(broadcastDrawingTimerRef.current)
        }
        broadcastDrawingTimerRef.current = setTimeout(() => {
          broadcastDrawingSync(sym, validOverlays)
        }, 120)

        // 2. Durable PostgreSQL upsert (1.0s debounce)
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
        }, 1000)
      } else {
        setCloudSyncStatus('local')
      }
    } catch (err) {
      console.warn('Failed to save drawings:', err)
    }
  }, [])

  // Shared helper to render a list of saved/remote overlays onto the active chart
  const renderOverlaysOnChart = useCallback(
    (overlayList, targetSym) => {
      if (!chartInstanceRef.current || !Array.isArray(overlayList)) return
      const sym = targetSym || activeSymbolRef.current
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
    },
    [saveDrawingsForSymbol]
  )

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

        // 1. Khôi phục tức thì từ localStorage (0ms độ trễ)
        if (Array.isArray(list) && list.length > 0) {
          renderOverlaysOnChart(list, sym)
        } else {
          setDrawingsCount(0)
        }

        // 2. Kiểm tra ngầm trên Supabase Cloud
        if (isCloudEnabled()) {
          fetchDrawingsCloud(sym)
            .then((cloudData) => {
              if (cloudData && Array.isArray(cloudData.overlays)) {
                const cloudJson = JSON.stringify(cloudData.overlays)
                const localJson = JSON.stringify(list || [])
                // Nếu Cloud có nét vẽ và khác với bản lưu local hiện tại
                if (cloudData.overlays.length > 0 && cloudJson !== localJson) {
                  localStorage.setItem(storageKey, cloudJson)
                  if (activeSymbolRef.current.toUpperCase() === sym.toUpperCase()) {
                    renderOverlaysOnChart(cloudData.overlays, sym)
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
    [renderOverlaysOnChart]
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
        // Chuẩn TradingView 100%:
        // - Kéo chuột LÊN (dy < 0): Giãn biểu đồ theo chiều dọc (phóng to nến/chỉ báo cao hơn)
        // - Kéo chuột XUỐNG (dy > 0): Bóp biểu đồ theo chiều dọc (thu nhỏ/dẹt nến và chỉ báo lại)
        const factor = Math.exp(dy * 0.007)
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
      if (ticker && ticker === activeSymbolRef.current) setActiveSymbol(ticker)
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
          symbol: activeSymbol,
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

      // Background check Supabase Cloud for updated indicators across devices
      if (isCloudEnabled()) {
        fetchChartSettingsCloud()
          .then((cloudSettings) => {
            if (!cloudSettings) return
            const rawLocal = localStorage.getItem(STORAGE_KEYS.ACTIVE_INDICATORS)
            if (!rawLocal && Array.isArray(cloudSettings.activeIndicators) && cloudSettings.activeIndicators.length > 0) {
              applyCloudIndicators(
                cloudSettings.activeIndicators,
                cloudSettings.hiddenIndicators,
                cloudSettings.indicatorParams
              )
            }
          })
          .catch(() => {})
      }

      // Subscribe for live polling
      datafeed.subscribe(activeSymbol, activePeriod, (bar) => {
        chart.updateData(bar)
        setLatestBar((prev) => {
          const ref = bar.ref_price || prev?.ref_price || (bars.length >= 2 ? bars[bars.length - 2].close : bar.open)
          const diff = bar.close - ref
          const pct = ref ? (diff / ref) * 100 : 0
          return {
            symbol: activeSymbol,
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
        symbol: ticker,
        ...last,
        ref_price: ref,
        change: diff,
        pct_change: pct,
      })
    } else {
      // Clear latestBar immediately to prevent leaking old stock's bar during transition
      setLatestBar(null)
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
            symbol: ticker,
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
          symbol: ticker,
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
        symbol: activeSymbolRef.current,
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
            symbol: activeSymbolRef.current,
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
          symbol: activeSymbolRef.current,
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
      const saved = localStorage.getItem('vn_stock_watchlist') || localStorage.getItem('vn_watchlist_symbols')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Only pre-cache top 8 symbols so we don't congest network when watchlist has 100+ items
          symbolsToPreload = parsed.slice(0, 8)
        }
      }
    } catch {}

    const timer = setTimeout(() => {
      datafeedRef.current?.prefetchSymbols?.(symbolsToPreload, activePeriodRef.current)
    }, 1800)

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

  // Debounce ref for syncing chart settings & indicators to Supabase Cloud
  const chartSettingsTimerRef = useRef(null)

  // Persist Active & Hidden Indicators to localStorage & Supabase Cloud (+ Realtime Broadcast)
  const persistActiveIndicators = (indicators, hidden) => {
    try {
      const toSave = indicators.map((i) => ({ name: i.name, isOverlay: i.isOverlay }))
      localStorage.setItem(STORAGE_KEYS.ACTIVE_INDICATORS, JSON.stringify(toSave))
      if (hidden !== undefined) {
        localStorage.setItem(STORAGE_KEYS.HIDDEN_INDICATORS, JSON.stringify(hidden))
      }

      if (isCloudEnabled()) {
        let pMap = {}
        try {
          const rawP = localStorage.getItem(STORAGE_KEYS.INDICATOR_PARAMS)
          if (rawP) pMap = JSON.parse(rawP) || {}
        } catch {}
        const nextHidden = hidden !== undefined ? hidden : hiddenIndicators

        // Instant Realtime Broadcast to other open devices
        broadcastSettingsSync({
          activeIndicators: toSave,
          hiddenIndicators: nextHidden,
          indicatorParams: pMap,
        })

        if (chartSettingsTimerRef.current) clearTimeout(chartSettingsTimerRef.current)
        chartSettingsTimerRef.current = setTimeout(() => {
          syncChartSettingsCloud({
            theme,
            chartType,
            activeIndicators: toSave,
            hiddenIndicators: nextHidden,
            indicatorParams: pMap,
          })
        }, 1000)
      }
    } catch (e) {
      console.warn('Failed to persist active indicators:', e)
    }
  }

  // Khôi phục chỉ báo từ Supabase Cloud vào biểu đồ
  const applyCloudIndicators = useCallback((targetInds, targetHidden = [], targetParams = {}) => {
    if (!chartInstanceRef.current || !Array.isArray(targetInds)) return
    const chart = chartInstanceRef.current

    // 1. Gỡ sạch các indicator đang hiển thị (use ref to keep callback identity stable)
    ;(activeIndicatorsRef.current || []).forEach((i) => {
      if (i.paneId) {
        try { chart.removeIndicator(i.paneId, i.name) } catch {}
      }
    })

    // 2. Tạo mới theo danh sách từ Cloud
    const created = []
    for (const item of targetInds) {
      if (!item || !item.name) continue
      const indName = item.name
      const meta = AVAILABLE_INDICATORS.find((i) => i.name === indName)
      const isOverlay = meta ? meta.isOverlay : (item.isOverlay ?? true)
      const isHidden = Array.isArray(targetHidden) && targetHidden.includes(indName)

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
          const customParams = targetParams[indName]
          if (customParams && Array.isArray(customParams)) {
            try {
              chart.overrideIndicator({ name: indName, calcParams: customParams }, paneId)
            } catch {}
          }
          created.push({ name: indName, paneId, isOverlay })
        }
      } else {
        created.push({ name: indName, paneId: null, isOverlay })
      }
    }

    setActiveIndicators(created)
    setHiddenIndicators(targetHidden || [])
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_INDICATORS, JSON.stringify(targetInds))
      localStorage.setItem(STORAGE_KEYS.HIDDEN_INDICATORS, JSON.stringify(targetHidden || []))
      if (targetParams && Object.keys(targetParams).length > 0) {
        localStorage.setItem(STORAGE_KEYS.INDICATOR_PARAMS, JSON.stringify(targetParams))
      }
    } catch {}
  }, [])

  // Lắng nghe sự kiện đổi Sync Key hoặc ép đồng bộ để tải lại chỉ báo
  useEffect(() => {
    const handleReload = () => {
      if (!isCloudEnabled()) return
      fetchChartSettingsCloud().then((cloudSettings) => {
        if (!cloudSettings) return
        if (Array.isArray(cloudSettings.activeIndicators) && cloudSettings.activeIndicators.length > 0) {
          applyCloudIndicators(cloudSettings.activeIndicators, cloudSettings.hiddenIndicators, cloudSettings.indicatorParams)
        }
      })
    }
    window.addEventListener('vn_stock_reload_cloud_indicators', handleReload)
    return () => {
      window.removeEventListener('vn_stock_reload_cloud_indicators', handleReload)
    }
  }, [applyCloudIndicators])

  // Real-time Cross-Device Sync Listener (Drawings & Indicators live across open machines!)
  useEffect(() => {
    if (!isCloudEnabled()) return
    const unsub = subscribeRealtimeSync({
      onDrawingSync: async (payload) => {
        const ticker = (payload?.symbol || '').toUpperCase()
        if (!ticker) return
        let overlayList = Array.isArray(payload.overlays) ? payload.overlays : null
        if (payload.fetchFromCloud || !overlayList) {
          const cloudData = await fetchDrawingsCloud(ticker)
          if (cloudData && Array.isArray(cloudData.overlays)) {
            overlayList = cloudData.overlays
          }
        }
        if (!Array.isArray(overlayList)) return
        const storageKey = `vn_drawings_${ticker}`
        const nextJson = JSON.stringify(overlayList)
        const prevJson = localStorage.getItem(storageKey)
        if (prevJson === nextJson) return
        localStorage.setItem(storageKey, nextJson)
        if (activeSymbolRef.current.toUpperCase() === ticker && chartInstanceRef.current) {
          if (!inProgressOverlayIdRef.current) {
            renderOverlaysOnChart(overlayList, ticker)
            setCloudSyncStatus('synced')
          }
        }
      },
      onSettingsSync: (payload) => {
        if (Array.isArray(payload?.activeIndicators)) {
          applyCloudIndicators(
            payload.activeIndicators,
            payload.hiddenIndicators || [],
            payload.indicatorParams || {}
          )
        }
      },
    })

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        reconnectRealtimeSync()
        if (activeSymbolRef.current) {
          restoreDrawingsForSymbol(activeSymbolRef.current)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      unsub()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [renderOverlaysOnChart, restoreDrawingsForSymbol, applyCloudIndicators])

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

  const handleToggleLockDrawings = useCallback(() => {
    setIsDrawingsLocked((prev) => {
      const next = !prev
      if (chartInstanceRef.current) {
        try {
          const overlayStore = chartInstanceRef.current._chartStore?.getOverlayStore?.()
          const instances = overlayStore?.getInstances() || []
          instances.forEach((inst) => {
            chartInstanceRef.current.overrideOverlay({ id: inst.id, lock: next })
          })
          setTimeout(() => saveDrawingsForSymbol(activeSymbolRef.current), 60)
        } catch (e) {
          console.warn('Error toggling lock on overlays:', e)
        }
      }
      return next
    })
  }, [saveDrawingsForSymbol])

  const handleToggleHideDrawings = useCallback(() => {
    setIsDrawingsHidden((prev) => {
      const next = !prev
      if (chartInstanceRef.current) {
        try {
          const overlayStore = chartInstanceRef.current._chartStore?.getOverlayStore?.()
          const instances = overlayStore?.getInstances() || []
          instances.forEach((inst) => {
            chartInstanceRef.current.overrideOverlay({ id: inst.id, visible: !next })
          })
          setTimeout(() => saveDrawingsForSymbol(activeSymbolRef.current), 60)
        } catch (e) {
          console.warn('Error toggling visibility on overlays:', e)
        }
      }
      return next
    })
  }, [saveDrawingsForSymbol])

  // Drawing Tools
  const handleSelectOverlay = (overlayName) => {
    if (!chartInstanceRef.current) return
    if (overlayName && overlayName !== 'crosshair') {
      // Hủy công cụ vẽ trước đó nếu có
      cancelCurrentDrawing()

      const klineMode =
        magnetMode === 'strong'
          ? 'strong_magnet'
          : magnetMode === 'weak'
          ? 'weak_magnet'
          : 'normal'

      const createdId = chartInstanceRef.current.createOverlay({
        name: overlayName,
        mode: klineMode,
        modeSensitivity: 10,
        lock: isDrawingsLocked,
        visible: !isDrawingsHidden,
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
          if (isContinuousDrawingRef.current) {
            // Khóa chế độ vẽ: tiếp tục giữ công cụ vẽ sẵn sàng cho nét tiếp theo
            setTimeout(() => {
              handleSelectOverlay(overlayName)
            }, 60)
          } else {
            setActiveDrawingTool('crosshair')
          }
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
        onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}
      />

      {/* Main Workspace */}
      <div className="tv-main-workspace">
        {/* Left Drawing Toolbar */}
        <DrawingToolbar
          activeTool={activeDrawingTool}
          onSelectTool={setActiveDrawingTool}
          onSelectOverlay={handleSelectOverlay}
          onClearOverlays={handleClearOverlays}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          showFavoriteToolbar={showFavoriteToolbar}
          onToggleFavoriteToolbar={handleToggleFavoriteToolbar}
          magnetMode={magnetMode}
          onToggleMagnetMode={handleToggleMagnetMode}
          isContinuousDrawing={isContinuousDrawing}
          onToggleContinuousDrawing={handleToggleContinuousDrawing}
          isDrawingsLocked={isDrawingsLocked}
          onToggleLockDrawings={handleToggleLockDrawings}
          isDrawingsHidden={isDrawingsHidden}
          onToggleHideDrawings={handleToggleHideDrawings}
        />

        {/* Center: Chart Workspace */}
        <div className="tv-chart-viewport">
          {/* Floating Starred Favorites Toolbar */}
          <FloatingFavoriteToolbar
            activeTool={activeDrawingTool}
            onSelectTool={setActiveDrawingTool}
            onSelectOverlay={handleSelectOverlay}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            isOpen={showFavoriteToolbar}
            onClose={() => setShowFavoriteToolbar(false)}
            allToolsMap={ALL_DRAWING_TOOLS_MAP}
          />

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
            latestBar={latestBar}
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
          persistActiveIndicators(activeIndicators, hiddenIndicators)
        }}
      />

      {/* Cloud Sync Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
        activeSymbol={activeSymbol}
        drawingsCount={drawingsCount}
        activeIndicatorsCount={activeIndicators.length}
        onForceSync={() => {
          restoreDrawingsForSymbol(activeSymbolRef.current)
        }}
      />
    </div>
  )
}
