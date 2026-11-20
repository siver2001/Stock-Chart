import React, { useState, useEffect } from 'react'
import { Clock, Radio, Activity } from 'lucide-react'

export function getVietnamMarketSession(date = new Date()) {
  const day = date.getDay() // 0 = Sunday, 6 = Saturday
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const totalMinutes = hours * 60 + minutes

  if (day === 0 || day === 6) {
    return {
      isOpen: false,
      statusText: 'Thị trường đóng cửa (Cuối tuần)',
      badgeClass: 'closed',
      badgeColor: '#f23645',
    }
  }

  // 09:00 - 09:15 (540 - 555 min): ATO
  if (totalMinutes >= 540 && totalMinutes < 555) {
    return {
      isOpen: true,
      statusText: 'Đang mở cửa • Khớp lệnh ATO',
      badgeClass: 'ato',
      badgeColor: '#e3b341',
    }
  }

  // 09:15 - 11:30 (555 - 690 min): Continuous Morning
  if (totalMinutes >= 555 && totalMinutes < 690) {
    return {
      isOpen: true,
      statusText: 'Đang giao dịch liên tục',
      badgeClass: 'open',
      badgeColor: '#089981',
    }
  }

  // 11:30 - 13:00 (690 - 780 min): Lunch break
  if (totalMinutes >= 690 && totalMinutes < 780) {
    return {
      isOpen: false,
      statusText: 'Nghỉ trưa (Mở lại lúc 13:00)',
      badgeClass: 'break',
      badgeColor: '#e3b341',
    }
  }

  // 13:00 - 14:30 (780 - 870 min): Continuous Afternoon
  if (totalMinutes >= 780 && totalMinutes < 870) {
    return {
      isOpen: true,
      statusText: 'Đang giao dịch liên tục',
      badgeClass: 'open',
      badgeColor: '#089981',
    }
  }

  // 14:30 - 14:45 (870 - 885 min): ATC
  if (totalMinutes >= 870 && totalMinutes < 885) {
    return {
      isOpen: true,
      statusText: 'Phiên đóng cửa • Khớp lệnh ATC',
      badgeClass: 'atc',
      badgeColor: '#e3b341',
    }
  }

  // 14:45 - 15:00 (885 - 900 min): Put-through
  if (totalMinutes >= 885 && totalMinutes < 900) {
    return {
      isOpen: false,
      statusText: 'Giao dịch thỏa thuận',
      badgeClass: 'break',
      badgeColor: '#b2b5be',
    }
  }

  // After 15:00 or before 09:00: Closed
  return {
    isOpen: false,
    statusText: 'Thị trường đóng cửa',
    badgeClass: 'closed',
    badgeColor: '#f23645',
  }
}

export default function RealtimeMarketBar({ activeSymbol, activePeriod, latestBar }) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const pad = (n) => String(n).padStart(2, '0')
  const timeStr = `${pad(currentTime.getHours())}:${pad(currentTime.getMinutes())}:${pad(currentTime.getSeconds())}`
  const dateStr = `${pad(currentTime.getDate())}/${pad(currentTime.getMonth() + 1)}/${currentTime.getFullYear()}`

  const session = getVietnamMarketSession(currentTime)

  // Format running bar timestamp
  let barTimeStr = '--:--:--'
  let barDateStr = '--/--/----'
  if (latestBar && latestBar.timestamp) {
    const bDate = new Date(latestBar.timestamp)
    barTimeStr = `${pad(bDate.getHours())}:${pad(bDate.getMinutes())}:${pad(bDate.getSeconds())}`
    barDateStr = `${pad(bDate.getDate())}/${pad(bDate.getMonth() + 1)}/${bDate.getFullYear()}`
  }

  const isIndex = ['VNINDEX', 'VN30', 'HNXINDEX', 'HNX30', 'UPCOMINDEX'].includes(activeSymbol)
  const formatPrice = (val) => {
    if (val == null) return '--'
    return new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: isIndex ? 2 : 0,
      maximumFractionDigits: isIndex ? 2 : 0,
    }).format(val)
  }

  const refPrice = latestBar?.ref_price || latestBar?.open || 0
  const priceDiff = latestBar && refPrice ? latestBar.close - refPrice : 0
  const pctDiff = latestBar && refPrice ? (priceDiff / refPrice) * 100 : 0
  const isUp = priceDiff >= 0

  return (
    <div className="tv-realtime-market-bar">
      {/* Left: Market session status & Pulse */}
      <div className="tv-rt-session">
        <span
          className="tv-rt-dot"
          style={{
            backgroundColor: session.badgeColor,
            boxShadow: session.isOpen ? `0 0 8px ${session.badgeColor}` : 'none',
          }}
        />
        <span className="tv-rt-session-text" style={{ color: session.badgeColor }}>
          {session.statusText}
        </span>
      </div>

      <div className="tv-rt-divider" />

      {/* Center Left: Live Bar Timestamp (Giờ phút giây của nến đang chạy) */}
      {latestBar && (
        <div className="tv-rt-bar-timestamp" title={`Mốc thời gian của nến ${activeSymbol} (${activePeriod.text})`}>
          <span className="tv-rt-label">Mốc nến:</span>
          <b className="tv-rt-val">{barTimeStr}</b>
          <span className="tv-rt-dim">{barDateStr}</span>
        </div>
      )}

      {latestBar && <div className="tv-rt-divider" />}

      {/* Center: Running Price & % */}
      {latestBar && (
        <div className="tv-rt-price-box">
          <span className="tv-rt-label">Giá khớp:</span>
          <b className={`tv-rt-price ${isUp ? 'up' : 'down'}`}>
            {formatPrice(latestBar.close)}
          </b>
          <span className={`tv-rt-change ${isUp ? 'up' : 'down'}`}>
            {isUp ? '+' : ''}
            {pctDiff.toFixed(2)}%
          </span>
        </div>
      )}

      <div className="tv-rt-divider" />

      {/* Right: Live Market Clock (Giờ, phút, giây hiện tại của thị trường) */}
      <div className="tv-rt-clock" title="Thời gian thực TTCK Việt Nam (UTC+7)">
        <Clock size={13} className="tv-rt-clock-icon" />
        <b className="tv-rt-clock-time">{timeStr}</b>
        <span className="tv-rt-dim">(UTC+7)</span>
      </div>

      <div className="tv-rt-divider" />

      {/* Data Source Badge */}
      <div className="tv-rt-source" title="Dữ liệu giá khớp lệnh trực tiếp từ VNDIRECT DChart">
        <Radio size={11} color="#089981" />
        <span>VNDIRECT Live</span>
      </div>
    </div>
  )
}
