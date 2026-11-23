/**
 * SuperTrend Indicator (Olivier Seban)
 * Chuẩn TradingView Open-Source
 * 
 * - Chu kỳ ATR (Period = 10)
 * - Hệ số nhân ATR (Multiplier = 3.0)
 * - Vẽ dải xu hướng trực tiếp lên nến giá (series: 'price')
 * - Xu hướng Tăng: Dải màu Xanh (#089981) nằm dưới nến
 * - Xu hướng Giảm: Dải màu Đỏ (#f23645) nằm trên nến
 */

function calcATR(dataList, period) {
  const tr = []
  for (let i = 0; i < dataList.length; i++) {
    const cur = dataList[i]
    if (i === 0) {
      tr.push(cur.high - cur.low)
    } else {
      const prev = dataList[i - 1]
      tr.push(
        Math.max(
          cur.high - cur.low,
          Math.abs(cur.high - prev.close),
          Math.abs(cur.low - prev.close)
        )
      )
    }
  }

  // Wilder RMA Smoothing
  const atr = new Array(dataList.length).fill(null)
  let sum = 0
  for (let i = 0; i < period && i < tr.length; i++) {
    sum += tr[i]
  }
  if (tr.length >= period) {
    atr[period - 1] = sum / period
    for (let i = period; i < tr.length; i++) {
      atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period
    }
  }
  return atr
}

export const superTrendIndicator = {
  name: 'SUPERTREND',
  shortName: 'SuperTrend',
  series: 'price',
  calcParams: [10, 3.0], // [ATR Period, Multiplier]
  precision: 0,
  shouldOhlc: true,

  figures: [
    {
      key: 'upTrend',
      title: 'ST Tăng: ',
      type: 'line',
      styles: () => ({ color: '#089981', size: 2 }),
    },
    {
      key: 'downTrend',
      title: 'ST Giảm: ',
      type: 'line',
      styles: () => ({ color: '#f23645', size: 2 }),
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
    const cur = result[dataIndex]

    if (!cur) {
      return {
        name: 'SuperTrend',
        calcParamsText: `(${indicator.calcParams.join(',')})`,
        icons: [],
        values: [],
      }
    }

    const isBull = cur.trend === 1
    const val = isBull ? cur.upTrend : cur.downTrend
    const formatted = val != null ? Number(val).toLocaleString('vi-VN') : '--'

    return {
      name: 'SuperTrend',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        {
          title: isBull ? 'ST Mua: ' : 'ST Bán: ',
          value: {
            text: `${formatted} (${isBull ? 'Tăng' : 'Giảm'})`,
            color: isBull ? '#089981' : '#f23645',
          },
        },
      ],
    }
  },

  calc: (dataList, indicator) => {
    const [period = 10, mult = 3.0] = indicator.calcParams
    const n = dataList.length
    if (n === 0) return []

    const atr = calcATR(dataList, period)
    const result = new Array(n)

    let upperBand = 0
    let lowerBand = 0
    let trend = 1 // 1 = Up (Bull), -1 = Down (Bear)

    for (let i = 0; i < n; i++) {
      const cur = dataList[i]
      const curAtr = atr[i]

      if (curAtr == null) {
        result[i] = {}
        continue
      }

      const hl2 = (cur.high + cur.low) / 2
      let basicUpper = hl2 + mult * curAtr
      let basicLower = hl2 - mult * curAtr

      if (i > 0 && result[i - 1].upperBand != null) {
        const prevClose = dataList[i - 1].close
        const prevUpper = result[i - 1].upperBand
        const prevLower = result[i - 1].lowerBand
        const prevTrend = result[i - 1].trend

        // Upper band adjustment
        if (basicUpper < prevUpper || prevClose > prevUpper) {
          upperBand = basicUpper
        } else {
          upperBand = prevUpper
        }

        // Lower band adjustment
        if (basicLower > prevLower || prevClose < prevLower) {
          lowerBand = basicLower
        } else {
          lowerBand = prevLower
        }

        // Trend switch
        if (prevTrend === 1) {
          trend = cur.close < lowerBand ? -1 : 1
        } else {
          trend = cur.close > upperBand ? 1 : -1
        }
      } else {
        upperBand = basicUpper
        lowerBand = basicLower
        trend = cur.close >= hl2 ? 1 : -1
      }

      result[i] = {
        upperBand,
        lowerBand,
        trend,
        upTrend: trend === 1 ? lowerBand : null,
        downTrend: trend === -1 ? upperBand : null,
        signal: 0,
      }

      if (i > 0 && result[i - 1].trend != null && result[i - 1].trend !== trend) {
        result[i].signal = trend // 1 = Buy signal, -1 = Sell signal
      }
    }

    return result
  },
}
