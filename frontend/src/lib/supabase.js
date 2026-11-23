import { createClient } from '@supabase/supabase-js'

// 1. Đọc thông tin cấu hình từ biến môi trường Vite (.env hoặc .env.local)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Kiểm tra xem người dùng đã điền URL và Anon Key hợp lệ chưa
export const isCloudEnabled = () => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim().length > 0 &&
    !supabaseUrl.includes('your-project-id') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseAnonKey.includes('your-anon-key')
  )
}

// 2. Khởi tạo Supabase Client (nếu cấu hình hợp lệ, ngược lại trả về null để fallback an toàn)
export const supabase = isCloudEnabled()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

// 3. Quản lý Device ID ẩn danh (Anonymous Persistent ID)
// Device ID được lưu bền vững trong localStorage của trình duyệt
const DEVICE_ID_KEY = 'vn_stock_device_id'

export const getDeviceId = () => {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY)
    if (!deviceId) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        deviceId = 'dev_' + crypto.randomUUID()
      } else {
        deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
      }
      localStorage.setItem(DEVICE_ID_KEY, deviceId)
    }
    return deviceId
  } catch (err) {
    console.warn('[Supabase] Không thể truy cập localStorage để lấy Device ID:', err)
    return 'dev_fallback_' + Date.now().toString(36)
  }
}
