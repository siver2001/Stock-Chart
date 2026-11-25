/**
 * Service đồng bộ dữ liệu đa thiết bị với Supabase Cloud
 * Hỗ trợ lưu trữ nét vẽ kỹ thuật (Drawings) và Danh mục theo dõi (Watchlist)
 * Cơ chế: Hybrid Offline-First (localStorage + Cloud Debounce)
 */
import { supabase, isCloudEnabled, getDeviceId, getSyncKey } from '../lib/supabase'

// Unique ID per browser tab so we never echo our own Realtime broadcasts back to ourselves
export const CLIENT_TAB_ID =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'tab_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)

// ==============================================================================
// 1. ĐỒNG BỘ NÉT VẼ PHÂN TÍCH KỸ THUẬT (CHART DRAWINGS)
// ==============================================================================

/**
 * Lưu nét vẽ của một mã cổ phiếu lên Supabase Cloud
 * @param {string} symbol - Mã cổ phiếu (VD: SSI, FPT, VNINDEX)
 * @param {Array} overlays - Mảng các đối tượng nét vẽ JSON từ KlineCharts
 */
export async function syncDrawingsCloud(symbol, overlays) {
  if (!isCloudEnabled() || !supabase) {
    return { success: false, reason: 'cloud_disabled' }
  }

  const ticker = (symbol || '').toUpperCase()
  if (!ticker) return { success: false, reason: 'empty_symbol' }

  try {
    const deviceId = getDeviceId()
    const validOverlays = Array.isArray(overlays) ? overlays : []

    const payload = {
      device_id: deviceId,
      symbol: ticker,
      overlays: validOverlays,
      drawings_count: validOverlays.length,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('chart_drawings')
      .upsert(payload, { onConflict: 'device_id,symbol' })

    if (error) {
      console.error(`[CloudSync] Lỗi lưu nét vẽ mã ${ticker} lên Cloud:`, error.message)
      return { success: false, error }
    }

    return { success: true, count: validOverlays.length }
  } catch (err) {
    console.error(`[CloudSync] Lỗi ngoại lệ khi lưu nét vẽ mã ${ticker}:`, err)
    return { success: false, error: err }
  }
}

/**
 * Tải nét vẽ của một mã cổ phiếu từ Supabase Cloud
 * @param {string} symbol - Mã cổ phiếu
 * @returns {Promise<{ overlays: Array, updatedAt: string } | null>}
 */
export async function fetchDrawingsCloud(symbol) {
  if (!isCloudEnabled() || !supabase) {
    return null
  }

  const ticker = (symbol || '').toUpperCase()
  if (!ticker) return null

  try {
    const deviceId = getDeviceId()
    const { data, error } = await supabase
      .from('chart_drawings')
      .select('overlays, drawings_count, updated_at')
      .eq('device_id', deviceId)
      .eq('symbol', ticker)
      .maybeSingle()

    if (error) {
      console.warn(`[CloudSync] Không thể lấy nét vẽ mã ${ticker} từ Cloud:`, error.message)
      return null
    }

    if (data && Array.isArray(data.overlays)) {
      return {
        overlays: data.overlays,
        updatedAt: data.updated_at,
        count: data.drawings_count || data.overlays.length,
      }
    }

    return null
  } catch (err) {
    console.warn(`[CloudSync] Lỗi khi tải nét vẽ mã ${ticker}:`, err)
    return null
  }
}

/**
 * Xóa toàn bộ nét vẽ của một mã trên Cloud
 */
export async function deleteDrawingsCloud(symbol) {
  if (!isCloudEnabled() || !supabase) return

  const ticker = (symbol || '').toUpperCase()
  try {
    broadcastDrawingSync(ticker, [])
    const deviceId = getDeviceId()
    await supabase
      .from('chart_drawings')
      .delete()
      .eq('device_id', deviceId)
      .eq('symbol', ticker)
  } catch (err) {
    console.warn(`[CloudSync] Lỗi xóa nét vẽ mã ${ticker} trên Cloud:`, err)
  }
}

// ==============================================================================
// 2. ĐỒNG BỘ DANH MỤC THEO DÕI (WATCHLIST & FLAGS)
// ==============================================================================

/**
 * Lưu danh mục Watchlist và cờ màu lên Supabase Cloud
 */
export async function syncWatchlistCloud(symbols, flags = {}) {
  if (!isCloudEnabled() || !supabase) {
    return { success: false, reason: 'cloud_disabled' }
  }

  try {
    const deviceId = getDeviceId()
    const payload = {
      device_id: deviceId,
      watchlist_name: 'default',
      symbols: Array.isArray(symbols) ? symbols : [],
      flags: typeof flags === 'object' && flags !== null ? flags : {},
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('user_watchlists')
      .upsert(payload, { onConflict: 'device_id,watchlist_name' })

    if (error) {
      console.error('[CloudSync] Lỗi lưu Watchlist lên Cloud:', error.message)
      return { success: false, error }
    }

    return { success: true }
  } catch (err) {
    console.error('[CloudSync] Lỗi ngoại lệ khi lưu Watchlist:', err)
    return { success: false, error: err }
  }
}

/**
 * Tải danh mục Watchlist từ Supabase Cloud
 */
export async function fetchWatchlistCloud() {
  if (!isCloudEnabled() || !supabase) {
    return null
  }

  try {
    const deviceId = getDeviceId()
    const { data, error } = await supabase
      .from('user_watchlists')
      .select('symbols, flags, updated_at')
      .eq('device_id', deviceId)
      .eq('watchlist_name', 'default')
      .maybeSingle()

    if (error) {
      console.warn('[CloudSync] Không thể lấy Watchlist từ Cloud:', error.message)
      return null
    }

    if (data && Array.isArray(data.symbols) && data.symbols.length > 0) {
      return {
        symbols: data.symbols,
        flags: data.flags || {},
        updatedAt: data.updated_at,
      }
    }

    return null
  } catch (err) {
    console.warn('[CloudSync] Lỗi tải Watchlist từ Cloud:', err)
    return null
  }
}

// ==============================================================================
// 3. ĐỒNG BỘ CẤU HÌNH BIỂU ĐỒ & CHỈ BÁO KỸ THUẬT (CHART SETTINGS & INDICATORS)
// ==============================================================================

/**
 * Lưu cấu hình chỉ báo và giao diện biểu đồ lên Cloud
 */
export async function syncChartSettingsCloud({
  theme = 'dark',
  chartType = 'candle_solid',
  activeIndicators = [],
  hiddenIndicators = [],
  indicatorParams = {},
  favoritePeriods = ['1m', '5m', '15m', '1H', '1D', '1W'],
}) {
  if (!isCloudEnabled() || !supabase) {
    return { success: false, reason: 'cloud_disabled' }
  }

  try {
    const deviceId = getDeviceId()
    const mergedParams = {
      ...(typeof indicatorParams === 'object' && indicatorParams !== null ? indicatorParams : {}),
    }
    if (Array.isArray(hiddenIndicators) && hiddenIndicators.length > 0) {
      mergedParams._hidden = hiddenIndicators
    }

    const payload = {
      device_id: deviceId,
      theme: theme || 'dark',
      chart_type: chartType || 'candle_solid',
      active_indicators: Array.isArray(activeIndicators) ? activeIndicators : [],
      indicator_params: mergedParams,
      favorite_periods: Array.isArray(favoritePeriods) ? favoritePeriods : ['1m', '5m', '15m', '1H', '1D', '1W'],
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('user_chart_settings')
      .upsert(payload, { onConflict: 'device_id' })

    if (error) {
      console.error('[CloudSync] Lỗi lưu cấu hình biểu đồ lên Cloud:', error.message)
      return { success: false, error }
    }

    return { success: true }
  } catch (err) {
    console.error('[CloudSync] Lỗi ngoại lệ khi lưu cấu hình biểu đồ:', err)
    return { success: false, error: err }
  }
}

/**
 * Tải cấu hình chỉ báo và giao diện biểu đồ từ Cloud
 */
export async function fetchChartSettingsCloud() {
  if (!isCloudEnabled() || !supabase) {
    return null
  }

  try {
    const deviceId = getDeviceId()
    const { data, error } = await supabase
      .from('user_chart_settings')
      .select('*')
      .eq('device_id', deviceId)
      .maybeSingle()

    if (error) {
      console.warn('[CloudSync] Không thể lấy cấu hình biểu đồ từ Cloud:', error.message)
      return null
    }

    if (data) {
      const hidden = Array.isArray(data.indicator_params?._hidden)
        ? data.indicator_params._hidden
        : []
      return {
        theme: data.theme,
        chartType: data.chart_type,
        activeIndicators: Array.isArray(data.active_indicators) ? data.active_indicators : [],
        hiddenIndicators: hidden,
        indicatorParams: data.indicator_params || {},
        favoritePeriods: data.favorite_periods || [],
        updatedAt: data.updated_at,
      }
    }

    return null
  } catch (err) {
    console.warn('[CloudSync] Lỗi tải cấu hình biểu đồ từ Cloud:', err)
    return null
  }
}

// ==============================================================================
// 4. ĐỒNG BỘ THỜI GIAN THỰC ĐA THIẾT BỊ (SUPABASE REALTIME BROADCAST HUB)
// ==============================================================================

let _rtChannel = null
let _rtChannelKey = null
let _rtSubscribed = false
const _drawingListeners = new Set()
const _watchlistListeners = new Set()
const _settingsListeners = new Set()

function ensureRealtimeChannel() {
  if (!isCloudEnabled() || !supabase) return null
  const activeKey = getSyncKey()

  if (_rtChannel && _rtChannelKey === activeKey) {
    return _rtChannel
  }

  if (_rtChannel) {
    try {
      supabase.removeChannel(_rtChannel)
    } catch {}
    _rtChannel = null
    _rtSubscribed = false
  }

  _rtChannelKey = activeKey
  const channelName = `vn_stock_rt_${activeKey}`
  const ch = supabase.channel(channelName, {
    config: {
      broadcast: { self: false },
    },
  })

  ch.on('broadcast', { event: 'drawing_sync' }, ({ payload }) => {
    if (!payload || payload.senderId === CLIENT_TAB_ID) return
    _drawingListeners.forEach((fn) => {
      try { fn(payload) } catch {}
    })
  })

  ch.on('broadcast', { event: 'watchlist_sync' }, ({ payload }) => {
    if (!payload || payload.senderId === CLIENT_TAB_ID) return
    _watchlistListeners.forEach((fn) => {
      try { fn(payload) } catch {}
    })
  })

  ch.on('broadcast', { event: 'settings_sync' }, ({ payload }) => {
    if (!payload || payload.senderId === CLIENT_TAB_ID) return
    _settingsListeners.forEach((fn) => {
      try { fn(payload) } catch {}
    })
  })

  ch.subscribe((status) => {
    _rtSubscribed = status === 'SUBSCRIBED'
  })

  _rtChannel = ch
  return ch
}

export function reconnectRealtimeSync() {
  if (_rtChannel && supabase) {
    try {
      supabase.removeChannel(_rtChannel)
    } catch {}
  }
  _rtChannel = null
  _rtChannelKey = null
  _rtSubscribed = false
  return ensureRealtimeChannel()
}

export function subscribeRealtimeSync({ onDrawingSync, onWatchlistSync, onSettingsSync } = {}) {
  if (!isCloudEnabled() || !supabase) return () => {}
  ensureRealtimeChannel()

  if (onDrawingSync) _drawingListeners.add(onDrawingSync)
  if (onWatchlistSync) _watchlistListeners.add(onWatchlistSync)
  if (onSettingsSync) _settingsListeners.add(onSettingsSync)

  return () => {
    if (onDrawingSync) _drawingListeners.delete(onDrawingSync)
    if (onWatchlistSync) _watchlistListeners.delete(onWatchlistSync)
    if (onSettingsSync) _settingsListeners.delete(onSettingsSync)
  }
}

async function sendRealtimeBroadcast(event, payload) {
  if (!isCloudEnabled() || !supabase) return
  try {
    const ch = ensureRealtimeChannel()
    if (!ch) return
    await ch.send({
      type: 'broadcast',
      event,
      payload: {
        ...payload,
        senderId: CLIENT_TAB_ID,
        ts: Date.now(),
      },
    })
  } catch (err) {
    console.warn(`[RealtimeSync] Broadcast ${event} error:`, err)
  }
}

export function broadcastDrawingSync(symbol, overlays) {
  const ticker = (symbol || '').toUpperCase()
  if (!ticker) return
  const list = Array.isArray(overlays) ? overlays : []
  const jsonLen = JSON.stringify(list).length
  if (jsonLen > 80000) {
    // Payload too large for broadcast frame -> signal receiver to pull directly from Supabase DB
    sendRealtimeBroadcast('drawing_sync', { symbol: ticker, fetchFromCloud: true })
  } else {
    sendRealtimeBroadcast('drawing_sync', { symbol: ticker, overlays: list })
  }
}

export function broadcastWatchlistSync(symbols, flags) {
  if (!Array.isArray(symbols)) return
  sendRealtimeBroadcast('watchlist_sync', { symbols, flags: flags || {} })
}

export function broadcastSettingsSync(settings) {
  if (!settings) return
  sendRealtimeBroadcast('settings_sync', settings)
}
