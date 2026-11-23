/**
 * Squeeze Momentum Indicator [LazyBear]
 * Top #1 Most Favorited Community Indicator in TradingView history (~92,000+ Likes)
 * 
 * Logic & Math Spec:
 * - Bollinger Bands (20, mult 2.0) vs Keltner Channels (20, mult 1.5)
 * - Squeeze ON: BB is inside KC (Market consolidation / Energy compression) -> Chấm Đỏ (#ff1744)
 * - Squeeze OFF (FIRED): BB breaks outside KC (Trend breakout / Energy release) -> Chấm Xanh lá (#00e676)
 * - Momentum: Linear Regression 20 of (Close - MidDonchianSMA)
 *   + Cột Dương tăng: Lime Green (#00e676) - Đà Tăng cực mạnh
 *   + Cột Dương giảm: Dark Green (#00897b) - Đà Tăng suy yếu
 *   + Cột Âm giảm sâu: Bright Red (#ff1744) - Đà Giảm cực mạnh
 *   + Cột Âm hồi phục: Light Orange (#ffb74d) - Đà Giảm suy yếu
 */

function getIndicatorData(data) {
  if (!data) return null
  if (data.current && data.current.indicatorData !== undefined) {
    return data.current.indicatorData
  }
  if (data.indicatorData !== undefined) {
    return data.indicatorData
  }
  return data
}

