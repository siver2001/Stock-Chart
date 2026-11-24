import { createClient } from '@supabase/supabase-js'

// 1. Đọc thông tin cấu hình từ biến môi trường Vite (.env hoặc .env.local)
// Kèm giá trị mặc định cho project Supabase của bạn
const DEFAULT_SUPABASE_URL = 'https://eaxxqgjcxwysftflgqlm.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_f_kD5wsipKmlCCWDkqDyGA_tR8APss_'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

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

// 3. Quản lý Mã đồng bộ đám mây (Cloud Sync Key / Shared Workspace ID)
// Mặc định tất cả thiết bị dùng chung 'default_user' để đồng bộ đa thiết bị tức thì 100% không cần đăng ký.
// Người dùng cũng có thể đặt mã riêng hoặc dán mã từ máy khác vào để liên kết.
export const SYNC_KEY_STORAGE = 'vn_stock_sync_key'
export const DEFAULT_SYNC_KEY = 'default_user'

export const getSyncKey = () => {
  try {
    const key = localStorage.getItem(SYNC_KEY_STORAGE)
    if (key && key.trim()) {
      return key.trim()
    }
    return DEFAULT_SYNC_KEY
  } catch (err) {
    console.warn('[Supabase] Không thể truy cập localStorage để lấy Sync Key:', err)
    return DEFAULT_SYNC_KEY
  }
}

export const setSyncKey = (newKey) => {
  try {
    const trimmed = (newKey || '').trim()
    if (!trimmed || trimmed === DEFAULT_SYNC_KEY) {
      localStorage.setItem(SYNC_KEY_STORAGE, DEFAULT_SYNC_KEY)
    } else {
      localStorage.setItem(SYNC_KEY_STORAGE, trimmed)
    }
    return getSyncKey()
  } catch (err) {
    console.warn('[Supabase] Không thể lưu Sync Key vào localStorage:', err)
    return DEFAULT_SYNC_KEY
  }
}

export const getDeviceId = () => {
  return getSyncKey()
}
