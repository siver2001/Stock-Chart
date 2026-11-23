/**
 * Service đồng bộ dữ liệu đa thiết bị với Supabase Cloud
 * Hỗ trợ lưu trữ nét vẽ kỹ thuật (Drawings) và Danh mục theo dõi (Watchlist)
 * Cơ chế: Hybrid Offline-First (localStorage + Cloud Debounce)
 */
import { supabase, isCloudEnabled, getDeviceId } from '../lib/supabase'

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
