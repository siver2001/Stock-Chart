/**
 * Volume Profile (Volume by Price) Indicator
 * Xác định các vùng volume gom hàng, kháng cự / hỗ trợ theo bước giá
 * 
 * - Chia khung nhìn thành 30 - 50 vùng giá (Price Buckets)
 * - Tính tổng volume Mua (Xanh) và volume Bán (Đỏ) tại từng mức giá
 * - Tự động phát hiện:
 *   * POC (Point of Control): Vùng giá tập trung khối lượng giao dịch khủng nhất
 *   * VAH (Value Area High): Biên trên vùng giá trị (chiếm 70% volume)
 *   * VAL (Value Area Low): Biên dưới vùng giá trị (chiếm 70% volume)
 * - Vẽ biểu đồ ngang tinh gọn bám sát mép phải đồ thị nến
 */

export const volumeProfileIndicator = {
  name: 'VOLUME_PROFILE',
  shortName: 'Volume Profile',
  series: 'price',
  calcParams: [36, 70], // [Số lượng bước giá (rows), Tỷ lệ Value Area % (mặc định 70%)]
  figures: [],
  precision: 0,
  shouldOhlc: true,

  calc: (dataList) => {
    return dataList.map((d) => ({
      close: d.close,
      high: d.high,
      low: d.low,
      volume: d.volume || 0,
    }))
  },

  createTooltipDataSource: ({ indicator }) => {
    const meta = indicator.profileMeta || {}
    const poc = meta.pocPrice ? Number(meta.pocPrice).toLocaleString('vi-VN') : '--'
    const vah = meta.vahPrice ? Number(meta.vahPrice).toLocaleString('vi-VN') : '--'
    const val = meta.valPrice ? Number(meta.valPrice).toLocaleString('vi-VN') : '--'

    return {
      name: 'Volume Profile (Kháng cự/Hỗ trợ)',
      calcParamsText: '',
      icons: [],
      values: [
        {
          title: 'POC (Kháng cự/HT mạnh): ',
          value: { text: poc, color: '#f59e0b' },
        },
        {
          title: 'VAH (Biên trên 70%): ',
          value: { text: vah, color: '#3b82f6' },
        },
        {
          title: 'VAL (Biên dưới 70%): ',
          value: { text: val, color: '#3b82f6' },
        },
      ],
    }
  },

  draw: ({ ctx, kLineDataList, visibleRange, bounding, yAxis }) => {
    if (!kLineDataList || kLineDataList.length === 0) return true

    const { from, to } = visibleRange
    const { width, height, left, top } = bounding
    const startIdx = Math.max(0, from)
    const endIdx = Math.min(kLineDataList.length, to)
    if (startIdx >= endIdx) return true

    // 1. Tìm giá cao nhất và thấp nhất trong vùng nhìn
    let minPrice = Infinity
    let maxPrice = -Infinity
    let totalVol = 0

    for (let i = startIdx; i < endIdx; i++) {
      const bar = kLineDataList[i]
      if (bar.low < minPrice) minPrice = bar.low
      if (bar.high > maxPrice) maxPrice = bar.high
      totalVol += bar.volume || 0
    }

    if (minPrice >= maxPrice || totalVol <= 0) return true

    // 2. Chia các phân vùng giá (Buckets)
    const rowCount = 36
    const step = (maxPrice - minPrice) / rowCount
    const buckets = Array.from({ length: rowCount }, (_, idx) => ({
      low: minPrice + idx * step,
      high: minPrice + (idx + 1) * step,
      mid: minPrice + (idx + 0.5) * step,
      buyVol: 0,
      sellVol: 0,
      totalVol: 0,
    }))

    // 3. Phân bổ Volume vào các bucket
    for (let i = startIdx; i < endIdx; i++) {
      const bar = kLineDataList[i]
      const vol = bar.volume || 0
      const isBuy = bar.close >= bar.open
      const barMid = (bar.high + bar.low) / 2
      const bucketIdx = Math.min(rowCount - 1, Math.max(0, Math.floor((barMid - minPrice) / step)))

      if (isBuy) {
        buckets[bucketIdx].buyVol += vol
      } else {
        buckets[bucketIdx].sellVol += vol
      }
      buckets[bucketIdx].totalVol += vol
    }

    // 4. Tìm POC (Point of Control)
    let maxBucketVol = 0
    let pocIdx = 0
    buckets.forEach((b, idx) => {
      if (b.totalVol > maxBucketVol) {
        maxBucketVol = b.totalVol
        pocIdx = idx
      }
    })
    const pocPrice = buckets[pocIdx].mid

    // 5. Tính Value Area (70% Volume xung quanh POC)
    const targetVol = totalVol * 0.70
    let curVaVol = buckets[pocIdx].totalVol
    let vaLowIdx = pocIdx
    let vaHighIdx = pocIdx

    while (curVaVol < targetVol && (vaLowIdx > 0 || vaHighIdx < rowCount - 1)) {
      const nextLowVol = vaLowIdx > 0 ? buckets[vaLowIdx - 1].totalVol : -1
      const nextHighVol = vaHighIdx < rowCount - 1 ? buckets[vaHighIdx + 1].totalVol : -1

      if (nextHighVol >= nextLowVol && nextHighVol > -1) {
        vaHighIdx++
        curVaVol += buckets[vaHighIdx].totalVol
      } else if (nextLowVol > -1) {
        vaLowIdx--
        curVaVol += buckets[vaLowIdx].totalVol
      } else {
        break
      }
    }

    const vahPrice = buckets[vaHighIdx].high
    const valPrice = buckets[vaLowIdx].low

    // 6. Vẽ các thanh ngang Volume Profile ở mép phải biểu đồ (chiếm tối đa 22% chiều rộng)
    ctx.save()
    const maxBarWidth = width * 0.22
    const rightEdge = left + width

    buckets.forEach((b, idx) => {
      if (b.totalVol <= 0) return

      const yTop = yAxis.convertToPixel(b.high)
      const yBottom = yAxis.convertToPixel(b.low)
      const barHeight = Math.max(1.5, Math.abs(yBottom - yTop) - 0.5)
      const barY = Math.min(yTop, yBottom)

      const totalBarW = (b.totalVol / maxBucketVol) * maxBarWidth
      const buyW = (b.buyVol / b.totalVol) * totalBarW
      const sellW = totalBarW - buyW

      const isInsideVA = idx >= vaLowIdx && idx <= vaHighIdx

      // Vẽ phần Bán (Đỏ)
      ctx.fillStyle = isInsideVA ? 'rgba(239, 83, 80, 0.55)' : 'rgba(239, 83, 80, 0.25)'
      ctx.fillRect(rightEdge - totalBarW, barY, sellW, barHeight)

      // Vẽ phần Mua (Xanh)
      ctx.fillStyle = isInsideVA ? 'rgba(38, 166, 154, 0.65)' : 'rgba(38, 166, 154, 0.30)'
      ctx.fillRect(rightEdge - totalBarW + sellW, barY, buyW, barHeight)
    })

    // 7. Vẽ đường kẻ POC (Đường hỗ trợ/kháng cự đỏ vàng nổi bật)
    const pocY = yAxis.convertToPixel(pocPrice)
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(left, pocY)
    ctx.lineTo(rightEdge, pocY)
    ctx.stroke()

    // Vẽ nhãn POC
    ctx.setLineDash([])
    ctx.fillStyle = '#f59e0b'
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`POC: ${Number(pocPrice).toLocaleString('vi-VN')}`, rightEdge - maxBarWidth - 8, pocY + 3)

    // 8. Vẽ đường VAH & VAL (Khung 70% Giá trị)
    const vahY = yAxis.convertToPixel(vahPrice)
    const valY = yAxis.convertToPixel(valPrice)
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])

    ctx.beginPath()
    ctx.moveTo(rightEdge - maxBarWidth, vahY)
    ctx.lineTo(rightEdge, vahY)
    ctx.moveTo(rightEdge - maxBarWidth, valY)
    ctx.lineTo(rightEdge, valY)
    ctx.stroke()

    ctx.restore()
    return true
  },
}
