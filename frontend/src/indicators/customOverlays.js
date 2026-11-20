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

  registered = true
}