// Calculate linear regression value at the current bar
function linearRegression(values, length) {
  if (values.length < length) return 0
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0
  const n = length

  for (let i = 0; i < n; i++) {
    const x = i
    const y = values[values.length - n + i]
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  }

  const denominator = n * sumX2 - sumX * sumX
  if (denominator === 0) return values[values.length - 1] || 0
  const slope = (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n
  return intercept + slope * (n - 1)
}

export const squeezeMomentumIndicator = {
  name: 'SQUEEZE_MOMENTUM',
  shortName: 'Squeeze Mom',
  calcParams: [20, 2.0, 1.5], // [length, bbMult, kcMult]
  precision: 2,
  shouldFormatBigNumber: false,
  figures: [
    {
      key: 'mom',
      title: 'Mom: ',
      type: 'bar',
      baseValue: 0,
      styles: (data) => {
        const cur = getIndicatorData(data)
        if (!cur || cur.mom == null) return { color: '#00e676' }
        const state = cur.colorState
        if (state === 1) return { color: '#00e676' } // Lime Green: Bullish rising
        if (state === 2) return { color: '#00897b' } // Dark Green: Bullish falling
        if (state === 3) return { color: '#ff1744' } // Deep Red: Bearish falling
        return { color: '#ffb74d' }                  // Light Orange: Bearish rising
      },
    },
    {
      key: 'zeroDot',
      title: 'Squeeze: ',
      type: 'circle',
      attrs: ({ coordinate, barSpace }) => ({
        x: coordinate?.current?.x ?? 0,
        y: coordinate?.current?.zeroDot ?? 0,
        r: Math.max(2, Math.min(3.5, (barSpace && barSpace.halfGapBar) || 2.5)),
      }),
      styles: (data) => {
        const cur = getIndicatorData(data)
        if (!cur) return { color: '#787b86', style: 'fill' }
        if (cur.squeezeOn) return { color: '#ff1744', style: 'fill' }  // Đỏ tươi: Đang nén chặt (Squeeze ON)
        if (cur.squeezeOff) return { color: '#00e676', style: 'fill' } // Xanh lá/Lime: Bung nén (Squeeze FIRED)
        return { color: '#787b86', style: 'fill' }                   // Xám: Bình thường (No Squeeze)
      },
    },
  ],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    let dataIndex = kLineDataList.length - 1
    if (
      crosshair &&
      crosshair.dataIndex !== undefined &&
      crosshair.dataIndex >= 0 &&
      crosshair.dataIndex < kLineDataList.length
    ) {
      dataIndex = crosshair.dataIndex
    }
    const result = indicator.result || []
    const cur = result[dataIndex] || {}
    const mom = cur.mom != null ? Number(cur.mom).toFixed(2) : '--'
    let sqzText = 'Bình thường (No Squeeze)'
    let sqzColor = '#9ca3af'
    if (cur.squeezeOn) {
      sqzText = '🔴 NÉN CHẶT (Squeeze ON)'
      sqzColor = '#ff1744'
    } else if (cur.squeezeOff) {
      sqzText = '🟢 BUNG NÉN (Squeeze FIRED)'
      sqzColor = '#00e676'
    }
    
    let momColor = '#00e676'
    if (cur.colorState === 2) momColor = '#00897b'
    if (cur.colorState === 3) momColor = '#ff1744'
    if (cur.colorState === 4) momColor = '#ffb74d'

    return {
      name: 'Squeeze Mom',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        {
          title: 'Mom: ',
          value: {
            text: String(mom),
            color: momColor,
          },
        },
        {
          title: 'Trạng thái: ',
          value: {
            text: sqzText,
            color: sqzColor,
          },
        },
      ],
    }
  },
  calc: (dataList, indicator) => {
    const [length = 20, bbMult = 2.0, kcMult = 1.5] = indicator.calcParams
    const n = Math.max(5, Math.floor(length))

    // Precalculate arrays
    const deltas = []
    let prevMom = 0

    return dataList.map((bar, i) => {
      if (i < n - 1) {
        deltas.push(0)
        return { mom: 0, zeroDot: 0, squeezeOn: false, colorState: 1 }
      }

      // 1. Calculate SMA and StdDev for Bollinger Bands
      let sumClose = 0
      for (let j = 0; j < n; j++) {
        sumClose += dataList[i - j].close
      }
      const basis = sumClose / n

      let sumSq = 0
      for (let j = 0; j < n; j++) {
        const diff = dataList[i - j].close - basis
        sumSq += diff * diff
      }
      const dev = Math.sqrt(sumSq / n)
      const bbUpper = basis + bbMult * dev
      const bbLower = basis - bbMult * dev

      // 2. Calculate Keltner Channels using True Range
      let sumTr = 0
      for (let j = 0; j < n; j++) {
        const idx = i - j
        const b = dataList[idx]
        const prev = idx > 0 ? dataList[idx - 1] : b
        const tr = Math.max(
          b.high - b.low,
          Math.abs(b.high - prev.close),
          Math.abs(b.low - prev.close)
        )
        sumTr += tr
      }
      const trAvg = sumTr / n
      const kcUpper = basis + kcMult * trAvg
      const kcLower = basis - kcMult * trAvg

      // 3. Squeeze state: BB is inside KC (Squeeze ON) vs BB outside KC (Squeeze FIRED/OFF)
      const squeezeOn = bbLower > kcLower && bbUpper < kcUpper
      const squeezeOff = bbLower < kcLower && bbUpper > kcUpper
      const noSqueeze = !squeezeOn && !squeezeOff

      // 4. Momentum oscillator: Linear Regression of Delta
      let highestHigh = -Infinity
      let lowestLow = Infinity
      for (let j = 0; j < n; j++) {
        const b = dataList[i - j]
        if (b.high > highestHigh) highestHigh = b.high
        if (b.low < lowestLow) lowestLow = b.low
      }
      const donchianMid = (highestHigh + lowestLow) / 2
      const delta = bar.close - (donchianMid + basis) / 2
      deltas.push(delta)

      // Calculate linear regression over window n
      const subDeltas = deltas.slice(-n)
      const mom = linearRegression(subDeltas, n)

      // Pure previous mom from prior bar
      const prevMom = deltas.length > n ? linearRegression(deltas.slice(-n - 1, -1), n) : 0

      // Color state
      let colorState = 1
      if (mom > 0) {
        colorState = mom >= prevMom ? 1 : 2 // 1: Lime green, 2: Dark green
      } else {
        colorState = mom <= prevMom ? 3 : 4 // 3: Deep red, 4: Light orange/Maroon
      }

      return {
        mom,
        zeroDot: 0,
        squeezeOn,
        squeezeOff,
        noSqueeze,
        colorState,
      }
    })
  },
}
