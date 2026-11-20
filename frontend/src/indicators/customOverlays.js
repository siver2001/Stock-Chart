import { registerOverlay } from 'klinecharts'

let registered = false

const formatNum = (v) =>
  v != null
    ? new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(v)
    : '--'

export function registerCustomOverlays() {
  if (registered) return

  // 1. Rectangle (Hộp Darvas / Vùng giá tích lũy)
  registerOverlay({
    name: 'rect',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 1) {
        return [
          {
            type: 'polygon',
            attrs: {
              coordinates: [
                coordinates[0],
                { x: coordinates[1].x, y: coordinates[0].y },
                coordinates[1],
                { x: coordinates[0].x, y: coordinates[1].y },
              ],
            },
            styles: {
              style: 'stroke_fill',
              color: 'rgba(41, 98, 255, 0.18)',
              borderColor: '#2962ff',
              borderSize: 1.5,
            },
          },
        ]
      }
      return []
    },
  })

  // 2. Circle (Vòng tròn)
  registerOverlay({
    name: 'circle',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 1) {
        const radius = Math.sqrt(
          Math.pow(coordinates[0].x - coordinates[1].x, 2) +
          Math.pow(coordinates[0].y - coordinates[1].y, 2)
        )
        return [
          {
            type: 'circle',
            attrs: {
              ...coordinates[0],
              r: radius,
            },
            styles: {
              style: 'stroke_fill',
              color: 'rgba(235, 168, 52, 0.15)',
              borderColor: '#e3b341',
              borderSize: 1.5,
            },
          },
        ]
      }
      return []
    },
  })

  // 3. Triangle (Mô hình tam giác)
  registerOverlay({
    name: 'triangle',
    totalStep: 4,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 2) {
        return [
          {
            type: 'polygon',
            attrs: {
              coordinates: [coordinates[0], coordinates[1], coordinates[2]],
            },
            styles: {
              style: 'stroke_fill',
              color: 'rgba(163, 113, 247, 0.18)',
              borderColor: '#a371f7',
              borderSize: 1.5,
            },
          },
        ]
      }
      return []
    },
  })

  // 4. Arrow (Mũi tên chỉ hướng)
  registerOverlay({
    name: 'arrow',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 1) {
        const start = coordinates[0]
        const end = coordinates[1]
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        const arrowLength = 12
        const arrowAngle = Math.PI / 6

        const arrowPoint1 = {
          x: end.x - arrowLength * Math.cos(angle - arrowAngle),
          y: end.y - arrowLength * Math.sin(angle - arrowAngle),
        }
        const arrowPoint2 = {
          x: end.x - arrowLength * Math.cos(angle + arrowAngle),
          y: end.y - arrowLength * Math.sin(angle + arrowAngle),
        }

        return [
          {
            type: 'line',
            attrs: { coordinates: [start, end] },
            styles: { color: '#089981', size: 2 },
          },
          {
            type: 'polygon',
            attrs: { coordinates: [end, arrowPoint1, arrowPoint2] },
            styles: { style: 'fill', color: '#089981' },
          },
        ]
      }
      return []
    },
  })

  // 5. Price Range / Measure Ruler (Thước đo khoảng giá & % & số nến)
  registerOverlay({
    name: 'priceRange',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length > 1) {
        const p1 = overlay.points?.[0]
        const p2 = overlay.points?.[1]
        let diffPct = 0
        let diffVal = 0
        let barsCount = 0
        if (p1 && p2 && p1.value) {
          diffVal = p2.value - p1.value
          diffPct = (diffVal / p1.value) * 100
          if (p1.dataIndex != null && p2.dataIndex != null) {
            barsCount = Math.abs(p2.dataIndex - p1.dataIndex)
          }
        }
        const isUp = diffVal >= 0
        const color = isUp ? '#089981' : '#f23645'
        const sign = isUp ? '+' : ''
        const textVal = `${sign}${formatNum(diffVal)} (${sign}${diffPct.toFixed(2)}%)`
        const textBars = barsCount > 0 ? `${barsCount} nến` : ''
        const fullText = textBars ? `${textVal} • ${textBars}` : textVal

        const midY = (coordinates[0].y + coordinates[1].y) / 2
        const midX = (coordinates[0].x + coordinates[1].x) / 2

        return [
          {
            type: 'polygon',
            attrs: {
              coordinates: [
                coordinates[0],
                { x: coordinates[1].x, y: coordinates[0].y },
                coordinates[1],
                { x: coordinates[0].x, y: coordinates[1].y },
              ],
            },
            styles: {
              style: 'stroke_fill',
              color: isUp ? 'rgba(8, 153, 129, 0.16)' : 'rgba(242, 54, 69, 0.16)',
              borderColor: color,
              borderSize: 1.5,
              borderStyle: 'dashed',
            },
          },
          {
            type: 'line',
            attrs: { coordinates: [coordinates[0], coordinates[1]] },
            styles: {
              color,
              size: 1.5,
              style: 'dashed',
              dashedValue: [3, 3],
            },
          },
          {
            type: 'text',
            attrs: {
              x: midX,
              y: midY,
              text: fullText,
              align: 'center',
              baseline: 'middle',
            },
            styles: {
              color: '#ffffff',
              backgroundColor: color,
              paddingLeft: 8,
              paddingRight: 8,
              paddingTop: 4,
              paddingBottom: 4,
              borderRadius: 4,
              size: 11,
              weight: 'bold',
            },
          },
        ]
      }
      return []
    },
  })

  // 6. Long Position (Vị thế Mua: Mục tiêu Lời / Cắt Lỗ / Tỷ lệ R:R)
  registerOverlay({
    name: 'longPosition',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length > 1) {
        const c1 = coordinates[0]
        const c2 = coordinates[1]
        const p1 = overlay.points?.[0]
        const p2 = overlay.points?.[1]

        const entryVal = p1?.value || 0
        const targetVal = p2?.value || 0
        const diffVal = targetVal - entryVal
        const profit = Math.abs(diffVal)
        const profitPct = entryVal ? (profit / entryVal) * 100 : 0
        const risk = profit / 2 // Default R:R = 2.0
        const riskPct = entryVal ? (risk / entryVal) * 100 : 0
        const rr = '2.00'

        const leftX = Math.min(c1.x, c2.x)
        const rightX = Math.max(c1.x, c2.x)
        const width = Math.max(rightX - leftX, 120)
        const entryY = c1.y
        const targetY = c2.y
        const heightTarget = Math.abs(targetY - entryY)
        const topY = Math.min(entryY, targetY)
        const bottomY = entryY + (heightTarget > 0 ? heightTarget / 2 : 40)

        return [
          // Target Green Box (Chốt Lời)
          {
            type: 'polygon',
            attrs: {
              coordinates: [
                { x: leftX, y: topY },
                { x: leftX + width, y: topY },
                { x: leftX + width, y: entryY },
                { x: leftX, y: entryY },
              ],
            },
            styles: {
              style: 'stroke_fill',
              color: 'rgba(8, 153, 129, 0.22)',
              borderColor: '#089981',
              borderSize: 1.5,
            },
          },
          // Risk Red Box (Cắt Lỗ)
          {
            type: 'polygon',
            attrs: {
              coordinates: [
                { x: leftX, y: entryY },
                { x: leftX + width, y: entryY },
                { x: leftX + width, y: bottomY },
                { x: leftX, y: bottomY },
              ],
            },
            styles: {
              style: 'stroke_fill',
              color: 'rgba(242, 54, 69, 0.22)',
              borderColor: '#f23645',
              borderSize: 1.5,
            },
          },
          // Entry Line
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x: leftX, y: entryY },
                { x: leftX + width, y: entryY },
              ],
            },
            styles: {
              color: '#ffffff',
              size: 2,
              style: 'dashed',
              dashedValue: [4, 4],
            },
          },
          // Text Target
          {
            type: 'text',
            attrs: {
              x: leftX + width / 2,
              y: topY + 12,
              text: `MỤC TIÊU: +${formatNum(profit)} (+${profitPct.toFixed(2)}%) | R:R: ${rr}`,
              align: 'center',
              baseline: 'middle',
            },
            styles: {
              color: '#ffffff',
              backgroundColor: '#089981',
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 3,
              paddingBottom: 3,
              borderRadius: 3,
              size: 11,
              weight: 'bold',
            },
          },
          // Text Stop Loss
          {
            type: 'text',
            attrs: {
              x: leftX + width / 2,
              y: bottomY - 12,
              text: `CẮT LỖ: -${formatNum(risk)} (-${riskPct.toFixed(2)}%)`,
              align: 'center',
              baseline: 'middle',
            },
            styles: {
              color: '#ffffff',
              backgroundColor: '#f23645',
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 3,
              paddingBottom: 3,
              borderRadius: 3,
              size: 11,
              weight: 'bold',
            },
          },
          // Text Entry
          {
            type: 'text',
            attrs: {
              x: leftX + 4,
              y: entryY - 10,
              text: `VÀO LỆNH: ${formatNum(entryVal)}`,
              align: 'left',
              baseline: 'middle',
            },
            styles: {
              color: '#ffffff',
              backgroundColor: '#1e222d',
              paddingLeft: 4,
              paddingRight: 4,
              paddingTop: 2,
              paddingBottom: 2,
              borderRadius: 2,
              size: 10,
              weight: '600',
            },
          },
        ]
      }
      return []
    },
  })

  // 7. Short Position (Vị thế Bán: Mục tiêu Lời / Cắt Lỗ / Tỷ lệ R:R)
  registerOverlay({
    name: 'shortPosition',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length > 1) {
        const c1 = coordinates[0]
        const c2 = coordinates[1]
        const p1 = overlay.points?.[0]
        const p2 = overlay.points?.[1]

        const entryVal = p1?.value || 0
        const targetVal = p2?.value || 0
        const diffVal = entryVal - targetVal
        const profit = Math.abs(diffVal)
        const profitPct = entryVal ? (profit / entryVal) * 100 : 0
        const risk = profit / 2
        const riskPct = entryVal ? (risk / entryVal) * 100 : 0
        const rr = '2.00'

        const leftX = Math.min(c1.x, c2.x)
        const rightX = Math.max(c1.x, c2.x)
        const width = Math.max(rightX - leftX, 120)
        const entryY = c1.y
        const targetY = c2.y
        const heightTarget = Math.abs(targetY - entryY)
        const bottomY = Math.max(entryY, targetY)
        const topY = entryY - (heightTarget > 0 ? heightTarget / 2 : 40)

        return [
          // Risk Red Box on Top (Cắt Lỗ khi giá tăng vượt ngưỡng)
          {
            type: 'polygon',
            attrs: {
              coordinates: [
                { x: leftX, y: topY },
                { x: leftX + width, y: topY },
                { x: leftX + width, y: entryY },
                { x: leftX, y: entryY },
              ],
            },
            styles: {
              style: 'stroke_fill',
              color: 'rgba(242, 54, 69, 0.22)',
              borderColor: '#f23645',
              borderSize: 1.5,
            },
          },
          // Target Green Box at Bottom (Chốt Lời khi giá giảm)
          {
            type: 'polygon',
            attrs: {
              coordinates: [
                { x: leftX, y: entryY },
                { x: leftX + width, y: entryY },
                { x: leftX + width, y: bottomY },
                { x: leftX, y: bottomY },
              ],
            },
            styles: {
              style: 'stroke_fill',
              color: 'rgba(8, 153, 129, 0.22)',
              borderColor: '#089981',
              borderSize: 1.5,
            },
          },
          // Entry Line
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x: leftX, y: entryY },
                { x: leftX + width, y: entryY },
              ],
            },
            styles: {
              color: '#ffffff',
              size: 2,
              style: 'dashed',
              dashedValue: [4, 4],
            },
          },
          // Text Stop Loss
          {
            type: 'text',
            attrs: {
              x: leftX + width / 2,
              y: topY + 12,
              text: `CẮT LỖ: -${formatNum(risk)} (-${riskPct.toFixed(2)}%)`,
              align: 'center',
              baseline: 'middle',
            },
            styles: {
              color: '#ffffff',
              backgroundColor: '#f23645',
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 3,
              paddingBottom: 3,
              borderRadius: 3,
              size: 11,
              weight: 'bold',
            },
          },
          // Text Target
          {
            type: 'text',
            attrs: {
              x: leftX + width / 2,
              y: bottomY - 12,
              text: `MỤC TIÊU: +${formatNum(profit)} (+${profitPct.toFixed(2)}%) | R:R: ${rr}`,
              align: 'center',
              baseline: 'middle',
            },
            styles: {
              color: '#ffffff',
              backgroundColor: '#089981',
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 3,
              paddingBottom: 3,
              borderRadius: 3,
              size: 11,
              weight: 'bold',
            },
          },
          // Text Entry
          {
            type: 'text',
            attrs: {
              x: leftX + 4,
              y: entryY - 10,
              text: `BÁN KHỐNG: ${formatNum(entryVal)}`,
              align: 'left',
              baseline: 'middle',
            },
            styles: {
              color: '#ffffff',
              backgroundColor: '#1e222d',
              paddingLeft: 4,
              paddingRight: 4,
              paddingTop: 2,
              paddingBottom: 2,
              borderRadius: 2,
              size: 10,
              weight: '600',
            },
          },
        ]
      }
      return []
    },
  })

  // 8. Horizontal Straight Line (Đường nằm ngang)
  registerOverlay({
    name: 'horizontalStraightLine',
    totalStep: 2,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, bounding }) => {
      if (coordinates.length > 0) {
        const y = coordinates[0].y
        return [
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x: 0, y },
                { x: bounding.width, y },
              ],
            },
            styles: {
              color: '#2962ff',
              size: 1.5,
              style: 'solid',
            },
          },
        ]
      }
      return []
    },
  })

  // 9. Horizontal Ray Line (Tia nằm ngang)
  registerOverlay({
    name: 'horizontalRayLine',
    totalStep: 2,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, bounding }) => {
      if (coordinates.length > 0) {
        const { x, y } = coordinates[0]
        return [
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x, y },
                { x: bounding.width, y },
              ],
            },
            styles: {
              color: '#f59e0b',
              size: 1.5,
              style: 'dashed',
              dashedValue: [4, 4],
            },
          },
        ]
      }
      return []
    },
  })

  // 10. Vertical Straight Line (Đường thẳng đứng)
  registerOverlay({
    name: 'verticalStraightLine',
    totalStep: 2,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, bounding }) => {
      if (coordinates.length > 0) {
        const { x } = coordinates[0]
        return [
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x, y: 0 },
                { x, y: bounding.height },
              ],
            },
            styles: {
              color: '#a855f7',
              size: 1.5,
              style: 'dashed',
              dashedValue: [4, 4],
            },
          },
        ]
      }
      return []
    },
  })

  // 11. Price Line (Đường mức giá)
  registerOverlay({
    name: 'priceLine',
    totalStep: 2,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, bounding, overlay }) => {
      if (coordinates.length > 0) {
        const { y } = coordinates[0]
        const val = overlay.points?.[0]?.value
        const label = val != null ? formatNum(val) : ''
        return [
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x: 0, y },
                { x: bounding.width, y },
              ],
            },
            styles: {
              color: '#e3b341',
              size: 1.5,
              style: 'solid',
            },
          },
          {
            type: 'text',
            attrs: {
              x: bounding.width - 60,
              y: y - 10,
              text: label,
              align: 'left',
              baseline: 'middle',
            },
            styles: {
              color: '#131722',
              backgroundColor: '#e3b341',
              paddingLeft: 4,
              paddingRight: 4,
              paddingTop: 2,
              paddingBottom: 2,
              borderRadius: 2,
              size: 11,
              weight: 'bold',
            },
          },
        ]
      }
      return []
    },
  })

  // 12. Fibonacci Retracement (Fibonacci Thoái lui 7 mức chuẩn TradingView)
  registerOverlay({
    name: 'fibonacciLine',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, bounding, overlay }) => {
      if (coordinates.length > 1) {
        const c1 = coordinates[0]
        const c2 = coordinates[1]
        const p1 = overlay.points?.[0]
        const p2 = overlay.points?.[1]

        const startY = c1.y
        const diffY = c2.y - c1.y
        const startVal = p1?.value || 0
        const diffVal = (p2?.value || 0) - startVal

        const fibLevels = [
          { ratio: 0.0, color: '#787b86' },
          { ratio: 0.236, color: '#f23645' },
          { ratio: 0.382, color: '#e3b341' },
          { ratio: 0.5, color: '#089981' },
          { ratio: 0.618, color: '#2962ff' },
          { ratio: 0.786, color: '#a855f7' },
          { ratio: 1.0, color: '#787b86' },
        ]

        const leftX = Math.min(c1.x, c2.x)
        const rightX = Math.max(bounding.width, Math.max(c1.x, c2.x) + 100)

        const figures = []

        // Translucent background bands like TradingView
        for (let i = 0; i < fibLevels.length - 1; i++) {
          const yTop = startY + diffY * fibLevels[i].ratio
          const yBottom = startY + diffY * fibLevels[i + 1].ratio
          figures.push({
            type: 'polygon',
            attrs: {
              coordinates: [
                { x: leftX, y: yTop },
                { x: rightX, y: yTop },
                { x: rightX, y: yBottom },
                { x: leftX, y: yBottom },
              ],
            },
            styles: {
              style: 'fill',
              color: `${fibLevels[i + 1].color}12`,
            },
          })
        }

        fibLevels.forEach((fib) => {
          const y = startY + diffY * fib.ratio
          const val = startVal + diffVal * fib.ratio
          figures.push({
            type: 'line',
            attrs: {
              coordinates: [
                { x: leftX, y },
                { x: rightX, y },
              ],
            },
            styles: {
              color: fib.color,
              size: 1.2,
              style: fib.ratio === 0.5 ? 'solid' : 'dashed',
              dashedValue: [3, 3],
            },
          })
          figures.push({
            type: 'text',
            attrs: {
              x: leftX + 4,
              y: y - 8,
              text: `${fib.ratio} (${formatNum(val)})`,
              align: 'left',
              baseline: 'middle',
            },
            styles: {
              color: fib.color,
              size: 10,
              weight: fib.ratio === 0.618 ? 'bold' : 'normal',
            },
          })
        })

        return figures
      }
      return []
    },
  })

  // 13. Parallel Channel (Kênh giá song song)
  registerOverlay({
    name: 'priceChannelLine',
    totalStep: 4,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 2) {
        const [p1, p2, p3] = coordinates
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const p4 = { x: p3.x - dx, y: p3.y - dy }

        const mid1 = { x: (p1.x + p4.x) / 2, y: (p1.y + p4.y) / 2 }
        const mid2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 }

        return [
          {
            type: 'polygon',
            attrs: { coordinates: [p1, p2, p3, p4] },
            styles: {
              style: 'stroke_fill',
              color: 'rgba(41, 98, 255, 0.12)',
              borderColor: '#2962ff',
              borderSize: 1.5,
            },
          },
          {
            type: 'line',
            attrs: { coordinates: [mid1, mid2] },
            styles: {
              color: '#2962ff',
              size: 1,
              style: 'dashed',
              dashedValue: [4, 4],
            },
          },
        ]
      }
      return []
    },
  })

  // 14. Simple Text Annotation (Ghi chú chữ)
  registerOverlay({
    name: 'simpleAnnotation',
    totalStep: 2,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 0) {
        const { x, y } = coordinates[0]
        return [
          {
            type: 'text',
            attrs: {
              x,
              y: y - 10,
              text: 'Ghi chú kỹ thuật (Bấm đúp để sửa)',
              align: 'left',
              baseline: 'middle',
            },
            styles: {
              color: '#f0f3fa',
              backgroundColor: 'rgba(30, 34, 45, 0.9)',
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 3,
              paddingBottom: 3,
              borderRadius: 3,
              size: 12,
            },
          },
        ]
      }
      return []
    },
  })

  // 15. Trend-Based Fibonacci Extension (Fibonacci Mở rộng dựa trên xu hướng - 3 điểm)
  registerOverlay({
    name: 'fibExtension',
    totalStep: 4,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, bounding, overlay }) => {
      if (coordinates.length > 2) {
        const [c1, c2, c3] = coordinates
        const p1 = overlay.points?.[0]
        const p2 = overlay.points?.[1]
        const p3 = overlay.points?.[2]

        const wave1Y = c2.y - c1.y
        const wave1Val = (p2?.value || 0) - (p1?.value || 0)
        const startY = c3.y
        const startVal = p3?.value || 0

        const fibExtLevels = [
          { ratio: 0.0, color: '#787b86' },
          { ratio: 0.382, color: '#f23645' },
          { ratio: 0.5, color: '#e3b341' },
          { ratio: 0.618, color: '#089981' },
          { ratio: 0.786, color: '#2962ff' },
          { ratio: 1.0, color: '#2962ff' },
          { ratio: 1.272, color: '#a855f7' },
          { ratio: 1.618, color: '#a855f7' },
          { ratio: 2.0, color: '#f97316' },
          { ratio: 2.618, color: '#f23645' },
        ]

        const leftX = Math.min(c1.x, c2.x, c3.x)
        const rightX = Math.max(bounding.width, Math.max(c1.x, c2.x, c3.x) + 120)

        const figures = []

        // Wave 1 dashed trend line: P1 -> P2
        figures.push({
          type: 'line',
          attrs: { coordinates: [c1, c2] },
          styles: { color: '#2962ff', size: 1.5, style: 'dashed', dashedValue: [3, 3] },
        })
        // Retracement wave line: P2 -> P3
        figures.push({
          type: 'line',
          attrs: { coordinates: [c2, c3] },
          styles: { color: '#e3b341', size: 1.5, style: 'dashed', dashedValue: [3, 3] },
        })

        // Translucent background bands
        for (let i = 0; i < fibExtLevels.length - 1; i++) {
          const y1 = startY + wave1Y * fibExtLevels[i].ratio
          const y2 = startY + wave1Y * fibExtLevels[i + 1].ratio
          figures.push({
            type: 'polygon',
            attrs: {
              coordinates: [
                { x: c3.x, y: y1 },
                { x: rightX, y: y1 },
                { x: rightX, y: y2 },
                { x: c3.x, y: y2 },
              ],
            },
            styles: {
              style: 'fill',
              color: `${fibExtLevels[i + 1].color}12`,
            },
          })
        }

        // Fib Extension levels lines and text
        fibExtLevels.forEach((fib) => {
          const y = startY + wave1Y * fib.ratio
          const val = startVal + wave1Val * fib.ratio
          figures.push({
            type: 'line',
            attrs: { coordinates: [{ x: c3.x, y }, { x: rightX, y }] },
            styles: {
              color: fib.color,
              size: fib.ratio === 1.0 || fib.ratio === 1.618 ? 1.8 : 1.2,
              style: fib.ratio === 1.0 ? 'solid' : 'dashed',
              dashedValue: [3, 3],
            },
          })
          figures.push({
            type: 'text',
            attrs: {
              x: c3.x + 4,
              y: y - 8,
              text: `Fib ${fib.ratio} (${formatNum(val)})`,
              align: 'left',
              baseline: 'middle',
            },
            styles: {
              color: fib.color,
              size: 10,
              weight: fib.ratio === 1.618 || fib.ratio === 1.0 ? 'bold' : 'normal',
            },
          })
        })

        return figures
      }
      return []
    },
  })

  // 16. Fibonacci Channel (Kênh Fibonacci - 3 điểm)
  registerOverlay({
    name: 'fibChannel',
    totalStep: 4,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 2) {
        const [p1, p2, p3] = coordinates
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const offsetX = p3.x - p1.x
        const offsetY = p3.y - p1.y

        const ratios = [0, 0.382, 0.5, 0.618, 1.0, 1.618, 2.0]
        const colors = ['#787b86', '#f23645', '#e3b341', '#089981', '#2962ff', '#a855f7', '#f97316']

        const figures = []
        for (let i = 0; i < ratios.length; i++) {
          const r = ratios[i]
          const c = colors[i]
          const start = { x: p1.x + offsetX * r, y: p1.y + offsetY * r }
          const end = { x: start.x + dx, y: start.y + dy }

          figures.push({
            type: 'line',
            attrs: { coordinates: [start, end] },
            styles: { color: c, size: r === 1.0 ? 1.8 : 1.2, style: r === 0.0 || r === 1.0 ? 'solid' : 'dashed', dashedValue: [3, 3] },
          })
          figures.push({
            type: 'text',
            attrs: { x: start.x + 4, y: start.y - 8, text: `Fib ${r}`, align: 'left', baseline: 'middle' },
            styles: { color: c, size: 10, weight: r === 0.618 || r === 1.0 ? 'bold' : 'normal' },
          })
        }
        return figures
      }
      return []
    },
  })

  // 17. Fibonacci Time Zone (Vùng thời gian Fibonacci - 2 điểm)
  registerOverlay({
    name: 'fibTimeZone',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, bounding }) => {
      if (coordinates.length > 1) {
        const [p1, p2] = coordinates
        const stepX = Math.max(Math.abs(p2.x - p1.x), 10)
        const startX = p1.x
        const fibNumbers = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
        const colors = ['#787b86', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b']

        const figures = []
        fibNumbers.forEach((f, idx) => {
          const x = startX + f * stepX
          if (x >= 0 && x <= bounding.width + 50) {
            const col = colors[idx % colors.length]
            figures.push({
              type: 'line',
              attrs: {
                coordinates: [
                  { x, y: 0 },
                  { x, y: bounding.height },
                ],
              },
              styles: { color: col, size: 1.2, style: f === 0 ? 'solid' : 'dashed', dashedValue: [3, 3] },
            })
            figures.push({
              type: 'text',
              attrs: { x: x + 4, y: 20, text: `F:${f}`, align: 'left', baseline: 'middle' },
              styles: { color: col, size: 10, weight: 'bold', backgroundColor: 'rgba(30, 34, 45, 0.85)', paddingLeft: 3, paddingRight: 3, paddingTop: 1, paddingBottom: 1, borderRadius: 2 },
            })
          }
        })
        return figures
      }
      return []
    },
  })

  // 18. Fibonacci Speed Resistance Fan (Quạt Fibonacci - 2 điểm)
  registerOverlay({
    name: 'fibFan',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, bounding }) => {
      if (coordinates.length > 1) {
        const [p1, p2] = coordinates
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const ratios = [0.382, 0.5, 0.618, 0.786]
        const colors = ['#f23645', '#e3b341', '#089981', '#2962ff']

        const figures = [
          {
            type: 'line',
            attrs: { coordinates: [p1, p2] },
            styles: { color: '#787b86', size: 1.5, style: 'dashed', dashedValue: [3, 3] },
          },
        ]

        ratios.forEach((r, idx) => {
          const targetY = p1.y + dy * r
          const targetX = p2.x
          const slope = (targetY - p1.y) / (targetX - p1.x || 1)
          const extendX = Math.max(bounding.width, targetX + 200)
          const extendY = p1.y + slope * (extendX - p1.x)
          const col = colors[idx]

          figures.push({
            type: 'line',
            attrs: { coordinates: [p1, { x: extendX, y: extendY }] },
            styles: { color: col, size: r === 0.618 ? 1.8 : 1.2 },
          })
          figures.push({
            type: 'text',
            attrs: { x: targetX + 4, y: targetY - 6, text: `Fan ${r}`, align: 'left', baseline: 'middle' },
            styles: { color: col, size: 10, weight: r === 0.618 ? 'bold' : 'normal' },
          })
        })
        return figures
      }
      return []
    },
  })

  // 19. Fibonacci Circles (Vòng tròn Fibonacci - 2 điểm)
  registerOverlay({
    name: 'fibCircles',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 1) {
        const [p1, p2] = coordinates
        const baseR = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
        const ratios = [0.382, 0.5, 0.618, 0.786, 1.0, 1.618]
        const colors = ['#f23645', '#e3b341', '#089981', '#2962ff', '#a855f7', '#f97316']

        const figures = []
        ratios.forEach((r, idx) => {
          const radius = baseR * r
          const col = colors[idx]
          figures.push({
            type: 'circle',
            attrs: { ...p1, r: radius },
            styles: { style: 'stroke', color: col, size: r === 0.618 ? 1.8 : 1.2 },
          })
          figures.push({
            type: 'text',
            attrs: { x: p1.x, y: p1.y - radius - 4, text: `Fib ${r}`, align: 'center', baseline: 'bottom' },
            styles: { color: col, size: 10, weight: r === 0.618 ? 'bold' : 'normal' },
          })
        })
        return figures
      }
      return []
    },
  })

  // 20. Info Line (Đoạn xu hướng kèm thông tin giá, %, góc, số nến - 2 điểm)
  registerOverlay({
    name: 'infoLine',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length > 1) {
        const [c1, c2] = coordinates
        const p1 = overlay.points?.[0]
        const p2 = overlay.points?.[1]

        const diffVal = (p2?.value || 0) - (p1?.value || 0)
        const pct = p1?.value ? (diffVal / p1.value) * 100 : 0
        const isUp = diffVal >= 0
        const col = isUp ? '#089981' : '#f23645'

        const angleRad = Math.atan2(-(c2.y - c1.y), c2.x - c1.x)
        const angleDeg = Math.round((angleRad * 180) / Math.PI)
        const bars = p1?.dataIndex != null && p2?.dataIndex != null ? Math.abs(p2.dataIndex - p1.dataIndex) : 0

        const midX = (c1.x + c2.x) / 2
        const midY = (c1.y + c2.y) / 2
        const sign = isUp ? '+' : ''
        const text = `${sign}${formatNum(diffVal)} (${sign}${pct.toFixed(2)}%) | ${bars} nến | ${angleDeg}°`

        return [
          {
            type: 'line',
            attrs: { coordinates: [c1, c2] },
            styles: { color: col, size: 2 },
          },
          {
            type: 'text',
            attrs: { x: midX, y: midY - 14, text, align: 'center', baseline: 'middle' },
            styles: {
              color: '#ffffff',
              backgroundColor: col,
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 3,
              paddingBottom: 3,
              borderRadius: 3,
              size: 11,
              weight: 'bold',
            },
          },
        ]
      }
      return []
    },
  })

  // 21. Trend Angle (Góc xu hướng - 2 điểm)
  registerOverlay({
    name: 'trendAngle',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 1) {
        const [c1, c2] = coordinates
        const angleRad = Math.atan2(-(c2.y - c1.y), c2.x - c1.x)
        const angleDeg = Math.round((angleRad * 180) / Math.PI)
        const col = angleDeg >= 0 ? '#089981' : '#f23645'

        const horizEnd = { x: c1.x + Math.abs(c2.x - c1.x), y: c1.y }
        return [
          {
            type: 'line',
            attrs: { coordinates: [c1, horizEnd] },
            styles: { color: '#787b86', size: 1.2, style: 'dashed', dashedValue: [3, 3] },
          },
          {
            type: 'line',
            attrs: { coordinates: [c1, c2] },
            styles: { color: col, size: 2 },
          },
          {
            type: 'text',
            attrs: { x: c1.x + 30, y: c1.y - 12, text: `${angleDeg}°`, align: 'left', baseline: 'middle' },
            styles: {
              color: '#ffffff',
              backgroundColor: col,
              paddingLeft: 5,
              paddingRight: 5,
              paddingTop: 2,
              paddingBottom: 2,
              borderRadius: 3,
              size: 11,
              weight: 'bold',
            },
          },
        ]
      }
      return []
    },
  })

  // 22. Cross Line (Đường chữ thập - 1 điểm)
  registerOverlay({
    name: 'crossLine',
    totalStep: 2,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, bounding }) => {
      if (coordinates.length > 0) {
        const { x, y } = coordinates[0]
        return [
          {
            type: 'line',
            attrs: { coordinates: [{ x: 0, y }, { x: bounding.width, y }] },
            styles: { color: '#58a6ff', size: 1.5, style: 'dashed', dashedValue: [4, 4] },
          },
          {
            type: 'line',
            attrs: { coordinates: [{ x, y: 0 }, { x, y: bounding.height }] },
            styles: { color: '#58a6ff', size: 1.5, style: 'dashed', dashedValue: [4, 4] },
          },
        ]
      }
      return []
    },
  })

  // 23. Ellipse (Hình elip - 2 điểm)
  registerOverlay({
    name: 'ellipse',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 1) {
        const [c1, c2] = coordinates
        const rx = Math.abs(c2.x - c1.x)
        const ry = Math.abs(c2.y - c1.y)
        const points = []
        const steps = 36
        for (let i = 0; i < steps; i++) {
          const theta = (i / steps) * 2 * Math.PI
          points.push({
            x: c1.x + rx * Math.cos(theta),
            y: c1.y + ry * Math.sin(theta),
          })
        }
        return [
          {
            type: 'polygon',
            attrs: { coordinates: points },
            styles: {
              style: 'stroke_fill',
              color: 'rgba(235, 168, 52, 0.16)',
              borderColor: '#e3b341',
              borderSize: 1.5,
            },
          },
        ]
      }
      return []
    },
  })

  // 24. Arc (Cung hình vòm - 3 điểm)
  registerOverlay({
    name: 'arc',
    totalStep: 4,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 2) {
        const [p1, p2, p3] = coordinates
        const curvePoints = []
        for (let t = 0; t <= 1; t += 0.05) {
          const x = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * p2.x + t * t * p3.x
          const y = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * p2.y + t * t * p3.y
          curvePoints.push({ x, y })
        }
        const figures = []
        for (let i = 0; i < curvePoints.length - 1; i++) {
          figures.push({
            type: 'line',
            attrs: { coordinates: [curvePoints[i], curvePoints[i + 1]] },
            styles: { color: '#a855f7', size: 2 },
          })
        }
        return figures
      }
      return []
    },
  })

  // 25. Callout (Bong bóng chú thích kèm đuôi chỉ - 2 điểm)
  registerOverlay({
    name: 'callout',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 1) {
        const [p1, p2] = coordinates
        const boxWidth = 140
        const boxHeight = 44
        const bx = p2.x
        const by = p2.y

        return [
          {
            type: 'line',
            attrs: { coordinates: [p1, { x: bx + boxWidth / 2, y: by + boxHeight / 2 }] },
            styles: { color: '#58a6ff', size: 1.5, style: 'dashed', dashedValue: [3, 3] },
          },
          {
            type: 'circle',
            attrs: { x: p1.x, y: p1.y, r: 4 },
            styles: { style: 'fill', color: '#58a6ff' },
          },
          {
            type: 'polygon',
            attrs: {
              coordinates: [
                { x: bx, y: by },
                { x: bx + boxWidth, y: by },
                { x: bx + boxWidth, y: by + boxHeight },
                { x: bx, y: by + boxHeight },
              ],
            },
            styles: {
              style: 'stroke_fill',
              color: 'rgba(30, 34, 45, 0.95)',
              borderColor: '#58a6ff',
              borderSize: 1.5,
            },
          },
          {
            type: 'text',
            attrs: {
              x: bx + boxWidth / 2,
              y: by + boxHeight / 2,
              text: 'Chú thích kỹ thuật',
              align: 'center',
              baseline: 'middle',
            },
            styles: { color: '#f0f3fa', size: 12, weight: '600' },
          },
        ]
      }
      return []
    },
  })

  // 26. Price Label (Nhãn mốc giá TradingView - 1 điểm)
  registerOverlay({
    name: 'priceLabel',
    totalStep: 2,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length > 0) {
        const { x, y } = coordinates[0]
        const val = overlay.points?.[0]?.value
        const label = val != null ? formatNum(val) : ''
        return [
          {
            type: 'circle',
            attrs: { x, y, r: 4 },
            styles: { style: 'fill', color: '#2962ff' },
          },
          {
            type: 'polygon',
            attrs: {
              coordinates: [
                { x: x + 6, y: y - 10 },
                { x: x + 70, y: y - 10 },
                { x: x + 70, y: y + 10 },
                { x: x + 6, y: y + 10 },
                { x, y },
              ],
            },
            styles: {
              style: 'stroke_fill',
              color: '#2962ff',
              borderColor: '#ffffff',
              borderSize: 1,
            },
          },
          {
            type: 'text',
            attrs: { x: x + 38, y, text: label, align: 'center', baseline: 'middle' },
            styles: { color: '#ffffff', size: 11, weight: 'bold' },
          },
        ]
      }
      return []
    },
  })

  // 27. Arrow Marker Up (Mũi tên Mua - 1 điểm)
  registerOverlay({
    name: 'arrowMarkerUp',
    totalStep: 2,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 0) {
        const { x, y } = coordinates[0]
        return [
          {
            type: 'polygon',
            attrs: {
              coordinates: [
                { x, y: y - 16 },
                { x: x + 10, y: y - 4 },
                { x: x + 4, y: y - 4 },
                { x: x + 4, y: y + 10 },
                { x: x - 4, y: y + 10 },
                { x: x - 4, y: y - 4 },
                { x: x - 10, y: y - 4 },
              ],
            },
            styles: { style: 'fill', color: '#089981' },
          },
        ]
      }
      return []
    },
  })

  // 28. Arrow Marker Down (Mũi tên Bán - 1 điểm)
  registerOverlay({
    name: 'arrowMarkerDown',
    totalStep: 2,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 0) {
        const { x, y } = coordinates[0]
        return [
          {
            type: 'polygon',
            attrs: {
              coordinates: [
                { x, y: y + 16 },
                { x: x + 10, y: y + 4 },
                { x: x + 4, y: y + 4 },
                { x: x + 4, y: y - 10 },
                { x: x - 4, y: y - 10 },
                { x: x - 4, y: y + 4 },
                { x: x - 10, y: y + 4 },
              ],
            },
            styles: { style: 'fill', color: '#f23645' },
          },
        ]
      }
      return []
    },
  })

  // 29. Head and Shoulders (Mô hình Vai - Đầu - Vai - 7 điểm)
  registerOverlay({
    name: 'headAndShoulders',
    totalStep: 8,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 6) {
        const [ls, v1, head, v2, rs, nl, nr] = coordinates
        return [
          {
            type: 'line',
            attrs: { coordinates: [v1, ls, v1, head, v2, rs, v2] },
            styles: { color: '#a855f7', size: 1.8 },
          },
          {
            type: 'line',
            attrs: { coordinates: [nl, nr] },
            styles: { color: '#f23645', size: 2, style: 'dashed', dashedValue: [4, 4] },
          },
          {
            type: 'text',
            attrs: { x: ls.x, y: ls.y - 12, text: 'Vai Trái (LS)', align: 'center', baseline: 'middle' },
            styles: { color: '#ffffff', backgroundColor: '#a855f7', paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 2, size: 10, weight: 'bold' },
          },
          {
            type: 'text',
            attrs: { x: head.x, y: head.y - 14, text: 'ĐẦU (Head)', align: 'center', baseline: 'middle' },
            styles: { color: '#ffffff', backgroundColor: '#f23645', paddingLeft: 5, paddingRight: 5, paddingTop: 2, paddingBottom: 2, borderRadius: 2, size: 11, weight: 'bold' },
          },
          {
            type: 'text',
            attrs: { x: rs.x, y: rs.y - 12, text: 'Vai Phải (RS)', align: 'center', baseline: 'middle' },
            styles: { color: '#ffffff', backgroundColor: '#a855f7', paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 2, size: 10, weight: 'bold' },
          },
          {
            type: 'text',
            attrs: { x: (nl.x + nr.x) / 2, y: (nl.y + nr.y) / 2 + 12, text: 'Đường Viền Cổ (Neckline)', align: 'center', baseline: 'middle' },
            styles: { color: '#f23645', size: 10, weight: 'bold' },
          },
        ]
      }
      return []
    },
  })

  // 30. Elliott Wave Impulse (Sóng đẩy Elliott 12345 - 6 điểm)
  registerOverlay({
    name: 'elliottImpulse',
    totalStep: 7,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 5) {
        const labels = ['(0)', '(1)', '(2)', '(3)', '(4)', '(5)']
        const figures = [
          {
            type: 'line',
            attrs: { coordinates },
            styles: { color: '#2962ff', size: 2 },
          },
        ]
        coordinates.forEach((pt, idx) => {
          figures.push({
            type: 'circle',
            attrs: { ...pt, r: 10 },
            styles: { style: 'stroke_fill', color: '#1e222d', borderColor: '#2962ff', borderSize: 1.5 },
          })
          figures.push({
            type: 'text',
            attrs: { x: pt.x, y: pt.y, text: labels[idx], align: 'center', baseline: 'middle' },
            styles: { color: '#2962ff', size: 10, weight: 'bold' },
          })
        })
        return figures
      }
      return []
    },
  })

  // 31. Elliott Wave Correction (Sóng điều chỉnh Elliott A-B-C - 4 điểm)
  registerOverlay({
    name: 'elliottCorrection',
    totalStep: 5,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 3) {
        const labels = ['(0)', '(A)', '(B)', '(C)']
        const figures = [
          {
            type: 'line',
            attrs: { coordinates },
            styles: { color: '#f23645', size: 2 },
          },
        ]
        coordinates.forEach((pt, idx) => {
          figures.push({
            type: 'circle',
            attrs: { ...pt, r: 10 },
            styles: { style: 'stroke_fill', color: '#1e222d', borderColor: '#f23645', borderSize: 1.5 },
          })
          figures.push({
            type: 'text',
            attrs: { x: pt.x, y: pt.y, text: labels[idx], align: 'center', baseline: 'middle' },
            styles: { color: '#f23645', size: 10, weight: 'bold' },
          })
        })
        return figures
      }
      return []
    },
  })

  // 32. ABCD Pattern (Mô hình ABCD - 4 điểm)
  registerOverlay({
    name: 'abcdPattern',
    totalStep: 5,
    needDefaultPointFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 3) {
        const [a, b, c, d] = coordinates
        const labels = ['A', 'B', 'C', 'D']
        const figures = [
          {
            type: 'line',
            attrs: { coordinates: [a, b, c, d] },
            styles: { color: '#e3b341', size: 2 },
          },
          {
            type: 'line',
            attrs: { coordinates: [a, c] },
            styles: { color: '#787b86', size: 1, style: 'dashed', dashedValue: [3, 3] },
          },
          {
            type: 'line',
            attrs: { coordinates: [b, d] },
            styles: { color: '#787b86', size: 1, style: 'dashed', dashedValue: [3, 3] },
          },
        ]
        ;[a, b, c, d].forEach((pt, idx) => {
          figures.push({
            type: 'circle',
            attrs: { ...pt, r: 9 },
            styles: { style: 'stroke_fill', color: '#1e222d', borderColor: '#e3b341', borderSize: 1.5 },
          })
          figures.push({
            type: 'text',
            attrs: { x: pt.x, y: pt.y, text: labels[idx], align: 'center', baseline: 'middle' },
            styles: { color: '#e3b341', size: 10, weight: 'bold' },
          })
        })
        return figures
      }
      return []
    },
  })

  registered = true
}
