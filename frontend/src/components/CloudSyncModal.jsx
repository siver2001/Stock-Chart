import React, { useState, useEffect } from 'react'
import {
  X,
  Cloud,
  Check,
  Copy,
  RefreshCw,
  Database,
  Smartphone,
  Monitor,
  ShieldCheck,
  AlertCircle,
  Key,
} from 'lucide-react'
import { isCloudEnabled, getSyncKey, setSyncKey, DEFAULT_SYNC_KEY } from '../lib/supabase'
import { syncWatchlistCloud, fetchWatchlistCloud, syncChartSettingsCloud, fetchChartSettingsCloud } from '../services/cloudStorage'

export default function CloudSyncModal({
  isOpen,
  onClose,
  activeSymbol,
  drawingsCount = 0,
  activeIndicatorsCount = 0,
  onForceSync,
}) {
  const [currentKey, setCurrentKey] = useState(getSyncKey())
  const [inputKey, setInputKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (isOpen) {
      const k = getSyncKey()
      setCurrentKey(k)
      setInputKey(k === DEFAULT_SYNC_KEY ? '' : k)
      setMessage(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const cloudActive = isCloudEnabled()

  // Sao chép mã đồng bộ vào Clipboard
  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(currentKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Áp dụng mã đồng bộ mới
  const handleApplyKey = (newKeyToApply) => {
    const target = (newKeyToApply !== undefined ? newKeyToApply : inputKey).trim()
    const finalKey = target || DEFAULT_SYNC_KEY
    setSyncKey(finalKey)
    setCurrentKey(finalKey)

    setMessage({
      type: 'success',
      text: `Đã đổi sang mã "${finalKey}". Đang tải dữ liệu từ đám mây...`,
    })

    // Thông báo cho Watchlist & Chỉ báo tải lại từ Cloud
    window.dispatchEvent(new Event('vn_stock_reload_cloud_watchlist'))
    window.dispatchEvent(new Event('vn_stock_reload_cloud_indicators'))
    if (onForceSync) onForceSync()

    setTimeout(() => {
      setMessage({
        type: 'success',
        text: `Đã kết nối thành công với không gian "${finalKey}"!`,
      })
    }, 800)
  }

  // Khôi phục về mã mặc định
  const handleResetDefault = () => {
    handleApplyKey(DEFAULT_SYNC_KEY)
    setInputKey('')
  }

  // Ép đồng bộ hai chiều ngay lập tức
  const handleTriggerSync = async () => {
    setSyncing(true)
    setMessage(null)
    try {
      // 1. Đồng bộ Watchlist
      let localWatchlist = []
      let localFlags = {}
      try {
        const rawW = localStorage.getItem('vn_stock_watchlist')
        if (rawW) localWatchlist = JSON.parse(rawW)
        const rawF = localStorage.getItem('vn_stock_flags')
        if (rawF) localFlags = JSON.parse(rawF)
      } catch {}

      if (localWatchlist.length > 0) {
        await syncWatchlistCloud(localWatchlist, localFlags)
      }

      // 2. Đồng bộ Chỉ báo
      let localInds = []
      let localHidden = []
      let localParams = {}
      try {
        const rawI = localStorage.getItem('vn_active_indicators')
        if (rawI) localInds = JSON.parse(rawI)
        const rawH = localStorage.getItem('vn_hidden_indicators')
        if (rawH) localHidden = JSON.parse(rawH)
        const rawP = localStorage.getItem('vn_indicator_calc_params')
        if (rawP) localParams = JSON.parse(rawP)
      } catch {}

      if (localInds.length > 0) {
        await syncChartSettingsCloud({
          activeIndicators: localInds,
          hiddenIndicators: localHidden,
          indicatorParams: localParams,
        })
      }

      // 3. Tải lại mới nhất
      window.dispatchEvent(new Event('vn_stock_reload_cloud_watchlist'))
      window.dispatchEvent(new Event('vn_stock_reload_cloud_indicators'))
      if (onForceSync) onForceSync()

      setMessage({
        type: 'success',
        text: 'Đã hoàn tất đồng bộ 2 chiều với Supabase Cloud!',
      })
    } catch (err) {
      setMessage({
        type: 'error',
        text: `Đồng bộ thất bại: ${err.message || 'Lỗi mạng'}`,
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="tv-modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="tv-settings-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', width: '92%' }}
      >
        {/* Header */}
        <div className="tv-settings-header" style={{ padding: '16px 20px', borderBottom: '1px solid #2a2e39' }}>
          <div className="tv-settings-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(41, 98, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2962ff',
            }}>
              <Cloud size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#e0e3eb' }}>
                Đồng bộ Đa thiết bị (Cloud Sync)
              </div>
              <div style={{ fontSize: '11px', color: '#787b86', marginTop: '2px' }}>
                Lưu trữ đám mây Supabase PostgreSQL • Tự động đồng bộ 100%
              </div>
            </div>
          </div>
          <button className="tv-modal-close-btn" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="tv-settings-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto' }}>
          
          {/* Thông báo Alert nếu có */}
          {message && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: message.type === 'success' ? 'rgba(8, 153, 129, 0.15)' : 'rgba(242, 54, 69, 0.15)',
              border: `1px solid ${message.type === 'success' ? '#089981' : '#f23645'}`,
              color: message.type === 'success' ? '#089981' : '#f23645',
            }}>
              {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Card 1: Trạng thái kết nối Cloud */}
          <div style={{
            background: '#1e222d',
            border: '1px solid #2a2e39',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: cloudActive ? '#089981' : '#787b86',
                boxShadow: cloudActive ? '0 0 8px #089981' : 'none',
              }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#d1d4dc' }}>
                  {cloudActive ? 'Đã kết nối Supabase Cloud' : 'Chưa bật Cloud Sync'}
                </div>
                <div style={{ fontSize: '11px', color: '#787b86', marginTop: '2px' }}>
                  Máy chủ: Singapore (ap-southeast-1) • Độ trễ ~25ms
                </div>
              </div>
            </div>
            <button
              onClick={handleTriggerSync}
              disabled={syncing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#2962ff',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: syncing ? 'not-allowed' : 'pointer',
                opacity: syncing ? 0.7 : 1,
              }}
              title="Đồng bộ ngay lập tức"
            >
              <RefreshCw size={13} className={syncing ? 'tv-cloud-pulse' : ''} />
              <span>{syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}</span>
            </button>
          </div>

          {/* Card 2: Mã không gian đồng bộ hiện tại */}
          <div style={{
            background: '#1e222d',
            border: '1px solid #2a2e39',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#848e9c' }}>
                <Key size={14} color="#f59e0b" />
                MÃ ĐỒNG BỘ HIỆN TẠI (SYNC KEY)
              </div>
              {currentKey === DEFAULT_SYNC_KEY && (
                <span style={{
                  fontSize: '10px',
                  background: 'rgba(41, 98, 255, 0.2)',
                  color: '#2962ff',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: '600',
                }}>
                  MẶC ĐỊNH CHIA SẺ
                </span>
              )}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#131722',
              border: '1px solid #2a2e39',
              borderRadius: '6px',
              padding: '8px 12px',
            }}>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#2962ff',
                fontWeight: '600',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {currentKey}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: copied ? '#089981' : '#2a2e39',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>

            <div style={{ fontSize: '11px', color: '#787b86', marginTop: '10px', lineHeight: '1.5' }}>
              💡 <strong>Cách đồng bộ sang máy khác:</strong> Mọi máy tính hoặc điện thoại mở trang web này đều mặc định kết nối với <code>default_user</code>. Nếu bạn muốn dùng mã riêng, hãy copy mã ở trên và dán vào máy tính khác để đồng bộ cùng 1 không gian làm việc.
            </div>
          </div>

          {/* Card 3: Nhập mã để chuyển đổi không gian làm việc */}
          <div style={{
            background: '#1e222d',
            border: '1px solid #2a2e39',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#848e9c', marginBottom: '8px' }}>
              LIÊN KẾT MÃ TỪ MÁY KHÁC (HOẶC TẠO MÃ RIÊNG)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Nhập mã đồng bộ, VD: user_longnh_vip"
                style={{
                  flex: 1,
                  background: '#131722',
                  border: '1px solid #2a2e39',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#d1d4dc',
                  fontSize: '13px',
                  outline: 'none',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyKey()
                }}
              />
              <button
                onClick={() => handleApplyKey()}
                style={{
                  background: '#089981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Áp dụng
              </button>
            </div>

            {currentKey !== DEFAULT_SYNC_KEY && (
              <div style={{ marginTop: '10px' }}>
                <button
                  onClick={handleResetDefault}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#2962ff',
                    fontSize: '11px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  ↺ Quay về mã mặc định ({DEFAULT_SYNC_KEY})
                </button>
              </div>
            )}
          </div>

          {/* Card 4: Minh họa thiết bị đồng bộ */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '10px',
            marginTop: '4px',
          }}>
            <div style={{
              background: '#181b24',
              borderRadius: '6px',
              padding: '10px',
              textAlign: 'center',
              border: '1px solid #242832',
            }}>
              <Monitor size={18} color="#2962ff" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#d1d4dc' }}>Máy tính bàn</div>
              <div style={{ fontSize: '10px', color: '#787b86' }}>Tự động đồng bộ</div>
            </div>
            <div style={{
              background: '#181b24',
              borderRadius: '6px',
              padding: '10px',
              textAlign: 'center',
              border: '1px solid #242832',
            }}>
              <Monitor size={18} color="#089981" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#d1d4dc' }}>Laptop cá nhân</div>
              <div style={{ fontSize: '10px', color: '#787b86' }}>Tự động đồng bộ</div>
            </div>
            <div style={{
              background: '#181b24',
              borderRadius: '6px',
              padding: '10px',
              textAlign: 'center',
              border: '1px solid #242832',
            }}>
              <Smartphone size={18} color="#f59e0b" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#d1d4dc' }}>Điện thoại / iPad</div>
              <div style={{ fontSize: '10px', color: '#787b86' }}>Tự động đồng bộ</div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #2a2e39',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#1e222d',
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#2a2e39',
              color: '#d1d4dc',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 18px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  )
}
