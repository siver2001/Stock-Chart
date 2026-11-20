/**
 * Volume Overlay Indicator (TradingView Style)
 * 
 * 1. Volume hiển thị dạng cột ở chân biểu đồ nến (tối đa 18% chiều cao).
 * 2. Cột volume có độ rộng ĐỒNG NHẤT 100% với thân nến ở trên (khắc phục lỗi lúc to lúc nhỏ).
 * 3. Tọa độ được snap nguyên pixel (Math.round) tránh răng cưa / mờ nét subpixel.
 * 4. KHÔNG đưa giá trị volume vào trục Y bên phải để tránh làm bẹp nến giá cổ phiếu.
 * 5. Trục Y bên phải hoàn toàn giữ nguyên 100% bước giá của nến.
 * 6. KHÔNG vẽ các đường MA trên volume (MA là dành riêng cho biểu đồ nến giá).
 * 7. Khi di chuột (hover/crosshair), hiển thị số lượng cổ phiếu giao dịch (CP)
 *    cả trên thanh thông tin (Tooltip/Legend) và hiển thị pill tooltip ngay trên cột volume.
 */

export const volumeOverlayConfig = {
  maxHeightRatio: 0.18,
  opacity: 0.70,
}

export const volumeOverlayIndicator = {
  name: 'VOL',
  shortName: 'Vol',
  series: 'price',
  calcParams: [],
  figures: [],
  precision: 0,
  shouldFormatBigNumber: true,
  minValue: null,
  maxValue: null,

  calc: (dataList) => {
    return dataList.map((bar) => ({
      volume: bar.volume || 0,
      open: bar.open,
      close: bar.close,
      high: bar.high,
      low: bar.low,
    }))
  },

  createTooltipDataSource: ({ kLineDataList, crosshair }) => {
    let vol = 0
    let isUp = true

    if (
      crosshair &&
      crosshair.dataIndex !== undefined &&
      crosshair.dataIndex >= 0 &&
      crosshair.dataIndex < kLineDataList.length
    ) {
      const bar = kLineDataList[crosshair.dataIndex]
      vol = bar?.volume || 0
      isUp = (bar?.close || 0) >= (bar?.open || 0)
    } else if (kLineDataList && kLineDataList.length > 0) {
      const lastBar = kLineDataList[kLineDataList.length - 1]
      vol = lastBar?.volume || 0
      isUp = (lastBar?.close || 0) >= (lastBar?.open || 0)
    }

    const formatVol = (v) => {
      if (!v && v !== 0) return '0 CP'
      const numStr = Number(v).toLocaleString('vi-VN')
      let shortStr = ''
      if (v >= 1e9) shortStr = ` (${(v / 1e9).toFixed(2)}B)`
      else if (v >= 1e6) shortStr = ` (${(v / 1e6).toFixed(2)}M)`
      else if (v >= 1e3) shortStr = ` (${(v / 1e3).toFixed(1)}K)`
      return `${numStr} CP${shortStr}`
    }

    return {
      name: 'Vol',
      calcParamsText: '',
      icons: [],
      values: [
        {
          title: 'Khối lượng: ',
          value: {
            text: formatVol(vol),
            color: isUp ? '#089981' : '#f23645',
          },
        },
      ],
    }
  },

  draw: ({ ctx, kLineDataList, visibleRange, bounding, barSpace, xAxis, crosshair }) => {
    if (!kLineDataList || kLineDataList.length === 0) return true

    const { from, to } = visibleRange
    const { width, height, left, top } = bounding

    // Tối đa 18% chiều cao của khung nến, nằm sát mép dưới
    const maxBarHeight = height * volumeOverlayConfig.maxHeightRatio
    const bottomY = top + height

    // Tìm volume lớn nhất trong vùng đang hiển thị trên màn hình
    let maxVol = 0
    const startIdx = Math.max(0, from)
    const endIdx = Math.min(kLineDataList.length, to)

    for (let i = startIdx; i < endIdx; i++) {
      const v = kLineDataList[i]?.volume || 0
      if (v > maxVol) maxVol = v
    }

    if (maxVol <= 0) return true

    ctx.save()

    // Lấy kích thước chuẩn xác từ barSpace giống hệt CandleBarView trong KlineCharts
    const halfGapBar = barSpace?.halfGapBar || 1
    const rawWidth = barSpace?.gapBar || (halfGapBar * 2)
    // Đồng nhất kích thước độ rộng cột cho toàn bộ nến trên màn hình
    const barWidth = Math.max(1, Math.round(rawWidth))

    const hoveredIdx = crosshair?.dataIndex
    let hoveredBarInfo = null

    for (let i = startIdx; i < endIdx; i++) {
      const b = kLineDataList[i]
      if (!b || !b.volume) continue

      const x = xAxis.convertToPixel(i)
      const barH = Math.max(1, Math.round((b.volume / maxVol) * maxBarHeight))
      const y = Math.round(bottomY - barH)
      // Snap theo trục pixel nguyên để không bị hiện tượng 1 cột dày 1 cột mỏng
      const startX = Math.round(x - halfGapBar)
      const isUp = b.close >= b.open

      const isHovered = hoveredIdx === i

      if (isHovered) {
        // Cột đang được hover: màu sáng rõ
        ctx.fillStyle = isUp ? '#089981' : '#f23645'
        hoveredBarInfo = { x, y, barH, vol: b.volume, isUp }
      } else {
        // Cột bình thường: màu đều đặn sắc nét
        ctx.fillStyle = isUp
          ? `rgba(8, 153, 129, ${volumeOverlayConfig.opacity})`
          : `rgba(242, 54, 69, ${volumeOverlayConfig.opacity})`
      }

      ctx.fillRect(startX, y, barWidth, barH)
    }

    // Nếu đang hover vào 1 cây nến/volume, vẽ một pill hiển thị số lượng CP nhỏ gọn ở đỉnh cột volume
    if (hoveredBarInfo) {
      const { x, y, vol, isUp } = hoveredBarInfo
      const volText = Number(vol).toLocaleString('vi-VN') + ' CP'

      ctx.font = 'bold 10px Inter, -apple-system, sans-serif'
      const textWidth = ctx.measureText(volText).width
      const padX = 6
      const padY = 2.5
      const badgeW = textWidth + padX * 2
      const badgeH = 18

      // Đặt badge ngay trên đầu cột volume
      let badgeX = x - badgeW / 2
      let badgeY = Math.max(top + 4, y - badgeH - 3)

      // Giữ trong màn hình
      if (badgeX < left + 4) badgeX = left + 4
      if (badgeX + badgeW > left + width - 4) badgeX = left + width - 4 - badgeW

      // Vẽ nền pill badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)'
      ctx.strokeStyle = isUp ? '#089981' : '#f23645'
      ctx.lineWidth = 1

      ctx.beginPath()
      if (ctx.roundRect) {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4)
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH)
      }
      ctx.fill()
      ctx.stroke()

      // Vẽ text
      ctx.fillStyle = isUp ? '#10b981' : '#f87171'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(volText, badgeX + badgeW / 2, badgeY + badgeH / 2)
    }

    ctx.restore()
    return true
  },
}
